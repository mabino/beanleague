import os
import sys
import tempfile
from pathlib import Path

# Ensure backend and root directory are on sys.path regardless of execution CWD
TESTS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = TESTS_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

for p in [str(PROJECT_ROOT), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

import pytest
import pytest_asyncio
import aiosqlite
from httpx import AsyncClient, ASGITransport

try:
    from backend.app.config import settings
    from backend.app.main import app
    from backend.app.database import init_db
    from backend.app.pipeline.seeder import run_daily_seeder
except ImportError:
    from app.config import settings
    from app.main import app
    from app.database import init_db
    from app.pipeline.seeder import run_daily_seeder

# Override database path for tests before loading app
temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
temp_db_path = temp_db.name
temp_db.close()

settings.DATABASE_PATH = temp_db_path
settings.API_DAILY_LIMIT = 100
settings.ENABLE_SCHEDULER = False

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    await init_db(temp_db_path)
    async with aiosqlite.connect(temp_db_path) as db:
        db.row_factory = aiosqlite.Row
        await run_daily_seeder(db, force_mock=True)
    yield
    if os.path.exists(temp_db_path):
        os.remove(temp_db_path)

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def db_conn():
    async with aiosqlite.connect(temp_db_path) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON;")
        yield db
