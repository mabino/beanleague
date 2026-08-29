import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    # Database
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", str(DATA_DIR / "beanleague.db"))
    
    # API-Football
    API_FOOTBALL_KEY: str = os.getenv("API_FOOTBALL_KEY", "")
    API_FOOTBALL_BASE_URL: str = os.getenv("API_FOOTBALL_BASE_URL", "https://v3.football.api-sports.io")
    API_DAILY_LIMIT: int = int(os.getenv("API_DAILY_LIMIT", "100"))
    
    # Default League Config
    DEFAULT_SEASON_CODE: str = os.getenv("DEFAULT_SEASON_CODE", "BARCA-2026")
    DEFAULT_LEAGUE_NAME: str = os.getenv("DEFAULT_LEAGUE_NAME", "Barca & Friends Fantasy League")
    DEFAULT_SALARY_CAP: float = float(os.getenv("DEFAULT_SALARY_CAP", "100.0"))
    
    # Target Leagues for Seeder (e.g., La Liga: 140, Premier League: 39)
    TARGET_LEAGUE_IDS: list[int] = [140, 39]
    TARGET_SEASON: int = int(os.getenv("TARGET_SEASON", "2026"))
    
    # Scheduler
    POLL_INTERVAL_MINUTES: int = int(os.getenv("POLL_INTERVAL_MINUTES", "15"))
    ENABLE_SCHEDULER: bool = os.getenv("ENABLE_SCHEDULER", "true").lower() in ("true", "1", "yes")
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: list[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:80",
        "http://localhost:8080",
        "https://bino-fantasy.com",
        "https://fantasy.binolabs.com",
        "*"
    ]

settings = Settings()
