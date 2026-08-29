import pytest
from app.pipeline.reconciler import normalize_team_name, make_fixture_fingerprint, reconcile_fixtures
from app.pipeline.adapters.base import NormalizedFixture
from app.pipeline.coordinator import IngestCoordinator
from app.pipeline.adapters import TheSportsDbAdapter, OpenFootballAdapter, ApiFootballAdapter

def test_team_normalization():
    assert normalize_team_name("Manchester City FC") == "Manchester City"
    assert normalize_team_name("Man City") == "Manchester City"
    assert normalize_team_name("Arsenal FC") == "Arsenal"
    assert normalize_team_name("FC Barcelona") == "Barcelona"
    assert normalize_team_name("Real Madrid CF") == "Real Madrid"
    assert normalize_team_name("Wolverhampton Wanderers") == "Wolves"

def test_fixture_fingerprint_and_reconciliation():
    f1 = NormalizedFixture(
        id=101,
        league_id=39,
        round="Matchday 1",
        home_team_id=1,
        home_team_name="Man City",
        home_team_logo="https://example.com/mc.png",
        away_team_id=2,
        away_team_name="Chelsea FC",
        away_team_logo="https://example.com/cfc.png",
        kickoff_time="2026-08-29T15:00:00Z",
        status="Scheduled",
        home_score=0,
        away_score=0,
        source="thesportsdb"
    )

    f2 = NormalizedFixture(
        id=201,
        league_id=39,
        round="Regular Season - 1",
        home_team_id=50,
        home_team_name="Manchester City FC",
        home_team_logo=None,
        away_team_id=49,
        away_team_name="Chelsea",
        away_team_logo=None,
        kickoff_time="2026-08-29T15:00:00Z",
        status="In-Play",
        home_score=2,
        away_score=1,
        source="open_football"
    )

    reconciled = reconcile_fixtures([f1, f2])
    assert len(reconciled) == 1
    match = reconciled[0]
    assert match.home_team_name == "Manchester City"
    assert match.away_team_name == "Chelsea"
    assert match.home_team_logo == "https://example.com/mc.png"
    assert match.status == "In-Play"
    assert match.home_score == 2
    assert match.away_score == 1

def test_coordinator_adapter_ordering():
    coordinator = IngestCoordinator()
    ranks = [a.rank for a in coordinator.adapters]
    assert ranks == sorted(ranks)
    assert coordinator.adapters[0].name == "api_football"
    assert coordinator.adapters[1].name == "football_data"
    assert coordinator.adapters[2].name == "thesportsdb"
    assert coordinator.adapters[3].name == "open_football"
