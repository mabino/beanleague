import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import init_db, get_db
from .pipeline.seeder import run_daily_seeder
from .pipeline.scheduler import start_scheduler, shutdown_scheduler
from .api import leagues, teams, players, fixtures, live, admin

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("beanleague")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    logger.info("Initializing BeanLeague Backend...")
    await init_db()
    
    # Run initial seed if needed
    async for db in get_db():
        await run_daily_seeder(db)
        break

    # Start background scheduler
    start_scheduler()
    logger.info("BeanLeague Backend ready!")
    
    yield
    
    # --- Shutdown ---
    logger.info("Shutting down BeanLeague Backend...")
    shutdown_scheduler()

app = FastAPI(
    title="BeanLeague API",
    description="Login-less Fantasy Soccer API for kids with API-Football Caching & Live Scoring Engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(leagues.router)
app.include_router(teams.router)
app.include_router(players.router)
app.include_router(fixtures.router)
app.include_router(live.router)
app.include_router(admin.router)

@app.get("/")
async def root():
    return {
        "app": "BeanLeague",
        "version": "1.0.0",
        "description": "High-Performance Login-Less Fantasy Soccer API",
        "status": "healthy",
        "docs_url": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
