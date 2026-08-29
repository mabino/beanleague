import logging
import httpx
from typing import List, Optional
from .base import BaseSportsAdapter, NormalizedFixture, NormalizedPlayer
from ...config import settings

logger = logging.getLogger("beanleague.adapters.thesportsdb")

TSDB_LEAGUE_MAP = {
    39: 4328,   # English Premier League
    140: 4335,  # Spanish La Liga
    2: 4480,    # UEFA Champions League
    135: 4332,  # Italian Serie A
    78: 4331    # German Bundesliga
}

class TheSportsDbAdapter(BaseSportsAdapter):
    """Rank 3 Adapter: Free open community match schedules and live scores via TheSportsDB."""

    def __init__(self):
        self.api_key = getattr(settings, "THESPORTSDB_KEY", "3") # Default free public key
        self.base_url = f"https://www.thesportsdb.com/api/v1/json/{self.api_key}"

    @property
    def name(self) -> str:
        return "thesportsdb"

    @property
    def rank(self) -> int:
        return 3

    def is_configured(self) -> bool:
        return True # Always available on public community tier

    async def fetch_fixtures(self, league_id: int, season: int) -> List[NormalizedFixture]:
        tsdb_id = TSDB_LEAGUE_MAP.get(league_id)
        if not tsdb_id:
            return []

        season_str = f"{season}-{season + 1}"
        url = f"{self.base_url}/eventsseason.php"
        params = {"id": tsdb_id, "s": season_str}

        try:
            async with httpx.AsyncClient(timeout=15.0, headers={"User-Agent": "BeanLeague/1.0"}) as client:
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    return []
                data = resp.json()
                events = data.get("events") or []

                results = []
                for ev in events:
                    ev_id = int(ev.get("idEvent", 0) or 0)
                    round_str = f"Matchday {ev.get('intRound')}" if ev.get("intRound") else "Regular Season"
                    st_str = ev.get("strStatus", "NS")
                    
                    if st_str in ("FT", "AET", "PEN", "Match Finished"):
                        mapped_status = "Finished"
                    elif st_str in ("1H", "2H", "HT", "ET", "P", "Live"):
                        mapped_status = "In-Play"
                    elif st_str in ("Postponed", "PST", "Cancelled"):
                        mapped_status = "Postponed"
                    else:
                        mapped_status = "Scheduled"

                    hs = int(ev.get("intHomeScore", 0) or 0) if ev.get("intHomeScore") is not None else 0
                    as_ = int(ev.get("intAwayScore", 0) or 0) if ev.get("intAwayScore") is not None else 0
                    
                    date_str = ev.get("dateEvent", "")
                    time_str = ev.get("strTime", "00:00:00")
                    iso_date = f"{date_str}T{time_str}Z" if date_str else ""

                    results.append(NormalizedFixture(
                        id=3000000 + ev_id,
                        league_id=league_id,
                        round=round_str,
                        home_team_id=int(ev.get("idHomeTeam", 0) or 0),
                        home_team_name=ev.get("strHomeTeam", "Home Team"),
                        home_team_logo=ev.get("strHomeTeamBadge"),
                        away_team_id=int(ev.get("idAwayTeam", 0) or 0),
                        away_team_name=ev.get("strAwayTeam", "Away Team"),
                        away_team_logo=ev.get("strAwayTeamBadge"),
                        kickoff_time=iso_date,
                        status=mapped_status,
                        home_score=hs,
                        away_score=as_,
                        source=self.name
                    ))
                return results
        except Exception as e:
            logger.exception(f"Error fetching from TheSportsDB: {e}")
            return []

    async def fetch_today_events(self, league_id: int) -> List[NormalizedFixture]:
        """Fetches live/today matches from TheSportsDB with dynamic in-play status detection."""
        tsdb_id = TSDB_LEAGUE_MAP.get(league_id)
        if not tsdb_id:
            return []

        from datetime import datetime, timezone
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        url = f"{self.base_url}/eventsday.php"
        params = {"d": today_str, "l": tsdb_id}

        try:
            async with httpx.AsyncClient(timeout=15.0, headers={"User-Agent": "BeanLeague/1.0"}) as client:
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    return []
                data = resp.json()
                events = data.get("events") or []

                now_utc = datetime.now(timezone.utc)
                results = []
                for ev in events:
                    ev_id = int(ev.get("idEvent", 0) or 0)
                    round_str = f"Matchday {ev.get('intRound')}" if ev.get("intRound") else "Matchday Live"
                    st_str = ev.get("strStatus", "NS")
                    
                    date_str = ev.get("dateEvent", today_str)
                    time_str = ev.get("strTime", "00:00:00")
                    iso_date = f"{date_str}T{time_str}Z" if date_str else ""
                    
                    # Dynamic Status calculation
                    if st_str in ("FT", "AET", "PEN", "Match Finished"):
                        mapped_status = "Finished"
                    elif st_str in ("1H", "2H", "HT", "ET", "P", "Live", "In-Play"):
                        mapped_status = "In-Play"
                    elif st_str in ("Postponed", "PST", "Cancelled"):
                        mapped_status = "Postponed"
                    else:
                        try:
                            ko_dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
                            diff_min = (now_utc - ko_dt).total_seconds() / 60.0
                            if 0 <= diff_min <= 115:
                                mapped_status = "In-Play"
                            elif diff_min > 115:
                                mapped_status = "Finished"
                            else:
                                mapped_status = "Scheduled"
                        except Exception:
                            mapped_status = "Scheduled"

                    hs = int(ev.get("intHomeScore", 0) or 0) if ev.get("intHomeScore") is not None else 0
                    as_ = int(ev.get("intAwayScore", 0) or 0) if ev.get("intAwayScore") is not None else 0

                    results.append(NormalizedFixture(
                        id=3000000 + ev_id,
                        league_id=league_id,
                        round=round_str,
                        home_team_id=int(ev.get("idHomeTeam", 0) or 0),
                        home_team_name=ev.get("strHomeTeam", "Home Team"),
                        home_team_logo=ev.get("strHomeTeamBadge"),
                        away_team_id=int(ev.get("idAwayTeam", 0) or 0),
                        away_team_name=ev.get("strAwayTeam", "Away Team"),
                        away_team_logo=ev.get("strAwayTeamBadge"),
                        kickoff_time=iso_date,
                        status=mapped_status,
                        home_score=hs,
                        away_score=as_,
                        source=self.name
                    ))
                return results
        except Exception as e:
            logger.exception(f"Error fetching today events from TheSportsDB: {e}")
            return []

    async def fetch_squad(self, team_id: int, team_name: str) -> List[NormalizedPlayer]:
        return []
