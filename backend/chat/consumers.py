import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser, User
from channels.db import database_sync_to_async
from .models import Message

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(); return
        self.me = user
        self.peer_username = self.scope["url_route"]["kwargs"]["username"]
        self.room_name = self._room(self.me.username, self.peer_username)
        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.room_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        text = data.get("text", "").strip()
        if not text: return
        msg = await self._save_message(self.me.username, self.peer_username, text)
        await self.channel_layer.group_send(self.room_name, {"type": "chat.message", "message": msg})

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    @staticmethod
    def _room(a, b):
        return "chat_" + "__".join(sorted([a, b]))

    @database_sync_to_async
    def _save_message(self, sender, receiver, text):
        s = User.objects.get(username=sender)
        r = User.objects.get(username=receiver)
        m = Message.objects.create(sender=s, receiver=r, text=text)
        return {
            "id": m.id,
            "text": m.text,
            "created_at": m.created_at.isoformat(),
            "sender": {"id": s.id, "username": s.username},
            "receiver": {"id": r.id, "username": r.username},
        }
