import logging
import httpx
from typing import List, Optional
from .base import BaseSportsAdapter, NormalizedFixture, NormalizedPlayer
from ...config import settings

logger = logging.getLogger("beanleague.adapters.football_data")

LEAGUE_CODE_MAP = {
    39: "PL",   # Premier League
    140: "PD",  # La Liga Primera Division
    2: "CL",    # Champions League
    135: "SA",  # Serie A
    78: "BL1"   # Bundesliga
}

class FootballDataAdapter(BaseSportsAdapter):
    """Rank 2 Adapter: Live matches, standings, and schedules via Football-Data.org (v4)."""

    def __init__(self):
        self.api_key = getattr(settings, "FOOTBALL_DATA_KEY", "")
        self.base_url = "https://api.football-data.org/v4"

    @property
    def name(self) -> str:
        return "football_data"

    @property
    def rank(self) -> int:
        return 2

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def fetch_fixtures(self, league_id: int, season: int) -> List[NormalizedFixture]:
        if not self.is_configured():
            return []

        comp_code = LEAGUE_CODE_MAP.get(league_id)
        if not comp_code:
            return []

        url = f"{self.base_url}/competitions/{comp_code}/matches"
        headers = {"X-Auth-Token": self.api_key}
        params = {"season": season}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params, headers=headers)
                if resp.status_code != 200:
                    logger.warning(f"Football-Data.org error {resp.status_code}: {resp.text}")
                    return []
                data = resp.json()
                matches = data.get("matches", [])
                
                results = []
                for m in matches:
                    m_id = m.get("id", 0)
                    matchday = m.get("matchday")
                    round_str = f"Matchday {matchday}" if matchday else "Regular Season"
                    home = m.get("homeTeam", {})
                    away = m.get("awayTeam", {})
                    score = m.get("score", {}).get("fullTime", {})
                    st = m.get("status", "SCHEDULED")

                    if st in ("IN_PLAY", "PAUSED", "LIVE"):
                        mapped_status = "In-Play"
                    elif st in ("FINISHED", "AWARDED"):
                        mapped_status = "Finished"
                    elif st in ("POSTPONED", "CANCELLED", "SUSPENDED"):
                        mapped_status = "Postponed"
                    else:
                        mapped_status = "Scheduled"

                    results.append(NormalizedFixture(
                        id=2000000 + m_id,
                        league_id=league_id,
                        round=round_str,
                        home_team_id=home.get("id", 0),
                        home_team_name=home.get("name", "Home Team"),
                        home_team_logo=home.get("crest"),
                        away_team_id=away.get("id", 0),
                        away_team_name=away.get("name", "Away Team"),
                        away_team_logo=away.get("crest"),
                        kickoff_time=m.get("utcDate", ""),
                        status=mapped_status,
                        home_score=score.get("home") or 0,
                        away_score=score.get("away") or 0,
                        source=self.name
                    ))
                return results
        except Exception as e:
            logger.exception(f"Error fetching from Football-Data.org: {e}")
            return []

    async def fetch_squad(self, team_id: int, team_name: str) -> List[NormalizedPlayer]:
        return []
