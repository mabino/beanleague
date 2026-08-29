import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from typing import List, Optional
from ..database import get_db
from ..models import PlayerResponse
from ..pipeline.photo_scraper import resolve_player_photo

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

    if search and search.strip().lower() not in ("undefined", "null", "none", ""):
        conditions.append("(p.name LIKE ? OR p.short_name LIKE ?)")
        search_param = f"%{search.strip()}%"
        params.extend([search_param, search_param])

    if position and position.strip().upper() not in ("ALL", "UNDEFINED", "NULL", "NONE", ""):
        conditions.append("p.position = ?")
        params.append(position.strip().upper())

    if team and team.strip().lower() not in ("undefined", "null", "none", ""):
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

@router.get("/{player_id}/photo")
async def get_player_photo(player_id: int, db: aiosqlite.Connection = Depends(get_db)):
    """
    Serves a low-bandwidth, cached player profile picture.
    Lazily resolves and optimizes from fair-use open repositories if not yet cached.
    """
    cursor = await db.execute("SELECT name, real_team_name, position, photo_url FROM players WHERE id = ?", (player_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")
    
    player = dict(row)
    file_path = await resolve_player_photo(
        player_id=player_id,
        player_name=player["name"],
        real_team_name=player["real_team_name"] or "",
        position=player["position"] or "FWD",
        existing_url=player["photo_url"],
        db=db
    )
    
    media_type = "image/webp" if str(file_path).endswith(".webp") else "image/svg+xml"
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=2592000"}
    )
