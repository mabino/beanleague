import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from ..database import get_db
from ..models import PlayerResponse

router = APIRouter(prefix="/api/players", tags=["Players"])

@router.get("", response_model=List[PlayerResponse])
async def list_players(
    search: Optional[str] = Query(None, description="Search player name"),
    position: Optional[str] = Query(None, description="Filter by position: GK, DEF, MID, FWD"),
    team: Optional[str] = Query(None, description="Filter by real team name"),
    sort_by: Optional[str] = Query("price_desc", description="price_desc, price_asc, points_desc, name_asc"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Fetches the player directory from the local SQLite database.
    Never hits external APIs directly during user queries.
    """
    conditions = []
    params = []

    if search:
        conditions.append("(p.name LIKE ? OR p.short_name LIKE ?)")
        search_param = f"%{search.strip()}%"
        params.extend([search_param, search_param])

    if position:
        conditions.append("p.position = ?")
        params.append(position.strip().upper())

    if team:
        conditions.append("p.real_team_name LIKE ?")
        params.append(f"%{team.strip()}%")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    order_clause = "ORDER BY p.current_price DESC"
    if sort_by == "price_asc":
        order_clause = "ORDER BY p.current_price ASC"
    elif sort_by == "points_desc":
        order_clause = "ORDER BY fantasy_points DESC, p.current_price DESC"
    elif sort_by == "name_asc":
        order_clause = "ORDER BY p.name ASC"

    query = f"""
    SELECT p.id, p.name, p.short_name, p.real_team_id, p.real_team_name, p.position,
           p.current_price, p.photo_url, p.status,
           COALESCE(SUM(pms.fantasy_points_calculated), 0) as fantasy_points,
           COALESCE(SUM(pms.goals), 0) as goals,
           COALESCE(SUM(pms.assists), 0) as assists,
           COALESCE(SUM(pms.clean_sheet), 0) as clean_sheets,
           COALESCE(SUM(pms.yellow_cards), 0) as yellow_cards,
           COALESCE(SUM(pms.red_cards), 0) as red_cards,
           COALESCE(SUM(pms.minutes_played), 0) as minutes_played
    FROM players p
    LEFT JOIN player_match_stats pms ON p.id = pms.player_id
    {where_clause}
    GROUP BY p.id
    {order_clause}
    LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]

@router.get("/{player_id}", response_model=PlayerResponse)
async def get_player_details(player_id: int, db: aiosqlite.Connection = Depends(get_db)):
    """Fetches full player stats and history from local database."""
    query = """
    SELECT p.id, p.name, p.short_name, p.real_team_id, p.real_team_name, p.position,
           p.current_price, p.photo_url, p.status,
           COALESCE(SUM(pms.fantasy_points_calculated), 0) as fantasy_points,
           COALESCE(SUM(pms.goals), 0) as goals,
           COALESCE(SUM(pms.assists), 0) as assists,
           COALESCE(SUM(pms.clean_sheet), 0) as clean_sheets,
           COALESCE(SUM(pms.yellow_cards), 0) as yellow_cards,
           COALESCE(SUM(pms.red_cards), 0) as red_cards,
           COALESCE(SUM(pms.minutes_played), 0) as minutes_played
    FROM players p
    LEFT JOIN player_match_stats pms ON p.id = pms.player_id
    WHERE p.id = ?
    GROUP BY p.id
    """
    cursor = await db.execute(query, (player_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")
    return dict(row)
