import aiosqlite
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from ..database import get_db
from ..models import LeagueCreate, LeagueResponse, LeagueStandingsResponse, LeaderboardEntry

router = APIRouter(prefix="/api/leagues", tags=["Leagues"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_leagues(db: aiosqlite.Connection = Depends(get_db)):
    """Lists all available fantasy soccer seasons / leagues."""
    cursor = await db.execute(
        """
        SELECT l.id, l.season_code, l.name, l.max_teams, l.salary_cap, l.created_at,
               COUNT(t.id) as team_count
        FROM leagues l
        LEFT JOIN teams t ON l.id = t.league_id
        GROUP BY l.id
        ORDER BY l.created_at ASC
        """
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]

@router.post("", response_model=LeagueResponse, status_code=status.HTTP_201_CREATED)
async def create_league(league_in: LeagueCreate, db: aiosqlite.Connection = Depends(get_db)):
    """Creates a new virtual fantasy soccer league with a Season Code."""
    code = league_in.season_code.strip().upper()
    league_id = f"league-{uuid.uuid4().hex[:8]}"
    
    try:
        await db.execute(
            "INSERT INTO leagues (id, season_code, name, max_teams, salary_cap) VALUES (?, ?, ?, ?, ?)",
            (league_id, code, league_in.name.strip(), league_in.max_teams, league_in.salary_cap)
        )
        await db.commit()
    except aiosqlite.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Season Code '{code}' already exists. Please choose a different code."
        )

    cursor = await db.execute("SELECT * FROM leagues WHERE id = ?", (league_id,))
    row = await cursor.fetchone()
    return dict(row)

@router.get("/{season_code}", response_model=LeagueResponse)
async def get_league_by_code(season_code: str, db: aiosqlite.Connection = Depends(get_db)):
    """Fetches league details by Season Code (e.g. BARCA-2026)."""
    code = season_code.strip().upper()
    cursor = await db.execute("SELECT * FROM leagues WHERE season_code = ?", (code,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"League with Season Code '{code}' not found."
        )
    return dict(row)

@router.get("/{season_code}/standings", response_model=LeagueStandingsResponse)
async def get_league_standings(season_code: str, db: aiosqlite.Connection = Depends(get_db)):
    """Returns dynamic live standings for all teams in the league."""
    code = season_code.strip().upper()
    
    # 1. Fetch league
    l_cur = await db.execute("SELECT id, season_code, name, salary_cap FROM leagues WHERE season_code = ?", (code,))
    league = await l_cur.fetchone()
    if not league:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"League with Season Code '{code}' not found."
        )

    # 2. Fetch teams ordered by points descending
    t_cur = await db.execute(
        """
        SELECT t.id, t.team_name, t.manager_code, t.formation, t.total_points, t.kit_config,
               (SELECT COUNT(*) FROM rosters WHERE team_id = t.id) as player_count
        FROM teams t
        WHERE t.league_id = ?
        ORDER BY t.total_points DESC, t.team_name ASC
        """,
        (league["id"],)
    )
    teams = await t_cur.fetchall()
    
    import json
    standings_list = []
    for rank, t in enumerate(teams, start=1):
        pin = t["manager_code"]
        masked_pin = f"{pin[:2]}*-***" if len(pin) >= 6 else "***"
        kit = None
        if t["kit_config"]:
            try:
                kit = json.loads(t["kit_config"])
            except Exception:
                kit = None

        standings_list.append(LeaderboardEntry(
            rank=rank,
            team_id=t["id"],
            team_name=t["team_name"],
            manager_code_masked=masked_pin,
            formation=t["formation"],
            total_points=t["total_points"],
            gameweek_points=t["total_points"],
            player_count=t["player_count"],
            kit_config=kit
        ))

    return LeagueStandingsResponse(
        league_id=league["id"],
        season_code=league["season_code"],
        league_name=league["name"],
        salary_cap=league["salary_cap"],
        standings=standings_list
    )
