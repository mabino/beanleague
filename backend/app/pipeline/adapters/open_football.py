import logging
import httpx
from typing import List, Optional
from .base import BaseSportsAdapter, NormalizedFixture, NormalizedPlayer

logger = logging.getLogger("beanleague.adapters.open_football")

OPEN_FOOTBALL_MAP = {
    39: "en.1.json", # Premier League
    140: "es.1.json" # La Liga
}

class OpenFootballAdapter(BaseSportsAdapter):
    """Rank 4 Adapter: Public open-source match schedules and results from OpenFootball."""

    def __init__(self):
        self.base_url = "https://raw.githubusercontent.com/openfootball/football.json/master"

    @property
    def name(self) -> str:
        return "open_football"

    @property
    def rank(self) -> int:
        return 4

    def is_configured(self) -> bool:
        return True

    async def fetch_fixtures(self, league_id: int, season: int) -> List[NormalizedFixture]:
        file_name = OPEN_FOOTBALL_MAP.get(league_id)
        if not file_name:
            return []

        # Season string format in openfootball repo, e.g. 2024-25
        season_short = f"{season}-{str(season + 1)[-2:]}"
        url = f"{self.base_url}/{season_short}/{file_name}"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    # Fallback to standard season if not found
                    fallback_url = f"{self.base_url}/2024-25/{file_name}"
                    resp = await client.get(fallback_url)
                    if resp.status_code != 200:
                        return []

                data = resp.json()
                matches = data.get("matches", [])

                results = []
                for idx, m in enumerate(matches):
                    score = m.get("score", {})
                    ft = score.get("ft") if isinstance(score, dict) else None
                    hs = ft[0] if ft and len(ft) > 0 else 0
                    as_ = ft[1] if ft and len(ft) > 1 else 0
                    st = "Finished" if ft else "Scheduled"

                    d_str = m.get("date", "")
                    t_str = m.get("time", "19:00")
                    iso_time = f"{d_str}T{t_str}:00Z" if d_str else ""

                    t1 = m.get("team1", "Home Team")
                    t2 = m.get("team2", "Away Team")

                    results.append(NormalizedFixture(
                        id=4000000 + (league_id * 1000) + idx,
                        league_id=league_id,
                        round=m.get("round", "Regular Season"),
                        home_team_id=0,
                        home_team_name=t1,
                        home_team_logo=None,
                        away_team_id=0,
                        away_team_name=t2,
                        away_team_logo=None,
                        kickoff_time=iso_time,
                        status=st,
                        home_score=hs,
                        away_score=as_,
                        source=self.name
                    ))
                return results
        except Exception as e:
            logger.exception(f"Error fetching from OpenFootball: {e}")
            return []

    async def fetch_squad(self, team_id: int, team_name: str) -> List[NormalizedPlayer]:
        return []
