import aiosqlite
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
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
