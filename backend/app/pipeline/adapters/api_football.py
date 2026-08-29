import logging
import asyncio
from typing import List, Optional
from .base import BaseSportsAdapter, NormalizedFixture, NormalizedPlayer
from ..api_client import ApiFootballClient
from ...config import settings

logger = logging.getLogger("beanleague.adapters.api_football")

class ApiFootballAdapter(BaseSportsAdapter):
    """Rank 1 Adapter: High-fidelity fantasy stats and squad rosters via API-Football (v3)."""
    
    def __init__(self):
        self.client = ApiFootballClient()

    @property
    def name(self) -> str:
        return "api_football"

    @property
    def rank(self) -> int:
        return 1

    def is_configured(self) -> bool:
        return bool(settings.API_FOOTBALL_KEY)

    async def fetch_fixtures(self, league_id: int, season: int) -> List[NormalizedFixture]:
        if not self.is_configured():
            return []
        
        await asyncio.sleep(1.2)
        resp = await self.client.fetch("fixtures", params={"league": league_id, "season": season})
        if not resp or not resp.get("response"):
            return []

        results = []
        for item in resp["response"]:
            fix = item.get("fixture", {})
            teams = item.get("teams", {})
            goals = item.get("goals", {})
            lg = item.get("league", {})

            status_short = fix.get("status", {}).get("short", "NS")
            if status_short in ("1H", "2H", "HT", "ET", "P", "LIVE"):
                mapped_status = "In-Play"
            elif status_short in ("FT", "AET", "PEN"):
                mapped_status = "Finished"
            else:
                mapped_status = "Scheduled"

            results.append(NormalizedFixture(
                id=fix.get("id", 0),
                league_id=lg.get("id", league_id),
                round=lg.get("round", "Regular Season"),
                home_team_id=teams.get("home", {}).get("id", 0),
                home_team_name=teams.get("home", {}).get("name", "Home Team"),
                home_team_logo=teams.get("home", {}).get("logo"),
                away_team_id=teams.get("away", {}).get("id", 0),
                away_team_name=teams.get("away", {}).get("name", "Away Team"),
                away_team_logo=teams.get("away", {}).get("logo"),
                kickoff_time=fix.get("date", ""),
                status=mapped_status,
                home_score=goals.get("home", 0) or 0,
                away_score=goals.get("away", 0) or 0,
                source=self.name
            ))
        return results

    async def fetch_squad(self, team_id: int, team_name: str) -> List[NormalizedPlayer]:
        if not self.is_configured():
            return []

        await asyncio.sleep(1.2)
        resp = await self.client.fetch("players/squads", params={"team": team_id})
        if not resp or not resp.get("response"):
            return []

        POS_MAP = {"Goalkeeper": "GK", "Defender": "DEF", "Midfielder": "MID", "Attacker": "FWD"}
        BASE_PRICES = {"GK": 5.5, "DEF": 6.0, "MID": 7.5, "FWD": 8.5}

        players = []
        for team_data in resp["response"]:
            t_name = team_data.get("team", {}).get("name", team_name)
            t_id = team_data.get("team", {}).get("id", team_id)
            for pl in team_data.get("players", []):
                pl_id = pl["id"]
                raw_pos = pl.get("position", "Midfielder")
                pos = POS_MAP.get(raw_pos, "MID")
                name = pl.get("name", "Unknown")
                parts = name.split()
                short_name = parts[-1] if len(parts) > 1 else name
                price = BASE_PRICES.get(pos, 6.0)
                photo = pl.get("photo") or f"https://media.api-sports.io/football/players/{pl_id}.png"

                players.append(NormalizedPlayer(
                    id=pl_id,
                    name=name,
                    short_name=short_name,
                    real_team_id=t_id,
                    real_team_name=t_name,
                    position=pos,
                    current_price=price,
                    photo_url=photo,
                    status="Active",
                    source=self.name
                ))
        return players
