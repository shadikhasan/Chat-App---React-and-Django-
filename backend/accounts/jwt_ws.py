from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get("query_string", b"").decode())
        token = None
        if "token" in query:
            token = query.get("token", [None])[0]
        elif headers := dict(scope.get("headers", [])):
            auth = headers.get(b"authorization")
            if auth and auth.lower().startswith(b"bearer "):
                token = auth.split()[1].decode()
        scope["user"] = await self._get_user(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def _get_user(self, raw_token):
        authenticator = JWTAuthentication()
        try:
            validated = authenticator.get_validated_token(raw_token)
            return authenticator.get_user(validated)
        except Exception:
            return AnonymousUser()
