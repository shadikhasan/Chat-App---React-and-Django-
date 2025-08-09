# Django Backend Template v1.1

A production-ready Django backend template following best practices. Includes Docker support, PostgreSQL for production, SQLite for development, Celery with Redis, and environment-based settings.

---

## 📁 Project Structure

```
myproject/
│
├── core/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── dev.py
│   │   └── prod.py
│   ├── urls.py
│   ├── wsgi.py
│   └── celery.py
│
├── myapp/
│   ├── models.py
│   └── ...
│
├── static/
├── media/
├── manage.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env
└── README.md
```

---

## ⚙️ Features

- Django 4.2+
- PostgreSQL (prod) / SQLite (dev)
- Celery with Redis
- Docker and Docker Compose setup
- Separate `settings/` for base, development, and production
- Environment variables with `os.environ`
- Static and media file support

---

## 🚀 Getting Started

### Clone the repository

```bash
git clone https://github.com/shadikhasan/Django-Backend-Template.git
cd Django-Backend-Template
```

### Create `.env`

Create a `.env` file at the root with the following:

```
DEBUG=1
SECRET_KEY=your-secret-key

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Allowed hosts
ALLOWED_HOSTS=127.0.0.1,localhost
```

---

## 🐳 Run with Docker

```bash
docker-compose up --build
```

- App: http://localhost:8000
- Redis: localhost:6379
- PostgreSQL: localhost:5432

---

## 🧪 Run Migrations & Create Superuser

```bash
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py createsuperuser
```

---

## 🏃 Run Celery

```bash
docker-compose exec celery celery -A core worker --loglevel=info
docker-compose exec celery-beat celery -A core beat --loglevel=info
```

---

## 📂 Requirements Files

- `requirements.txt`: Common dependencies

---

## 📦 Collect Static Files

```bash
docker-compose exec web python manage.py collectstatic --noinput
```

---

## ✨ License

MIT License
