import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path
from chat.consumers import ChatConsumer
from accounts.jwt_ws import JWTAuthMiddleware
from chat.consumers_inbox import *

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.dev")

django_asgi_app = get_asgi_application()

websocket_urlpatterns = [
    path("ws/chat/<str:username>/", ChatConsumer.as_asgi()),
    path("ws/presence/", PresenceConsumer.as_asgi()),
    path("ws/inbox/", InboxConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
})