import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from django.utils import timezone
from django.contrib.auth.models import User
from .presence import set_online, refresh_online
from .models import Message

def room_name_for(a: str, b: str) -> str:
    return "chat_" + "__".join(sorted([a, b]))

class PresenceConsumer(AsyncWebsocketConsumer):
    """
    Keeps a lightweight presence socket per signed-in user.
    - On connect: mark user online (TTL)
    - On ping: refresh TTL
    - On connect: deliver any pending 'sent' messages (set to 'delivered') and notify senders
    """
    async def connect(self):
        user = self.scope.get("user")
        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(); return
        self.me = user
        await self.accept()
        await database_sync_to_async(set_online)(self.me.username)
        # deliver pending 'sent' messages to me
        items = await self._deliver_all_pending(self.me.username)
        # notify each sender's room that messages are delivered
        for mid, sender_username, ts in items:
            await self.channel_layer.group_send(
                room_name_for(sender_username, self.me.username),
                {"type": "chat.receipt_update", "message_id": mid, "status": "delivered", "ts": ts},
            )

    async def disconnect(self, code):
        # rely on TTL expiry; no hard offline broadcast
        pass

    async def receive(self, text_data=None, bytes_data=None):
        # expect {"type":"ping"} from client to refresh TTL
        try:
            data = json.loads(text_data or "{}")
        except Exception:
            return
        if data.get("type") == "ping":
            await database_sync_to_async(refresh_online)(self.me.username)

    @database_sync_to_async
    def _deliver_all_pending(self, me_username: str):
        """
        Mark all messages TO me with status='sent' -> 'delivered'.
        Return list of tuples (id, sender_username, delivered_at_iso).
        """
        from .models import Message
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
