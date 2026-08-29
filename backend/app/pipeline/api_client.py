import httpx
import logging
from datetime import date
from typing import Optional, Dict, Any
import aiosqlite
from ..config import settings

logger = logging.getLogger("beanleague.api_client")

class ApiFootballClient:
    """
    Guarded API client for API-Football (v3).
    Strictly tracks and limits requests to maximum 100 requests / day.
    """
    def __init__(self, db_path: Optional[str] = None):
        self.api_key = settings.API_FOOTBALL_KEY
        self.base_url = settings.API_FOOTBALL_BASE_URL
        self.daily_limit = settings.API_DAILY_LIMIT
        self.db_path = db_path or settings.DATABASE_PATH

    async def get_today_usage(self, db: aiosqlite.Connection) -> int:
        """Returns the number of external API requests made today."""
        today_str = date.today().isoformat()
        cursor = await db.execute(
            "SELECT COALESCE(SUM(cost), 0) as total FROM api_usage_log WHERE date = ?",
            (today_str,)
        )
        row = await cursor.fetchone()
        return row[0] if row else 0

    async def log_request(self, db: aiosqlite.Connection, endpoint: str, status_code: int, cost: int = 1):
        """Records an API call into the usage audit log."""
        today_str = date.today().isoformat()
        await db.execute(
            "INSERT INTO api_usage_log (date, endpoint, status_code, cost) VALUES (?, ?, ?, ?)",
            (today_str, endpoint, status_code, cost)
        )
        await db.commit()

    async def fetch(self, endpoint: str, params: Optional[Dict[str, Any]] = None, db: Optional[aiosqlite.Connection] = None) -> Optional[Dict[str, Any]]:
        """
        Executes a GET request against API-Football if within the daily quota.
        """
        if not self.api_key:
            logger.info(f"API_FOOTBALL_KEY not configured. Skipping external request to {endpoint}.")
            return None

        # Check rate limit in DB
        async with aiosqlite.connect(self.db_path) as conn:
            used_today = await self.get_today_usage(conn)
            if used_today >= self.daily_limit:
                logger.warning(
                    f"API-Football Daily Limit Exceeded! Used: {used_today}/{self.daily_limit}. "
                    f"Request to '{endpoint}' blocked to prevent overages."
                )
                return None

            headers = {
                "x-rapidapi-host": "v3.football.api-sports.io",
                "x-rapidapi-key": self.api_key,
                "x-apisports-key": self.api_key
            }

            url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
            
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    logger.info(f"Making API-Football request #{used_today + 1}/{self.daily_limit} -> {endpoint} with {params}")
                    response = await client.get(url, params=params, headers=headers)
                    
                    # Log request cost
                    await self.log_request(conn, endpoint, response.status_code, cost=1)
                    
                    if response.status_code == 200:
                        data = response.json()
                        errors = data.get("errors", {})
                        if errors:
                            logger.error(f"API-Football error response: {errors}")
                        return data
                    else:
                        logger.error(f"API-Football error {response.status_code}: {response.text}")
                        return None
            except Exception as e:
                logger.exception(f"Error requesting API-Football: {e}")
                return None
