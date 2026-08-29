import asyncio
import json
import logging
import aiosqlite
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from ..database import get_db
from ..pipeline.scoring import subscribe_sse, unsubscribe_sse

logger = logging.getLogger("beanleague.live")
router = APIRouter(prefix="/api/events", tags=["Live Events"])

@router.get("/live")
async def live_event_stream(request: Request):
    """
    Server-Sent Events (SSE) endpoint:
    Streams live match events (goals, cards, assists) and leaderboard updates directly to clients.
    """
    async def event_generator():
        queue = asyncio.Queue()
        subscribe_sse(queue)
        try:
            # Send initial connected message
            yield f"event: ping\ndata: {json.dumps({'status': 'connected'})}\n\n"
            
            while True:
                # Check client disconnection
                if await request.is_disconnected():
                    break
                try:
                    # Wait for next event or send keepalive ping every 15s
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: message\ndata: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    yield f"event: ping\ndata: {json.dumps({'status': 'heartbeat'})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            unsubscribe_sse(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/recent")
async def get_recent_events(limit: int = 20, db: aiosqlite.Connection = Depends(get_db)):
    """Fetches recent match events."""
    query = """
    SELECT me.id, me.fixture_id, me.player_id, me.event_type, me.minute, me.detail, me.created_at,
           p.name as player_name, p.position, p.real_team_name,
           f.home_team_name, f.away_team_name
    FROM match_events me
    JOIN players p ON me.player_id = p.id
    JOIN fixtures f ON me.fixture_id = f.id
    ORDER BY me.id DESC
    LIMIT ?
    """
    cursor = await db.execute(query, (limit,))
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]
