# 📡 Data Sources, API-Football & Rate Limiting

This document details how BeanLeague interacts with external sports data providers, enforces the strict **100 requests/day API limit**, manages local database caching, and supports offline simulation mode.

---

## ⚽ Data Source: API-Football (v3)

BeanLeague integrates with [API-Football (api-sports.io)](https://www.api-football.com/), a leading real-time soccer data provider.

### Getting an API Key

1. Sign up at [https://dashboard.api-football.com/register](https://dashboard.api-football.com/register).
2. Navigate to **Account** $\rightarrow$ **API Key**.
3. Copy your API key and set it in your `.env` or repository secrets:
   ```env
   API_FOOTBALL_KEY=your_api_key_here
   ```

---

## 📉 The 100 Requests/Day Free Tier Budget

API-Football's free tier provides **100 requests per calendar day**. A single web app load requesting live scores directly would burn through this quota immediately. 

### The Intermediary Cache Architecture

BeanLeague strictly decouples frontend users from external API providers:

```
[ Browser / Phone / iPad ]
           │
           ▼ (Hits internal SQLite DB only - 0 external cost)
  [ FastAPI / SQLite Cache ]
           ▲
           │ (Runs decoupled background jobs only)
[ Daily Seeder & Matchday Poller ]
           │
           ▼ (Audited by api_usage_log)
    [ API-Football v3 ]
```

### Daily Request Math

| Job | Frequency | Endpoints Called | Daily Request Cost |
|---|---|---|---|
| **Daily Seeder** | Once daily at 03:00 AM | `/fixtures?date={today}&league={id}` | **2 to 5 requests** |
| **Matchday Poller** | Every 15 min during `In-Play` matches | `/fixtures/events`, `/fixtures/statistics` | **~24 to 32 requests** (4 matches $\times$ 8 polls over 2 hours) |
| **User Web Actions** | Continuous | None (reads local SQLite DB) | **0 requests** |
| **Total Daily Usage** | | | **~35 / 100 requests (~35% of quota)** |

---

## 🛡️ Built-in Hard Rate Limiting

BeanLeague includes an active auditor in [`api_client.py`](file:///Users/mabino/Downloads/beanleague/backend/app/pipeline/api_client.py) that logs every external call in the `api_usage_log` table:

- Before making any outgoing HTTP request, the client queries `SELECT SUM(cost) FROM api_usage_log WHERE date = CURRENT_DATE`.
- If the count reaches `API_DAILY_LIMIT` (default: `100`), outgoing calls are **automatically blocked** with a warning log to guarantee zero overages or API suspension.
- The admin endpoint `GET /api/admin/usage` returns the current count and remaining budget:
  ```json
  {
    "today_date": "2026-08-28",
    "requests_used_today": 4,
    "daily_limit": 100,
    "remaining_requests": 96,
    "can_request_external": true
  }
  ```

---

## 🌍 Supported Leagues & Competition IDs

Configure `TARGET_LEAGUE_IDS` in `.env` to sync fixtures and squads for your favorite competitions:

| League Name | League ID | Country / Confederation |
|---|---|---|
| **La Liga** | `140` | Spain |
| **Premier League** | `39` | England |
| **UEFA Champions League** | `2` | Europe |
| **Serie A** | `135` | Italy |
| **Bundesliga** | `78` | Germany |
| **Ligue 1** | `61` | France |
| **Major League Soccer (MLS)** | `253` | USA |

Example configuration for La Liga & Premier League:
```env
TARGET_LEAGUE_IDS=[140, 39]
TARGET_SEASON=2026
```

---

## 🎮 Curated Mock & Simulation Mode

If `API_FOOTBALL_KEY` is not provided (or when developing offline), BeanLeague automatically operates in **Curated Mock Mode**:

1. **Curated Star Player Pool**: Pre-seeded with top world stars (Lamine Yamal, Erling Haaland, Jude Bellingham, Kylian Mbappé, Mohamed Salah, Cole Palmer, Bukayo Saka, etc.) with realistic prices and positions.
2. **Matchday Simulator**: Allows triggering real-time goals, assists, saves, and cards via:
   - Web UI toolbar button: **"Simulate Goal / Event"**
   - API endpoint: `POST /api/admin/simulate-tick`
   - Shell script: `./scripts/simulate-matchday.sh`
3. **End-to-End Simulation**: Each simulation tick:
   - Records match events in `match_events`
   - Updates `player_match_stats`
   - Executes the Scoring Engine to compute team totals
   - Streams live goal notifications via Server-Sent Events (SSE) to connected browsers.
