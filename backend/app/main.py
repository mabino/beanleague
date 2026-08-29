import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import init_db, get_db
from .pipeline.seeder import run_daily_seeder
from .pipeline.scheduler import start_scheduler, shutdown_scheduler
from .pipeline.photo_scraper import BackgroundPhotoWorker
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
    
    # Run initial seed asynchronously in background so healthchecks pass immediately
    async def bg_seed():
        try:
            async for db in get_db():
                await run_daily_seeder(db)
                break
        except Exception as e:
            logger.exception(f"Background initial seeder failed: {e}")

    asyncio.create_task(bg_seed())

    # Start background scheduler and photo worker
    start_scheduler()
    BackgroundPhotoWorker.start()
    logger.info("BeanLeague Backend ready!")
    
    yield
    
    # --- Shutdown ---
    logger.info("Shutting down BeanLeague Backend...")
    shutdown_scheduler()
    BackgroundPhotoWorker.stop()

app = FastAPI(
    title="BeanLeague API",
    description="Login-less Fantasy Soccer API for kids with API-Football Caching & Live Scoring Engine",
    version="1.0.0",
    lifespan=lifespan
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers at root
app.include_router(leagues.router)
app.include_router(teams.router)
app.include_router(players.router)
app.include_router(fixtures.router)
app.include_router(live.router)
app.include_router(admin.router)

# Mount API Routers at /beanleague subpath for reverse proxy routing
app.include_router(leagues.router, prefix="/beanleague")
app.include_router(teams.router, prefix="/beanleague")
app.include_router(players.router, prefix="/beanleague")
app.include_router(fixtures.router, prefix="/beanleague")
app.include_router(live.router, prefix="/beanleague")
app.include_router(admin.router, prefix="/beanleague")

@app.get("/")
@app.get("/beanleague")
@app.get("/beanleague/")
async def root():
    return {
        "app": "BeanLeague",
        "version": "1.0.0",
        "description": "High-Performance Login-Less Fantasy Soccer API",
        "status": "healthy",
        "docs_url": "/docs",
        "subpath_docs_url": "/beanleague/docs"
    }

@app.get("/health")
@app.get("/beanleague/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
