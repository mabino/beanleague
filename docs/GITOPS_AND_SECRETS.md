# 🔐 Homelab GitOps, Security & Secrets Guide

This guide details how BeanLeague is hosted as a submodule under `binolabs.com/beanleague`, configured via GitOps in `../homelab`, and protected by multi-layer security.

---

## 🌐 Ingress Routing & URLs

- **Public Web App**: `https://binolabs.com/beanleague/`
- **REST API Endpoints**: `https://binolabs.com/beanleague/api/...`
- **Live SSE Event Stream**: `https://binolabs.com/beanleague/api/live/stream`
- **System Telemetry & Status**: `https://binolabs.com/beanleague/api/system/status`
- **Interactive OpenAPI Swagger Docs**: `https://binolabs.com/beanleague/docs`

---

## 🔑 Environment Variables & Secrets

BeanLeague requires minimal configuration:

| Variable | Required? | Default | Description |
| :--- | :---: | :---: | :--- |
| `API_FOOTBALL_KEY` | Optional | `""` | API Key from API-Football. If omitted, the platform runs in Curated Mock Mode. |
| `API_DAILY_LIMIT` | Optional | `100` | Hard cap on external API requests per day to prevent overages on free tiers. |
| `ADMIN_PIN` | Optional | `BEAN-ADMIN-2026` | Preset security PIN for the Developer Sandbox and Data Admin Portal. |
| `DEFAULT_SEASON_CODE`| Optional | `BARCA-2026` | Default room code for initial database bootstrap. |
| `DEFAULT_SALARY_CAP` | Optional | `100.0` | Default salary cap in millions of dollars (e.g. `$100.0M`). |
| `DATA_DIR` | Optional | `./data` | Filepath for SQLite persistence volume. |

---

## 🛡️ Security Architecture

### 1. Timing-Safe Admin PIN Authentication
Administrative endpoints (`/api/admin/...`) require the `X-Admin-PIN` header and verify access using `hmac.compare_digest` to prevent side-channel timing attacks.

### 2. PIN Brute-Force Rate Limiting
The login endpoint (`POST /api/teams/login`) enforces an IP-based sliding window rate limiter (`check_login_rate_limit`) permitting up to 15 attempts per minute per IP before returning `HTTP 429 Too Many Requests`.

### 3. Media & Notes Script Sanitization (XSS)
- YouTube video IDs are validated against strict 11-character regex (`^[a-zA-Z0-9_-]{11}$`).
- Player notes and titles are sanitized via `html.escape` to neutralize arbitrary script injection.

### 4. Security Headers
All responses include standard security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## 🔄 Homelab GitOps & Submodule Integration

### 1. Submodule Registration in `../homelab`

```bash
cd ../homelab
git submodule add https://github.com/mabino/beanleague.git web/beanleague
git submodule update --init --recursive
```

### 2. Docker Compose Service Definition

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
      - ADMIN_PIN=${BEANLEAGUE_ADMIN_PIN:-BEAN-ADMIN-2026}
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

### 3. Nginx Gateway Ingress (`../homelab/web/nginx.conf`)

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
        }
```

---

## 🧪 CI/CD Pre-Deployment Test Verification

Before any deployment is dispatched to production, the GitHub Actions deployment workflow executes containerized verification:

```bash
# 1. Run all 36 pytest backend unit & security tests
docker run --rm -v "$PWD/web/beanleague/backend:/app" -w /app python:3.12-slim \
  sh -c "pip install -q -r requirements-dev.txt && pytest tests/ -q"

# 2. Verify clean production Vite frontend build
docker run --rm -v "$PWD/web/beanleague/frontend:/src:ro" -w /work node:20-alpine \
  sh -c "cp -r /src/. /work && npm ci --no-audit --no-fund && npm run build"
```
