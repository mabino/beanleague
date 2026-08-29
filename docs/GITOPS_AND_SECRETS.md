# 🔐 GitOps, Secrets & Deployment Guide

This guide details the repository secrets, environment variables, Azure DNS routing, and GitOps submodule integration with `../homelab`.

---

## 🔑 Required Repository Secrets & Variables

When deploying BeanLeague via GitHub Actions, Azure, or Homelab GitOps, configure the following secrets:

### 1. External Data Sources & Runtime Secrets

| Secret / Env Var | Required? | Description | Example Value |
|---|---|---|---|
| `API_FOOTBALL_KEY` | Optional | API Key from API-Football. If omitted, app runs in Mock Mode. | `e8f92a10b4c73...` |
| `API_DAILY_LIMIT` | Optional | Max external API requests allowed per day (Default: `100`). | `100` |
| `DEFAULT_SEASON_CODE` | Optional | Default room code for league bootstrap. | `BARCA-2026` |
| `DEFAULT_SALARY_CAP` | Optional | Starting salary cap in millions of dollars. | `100.0` |

### 2. Azure DNS & Ingress Secrets (for Homelab External Access)

| Secret / Env Var | Required? | Description | Example Value |
|---|---|---|---|
| `AZURE_CREDENTIALS` | For CI/CD | Azure Service Principal JSON for GitHub Actions. | `{"clientId": "...", "clientSecret": "..."}` |
| `AZURE_RESOURCE_GROUP` | Optional | Resource Group containing your Azure DNS Zone. | `rg-homelab-dns` |
| `AZURE_DNS_ZONE` | Optional | Custom domain managed in Azure DNS. | `bino-fantasy.com` |
| `HOMELAB_INGRESS_IP` | Optional | Public IP or Gateway IP for Azure DNS A record. | `198.51.100.42` |

---

## 🔄 Homelab GitOps Integration

BeanLeague is designed to deploy as a git submodule inside your main `../homelab` infrastructure repository.

### Step 1: Register as a Git Submodule

Run the provided setup script from the BeanLeague directory:

```bash
./deploy/homelab-submodule-setup.sh ../homelab
```

Or manually inside `../homelab`:
```bash
cd ../homelab
git submodule add https://github.com/mabino/beanleague.git web/beanleague
git submodule update --init --recursive
```

### Step 2: Add Service to Homelab `docker-compose.yml`

Add the BeanLeague service block to `../homelab/docker-compose.yml`:

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

### Step 3: Route Traffic via Homelab Reverse Proxy

Include the ingress rules from [`deploy/homelab-ingress.conf`](file:///Users/mabino/Downloads/beanleague/deploy/homelab-ingress.conf) into your homelab Nginx or reverse proxy configuration (`../homelab/web/nginx.conf`).

---

## ☁️ Azure DNS & Tunnel Automation

To allow friends to access the web app from their phones without opening local router ports:

1. **Deploy DNS Zone**:
   ```bash
   ./scripts/deploy-azure-dns.zsh <HOMELAB_IP_OR_TUNNEL_ENDPOINT>
   ```

2. **Update DNS Records**:
   ```bash
   ./scripts/update-azure-dns.zsh <NEW_IP> A
   ```

3. **Teardown DNS Resources**:
   ```bash
   ./scripts/teardown-azure-dns.zsh
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
