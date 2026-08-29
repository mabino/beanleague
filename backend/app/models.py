from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- League Models ---
class LeagueCreate(BaseModel):
    season_code: str = Field(..., json_schema_extra={"example": "BARCA-2026"}, description="Unique code defining the league context")
    name: str = Field(..., json_schema_extra={"example": "FC Barcelona & Friends League"})
    max_teams: int = Field(16, ge=2, le=50)
    salary_cap: float = Field(100.0, ge=50.0, le=200.0)

class LeagueResponse(BaseModel):
    id: str
    season_code: str
    name: str
    max_teams: int
    salary_cap: float
    created_at: str

# --- Team & Auth Models ---
class TeamCreate(BaseModel):
    season_code: str = Field(..., json_schema_extra={"example": "BARCA-2026"})
    team_name: str = Field(..., min_length=2, max_length=30, json_schema_extra={"example": "Lightning Strikers"})
    formation: str = Field("4-3-3", json_schema_extra={"example": "4-3-3"})
    recovery_player_1_id: Optional[int] = Field(None, description="First security player ID")
    recovery_player_2_id: Optional[int] = Field(None, description="Second security player ID")
    recovery_player_3_id: Optional[int] = Field(None, description="Third security player ID")
    secret_word: Optional[str] = Field(None, description="Secret word for code recovery")

class TeamRecoveryRequest(BaseModel):
    season_code: str = Field(..., json_schema_extra={"example": "BARCA-2026"})
    player_1_id: int = Field(..., description="First security player ID selected during setup")
    player_2_id: int = Field(..., description="Second security player ID selected during setup")
    player_3_id: int = Field(..., description="Third security player ID selected during setup")
    secret_word: str = Field(..., min_length=2, description="Secret word selected during setup")

class TeamRecoveryResponse(BaseModel):
    success: bool
    manager_code: str
    team_name: str
    league_name: str
    season_code: str
    message: str

class TeamJoinResponse(BaseModel):
    id: str
    league_id: str
    season_code: str
    league_name: str
    team_name: str
    manager_code: str
    formation: str
    total_points: int

class TeamLoginRequest(BaseModel):
    manager_code: str = Field(..., json_schema_extra={"example": "849-201"})

# --- Player & Stats Models ---
class PlayerResponse(BaseModel):
    id: int
    name: str
    short_name: Optional[str] = None
    real_team_id: Optional[int] = None
    real_team_name: Optional[str] = None
    position: str  # GK, DEF, MID, FWD
    current_price: float
    photo_url: Optional[str] = None
    status: str
    fantasy_points: int = 0
    goals: int = 0
    assists: int = 0
    clean_sheets: int = 0
    yellow_cards: int = 0
    red_cards: int = 0
    minutes_played: int = 0

class RosterSlotItem(BaseModel):
    player_id: int
    is_starting_xi: bool = True
    is_captain: bool = False
    slot_position: Optional[str] = None
    slot_index: int = 0

class TeamRosterSaveRequest(BaseModel):
    formation: str = "4-3-3"
    players: List[RosterSlotItem]

class TeamRosterResponse(BaseModel):
    team_id: str
    team_name: str
    manager_code: str
    formation: str
    total_points: int
    total_cost: float
    salary_cap: float
    remaining_budget: float
    players: List[Dict[str, Any]]

# --- Fixture Models ---
class FixtureResponse(BaseModel):
    id: int
    league_id: Optional[int] = None
    round: Optional[str] = None
    home_team_id: Optional[int] = None
    home_team_name: str
    home_team_logo: Optional[str] = None
    away_team_id: Optional[int] = None
    away_team_name: str
    away_team_logo: Optional[str] = None
    kickoff_time: str
    status: str # Scheduled, In-Play, Finished
    home_score: int = 0
    away_score: int = 0

# --- Standings & Leaderboard Models ---
class LeaderboardEntry(BaseModel):
    rank: int
    team_id: str
    team_name: str
    manager_code_masked: str
    formation: str
    total_points: int
    gameweek_points: int = 0
    player_count: int = 0

class LeagueStandingsResponse(BaseModel):
    league_id: str
    season_code: str
    league_name: str
    salary_cap: float
    standings: List[LeaderboardEntry]

# --- Live Match Events (SSE) ---
class MatchEventItem(BaseModel):
    id: int
    fixture_id: int
    fixture_summary: Optional[str] = None
    player_id: int
    player_name: str
    player_team: Optional[str] = None
    position: str
    event_type: str # goal, assist, yellow_card, red_card, save, penalty_save, own_goal
    minute: int
    detail: Optional[str] = None
    points_delta: int = 0
    timestamp: str

# --- API Limit Monitor ---
class ApiUsageSummary(BaseModel):
    today_date: str
    requests_used_today: int
    daily_limit: int
    remaining_requests: int
    can_request_external: bool
