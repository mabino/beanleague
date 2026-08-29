# ⚽ BeanLeague

A high-performance, login-less fantasy soccer web application designed for friends and family, hosted on homelab infrastructure at **`binolabs.com/beanleague`**. BeanLeague eliminates login friction with 6-digit Manager PINs, features a tactical visual Pitch View with custom kit design and player highlight reels, operates strictly within API-Football's 100 requests/day free tier via local SQLite caching, runs an asynchronous scoring engine, and provides live Server-Sent Events (SSE) matchday pulsing.

---

## 📚 Documentation Index

- 🛠️ [**Setup & Installation Guide**](docs/SETUP.md): Local development, Docker Compose deployment, reverse proxy routing, and persistent storage.
- 📡 [**Data Pipeline & API-Football Guide**](docs/API_AND_DATA_SOURCES.md): Caching economics, rate limit guarantees, multi-provider adapters, and simulation sandbox.
- 🔐 [**Security & GitOps Guide**](docs/GITOPS_AND_SECRETS.md): Security architecture, rate limiting, HMAC timing safety, CI/CD regression testing, and secret management.
- 🗺️ [**Architecture & Roadmap**](docs/ARCHITECTURE_AND_ROADMAP.md): System components, data models, and future development milestones.
- 📄 [**Environment Template**](.env.example): Complete reference of all configurable environment variables.

---

## 🌟 Key Features

### 1. 🎟️ Frictionless Manager PIN Authentication
- No email registrations, passwords, or OAuth flows.
- Managers join with a **Season Code** (e.g. `BARCA-2026` or custom) and receive a memorable 6-digit **Manager PIN** (e.g. `849-201`) saved in `localStorage`.
- Protected by sliding-window IP rate limiting to prevent brute-force PIN harvesting.

### 2. 🏟️ Tactical Pitch View & Formation Engine
- Visual soccer pitch featuring lawn stripes, responsive position cards, and dynamic tactical formations (`4-3-3`, `3-5-2`, `4-4-2`, `3-4-3`, `5-3-2`, `4-2-3-1`, `5-4-1`).
- One-tap **Captain Designation** granting a $2\times$ match points multiplier.
- **Collapsible Substitutes Bench** (4 bench slots) designed to maximize screen real estate on mobile phones and tablets.

### 3. 🎨 Custom Jersey Kit Maker & Crest Customizer
- In-app jersey design studio with 9 vector patterns (solid, vertical stripes, hoops, sash, split, checker, sleeves, quarters, gradient).
- Real-time custom primary and secondary color palettes + 9 crest badge emblems (Shield, Crown, Lightning, Flame, Dragon, Star, Lion, Skull, Falcon).
- Renders consistently across Starting XI pitch cards, live standings, match tickers, and public scout views.

### 4. 📺 Player Media Profiles & Highlight Reels
- Managers can embed up to 3 validated YouTube highlight videos per rostered player.
- Custom scouting notes with automated HTML sanitization and script escaping.
- Embedded media is preserved across roster changes and automatically cleared only when a player is dropped from the squad.

### 5. 🏆 Multi-Season & Custom Season Builder
- Managers can browse active seasons or create their own custom leagues.
- Supports arbitrary validated league names (2–60 chars), custom shareable season codes (2–20 chars), and configurable salary caps ($50M to $300M).
- Generates the league and registers the manager's founding team in a single step.

### 6. 💰 Dynamic Salary Cap & Squad Validation
- Real-time budget tracker enforcing the league salary cap (default $100.0M or custom).
- Validates squad composition: exactly 11 Starters, up to 4 Bench, valid positional breakdown by formation, and exactly 1 Captain.

### 7. ⏱️ 100 Reqs/Day API-Football Caching Economics
- The frontend **never** calls external APIs directly. All reads hit the local SQLite cache in WAL mode.
- **Daily Seeder** (03:00 AM): Fetches upcoming fixtures and squad rosters (~2–5 API calls/day).
- **Matchday Poller** (every 15 min): Queries match events only when fixtures are actively `In-Play`.
- Hard quota enforcer halts external calls before approaching the 100 reqs/day limit.

### 8. ⚡ Asynchronous Scoring Engine & Live SSE Pulsing
- Calculates unified fantasy points from real-world stats (goals by position, assists, clean sheets, saves, cards).
- Server-Sent Events (`/api/live/stream`) broadcast match events with green pulse indicators, audio celebrations (muted by default), and confetti.

### 9. 🔭 Scout Mode
- Public team viewer allowing managers to scout opponents' Starting XI, custom jersey kits, tactical shapes, and player highlight reels directly from the leaderboard.

### 10. 🔒 PIN-Protected Admin & Data Management Portal
- Protected by `X-Admin-PIN` using constant-time `hmac.compare_digest` verification.
- Matchday event simulator for off-season and weekend testing.
- Complete JSON data export (`GET /api/admin/export`) and selective/bulk squad clearance controls.

---

## 📐 System Architecture

```
                       ┌────────────────────────┐
                       │  External Sports APIs  │
                       │  (API-Football / Mock) │
                       └───────────┬────────────┘
                                   │ Max 100 reqs/day
                                   ▼
                       ┌────────────────────────┐
                       │  Daily Seeder & Poller │
                       │  (APScheduler Tasks)   │
                       └───────────┬────────────┘
                                   │
                                   ▼
                       ┌────────────────────────┐
                       │ SQLite (WAL Mode)      │
                       │ Persistent Volume      │
                       └───────────┬────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌──────────────────┐                               ┌──────────────────┐
│ FastAPI Backend  │                               │ Live SSE Stream  │
│ REST API Engine  │                               │ Event Broadcaster│
└────────┬─────────┘                               └────────┬─────────┘
         │                                                   │
         └─────────────────────────┬─────────────────────────┘
                                   │ Reverse Proxy
                                   ▼
                       ┌────────────────────────┐
                       │ Nginx Gateway / SSL    │
                       │ binolabs.com/beanleague│
                       └───────────┬────────────┘
                                   │
                                   ▼
                       ┌────────────────────────┐
                       │ React 18 / Vite SPA    │
                       │ Tactical Pitch & Kits  │
                       └────────────────────────┘
```

---

## 🏆 Scoring System

| Match Event | Goalkeeper (GK) | Defender (DEF) | Midfielder (MID) | Forward (FWD) |
| :--- | :---: | :---: | :---: | :---: |
| **Goal Scored** | +6 pts | +6 pts | +5 pts | +4 pts |
| **Assist** | +3 pts | +3 pts | +3 pts | +3 pts |
| **Clean Sheet (60+ mins)** | +4 pts | +4 pts | +1 pt | 0 pts |
| **Playing 60+ minutes** | +2 pts | +2 pts | +2 pts | +2 pts |
| **Playing 1–59 minutes** | +1 pt | +1 pt | +1 pt | +1 pt |
| **Saves (every 3 saves)** | +1 pt | — | — | — |
| **Penalty Saved** | +5 pts | — | — | — |
| **Yellow Card** | -1 pt | -1 pt | -1 pt | -1 pt |
| **Red Card** | -3 pts | -3 pts | -3 pts | -3 pts |
| **Own Goal** | -2 pts | -2 pts | -2 pts | -2 pts |
| **Captain Multiplier** | **2x Points** | **2x Points** | **2x Points** | **2x Points** |

---

## 🧪 Containerized Testing & CI/CD

BeanLeague includes an automated test suite executed in isolated Docker containers:

```bash
# Run 36 Backend Unit, Integration & Security Tests
docker run --rm -v "$PWD/backend:/app" -w /app python:3.12-slim \
  sh -c "pip install -q -r requirements-dev.txt && pytest tests/ -q"

# Run Frontend Production Build & Asset Validation
docker run --rm -v "$PWD/frontend:/src:ro" -w /work node:20-alpine \
  sh -c "cp -r /src/. /work && npm ci --no-audit --no-fund && npm run build"
```

All Pull Requests and commits to `main` are automatically verified via GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) and pre-deployment verification in the parent Homelab stack.

---

## 🚀 Quick Start (Local Development)

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

# Start FastAPI server on port 8000
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive OpenAPI documentation will be available at `http://localhost:8000/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```
The client will be accessible at `http://localhost:5173/beanleague/`.
