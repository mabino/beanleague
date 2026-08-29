# 🛠️ BeanLeague Setup & Installation Guide

This guide walks you through setting up BeanLeague for local development, home server hosting, and production GitOps deployment.

---

## 📋 Prerequisites

- **Docker & Docker Compose** (recommended for production and isolated testing)
- **Python 3.12+** (if running the backend locally without containers)
- **Node.js 20+** (if building or developing the frontend locally)
- *(Optional)* **API-Football Account & API Key** (for real-world live match data)

---

## ⚡ Fast Track: Docker Deployment (Recommended)

The cleanest way to run BeanLeague on your homelab or server is via Docker Compose.

### 1. Clone & Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# (Optional) Edit .env with your API-Football key and custom league settings
nano .env
```

### 2. Launch Services

```bash
docker compose up -d --build
```

This starts:
- **`beanleague-backend`**: FastAPI REST API + Asynchronous Scoring Engine + Cron Scheduler on port `8000`.
- **`beanleague-frontend`**: React Single Page Application served via Nginx on port `3000`.
- **`beanleague_data`**: Persistent Docker named volume storing the SQLite database (`beanleague.db`) in Write-Ahead Logging (WAL) mode.

### 3. Verify Health

```bash
# Check container status
docker compose ps

# Check backend health
curl http://localhost:8000/health
```

Open `http://localhost:3000` (or `http://<your-server-ip>:3000`) in any browser or mobile device.

---

## 💻 Local Development Setup

If you want to contribute to the codebase or develop locally:

### 1. Backend Setup

```bash
cd backend

# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install development and production requirements
pip install -r requirements-dev.txt

# Run FastAPI backend with hot reloading
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive OpenAPI Swagger docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Frontend Setup

```bash
cd frontend

# Install npm packages
npm install

# Start Vite dev server with proxy to backend
npm run dev
```

Frontend will be accessible at [http://localhost:5173](http://localhost:5173).

---

## 🗄️ Database Architecture & Storage

BeanLeague uses **SQLite** with Write-Ahead Logging (`WAL`) enabled for zero-lock concurrency:

- **Database Location**: Stored in `./data/beanleague.db` (locally) or `/app/data/beanleague.db` (in container).
- **Persistent Volume**: When deployed via Docker, the volume `beanleague_data` is mounted to `/app/data`. Your teams, manager PINs, rosters, and match histories are preserved across container restarts and updates.

### Manual Database Seeding
To manually seed or reset the database with the latest players and fixtures:

```bash
# Trigger seed via script
./scripts/seed-db.sh

# Or via API
curl -X POST http://localhost:8000/api/admin/seed?force_mock=true
```

### Database Backup & Restore

```bash
# Hot-backup SQLite database in WAL mode without stopping containers
sqlite3 /var/lib/docker/volumes/beanleague_data/_data/beanleague.db ".backup '/backup/beanleague-$(date +%Y%m%d).db'"
```

---

## 🛡️ Reverse Proxy & SSL Configuration

When serving BeanLeague over HTTPS via Nginx, Traefik, or Cloudflare Tunnels, ensure that **buffering is disabled** on `/api/events/live` so Server-Sent Events (SSE) stream smoothly to phones and tablets.

### Nginx Example
```nginx
server {
    listen 443 ssl http2;
    server_name fantasy.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # Frontend Single Page App
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API & Live SSE Event Stream
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        
        # Disable buffering for live goal pulse toasts
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```
