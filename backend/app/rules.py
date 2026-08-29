from typing import Dict, Any, List, Optional
from pydantic import BaseModel

# Supported formations and required position counts for Starting XI
FORMATIONS: Dict[str, Dict[str, int]] = {
    "4-3-3": {"GK": 1, "DEF": 4, "MID": 3, "FWD": 3},
    "3-5-2": {"GK": 1, "DEF": 3, "MID": 5, "FWD": 2},
    "4-4-2": {"GK": 1, "DEF": 4, "MID": 4, "FWD": 2},
    "3-4-3": {"GK": 1, "DEF": 3, "MID": 4, "FWD": 3},
    "5-3-2": {"GK": 1, "DEF": 5, "MID": 3, "FWD": 2},
    "4-2-3-1": {"GK": 1, "DEF": 4, "MID": 5, "FWD": 1},
    "5-4-1": {"GK": 1, "DEF": 5, "MID": 4, "FWD": 1},
}

DEFAULT_SALARY_CAP: float = 100.0
MAX_STARTING_PLAYERS: int = 11
MAX_BENCH_PLAYERS: int = 4
MAX_SQUAD_PLAYERS: int = 15

# Point Multipliers
POINTS_CONFIG = {
    "MINUTES_1_TO_59": 1,
    "MINUTES_60_PLUS": 2,
    "GOAL_GK": 6,
    "GOAL_DEF": 6,
    "GOAL_MID": 5,
    "GOAL_FWD": 4,
    "ASSIST": 3,
    "CLEAN_SHEET_GK": 4,
    "CLEAN_SHEET_DEF": 4,
    "CLEAN_SHEET_MID": 1,
    "SAVES_PER_3": 1,
    "PENALTY_SAVED": 5,
    "YELLOW_CARD": -1,
    "RED_CARD": -3,
    "OWN_GOAL": -2,
}

def calculate_fantasy_points(position: str, stats: Dict[str, Any]) -> int:
    """
    Calculate fantasy points for a player given their position and match stats.
    
    Unified standard rules:
    - Forward Goal = 4 pts, Midfielder Goal = 5 pts, Defender/GK Goal = 6 pts
    - Assist = 3 pts
    - Clean Sheet (DEF/GK with 60+ mins) = 4 pts
    - Clean Sheet (MID with 60+ mins) = 1 pt
    - Playing up to 59 min = 1 pt, 60+ min = 2 pts
    - Yellow Card = -1 pt, Red Card = -3 pts
    - Own Goal = -2 pts
    - Penalty Save = +5 pts, GK saves (1 pt / 3 saves)
    """
    pts = 0
    pos = (position or "MID").upper()
    
    mins = int(stats.get("minutes_played", 0) or 0)
    if mins > 0:
        pts += POINTS_CONFIG["MINUTES_1_TO_59"]
    if mins >= 60:
        pts += (POINTS_CONFIG["MINUTES_60_PLUS"] - POINTS_CONFIG["MINUTES_1_TO_59"])
        
    goals = int(stats.get("goals", 0) or 0)
    if pos in ("GK", "DEF"):
        pts += goals * POINTS_CONFIG["GOAL_DEF"]
    elif pos == "MID":
        pts += goals * POINTS_CONFIG["GOAL_MID"]
    elif pos == "FWD":
        pts += goals * POINTS_CONFIG["GOAL_FWD"]
        
    assists = int(stats.get("assists", 0) or 0)
    pts += assists * POINTS_CONFIG["ASSIST"]
    
    clean_sheet = bool(stats.get("clean_sheet", False))
    if clean_sheet and mins >= 60:
        if pos in ("GK", "DEF"):
            pts += POINTS_CONFIG["CLEAN_SHEET_DEF"]
        elif pos == "MID":
            pts += POINTS_CONFIG["CLEAN_SHEET_MID"]
            
    saves = int(stats.get("saves", 0) or 0)
    if pos == "GK" and saves > 0:
        pts += (saves // 3) * POINTS_CONFIG["SAVES_PER_3"]
        
    penalties_saved = int(stats.get("penalties_saved", 0) or 0)
    if penalties_saved > 0:
        pts += penalties_saved * POINTS_CONFIG["PENALTY_SAVED"]
        
    yellows = int(stats.get("yellow_cards", 0) or 0)
    pts += yellows * POINTS_CONFIG["YELLOW_CARD"]
    
    reds = int(stats.get("red_cards", 0) or 0)
    pts += reds * POINTS_CONFIG["RED_CARD"]
    
    own_goals = int(stats.get("own_goals", 0) or 0)
    pts += own_goals * POINTS_CONFIG["OWN_GOAL"]
    
    return pts

class RosterValidationResult(BaseModel):
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    total_cost: float = 0.0
    starting_count: int = 0
    bench_count: int = 0
    captain_id: Optional[int] = None

def validate_roster(
    formation: str,
    players: List[Dict[str, Any]], # Each dict has id, position, current_price, is_starting_xi, is_captain
    salary_cap: float = DEFAULT_SALARY_CAP
) -> RosterValidationResult:
    """
    Validates a team roster against formation requirements, salary cap, and squad rules.
    """
    errors = []
    warnings = []
    
    if formation not in FORMATIONS:
        errors.append(f"Invalid formation '{formation}'. Supported formations: {list(FORMATIONS.keys())}")
        return RosterValidationResult(is_valid=False, errors=errors)
        
    req_counts = FORMATIONS[formation]
    
    total_cost = round(sum(float(p.get("current_price", 0.0)) for p in players), 2)
    if total_cost > salary_cap:
        errors.append(f"Budget exceeded: Total roster cost is ${total_cost:.1f}M, but the salary cap is ${salary_cap:.1f}M.")
        
    starting_players = [p for p in players if p.get("is_starting_xi", True)]
    bench_players = [p for p in players if not p.get("is_starting_xi", True)]
    
    # Check counts
    if len(starting_players) != MAX_STARTING_PLAYERS:
        errors.append(f"Starting XI must have exactly {MAX_STARTING_PLAYERS} players, found {len(starting_players)}.")
        
    if len(bench_players) > MAX_BENCH_PLAYERS:
        errors.append(f"Bench cannot have more than {MAX_BENCH_PLAYERS} players, found {len(bench_players)}.")
        
    # Check starting XI positional breakdown
    starting_pos_counts = {"GK": 0, "DEF": 0, "MID": 0, "FWD": 0}
    captains = []
    
    for p in starting_players:
        pos = (p.get("position") or "MID").upper()
        if pos in starting_pos_counts:
            starting_pos_counts[pos] += 1
        else:
            errors.append(f"Player {p.get('name', p.get('id'))} has unknown position '{pos}'.")
            
        if p.get("is_captain"):
            captains.append(p.get("id"))
            
    # Formation matching
    for pos, req in req_counts.items():
        actual = starting_pos_counts.get(pos, 0)
        if actual != req:
            errors.append(f"Formation {formation} requires {req} {pos}, but Starting XI has {actual}.")
            
    # Captain verification
    if len(captains) == 0:
        errors.append("You must designate exactly 1 Captain in your Starting XI (Captain scores 2x points!).")
    elif len(captains) > 1:
        errors.append(f"You can only select 1 Captain, found {len(captains)}.")
        
    # Duplicate player check
    player_ids = [p.get("id") for p in players if p.get("id") is not None]
    if len(player_ids) != len(set(player_ids)):
        errors.append("Duplicate players found in squad.")
        
    return RosterValidationResult(
        is_valid=(len(errors) == 0),
        errors=errors,
        warnings=warnings,
        total_cost=total_cost,
        starting_count=len(starting_players),
        bench_count=len(bench_players),
        captain_id=captains[0] if captains else None
    )
