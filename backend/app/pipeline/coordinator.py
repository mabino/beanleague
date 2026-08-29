import logging
from typing import List, Tuple, Optional
from .adapters import (
    BaseSportsAdapter,
    NormalizedFixture,
    NormalizedPlayer,
    ApiFootballAdapter,
    FootballDataAdapter,
    TheSportsDbAdapter,
    OpenFootballAdapter
)
from .reconciler import reconcile_fixtures

logger = logging.getLogger("beanleague.coordinator")

class IngestCoordinator:
    """
    Coordinates multi-source ranked ingestion.
    Falls back gracefully across providers upon rate-limits or season restrictions.
    """

    def __init__(self):
        # Register adapters in priority order
        self.adapters: List[BaseSportsAdapter] = [
            ApiFootballAdapter(),
            FootballDataAdapter(),
            TheSportsDbAdapter(),
            OpenFootballAdapter()
        ]
        # Sort by rank
        self.adapters.sort(key=lambda a: a.rank)

    async def fetch_fixtures(self, league_id: int, season: int) -> Tuple[List[NormalizedFixture], str]:
        """
        Attempts to fetch fixtures from highest-ranked configured adapter,
        falling back through the chain if rate-limited or empty.
        """
        all_fixtures: List[NormalizedFixture] = []
        winning_source = "none"

        for adapter in self.adapters:
            if not adapter.is_configured():
                logger.debug(f"Adapter '{adapter.name}' is not configured. Skipping.")
                continue

            try:
                logger.info(f"Attempting fixture fetch from Rank {adapter.rank} adapter: '{adapter.name}' (League: {league_id}, Season: {season})")
                fixtures = await adapter.fetch_fixtures(league_id, season)
                if fixtures:
                    logger.info(f"Successfully ingested {len(fixtures)} fixtures from provider '{adapter.name}'.")
                    all_fixtures.extend(fixtures)
                    winning_source = adapter.name
                    break
                else:
                    logger.warning(f"Provider '{adapter.name}' returned 0 fixtures. Trying next provider in hierarchy...")
            except Exception as e:
                logger.exception(f"Provider '{adapter.name}' failed with error: {e}. Falling back to next provider...")

        reconciled = reconcile_fixtures(all_fixtures)
        return reconciled, winning_source

    async def fetch_today_live_fixtures(self, league_ids: List[int]) -> List[NormalizedFixture]:
        """Fetches today's live/scheduled fixtures across all active providers."""
        all_today: List[NormalizedFixture] = []
        for adapter in self.adapters:
            if not adapter.is_configured():
                continue
            if hasattr(adapter, "fetch_today_events"):
                for lg in league_ids:
                    try:
                        matches = await adapter.fetch_today_events(lg)
                        if matches:
                            all_today.extend(matches)
                    except Exception as e:
                        logger.warning(f"Error fetching today events from {adapter.name}: {e}")
        return reconcile_fixtures(all_today)
