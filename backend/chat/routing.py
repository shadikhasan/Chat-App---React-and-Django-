# chat/routing.py
from django.urls import path
from .consumers import ChatConsumer
from .consumers_inbox import InboxConsumer, PresenceConsumer

websocket_urlpatterns = [
    path("ws/chat/<str:username>/", ChatConsumer.as_asgi()),
    path("ws/presence/", PresenceConsumer.as_asgi()),
    path("ws/inbox/", InboxConsumer.as_asgi()),
]
