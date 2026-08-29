import aiosqlite
import logging
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header, status
from typing import Dict, Any, Optional, List
from ..database import get_db
from ..config import settings
from ..pipeline.api_client import ApiFootballClient
from ..pipeline.seeder import run_daily_seeder
from ..pipeline.poller import run_matchday_poller, simulate_live_tick
from ..pipeline.scoring import run_scoring_engine
from ..models import ApiUsageSummary

logger = logging.getLogger("beanleague.admin")

router = APIRouter(tags=["Admin, Pipeline & System Status"])

def verify_admin_pin(x_admin_pin: Optional[str] = Header(None, alias="X-Admin-PIN")):
    """
    Security guard: enforces that admin/simulation endpoints require the valid Admin PIN.
    """
    expected_pin = settings.ADMIN_PIN.strip()
    if not x_admin_pin or x_admin_pin.strip() != expected_pin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Admin Security PIN."
        )
    return True

# ==========================================
# PUBLIC SYSTEM STATUS (No PIN required)
# ==========================================

@router.get("/api/system/status")
async def get_system_status(db: aiosqlite.Connection = Depends(get_db)):
    """
    Returns public, read-only operational telemetry & health metrics:
    - Real-time SSE Stream health
    - Database metrics (player count, teams, fixtures, active matches)
    - Data adapters & background poller status
    - External API usage summary
    """
    today_str = date.today().isoformat()
    client = ApiFootballClient()
    used = await client.get_today_usage(db)
    remaining = max(0, settings.API_DAILY_LIMIT - used)

    # Database counts
    p_cur = await db.execute("SELECT COUNT(*) as c FROM players")
    p_count = (await p_cur.fetchone())["c"]

    t_cur = await db.execute("SELECT COUNT(*) as c FROM teams")
    t_count = (await t_cur.fetchone())["c"]

    f_cur = await db.execute("SELECT COUNT(*) as c FROM fixtures")
    f_count = (await f_cur.fetchone())["c"]

    live_cur = await db.execute("SELECT COUNT(*) as c FROM fixtures WHERE status = 'In-Play'")
    live_count = (await live_cur.fetchone())["c"]

    return {
        "status": "operational",
        "app_version": "2.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "status": "healthy",
            "registered_players": p_count,
            "fantasy_teams": t_count,
            "fixtures_synced": f_count,
            "active_in_play_matches": live_count
        },
        "sse_stream": {
            "status": "active",
            "endpoint": "/api/events/live",
            "reconnect_strategy": "automatic"
        },
        "poller": {
            "scheduler_enabled": settings.ENABLE_SCHEDULER,
            "interval_minutes": settings.POLL_INTERVAL_MINUTES,
            "thesportsdb_adapter": "active (real-time free live scores)",
            "api_football_adapter": "ready" if settings.API_FOOTBALL_KEY else "standby"
        },
        "api_usage": {
            "date": today_str,
            "requests_used": used,
            "daily_limit": settings.API_DAILY_LIMIT,
            "remaining": remaining
        }
    }

# ==========================================
# PROTECTED ADMIN PORTAL (Requires Admin PIN)
# ==========================================

@router.post("/api/admin/verify")
async def verify_admin_access(_: bool = Depends(verify_admin_pin)):
    """Validates the Admin Security PIN."""
    return {"success": True, "message": "Admin authenticated successfully."}

@router.get("/api/admin/usage", response_model=ApiUsageSummary)
async def get_api_usage(
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """Returns today's API-Football request usage."""
    today_str = date.today().isoformat()
    client = ApiFootballClient()
    used = await client.get_today_usage(db)
    remaining = max(0, settings.API_DAILY_LIMIT - used)
    
    return ApiUsageSummary(
        today_date=today_str,
        requests_used_today=used,
        daily_limit=settings.API_DAILY_LIMIT,
        remaining_requests=remaining,
        can_request_external=(remaining > 0 and bool(settings.API_FOOTBALL_KEY))
    )

@router.post("/api/admin/simulate-tick")
async def trigger_simulated_tick(
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """
    Simulates a live goal or event, recalculates scores, and broadcasts to frontend via SSE.
    """
    result = await simulate_live_tick(db)
    return {"message": "Simulated match tick executed", "result": result}

@router.post("/api/admin/seed")
async def trigger_seeder(
    force_mock: bool = False,
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """Manually triggers the Daily Seeder."""
    try:
        result = await run_daily_seeder(db, force_mock=force_mock)
        return {"message": "Daily Seeder completed", "result": result}
    except Exception as e:
        import traceback
        logger.exception(f"Daily Seeder failed: {e}")
        return {"error": str(e), "traceback": traceback.format_exc()}

@router.post("/api/admin/poll")
async def trigger_poller(
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """Manually triggers the Matchday Poller."""
    result = await run_matchday_poller(db)
    return {"message": "Matchday Poller completed", "result": result}

@router.post("/api/admin/recalculate-scores")
async def trigger_recalculate_scores(
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """Manually triggers the Scoring Engine."""
    result = await run_scoring_engine(db)
    return {"message": "Scoring engine executed", "result": result}

@router.get("/api/admin/api-status")
async def check_external_api_status(_: bool = Depends(verify_admin_pin)):
    """Queries API-Sports /status to inspect real account status and API-side quota usage."""
    if not settings.API_FOOTBALL_KEY:
        return {"error": "API_FOOTBALL_KEY not configured"}
    import httpx
    headers = {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-apisports-key": settings.API_FOOTBALL_KEY,
        "x-rapidapi-key": settings.API_FOOTBALL_KEY,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{settings.API_FOOTBALL_BASE_URL.rstrip('/')}/status", headers=headers)
        return resp.json()

@router.get("/api/admin/logs")
async def get_recent_api_logs(
    limit: int = 50,
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """Returns recent API usage log entries from SQLite."""
    cursor = await db.execute(
        "SELECT id, date, endpoint, status_code, cost, timestamp FROM api_usage_log ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]

@router.post("/api/admin/reset-usage")
async def reset_local_usage_log(
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """Resets today's local usage counter in SQLite so new calls can be made."""
    today_str = date.today().isoformat()
    await db.execute("DELETE FROM api_usage_log WHERE date = ?", (today_str,))
    await db.commit()
    return {"message": f"Local API usage counter for {today_str} reset to 0."}
