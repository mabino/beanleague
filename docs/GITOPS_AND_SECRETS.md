# 🔐 Homelab GitOps & Secrets Guide

This guide details how BeanLeague is hosted as a submodule under `binolabs.com/beanleague` and managed via GitOps in `../homelab`.

---

## 🌐 Ingress URL & Routing

- **Public Web App**: `https://binolabs.com/beanleague`
- **Internal API**: `https://binolabs.com/beanleague/api`
- **Live SSE Event Stream**: `https://binolabs.com/beanleague/api/events/live`

---

## 🔑 Environment Variables & Secrets

BeanLeague requires minimal secrets:

| Variable | Required? | Description | Example Value |
|---|---|---|---|
| `API_FOOTBALL_KEY` | Optional | API Key from API-Football. If omitted, app runs in Curated Mock Mode. | `e8f92a10b4c73...` |
| `API_DAILY_LIMIT` | Optional | Max external API requests allowed per day (Default: `100`). | `100` |
| `DEFAULT_SEASON_CODE` | Optional | Default room code for league bootstrap. | `BARCA-2026` |
| `DEFAULT_SALARY_CAP` | Optional | Starting salary cap in millions of dollars. | `100.0` |

---

## 🔄 Homelab Submodule & Ingress Setup

### 1. Register Submodule in `../homelab`

Run the setup script:

```bash
./deploy/homelab-submodule-setup.sh ../homelab
```

Or manually:
```bash
cd ../homelab
git submodule add https://github.com/mabino/beanleague.git web/beanleague
git submodule update --init --recursive
```

### 2. Service Definition in `../homelab/docker-compose.yml`

```yaml
  beanleague-backend:
    build:
      context: ./web/beanleague
      dockerfile: backend/Dockerfile
    container_name: beanleague-backend
    restart: unless-stopped
    environment:
      - DATA_DIR=/app/data
      - API_FOOTBALL_KEY=${API_FOOTBALL_KEY:-}
      - API_DAILY_LIMIT=100
      - DEFAULT_SEASON_CODE=BARCA-2026
    volumes:
      - beanleague_data:/app/data
    networks:
      - homelab-net

  beanleague-frontend:
    build:
      context: ./web/beanleague
      dockerfile: frontend/Dockerfile
    container_name: beanleague-frontend
    restart: unless-stopped
    depends_on:
      - beanleague-backend
    networks:
      - homelab-net

volumes:
  beanleague_data:
    name: beanleague_data
```

### 3. Nginx Subpath Location Block in `../homelab/web/nginx.conf`

Add inside the `server { server_name binolabs.com www.binolabs.com; ... }` block:

```nginx
        # BeanLeague — Login-less Fantasy Soccer Platform
        location = /beanleague {
            return 301 $scheme://$host/beanleague/;
        }
        location /beanleague/ {
            set $upstream_beanleague_frontend beanleague-frontend;
            proxy_pass http://$upstream_beanleague_frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Real-time Server-Sent Events (SSE) support
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;
            chunked_transfer_encoding on;
        }
```

---

## 🤖 GitHub Actions CI/CD Pipeline

The GitHub Actions workflow runs all tests in an isolated Linux container:

```yaml
name: CI Test Suite

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    name: Run Containerized Test Suite
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Run Tests in Docker Container
        run: ./scripts/run-tests.sh docker
```
