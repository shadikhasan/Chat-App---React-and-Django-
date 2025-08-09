# core/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from accounts.jwt_ws import JWTAuthMiddleware
from chat.routing import websocket_urlpatterns  

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.dev") 

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
})
