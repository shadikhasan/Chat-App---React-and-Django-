# 💬 Chat App — React + Django (Channels)

A real-time WhatsApp‑style chat built with **React (Vite + TypeScript)** and **Django + DRF + Channels**.  
Features **JWT auth**, **1:1 chat**, **presence (online/last seen)**, **typing**, and **message ticks**: ✓ sent, ✓✓ delivered, ✓✓ blue seen.  
The sidebar (inbox) shows **last message + unread count** and updates **live** via WebSockets.

---

## 📌 Features

- 🔑 **JWT Authentication** (register, login, refresh, `/auth/me`)
- 💬 **One‑to‑one chat** (history over HTTP, realtime over WS)
- ✅ **Message status ticks**: `sent → delivered → seen` (live)
- 👀 **Seen receipts** (room open → ✓✓ blue)
- 📶 **Presence** with Redis TTL (online / last seen)
- ✍️ **Typing indicator** (debounced)
- 📥 **Inbox list** with **last message + unread badge** (live via `/ws/inbox/`)
- ⚡ **Django Channels + Redis** for scaling
- 🎨 **Modern UI** (TailwindCSS)
- 🐳 **Docker Compose** option

---

## 🛠 Tech Stack

**Frontend:** React (Vite), TypeScript, Axios, React Router, TailwindCSS, WebSocket API  
**Backend:** Django, DRF, Django Channels, Redis (channel layer), SimpleJWT

---

## 📂 Project Structure

```
backend/
 ├── accounts/              # Auth API (APIView): register/login/me/refresh
 ├── chat/                  # Messages, presence, consumers & routing
 │   ├── models.py          # Message model + indexes
 │   ├── views.py           # Users list (threads), conversation history, presence API
 │   ├── routing.py         # websocket_urlpatterns
 │   ├── consumers.py       # ChatConsumer (room)
 │   ├── consumers_inbox.py # InboxConsumer + PresenceConsumer
 │   ├── presence.py        # Redis presence helpers (TTL + last_seen)
 ├── core/                  # Settings (dev/prod)
 ├── manage.py
 └── requirements.txt

frontend/
 ├── src/
 │   ├── api.ts             # Axios client with JWT + refresh
 │   ├── pages/
 │   │   ├── Chat.tsx       # Sidebar (inbox) + search (live updates)
 │   │   └── Room.tsx       # WhatsApp-like room UI (ticks/typing)
 │   ├── presence.ts        # Presence ping helper
 │   └── types.ts           # TS types (Message, ThreadItem, etc.)
 ├── vite.config.ts
 └── package.json
```

---

## 🚀 Quick Start

### 1) Clone
```bash
git clone https://github.com/shadikhasan/Chat-App---React-and-Django-.git
cd Chat-App---React-and-Django-
```

### 2) Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Env (example)
export REDIS_URL=redis://127.0.0.1:6379/0
export DJANGO_SETTINGS_MODULE=core.settings.dev

python manage.py migrate
python manage.py createsuperuser

# Start Redis (or use Docker)
redis-server &
python manage.py runserver
```

### 3) Frontend
```bash
cd ../frontend
npm i

# .env (example)
# VITE_API_BASE=/api                  # when vite proxy maps to backend
# VITE_WS_BASE=ws://localhost:8000    # direct to backend websockets
npm run dev
```

> If you don’t proxy API/WS in Vite, set `VITE_API_BASE=http://localhost:8000/api` and `VITE_WS_BASE=ws://localhost:8000`.

---

## 🔌 APIs & WebSockets

### REST (key endpoints)
| Method | Path                      | Purpose                             | Auth |
|-------:|---------------------------|-------------------------------------|------|
| POST   | `/api/auth/register/`     | Register                            | no   |
| POST   | `/api/auth/login/`        | Login (JWT)                         | no   |
| POST   | `/api/auth/refresh/`      | Refresh access                      | no   |
| GET    | `/api/auth/me/`           | Current user                        | JWT  |
| GET    | `/api/chat/users/`        | **Threads list** (last msg + unread)| JWT  |
| GET    | `/api/chat/history/:u/`   | Conversation history with `:u`      | JWT  |
| GET    | `/api/chat/presence/:u/`  | Presence `{ online, last_seen }`    | JWT  |

### WebSockets
- **Room**: `ws://HOST/ws/chat/:username/?token=<ACCESS_JWT>`  
  Events:
  - Client → Server:
    - `{type:"message.send", text:string}`
    - `{type:"typing.start"}` / `{type:"typing.stop"}`
    - `{type:"receipt.delivered", message_id:number}`
    - `{type:"receipt.seen_all"}`
  - Server → Client:
    - `{type:"message.new", message}`
    - `{type:"receipt.update", message_id, status, ts}`
    - `{type:"receipt.bulk_seen", items:[{id, ts}] }`
    - `{type:"typing", from, active}`

- **Presence**: `ws://HOST/ws/presence/?token=<ACCESS_JWT>`  
  - On connect: marks user **online**, auto‑delivers pending **sent → delivered**, and broadcasts updates to the sender’s **room** and **inbox**.
  - Client should send `{type:"ping"}` periodically (e.g., every 25s) to keep TTL fresh.

- **Inbox**: `ws://HOST/ws/inbox/?token=<ACCESS_JWT>`  
  - Server → Client: `{type:"thread.update", user, unread_count, last_message}`  
  - Drives **live sidebar** updates (last message text, unread badge, and ticks).

---

## ✅ Message Status (Ticks)

- **`sent`** → single gray ✓ (message stored)
- **`delivered`** → double gray ✓✓ (recipient online anywhere)
- **`seen`** → double blue ✓✓ (recipient opened the room)

All tick changes update **in the room and in the inbox list** in real time.

---

## 🧠 Presence

- Backed by Redis keys (TTL ~60s) + `last_seen` timestamp.
- Title bar shows **online** or **last seen …** using `/api/chat/presence/:username/`.
- The client pings the presence WS every ~25s: `{type:"ping"}`.

---

## 🧩 Environment Variables (Backend)

- `REDIS_URL` — e.g. `redis://127.0.0.1:6379/0`
- `DJANGO_SETTINGS_MODULE` — e.g. `core.settings.dev`
- `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ORIGINS` (set for production)

---

## 🐳 Docker (Optional)
```bash
docker-compose up --build
```
Brings up **backend**, **frontend**, and **Redis**.

---

## 🔒 Notes

- JWT is passed in the **Authorization** header for REST and as `?token=` for WS.
- Avoid logging WS URLs with tokens in production.
- Prefer Postgres in production; tune Redis & Channels.

---

## 📸 Screenshots
_Add screenshots of the inbox and room UI here._

---

## 📜 License
MIT

---

## 👨‍💻 Author
**Shadik Hasan** — 🐙 [GitHub](https://github.com/shadikhasan)
