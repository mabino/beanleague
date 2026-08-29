import aiosqlite
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
from ..database import get_db
from ..auth import generate_manager_code, normalize_pin, get_current_team
from ..models import (
    TeamCreate, TeamJoinResponse, TeamLoginRequest, TeamRosterSaveRequest,
    TeamRosterResponse, TeamRecoveryRequest, TeamRecoveryResponse,
    TeamKitUpdateRequest, PlayerMediaSaveRequest, ScoutedTeamResponse
)
from ..rules import validate_roster, calculate_fantasy_points
from ..pipeline.scoring import run_scoring_engine

router = APIRouter(prefix="/api/teams", tags=["Teams"])

DEFAULT_KIT = {
    "primary_color": "#10B981",
    "secondary_color": "#0F172A",
    "pattern": "solid",
    "badge_icon": "shield"
}

@router.post("", response_model=TeamJoinResponse, status_code=status.HTTP_201_CREATED)
async def create_team(team_in: TeamCreate, db: aiosqlite.Connection = Depends(get_db)):
    """
    Creates a new fantasy team inside a league.
    Generates a memorable 6-digit Manager PIN (e.g. 849-201).
    """
    season_code = team_in.season_code.strip().upper()
    
    # 1. Lookup league
    l_cur = await db.execute("SELECT id, name, max_teams FROM leagues WHERE season_code = ?", (season_code,))
    league = await l_cur.fetchone()
    if not league:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"League with Season Code '{season_code}' does not exist."
        )

    # 2. Check team cap
    t_count_cur = await db.execute("SELECT COUNT(*) FROM teams WHERE league_id = ?", (league["id"],))
    count = (await t_count_cur.fetchone())[0]
    if count >= league["max_teams"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"League '{season_code}' is full (Max {league['max_teams']} teams)."
        )

    # 3. Generate unique Manager PIN
    manager_code = None
    for _ in range(10):
        candidate_code = generate_manager_code()
        check_cur = await db.execute("SELECT id FROM teams WHERE manager_code = ?", (candidate_code,))
        if not await check_cur.fetchone():
            manager_code = candidate_code
            break
            
    if not manager_code:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate unique manager code. Please try again."
        )

    team_id = f"team-{uuid.uuid4().hex[:8]}"
    kit_json = json.dumps(team_in.kit_config or DEFAULT_KIT)
    
    clean_secret = team_in.secret_word.strip().lower() if team_in.secret_word else None

    # 4. Insert Team
    await db.execute(
        """
        INSERT INTO teams (
            id, league_id, manager_code, team_name, formation, total_points, kit_config,
            recovery_player_1_id, recovery_player_2_id, recovery_player_3_id, recovery_word
        )
        VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
        """,
        (
            team_id,
            league["id"],
            manager_code,
            team_in.team_name.strip(),
            team_in.formation,
            kit_json,
            team_in.recovery_player_1_id,
            team_in.recovery_player_2_id,
            team_in.recovery_player_3_id,
            clean_secret
        )
    )
    await db.commit()

    return TeamJoinResponse(
        id=team_id,
        league_id=league["id"],
        season_code=season_code,
        league_name=league["name"],
        team_name=team_in.team_name.strip(),
        manager_code=manager_code,
        formation=team_in.formation,
        total_points=0,
        kit_config=team_in.kit_config or DEFAULT_KIT
    )

@router.post("/recover", response_model=TeamRecoveryResponse)
async def recover_team_code(req: TeamRecoveryRequest, db: aiosqlite.Connection = Depends(get_db)):
    """
    Recovers a lost Manager Code using the 3 Security Players (in exact order) and the Secret Word.
    """
    season_code = req.season_code.strip().upper()
    clean_word = req.secret_word.strip().lower()

    cursor = await db.execute(
        """
        SELECT t.id, t.manager_code, t.team_name, l.name as league_name, l.season_code
        FROM teams t
        JOIN leagues l ON t.league_id = l.id
        WHERE l.season_code = ?
          AND t.recovery_player_1_id = ?
          AND t.recovery_player_2_id = ?
          AND t.recovery_player_3_id = ?
          AND LOWER(TRIM(t.recovery_word)) = ?
        """,
        (
            season_code,
            req.player_1_id,
            req.player_2_id,
            req.player_3_id,
            clean_word
        )
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No team matched that exact 3-player sequence and secret word for this league."
        )

    return TeamRecoveryResponse(
        success=True,
        manager_code=row["manager_code"],
        team_name=row["team_name"],
        league_name=row["league_name"],
        season_code=row["season_code"],
        message=f"Success! Welcome back, Manager {row['team_name']}."
    )

@router.post("/login", response_model=TeamJoinResponse)
async def login_team(req: TeamLoginRequest, db: aiosqlite.Connection = Depends(get_db)):
    """
    Login-less PIN auth: Authenticates an existing manager via 6-digit PIN.
    """
    clean_code = normalize_pin(req.manager_code)
    cursor = await db.execute(
        """
        SELECT t.id, t.league_id, t.manager_code, t.team_name, t.formation, t.total_points, t.kit_config,
               l.season_code, l.name as league_name
        FROM teams t
        JOIN leagues l ON t.league_id = l.id
        WHERE t.manager_code = ?
        """,
        (clean_code,)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No team found with Manager Code '{clean_code}'. Please check your PIN."
        )

    kit = None
    if row["kit_config"]:
        try:
            kit = json.loads(row["kit_config"])
        except Exception:
            kit = DEFAULT_KIT

    return TeamJoinResponse(
        id=row["id"],
        league_id=row["league_id"],
        season_code=row["season_code"],
        league_name=row["league_name"],
        team_name=row["team_name"],
        manager_code=row["manager_code"],
        formation=row["formation"],
        total_points=row["total_points"],
        kit_config=kit or DEFAULT_KIT
    )

@router.get("/me", response_model=TeamRosterResponse)
async def get_my_roster(team: Dict[str, Any] = Depends(get_current_team), db: aiosqlite.Connection = Depends(get_db)):
    """
    Fetches the authenticated manager's team and roster with player stats and embedded media.
    """
    team_id = team["id"]
    
    cursor = await db.execute(
        """
        SELECT r.id as roster_id, r.player_id, r.is_starting_xi, r.is_captain, r.slot_position, r.slot_index,
               r.youtube_links, r.custom_notes,
               p.name, p.short_name, p.position, p.current_price, p.photo_url, p.status, p.real_team_name,
               COALESCE(pms.fantasy_points_calculated, 0) as match_points,
               COALESCE(pms.goals, 0) as goals,
               COALESCE(pms.assists, 0) as assists,
               COALESCE(pms.clean_sheet, 0) as clean_sheets,
               COALESCE(pms.yellow_cards, 0) as yellow_cards,
               COALESCE(pms.red_cards, 0) as red_cards
        FROM rosters r
        JOIN players p ON r.player_id = p.id
        LEFT JOIN player_match_stats pms ON p.id = pms.player_id
        WHERE r.team_id = ?
        ORDER BY r.is_starting_xi DESC, r.slot_index ASC, r.id ASC
        """,
        (team_id,)
    )
    roster_rows = await cursor.fetchall()
    
    players_list = []
    total_cost = 0.0
    
    for r in roster_rows:
        p_dict = dict(r)
        total_cost += p_dict["current_price"]
        
        # Parse youtube_links JSON
        raw_yt = p_dict.get("youtube_links")
        if raw_yt:
            try:
                p_dict["youtube_links"] = json.loads(raw_yt)
            except Exception:
                p_dict["youtube_links"] = []
        else:
            p_dict["youtube_links"] = []
            
        players_list.append(p_dict)
        
    total_cost = round(total_cost, 2)
    salary_cap = float(team.get("salary_cap", 100.0))
    remaining = round(salary_cap - total_cost, 2)
    
    kit = None
    if team.get("kit_config"):
        try:
            kit = json.loads(team["kit_config"]) if isinstance(team["kit_config"], str) else team["kit_config"]
        except Exception:
            kit = DEFAULT_KIT
    
    return TeamRosterResponse(
        team_id=team["id"],
        team_name=team["team_name"],
        manager_code=team["manager_code"],
        formation=team["formation"],
        total_points=team["total_points"],
        total_cost=total_cost,
        salary_cap=salary_cap,
        remaining_budget=remaining,
        kit_config=kit or DEFAULT_KIT,
        players=players_list
    )

@router.put("/me/kit")
async def update_my_kit(
    kit_req: TeamKitUpdateRequest,
    team: Dict[str, Any] = Depends(get_current_team),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Updates custom jersey kit design for the authenticated manager's team.
    """
    team_id = team["id"]
    kit_json = json.dumps(kit_req.kit_config)
    await db.execute("UPDATE teams SET kit_config = ? WHERE id = ?", (kit_json, team_id))
    await db.commit()
    return {"status": "success", "kit_config": kit_req.kit_config}

@router.put("/me/players/{player_id}/media")
async def update_player_media(
    player_id: int,
    media_req: PlayerMediaSaveRequest,
    team: Dict[str, Any] = Depends(get_current_team),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Embeds up to 3 YouTube highlight videos and notes on a rostered player's profile.
    """
    team_id = team["id"]
    if len(media_req.youtube_links) > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum of 3 YouTube videos allowed per player profile."
        )

    # Convert to json
    links_data = [item.model_dump() if hasattr(item, "model_dump") else item.dict() for item in media_req.youtube_links]
    links_json = json.dumps(links_data)
    
    cursor = await db.execute(
        "UPDATE rosters SET youtube_links = ?, custom_notes = ? WHERE team_id = ? AND player_id = ?",
        (links_json, media_req.custom_notes, team_id, player_id)
    )
    if cursor.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found in your team roster."
        )
    await db.commit()
    return {"status": "success", "youtube_links": links_data, "custom_notes": media_req.custom_notes}

@router.put("/me/roster")
async def save_my_roster(
    roster_req: TeamRosterSaveRequest,
    team: Dict[str, Any] = Depends(get_current_team),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Saves and validates the manager's roster:
    - Enforces $100M salary cap constraint.
    - Enforces formation positioning (11 starting XI, valid GK/DEF/MID/FWD breakdown).
    - Enforces exactly 1 Captain.
    - Preserves embedded media for retained players; cleans media for dropped players.
    """
    team_id = team["id"]
    player_items = roster_req.players
    formation = roster_req.formation
    
    if not player_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot save an empty roster."
        )

    # 1. Fetch player metadata for validation
    player_ids = [p.player_id for p in player_items]
    placeholders = ",".join("?" for _ in player_ids)
    
    p_cur = await db.execute(
        f"SELECT id, name, position, current_price FROM players WHERE id IN ({placeholders})",
        player_ids
    )
    db_players = {row["id"]: dict(row) for row in await p_cur.fetchall()}

    # Construct validation payload
    val_players = []
    for item in player_items:
        if item.player_id not in db_players:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Player ID {item.player_id} does not exist in player directory."
            )
        p_info = db_players[item.player_id]
        val_players.append({
            "id": item.player_id,
            "name": p_info["name"],
            "position": p_info["position"],
            "current_price": p_info["current_price"],
            "is_starting_xi": item.is_starting_xi,
            "is_captain": item.is_captain
        })

    # 2. Run validation against game rules
    val_result = validate_roster(
        formation=formation,
        players=val_players,
        salary_cap=float(team.get("salary_cap", 100.0))
    )

    if not val_result.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Roster validation failed",
                "errors": val_result.errors,
                "total_cost": val_result.total_cost,
                "salary_cap": team.get("salary_cap", 100.0)
            }
        )

    # 3. Fetch existing player media so retained players keep their highlights
    existing_cur = await db.execute(
        "SELECT player_id, youtube_links, custom_notes FROM rosters WHERE team_id = ?",
        (team_id,)
    )
    existing_media = {
        row["player_id"]: (row["youtube_links"], row["custom_notes"])
        for row in await existing_cur.fetchall()
    }

    # 4. Transactionally replace team roster
    await db.execute("UPDATE teams SET formation = ? WHERE id = ?", (formation, team_id))
    await db.execute("DELETE FROM rosters WHERE team_id = ?", (team_id,))
    
    for item in player_items:
        prev_yt, prev_notes = existing_media.get(item.player_id, ("[]", None))
        await db.execute(
            """
            INSERT INTO rosters (team_id, player_id, is_starting_xi, is_captain, slot_position, slot_index, youtube_links, custom_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                team_id,
                item.player_id,
                1 if item.is_starting_xi else 0,
                1 if item.is_captain else 0,
                item.slot_position,
                item.slot_index,
                prev_yt,
                prev_notes
            )
        )
    await db.commit()

    # 5. Recalculate team fantasy score
    await run_scoring_engine(db)

    return {
        "status": "success",
        "message": "Roster successfully saved and validated!",
        "total_cost": val_result.total_cost,
        "formation": formation
    }

@router.get("/{team_id}", response_model=ScoutedTeamResponse)
async def get_team_public(team_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """
    Public scouting endpoint:
    Returns full scout report with team kit, formation, Starting XI, bench, and embedded player highlight videos.
    """
    t_cur = await db.execute(
        """
        SELECT t.id, t.team_name, t.formation, t.total_points, t.kit_config,
               l.name as league_name, l.season_code, l.salary_cap
        FROM teams t
        JOIN leagues l ON t.league_id = l.id
        WHERE t.id = ?
        """,
        (team_id,)
    )
    team = await t_cur.fetchone()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

    r_cur = await db.execute(
        """
        SELECT r.player_id, r.is_starting_xi, r.is_captain, r.slot_position, r.slot_index,
               r.youtube_links, r.custom_notes,
               p.name, p.short_name, p.position, p.current_price, p.photo_url, p.real_team_name,
               COALESCE(pms.fantasy_points_calculated, 0) as match_points,
               COALESCE(pms.goals, 0) as goals,
               COALESCE(pms.assists, 0) as assists,
               COALESCE(pms.clean_sheet, 0) as clean_sheets
        FROM rosters r
        JOIN players p ON r.player_id = p.id
        LEFT JOIN player_match_stats pms ON p.id = pms.player_id
        WHERE r.team_id = ?
        ORDER BY r.is_starting_xi DESC, r.slot_index ASC
        """,
        (team_id,)
    )
    raw_players = await r_cur.fetchall()
    
    players_list = []
    for r in raw_players:
        p_dict = dict(r)
        raw_yt = p_dict.get("youtube_links")
        if raw_yt:
            try:
                p_dict["youtube_links"] = json.loads(raw_yt)
            except Exception:
                p_dict["youtube_links"] = []
        else:
            p_dict["youtube_links"] = []
        players_list.append(p_dict)
    
    kit = DEFAULT_KIT
    if team["kit_config"]:
        try:
            kit = json.loads(team["kit_config"])
        except Exception:
            kit = DEFAULT_KIT

    return ScoutedTeamResponse(
        team_id=team["id"],
        team_name=team["team_name"],
        formation=team["formation"],
        total_points=team["total_points"],
        season_code=team["season_code"],
        league_name=team["league_name"],
        kit_config=kit,
        players=players_list
    )
