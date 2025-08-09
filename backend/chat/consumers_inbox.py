# chat/consumers_inbox.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser, User
from channels.db import database_sync_to_async
from django.utils import timezone
from django.db.models import Q

from .presence import set_online, refresh_online
from .models import Message
from .serializers import MessageSerializer, UserPublicSerializer

def inbox_group(username: str) -> str:
    return f"inbox_{username}"

def room_name_for(a: str, b: str) -> str:
    return "chat_" + "__".join(sorted([a, b]))

class InboxConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(); return
        self.me = user
        self.group = inbox_group(self.me.username)
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group, self.channel_name)

    async def thread_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "thread.update",
            "user": event["user"],
            "unread_count": event["unread_count"],
            "last_message": event.get("last_message"),
        }))

class PresenceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(); return
        self.me = user
        await self.accept()
        await database_sync_to_async(set_online)(self.me.username)

        # Deliver any pending messages → delivered
        items = await self._deliver_all_pending(self.me.username)
        # items: [(id, sender_username, delivered_iso)]
        for mid, sender_username, ts in items:
            # 1) Update the open room (sender side) so ticks flip to ✓✓ there
            await self.channel_layer.group_send(
                room_name_for(sender_username, self.me.username),
                {"type": "chat.receipt_update", "message_id": mid, "status": "delivered", "ts": ts},
            )
            # 2) Update the sender's inbox list (last message + unread/ticks)
            summary = await self._thread_summary(owner_username=sender_username, other_username=self.me.username)
            await self.channel_layer.group_send(
                inbox_group(sender_username),
                {"type": "thread.update", **summary}
            )

    async def disconnect(self, code):
        pass  # TTL expiry handles offline; last_seen updated on ping

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or "{}")
        except Exception:
            return
        if data.get("type") == "ping":
            await database_sync_to_async(refresh_online)(self.me.username)

    # ==== DB helpers ====

    @database_sync_to_async
    def _deliver_all_pending(self, me_username: str):
        qs = Message.objects.select_related("sender", "receiver").filter(
            receiver__username=me_username, status=Message.STATUS_SENT
        )
        now = timezone.now()
        items = []
        for m in qs:
            m.status = Message.STATUS_DELIVERED
            m.delivered_at = now
            m.save(update_fields=["status", "delivered_at"])
            items.append((m.id, m.sender.username, m.delivered_at.isoformat()))
        return items

    @database_sync_to_async
    def _thread_summary(self, owner_username: str, other_username: str):
        try:
            owner = User.objects.get(username=owner_username)
            other = User.objects.get(username=other_username)
        except User.DoesNotExist:
            return {"user": None, "unread_count": 0, "last_message": None}

        qs = Message.objects.filter(
            Q(sender=owner, receiver=other) | Q(sender=other, receiver=owner)
        ).order_by("-created_at")
        last = qs.first()
        unread = Message.objects.filter(sender=other, receiver=owner, is_read=False).count()

        payload = None
        if last:
            payload = MessageSerializer(last).data
            payload["from_me"] = (last.sender_id == owner.id)

        return {
            "user": UserPublicSerializer(other).data,
            "unread_count": unread,
            "last_message": payload,
        }
