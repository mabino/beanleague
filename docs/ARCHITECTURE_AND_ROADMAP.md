# 🗺️ BeanLeague Architecture & Roadmap

This document outlines the software architecture, data modeling, security design, and future development roadmap for BeanLeague.

---

## 🏛️ System Architecture

BeanLeague is designed as a self-contained, high-performance fantasy sports platform optimized for home servers and cloud edge deployments.

```
+-------------------------------------------------------------------------+
|                        Client Layer (Browser / Mobile)                 |
|  - React 18 SPA (Vite)                                                  |
|  - HTML5 Canvas & Vector SVG Jersey Kit Engine                         |
|  - SSE Event Consumer with Reconnection Logic                           |
|  - localStorage Manager PIN & Session State                             |
+------------------------------------+------------------------------------+
                                     │ HTTP / SSE
                                     ▼
+-------------------------------------------------------------------------+
|                        Ingress & Gateway Layer                         |
|  - Nginx Reverse Proxy (SSL Termination @ binolabs.com/beanleague)      |
|  - Static Asset Caching (dist/ bundle)                                 |
|  - Subpath Routing & Header Rewriting (/beanleague/api -> :8000/api)    |
+------------------------------------+------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                        Application Layer (FastAPI)                     |
|  - REST Endpoints (/api/leagues, /api/teams, /api/players, /api/admin)  |
|  - Auth Middleware (HMAC Timing-Safe Admin PIN, IP Rate Limiter)        |
|  - Rules & Validation Engine (Squad Formations, Dynamic Salary Caps)    |
|  - Live SSE Hub (Broadcaster with Async Queue)                          |
+-------------------+--------------------------------+--------------------+
                    │                                │
                    ▼                                ▼
+-----------------------------------+  +----------------------------------+
|      Pipeline & Background Workers |  |      Data & Persistence Layer    |
|  - APScheduler Background Jobs    |  |  - SQLite (WAL Mode)             |
|  - Daily Fixture Seeder (03:00)   |  |  - Persistent Named Docker Volume|
|  - Matchday Poller (15 min active)|  |  - API Quota Audit Table         |
|  - Scoring Engine Aggregator      |  |  - Full JSON Export Engine       |
+-----------------------------------+  +----------------------------------+
```

---

## 💾 Database Schema & Data Models

### 1. `leagues` (Fantasy Seasons)
- `id`: `TEXT PRIMARY KEY` (e.g. `league-a1b2c3d4`)
- `season_code`: `TEXT UNIQUE` (e.g. `BARCA-2026`, `CHAMPIONS-26`)
- `name`: `TEXT` (League display title)
- `max_teams`: `INTEGER` (Default 16)
- `salary_cap`: `REAL` (Default 100.0, customizable $50.0M–$300.0M)
- `created_at`: `TIMESTAMP`

### 2. `teams` (Manager Clubs)
- `id`: `TEXT PRIMARY KEY`
- `league_id`: `TEXT REFERENCES leagues(id)`
- `manager_code`: `TEXT UNIQUE` (6-digit PIN: `849-201`)
- `team_name`: `TEXT`
- `formation`: `TEXT` (`4-3-3`, `3-5-2`, etc.)
- `total_points`: `INTEGER`
- `kit_config`: `TEXT JSON` (Jersey pattern, primary/secondary colors, crest badge)
- `created_at`: `TIMESTAMP`

### 3. `rosters` (Team Player Slots & Media)
- `id`: `INTEGER PRIMARY KEY AUTOINCREMENT`
- `team_id`: `TEXT REFERENCES teams(id)`
- `player_id`: `INTEGER REFERENCES players(id)`
- `is_starting_xi`: `BOOLEAN`
- `is_captain`: `BOOLEAN`
- `slot_position`: `TEXT` (`GK`, `DEF`, `MID`, `FWD`)
- `slot_index`: `INTEGER`
- `youtube_links`: `TEXT JSON` (Array of up to 3 validated YouTube highlights)
- `custom_notes`: `TEXT` (Sanitized player profile notes)

### 4. `players` & `player_match_stats`
- Real-world player catalog with prices, real club affiliations, positions, and live match stats (goals, assists, clean sheets, saves, minutes played).

---

## 🎯 Future Development Goals & Roadmap

```
ROADMAP MILESTONES
├── 🏁 Phase 1: Core Foundation & UI (Completed)
│      ✓ Login-less 6-digit Manager PIN authentication
│      ✓ 2D visual tactical pitch with drag & drop drafting
│      ✓ API-Football caching economics (< 100 reqs/day hard guarantee)
│      ✓ Asynchronous fantasy scoring engine & Live SSE match pulse
│
├── 🎨 Phase 2: Personalization & Media (Completed)
│      ✓ Custom Jersey Kit Maker with 9 vector patterns & crest badges
│      ✓ Embedded YouTube player highlight reels & sanitized scouting notes
│      ✓ Responsive mobile & tablet layouts with collapsible bench
│      ✓ Arbitrary custom season creation & dynamic salary caps
│      ✓ PIN-protected Admin Sandbox & JSON data backup/clearance
│
├── 🚀 Phase 3: Advanced Gameplay Mechanics (Next)
│      • Gameweek Auto-Substitutions: Automatic bench promotion when starter plays 0m
│      • Vice-Captaincy: Automated fallback captaincy if primary captain is benched
│      • Head-to-Head (H2H) Mode: Weekly 1-on-1 matchups alongside global league table
│      • Chips / Power-ups: "Triple Captain", "Bench Boost", "Free Hit" gameweek cards
│
└── 🌐 Phase 4: Integrations & Multi-Tournament (Future)
       • Homelab Ntfy / Webhook Alerts: Instant notifications on match kickoff & goals
       • Dynamic Transfer Market: Form-based player price fluctuations (+/- $0.1M–$0.5M)
       • Multi-League Catalogs: Simultaneous Premier League, Champions League, & World Cup
       • PWA Offline Support: Progressive Web App installation with offline pitch caching
```

---

## 🛠️ Design Principles

1. **Zero Login Friction**: Kids and casual players should start drafting in under 10 seconds without passwords or email verification.
2. **Deterministic Economics**: Zero unpredictable API bills. All external sports data is cached in SQLite with strict daily budget enforcement.
3. **Fail-Closed Defensive Security**: Timing-safe comparisons for administrative tasks, brute-force rate limits on PINs, and automated CI/CD gating.
4. **Delightful Real-Time Interaction**: Immediate tactical feedback, live matchday pulsing, custom team branding, and celebration animations.
