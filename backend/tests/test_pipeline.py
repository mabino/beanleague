import pytest
from datetime import date
from backend.app.pipeline.api_client import ApiFootballClient
from backend.app.pipeline.seeder import run_daily_seeder
from backend.app.pipeline.poller import run_matchday_poller, simulate_live_tick
from backend.app.pipeline.scoring import run_scoring_engine

@pytest.mark.asyncio
async def test_api_rate_limiter(db_conn):
    client = ApiFootballClient()
    today_str = date.today().isoformat()
    
    # Check initial usage
    used = await client.get_today_usage(db_conn)
    assert used >= 0
    
    # Log requests up to the daily limit (100)
    for i in range(10):
        await client.log_request(db_conn, endpoint="fixtures", status_code=200, cost=1)
        
    updated_used = await client.get_today_usage(db_conn)
    assert updated_used == used + 10

@pytest.mark.asyncio
async def test_daily_seeder_and_scoring(db_conn):
    result = await run_daily_seeder(db_conn, force_mock=True)
    assert result["status"] == "success"
    
    # Verify players exist
    cursor = await db_conn.execute("SELECT COUNT(*) FROM players")
    count = (await cursor.fetchone())[0]
    assert count >= 20

    # Run scoring engine
    scoring_res = await run_scoring_engine(db_conn)
    assert scoring_res["status"] == "success"
    assert scoring_res["updated_player_stats"] > 0

@pytest.mark.asyncio
async def test_simulation_tick(db_conn):
    sim_res = await simulate_live_tick(db_conn)
    assert sim_res["status"] == "success"
    assert "simulated_event" in sim_res
    assert sim_res["simulated_event"]["points_delta"] != 0 or sim_res["simulated_event"]["event_type"] is not None
