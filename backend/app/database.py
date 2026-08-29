import aiosqlite
import sqlite3
import logging
from typing import AsyncGenerator
from .config import settings

logger = logging.getLogger("beanleague.db")

SCHEMA_SQL = """
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;

-- 1. Leagues Table
CREATE TABLE IF NOT EXISTS leagues (
    id TEXT PRIMARY KEY,
    season_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    max_teams INTEGER NOT NULL DEFAULT 16,
    salary_cap REAL NOT NULL DEFAULT 100.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Teams Table (Fantasy teams created by users)
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL,
    manager_code TEXT UNIQUE NOT NULL,
    team_name TEXT NOT NULL,
    formation TEXT NOT NULL DEFAULT '4-3-3',
    total_points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE
);

-- 3. Players Table (Real world players)
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT,
    real_team_id INTEGER,
    real_team_name TEXT,
    position TEXT NOT NULL CHECK(position IN ('GK', 'DEF', 'MID', 'FWD')),
    current_price REAL NOT NULL DEFAULT 5.0,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Injured', 'Suspended')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Fixtures Table (Real world match schedule)
CREATE TABLE IF NOT EXISTS fixtures (
    id INTEGER PRIMARY KEY,
    league_id INTEGER,
    round TEXT,
    home_team_id INTEGER,
    home_team_name TEXT NOT NULL,
    home_team_logo TEXT,
    away_team_id INTEGER,
    away_team_name TEXT NOT NULL,
    away_team_logo TEXT,
    kickoff_time TIMESTAMP NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'In-Play', 'Finished', 'Postponed', 'Cancelled')),
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Player Match Stats Table (Scoring table written by poller & seeder)
CREATE TABLE IF NOT EXISTS player_match_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    fixture_id INTEGER NOT NULL,
    minutes_played INTEGER NOT NULL DEFAULT 0,
    goals INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    clean_sheet INTEGER NOT NULL DEFAULT 0,
    yellow_cards INTEGER NOT NULL DEFAULT 0,
    red_cards INTEGER NOT NULL DEFAULT 0,
    saves INTEGER NOT NULL DEFAULT 0,
    penalties_saved INTEGER NOT NULL DEFAULT 0,
    own_goals INTEGER NOT NULL DEFAULT 0,
    fantasy_points_calculated INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, fixture_id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE
);

-- 6. Rosters Table (Mapping of real players to kids' teams)
CREATE TABLE IF NOT EXISTS rosters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT NOT NULL,
    player_id INTEGER NOT NULL,
    is_starting_xi INTEGER NOT NULL DEFAULT 1,
    is_captain INTEGER NOT NULL DEFAULT 0,
    slot_position TEXT,
    slot_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, player_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- 7. API Usage Log Table (Tracks the 100/day hard constraint on API-Football)
CREATE TABLE IF NOT EXISTS api_usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    status_code INTEGER,
    cost INTEGER DEFAULT 1,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Match Events Table (Real-time events for SSE broadcasting)
CREATE TABLE IF NOT EXISTS match_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('goal', 'assist', 'yellow_card', 'red_card', 'save', 'penalty_save', 'own_goal', 'sub_in', 'sub_out', 'match_start', 'match_end')),
    minute INTEGER NOT NULL,
    detail TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager_code ON teams(manager_code);
CREATE INDEX IF NOT EXISTS idx_rosters_team ON rosters(team_id);
CREATE INDEX IF NOT EXISTS idx_rosters_player ON rosters(player_id);
CREATE INDEX IF NOT EXISTS idx_pms_fixture ON player_match_stats(fixture_id);
CREATE INDEX IF NOT EXISTS idx_pms_player ON player_match_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_status ON fixtures(status);
CREATE INDEX IF NOT EXISTS idx_match_events_fixture ON match_events(fixture_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_log(date);
"""

async def init_db(db_path: str = None):
    """Initialize database tables and WAL mode."""
    target_path = db_path or settings.DATABASE_PATH
    logger.info(f"Initializing database at: {target_path}")
    async with aiosqlite.connect(target_path) as db:
        await db.executescript(SCHEMA_SQL)
        await db.commit()
    logger.info("Database schema initialized successfully.")

async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Dependency for obtaining an async database connection with row factory."""
    async with aiosqlite.connect(settings.DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON;")
        await db.execute("PRAGMA busy_timeout = 5000;")
        yield db

def get_sync_db(db_path: str = None) -> sqlite3.Connection:
    """Synchronous connection helper for testing / scripts."""
    target_path = db_path or settings.DATABASE_PATH
    conn = sqlite3.connect(target_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn
