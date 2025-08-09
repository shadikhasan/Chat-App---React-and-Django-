# 💬 Chat App — React + Django

A real-time chat application built with **React (Vite)** on the frontend and **Django + Django Channels** on the backend.  
Supports **one-to-one messaging**, **real-time updates** via WebSockets, and a clean modular architecture for scalability.

---

## 📌 Features

- 🔑 **JWT Authentication** (Login & Signup)
- 💬 **One-to-One Chat**
- ⚡ **Real-Time Messaging** using Django Channels + WebSockets
- 📜 **Message History** from the database
- 🔔 **Live UI Updates** without page refresh
- 🎨 **Modern UI** with TailwindCSS
- 🐳 **Dockerized** for easy deployment
- 🗄 **SQLite** for development (can be switched to PostgreSQL/MySQL in production)

---

## 🛠 Tech Stack

**Frontend:**
- React (Vite)
- TypeScript
- TailwindCSS
- WebSocket API

**Backend:**
- Django
- Django REST Framework (DRF)
- Django Channels
- Redis (for channel layer)

**Deployment:**
- Docker & Docker Compose

---

## 📂 Project Structure

```
backend/
 ├── accounts/       # Authentication app
 ├── chat/           # Chat logic & WebSocket consumers
 ├── core/           # Project settings & configs
 ├── myapp/          # Other reusable apps
 ├── manage.py
 ├── requirements.txt
 └── Dockerfile

frontend/
 ├── public/
 ├── src/            # React components & pages
 ├── package.json
 ├── vite.config.ts
 └── tsconfig.json
```

---

## 🚀 Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/shadikhasan/Chat-App---React-and-Django-.git
cd Chat-App---React-and-Django-
```

---

### 2️⃣ Backend Setup (Django)
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start Redis (Required for Channels)
redis-server

# Run backend server
python manage.py runserver
```

---

### 3️⃣ Frontend Setup (React + Vite)
```bash
cd frontend

# Install dependencies
npm install

# Start frontend dev server
npm run dev
```

---

### 4️⃣ Running with Docker (Optional)
```bash
docker-compose up --build
```
This will start **backend**, **frontend**, and **Redis** together.

---

## 🔌 WebSocket URL Format

```
ws://<backend-host>/ws/chat/<username>/?token=<JWT_ACCESS_TOKEN>
```

Example:
```
ws://localhost:8000/ws/chat/john/?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUz...
```

---

## 📸 Screenshots

*(Add some screenshots of the chat interface here)*

---

## 🗒 Notes

- Default database is **SQLite** for quick setup — change `DATABASES` in `backend/core/settings.py` for production.
- Use **Redis** in production for WebSocket handling.
- Environment variables should be stored in `.env` files (both backend & frontend).

---

## 📜 License

This project is licensed under the MIT License — feel free to use and modify.

---

## 👨‍💻 Author

**Shadik Hasan**  
📧 [Email me](mailto:your-email@example.com)  
🐙 [GitHub Profile](https://github.com/shadikhasan)

---
