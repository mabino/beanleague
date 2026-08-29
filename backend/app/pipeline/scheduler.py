import logging
import aiosqlite
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from ..config import settings
from .seeder import run_daily_seeder
from .poller import run_matchday_poller

logger = logging.getLogger("beanleague.scheduler")

scheduler = AsyncIOScheduler()

async def scheduled_seeder_job():
    """Daily Seeder job scheduled for 03:00 AM."""
    logger.info("Executing scheduled Daily Seeder job...")
    try:
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            await run_daily_seeder(db)
    except Exception as e:
        logger.exception(f"Error during scheduled seeder job: {e}")

async def scheduled_poller_job():
    """Matchday Poller job scheduled every 15-20 minutes."""
    logger.info("Executing scheduled Matchday Poller job...")
    try:
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            await run_matchday_poller(db)
    except Exception as e:
        logger.exception(f"Error during scheduled poller job: {e}")

def start_scheduler():
    """Initializes and starts the background job scheduler."""
    if not settings.ENABLE_SCHEDULER:
        logger.info("Scheduler is disabled in configuration.")
        return

    # 1. Daily Seeder at 03:00 AM
    scheduler.add_job(
        scheduled_seeder_job,
        trigger=CronTrigger(hour=3, minute=0),
        id="daily_seeder",
        name="Daily Seeder (03:00 AM)",
        replace_existing=True
    )

    # 2. Matchday Poller every 15 minutes
    scheduler.add_job(
        scheduled_poller_job,
        trigger=IntervalTrigger(minutes=settings.POLL_INTERVAL_MINUTES),
        id="matchday_poller",
        name=f"Matchday Poller (every {settings.POLL_INTERVAL_MINUTES} min)",
        replace_existing=True
    )

    scheduler.start()
    logger.info(f"Scheduler started with jobs: {[j.name for j in scheduler.get_jobs()]}")

def shutdown_scheduler():
    """Gracefully shuts down the background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shut down successfully.")
