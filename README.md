# ⚽ BeanLeague

A high-performance, login-less fantasy soccer web application designed for a 12-year-old and their friends. BeanLeague eliminates friction with 6-digit Manager PINs, features a visual tactical Pitch View with drag-and-drop squad builder, operates within API-Football's 100 requests/day free tier limit via local SQLite caching, runs an asynchronous scoring engine, and provides live Server-Sent Events (SSE) match day pulsing.

---

## 🌟 Key Features

- 🎟️ **Login-Less PIN Authentication**: No emails, passwords, or OAuth. Kids join with a **Season Code** (e.g. `BARCA-2026`) and get assigned a memorable 6-digit **Manager PIN** (e.g. `849-201`) stored in `localStorage` or saved in their phone's Notes app.
- 🏟️ **Tactical 2D Pitch View**: Interactive visual soccer pitch featuring tactical lawn stripes, dynamic formations (`4-3-3`, `3-5-2`, `4-4-2`, `3-4-3`, `5-3-2`, `4-2-3-1`), Captain selection ($2\times$ points multiplier), and a 4-man bench.
- 💰 **$100M Salary Cap Engine**: Real-time budget meter preventing squads from exceeding the $100.0M cap.
- 🛡️ **Zero External API Leakage**: The frontend **never** calls API-Football. All reads hit the local SQLite cache.
- ⏱️ **Daily Seeder & Matchday Poller**:
  - *Daily Seeder* (03:00 AM): Fetches fixtures and squad lists (cost: ~2-5 API requests).
  - *Matchday Poller* (every 15 min during active matches): Fetches events and statistics only when matches are `In-Play`.
  - Built-in audit log and hard cap enforcer strictly guaranteeing $< 100$ reqs/day.
- ⚡ **Asynchronous Scoring Engine**: Converts real match stats into unified fantasy points (Goals by position, assists, clean sheets, saves, cards) and dynamically aggregates team standings.
- 📡 **Live Match Pulse & SSE**: Server-Sent Events stream live match events with animated green pulses, goal celebration fanfare, and confetti.
- 🔭 **Scout Mode**: Kids can click on any friend's team in the leaderboard to inspect their starting lineup on a visual pitch.
- 🎮 **Live Matchday Simulator**: Integrated simulation controls for dev/parent testing of live goals, assists, and scoring engine recalculations without waiting for weekend fixtures.
- 🚀 **Homelab & Azure GitOps Ready**: Containerized with Docker Compose, complete with macOS zsh scripts for Azure DNS ingress management and GitOps submodule integration with `../homelab`.

---

## 📐 Architecture

```
External APIs (API-Football v3)
       │
       ▼ (Max 100 req/day guarded by api_usage_log)
Cron Jobs / Pipelines (Daily Seeder @ 03:00 AM, Matchday Poller @ 15 min)
       │
       ▼
SQLite Database (WAL mode, persistent volume)
       ▲
       │
FastAPI Backend (REST API + Scoring Engine + SSE Broadcasting)
       ▲
       │
Nginx Reverse Proxy / Homelab Ingress (SSL Termination)
       ▲
       │
React 18 / Vite Frontend (Pitch View, Transfer Market, Live Standings)
```

---

## 🏆 Scoring Rules

| Event | Points |
|---|---|
| **Goal (Defender / Goalkeeper)** | **+6 pts** |
| **Goal (Midfielder)** | **+5 pts** |
| **Goal (Forward)** | **+4 pts** |
| **Assist (Any position)** | **+3 pts** |
| **Clean Sheet (GK / DEF, 60+ mins)** | **+4 pts** |
| **Clean Sheet (MID, 60+ mins)** | **+1 pt** |
| **Playing 1 to 59 mins** | **+1 pt** |
| **Playing 60+ mins** | **+2 pts** |
| **Goalkeeper Saves (every 3 saves)** | **+1 pt** |
| **Penalty Saved (Goalkeeper)** | **+5 pts** |
| **Yellow Card** | **-1 pt** |
| **Red Card** | **-3 pts** |
| **Own Goal** | **-2 pts** |
| **Captain Designation** | **2x Points Multiplier** |

---

## 🚀 Quick Start (Local Development)

### 1. Backend

```bash
# Setup Python virtual environment
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

# Run FastAPI backend
uvicorn backend.app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Deployment

Run the entire stack (Frontend, Backend, Persistent SQLite Storage) in Docker:

```bash
docker compose up -d --build
```

Access the web app at `http://localhost:3000`.

---

## 🧪 Running Tests

### Local Test Suite
```bash
./scripts/run-tests.sh local
```

### Containerized Test Suite (CI / Linux Container)
```bash
./scripts/run-tests.sh docker
```

---

## ☁️ Azure DNS & Homelab Ingress

BeanLeague includes native macOS zsh scripts for managing Azure DNS routing to your homelab tunnel:

```bash
# Deploy Azure DNS Zone & Record
./scripts/deploy-azure-dns.zsh <YOUR_HOMELAB_INGRESS_IP_OR_TUNNEL>

# Update DNS record
./scripts/update-azure-dns.zsh <NEW_IP> A

# Teardown Azure DNS
./scripts/teardown-azure-dns.zsh
```

### Homelab GitOps Submodule Setup

To add BeanLeague to your `../homelab` GitOps repo:

```bash
./deploy/homelab-submodule-setup.sh ../homelab
```
