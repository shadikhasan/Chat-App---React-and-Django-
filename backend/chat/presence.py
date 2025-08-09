# chat/presence.py
import os
import redis
from typing import Optional
from datetime import datetime, timezone

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
_r = redis.StrictRedis.from_url(REDIS_URL, decode_responses=True)

PRESENCE_TTL_SEC = 60
KEY_ONLINE = "presence:online:{}"   # TTL key — exists => online
KEY_LAST   = "presence:lastseen:{}" # ISO8601 string

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def set_online(username: str) -> None:
    _r.set(KEY_ONLINE.format(username), "1", ex=PRESENCE_TTL_SEC)
    _r.set(KEY_LAST.format(username), _now_iso())

def refresh_online(username: str) -> None:
    # extend TTL and bump last_seen
    _r.expire(KEY_ONLINE.format(username), PRESENCE_TTL_SEC)
    _r.set(KEY_LAST.format(username), _now_iso())

def clear_online(username: str) -> None:
    _r.delete(KEY_ONLINE.format(username))
    _r.set(KEY_LAST.format(username), _now_iso())

def is_online(username: str) -> bool:
    return _r.exists(KEY_ONLINE.format(username)) == 1

def get_last_seen(username: str) -> Optional[str]:
    return _r.get(KEY_LAST.format(username))

def get_presence(username: str) -> dict:
    return {"online": is_online(username), "last_seen": get_last_seen(username)}
