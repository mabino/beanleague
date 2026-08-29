from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class NormalizedFixture(BaseModel):
    id: int
    league_id: int
    round: str
    home_team_id: int
    home_team_name: str
    home_team_logo: Optional[str] = None
    away_team_id: int
    away_team_name: str
    away_team_logo: Optional[str] = None
    kickoff_time: str
    status: str # Scheduled, In-Play, Finished, Postponed
    home_score: int = 0
    away_score: int = 0
    source: str

class NormalizedPlayer(BaseModel):
    id: int
    name: str
    short_name: str
    real_team_id: int
    real_team_name: str
    position: str # GK, DEF, MID, FWD
    current_price: float
    photo_url: Optional[str] = None
    status: str = "Active"
    source: str

class BaseSportsAdapter(ABC):
    """Abstract Base Class for multi-source sports ingestion adapters."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the adapter provider."""
        pass

    @property
    @abstractmethod
    def rank(self) -> int:
        """Priority rank (1 is highest)."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Whether credentials/dependencies are ready."""
        pass

    @abstractmethod
    async def fetch_fixtures(self, league_id: int, season: int) -> List[NormalizedFixture]:
        """Fetches fixtures for a given league and season."""
        pass

    @abstractmethod
    async def fetch_squad(self, team_id: int, team_name: str) -> List[NormalizedPlayer]:
        """Fetches player roster for a club."""
        pass
