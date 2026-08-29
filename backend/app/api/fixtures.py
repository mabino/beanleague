import aiosqlite
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from ..database import get_db
from ..models import FixtureResponse

router = APIRouter(prefix="/api/fixtures", tags=["Fixtures"])

@router.get("", response_model=List[FixtureResponse])
async def list_fixtures(
    status: Optional[str] = Query(None, description="Filter by status: Scheduled, In-Play, Finished"),
    league_id: Optional[int] = Query(None, description="Filter by league ID"),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Returns real-world fixtures and live match scores from local database.
    """
    conditions = []
    params = []

    if status:
        conditions.append("status = ?")
        params.append(status)

    if league_id:
        conditions.append("league_id = ?")
        params.append(league_id)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
    SELECT id, league_id, round, home_team_id, home_team_name, home_team_logo,
           away_team_id, away_team_name, away_team_logo, kickoff_time, status,
           home_score, away_score
    FROM fixtures
    {where_clause}
    ORDER BY 
        CASE 
            WHEN status = 'In-Play' THEN 1
            WHEN DATE(kickoff_time) = DATE('now') THEN 2
            WHEN status = 'Scheduled' THEN 3
            ELSE 4 
        END ASC,
        kickoff_time DESC
    """
    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]
