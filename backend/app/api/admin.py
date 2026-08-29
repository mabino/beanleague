import aiosqlite
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional, List
from ..database import get_db
from ..config import settings
from ..pipeline.api_client import ApiFootballClient
from ..pipeline.seeder import run_daily_seeder
from ..pipeline.poller import run_matchday_poller, simulate_live_tick
from ..pipeline.scoring import run_scoring_engine
from ..models import ApiUsageSummary

router = APIRouter(prefix="/api/admin", tags=["Admin & Pipeline"])

@router.get("/usage", response_model=ApiUsageSummary)
async def get_api_usage(db: aiosqlite.Connection = Depends(get_db)):
    """
    Returns today's API-Football request usage against the 100/day limit.
    """
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

@router.post("/seed")
async def trigger_seeder(force_mock: bool = False, db: aiosqlite.Connection = Depends(get_db)):
    """Manually triggers the Daily Seeder."""
    try:
        result = await run_daily_seeder(db, force_mock=force_mock)
        return {"message": "Daily Seeder completed", "result": result}
    except Exception as e:
        import traceback
        logger.exception(f"Daily Seeder failed: {e}")
        return {"error": str(e), "traceback": traceback.format_exc()}

@router.post("/poll")
async def trigger_poller(db: aiosqlite.Connection = Depends(get_db)):
    """Manually triggers the Matchday Poller."""
    result = await run_matchday_poller(db)
    return {"message": "Matchday Poller completed", "result": result}

@router.post("/simulate-tick")
async def trigger_simulated_tick(db: aiosqlite.Connection = Depends(get_db)):
    """
    Simulates a live goal or event, recalculates scores, and broadcasts to frontend via SSE.
    """
    result = await simulate_live_tick(db)
    return {"message": "Simulated match tick executed", "result": result}

@router.post("/recalculate-scores")
async def trigger_recalculate_scores(db: aiosqlite.Connection = Depends(get_db)):
    """Manually triggers the Scoring Engine."""
    result = await run_scoring_engine(db)
    return {"message": "Scoring engine executed", "result": result}

@router.get("/api-status")
async def check_external_api_status():
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

@router.get("/logs")
async def get_recent_api_logs(limit: int = 50, db: aiosqlite.Connection = Depends(get_db)):
    """Returns recent API usage log entries from SQLite."""
    cursor = await db.execute(
        "SELECT id, date, endpoint, status_code, cost, timestamp FROM api_usage_log ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]

@router.post("/reset-usage")
async def reset_local_usage_log(db: aiosqlite.Connection = Depends(get_db)):
    """Resets today's local usage counter in SQLite so new calls can be made."""
    today_str = date.today().isoformat()
    await db.execute("DELETE FROM api_usage_log WHERE date = ?", (today_str,))
    await db.commit()
    return {"message": f"Local API usage counter for {today_str} reset to 0."}

@router.get("/probe-fixtures")
async def probe_fixtures(
    league: Optional[int] = 39,
    season: Optional[int] = 2024,
    date_str: Optional[str] = None
):
    """Directly probes API-Football fixtures to inspect available match data."""
    if not settings.API_FOOTBALL_KEY:
        return {"error": "API_FOOTBALL_KEY not configured"}
    import httpx
    headers = {
        "x-apisports-key": settings.API_FOOTBALL_KEY,
        "x-rapidapi-key": settings.API_FOOTBALL_KEY,
    }
    params = {}
    if date_str:
        params["date"] = date_str
    else:
        if league:
            params["league"] = league
        if season:
            params["season"] = season

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{settings.API_FOOTBALL_BASE_URL.rstrip('/')}/fixtures",
            params=params,
            headers=headers
        )
        data = resp.json()
        items = data.get("response", [])
        return {
            "total_items": len(items),
            "errors": data.get("errors"),
            "sample": items[:3] if items else []
        }
