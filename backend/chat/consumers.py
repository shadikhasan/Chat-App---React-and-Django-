# chat/consumers.py  (replace file if easier)
import json
from typing import Any, Dict
from django.db import transaction
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser, User
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import Message
from .presence import is_online

def room_name(a, b): return "chat_" + "__".join(sorted([a, b]))
def inbox_group(u): return f"inbox_{u}"

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(); return
        self.me = user
        self.peer_username = self.scope["url_route"]["kwargs"]["username"]
        self.room_name = room_name(self.me.username, self.peer_username)
        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.room_name, self.channel_name)

    async def receive(self, text_data):
        try:
          data = json.loads(text_data)
        except Exception:
          return
        evt = data.get("type")

        if evt == "message.send":
            text = (data.get("text") or "").strip()
            if not text: return
            msg = await self._create_message(self.me.username, self.peer_username, text)
            await self.channel_layer.group_send(self.room_name, {"type": "chat.message_new", "message": msg})

            # delivered if peer is online anywhere
            if await database_sync_to_async(is_online)(self.peer_username):
                upd = await self._mark_delivered(msg["id"])
                if upd:
                    await self.channel_layer.group_send(
                        self.room_name, {"type": "chat.receipt_update", "message_id": msg["id"], "status": "delivered", "ts": upd["ts"]}
                    )

            # 🔔 notify both inbox lists (sender & receiver)
            s_summary = await self._thread_summary(self.me.username, self.peer_username)
            r_summary = await self._thread_summary(self.peer_username, self.me.username)
            await self.channel_layer.group_send(inbox_group(self.me.username), {"type": "thread.update", **s_summary})
            await self.channel_layer.group_send(inbox_group(self.peer_username), {"type": "thread.update", **r_summary})
            return

        if evt == "receipt.delivered":
            mid = data.get("message_id")
            if isinstance(mid, int):
                upd = await self._mark_delivered(mid)
                if upd:
                    await self.channel_layer.group_send(
                        self.room_name,
                        {"type": "chat.receipt_update", "message_id": mid, "status": "delivered", "ts": upd["ts"]},
                    )
                    # 🔔 also refresh both inbox summaries (sender sees ✓✓)
                    s_summary = await self._thread_summary(self.me.username, self.peer_username)
                    r_summary = await self._thread_summary(self.peer_username, self.me.username)
                    from .consumers import inbox_group as _inbox  # or define at top
                    await self.channel_layer.group_send(_inbox(self.me.username), {"type": "thread.update", **s_summary})
                    await self.channel_layer.group_send(_inbox(self.peer_username), {"type": "thread.update", **r_summary})
            return

        if evt == "receipt.seen_all":
            ids_ts = await self._mark_all_seen(self.me.username, self.peer_username)
            if ids_ts:
                await self.channel_layer.group_send(self.room_name, {"type": "chat.receipt_bulk_seen", "items": ids_ts})

                # 🔔 after seeing, update both inbox threads (receiver unread -> 0)
                s_summary = await self._thread_summary(self.me.username, self.peer_username)
                r_summary = await self._thread_summary(self.peer_username, self.me.username)
                await self.channel_layer.group_send(inbox_group(self.me.username), {"type": "thread.update", **s_summary})
                await self.channel_layer.group_send(inbox_group(self.peer_username), {"type": "thread.update", **r_summary})
            return

        if evt == "typing.start":
            await self.channel_layer.group_send(self.room_name, {"type": "chat.typing", "from": self.me.username, "active": True})
            return
        if evt == "typing.stop":
            await self.channel_layer.group_send(self.room_name, {"type": "chat.typing", "from": self.me.username, "active": False})
            return

    # === group forwards ===
    async def chat_message_new(self, event):
        await self.send(text_data=json.dumps({"type": "message.new", "message": event["message"]}))

    async def chat_receipt_update(self, event):
        await self.send(text_data=json.dumps(event | {"type": "receipt.update"}))

    async def chat_receipt_bulk_seen(self, event):
        await self.send(text_data=json.dumps({"type": "receipt.bulk_seen", "items": event["items"]}))

    async def chat_typing(self, event):
        if event.get("from") == self.me.username: return
        await self.send(text_data=json.dumps({"type":"typing","from":event["from"],"active":event["active"]}))

    # === helpers ===
    @database_sync_to_async
    def _create_message(self, sender, receiver, text) -> Dict[str, Any]:
        s = User.objects.get(username=sender)
        r = User.objects.get(username=receiver)
        m = Message.objects.create(sender=s, receiver=r, text=text)  # status=sent
        return {
            "id": m.id, "text": m.text, "created_at": m.created_at.isoformat(), "status": m.status,
            "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
            "seen_at": m.seen_at.isoformat() if m.seen_at else None,
            "sender": {"id": s.id, "username": s.username},
            "receiver": {"id": r.id, "username": r.username},
        }

    @database_sync_to_async
    def _mark_delivered(self, message_id: int):
        try:
            msg = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return None
        if msg.status == Message.STATUS_SENT:
            msg.status = Message.STATUS_DELIVERED
            msg.delivered_at = timezone.now()
            msg.save(update_fields=["status", "delivered_at"])
        return {"ts": msg.delivered_at.isoformat() if msg.delivered_at else None}

    @database_sync_to_async
    def _mark_all_seen(self, me: str, peer: str):
        now = timezone.now()
        with transaction.atomic():
            qs = Message.objects.select_for_update().filter(
                sender__username=peer, receiver__username=me
            ).exclude(status=Message.STATUS_SEEN)
            changed = []
            for msg in qs:
                msg.status = Message.STATUS_SEEN
                msg.seen_at = now
                msg.is_read = True
                if not msg.delivered_at:
                    msg.delivered_at = now
                msg.save(update_fields=["status", "seen_at", "is_read", "delivered_at"])
                changed.append({"id": msg.id, "ts": msg.seen_at.isoformat()})
            return changed

    @database_sync_to_async
    def _thread_summary(self, me_username: str, other_username: str):
        """
        Return dict shaped for InboxConsumer.thread_update:
         { "user": {...}, "unread_count": int, "last_message": {... or None} }
        where 'last_message.from_me' is relative to 'me_username'.
        """
        from django.db.models import Q
        from .serializers import MessageSerializer, UserPublicSerializer

        try:
            me = User.objects.get(username=me_username)
            other = User.objects.get(username=other_username)
        except User.DoesNotExist:
            return {"user": None, "unread_count": 0, "last_message": None}

        qs = Message.objects.filter(Q(sender=me, receiver=other) | Q(sender=other, receiver=me)).order_by("-created_at")
        last = qs.first()
        unread = Message.objects.filter(sender=other, receiver=me, is_read=False).count()

        payload = None
        if last:
            payload = MessageSerializer(last).data
            payload["from_me"] = (last.sender_id == me.id)

        return {
            "user": UserPublicSerializer(other).data,
            "unread_count": unread,
            "last_message": payload,
        }
