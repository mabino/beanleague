import pytest

@pytest.mark.asyncio
async def test_health_and_root(client):
    res = await client.get("/")
    assert res.status_code == 200
    assert res.json()["app"] == "BeanLeague"

    health = await client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_leagues_and_standings_flow(client):
    # 1. Create a new league
    create_resp = await client.post("/api/leagues", json={
        "season_code": "TEST-2026",
        "name": "Test Cup 2026",
        "max_teams": 10,
        "salary_cap": 100.0
    })
    assert create_resp.status_code == 201
    league = create_resp.json()
    assert league["season_code"] == "TEST-2026"

    # 2. Fetch league by code
    get_resp = await client.get("/api/leagues/TEST-2026")
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Test Cup 2026"

    # 3. Create a team in this league
    team_resp = await client.post("/api/teams", json={
        "season_code": "TEST-2026",
        "team_name": "Test United",
        "formation": "4-3-3"
    })
    assert team_resp.status_code == 201
    team_data = team_resp.json()
    pin = team_data["manager_code"]
    assert pin is not None
    assert "-" in pin

    # 4. Login via PIN
    login_resp = await client.post("/api/teams/login", json={"manager_code": pin})
    assert login_resp.status_code == 200
    assert login_resp.json()["team_name"] == "Test United"

    # 5. Fetch standings
    standings_resp = await client.get("/api/leagues/TEST-2026/standings")
    assert standings_resp.status_code == 200
    standings = standings_resp.json()
    assert standings["season_code"] == "TEST-2026"
    assert len(standings["standings"]) >= 1

@pytest.mark.asyncio
async def test_player_directory_and_fixtures(client):
    # List players
    p_resp = await client.get("/api/players?limit=10")
    assert p_resp.status_code == 200
    players = p_resp.json()
    assert len(players) > 0
    first_player = players[0]
    assert "name" in first_player
    assert "current_price" in first_player

    # Filter players by position
    fwd_resp = await client.get("/api/players?position=FWD")
    assert fwd_resp.status_code == 200
    for p in fwd_resp.json():
        assert p["position"] == "FWD"

    # List fixtures
    fix_resp = await client.get("/api/fixtures")
    assert fix_resp.status_code == 200
    fixtures = fix_resp.json()
    assert len(fixtures) > 0

@pytest.mark.asyncio
async def test_roster_save_flow(client):
    # Create team
    t_resp = await client.post("/api/teams", json={
        "season_code": "BARCA-2026",
        "team_name": "Roster Wizards",
        "formation": "4-3-3"
    })
    assert t_resp.status_code == 201
    pin = t_resp.json()["manager_code"]
    headers = {"Authorization": f"Bearer {pin}"}

    # Save valid 4-3-3 roster
    roster_payload = {
        "formation": "4-3-3",
        "players": [
            {"player_id": 1, "is_starting_xi": True, "is_captain": False, "slot_position": "GK", "slot_index": 0},
            {"player_id": 10, "is_starting_xi": True, "is_captain": False, "slot_position": "DEF", "slot_index": 1},
            {"player_id": 11, "is_starting_xi": True, "is_captain": False, "slot_position": "DEF", "slot_index": 2},
            {"player_id": 12, "is_starting_xi": True, "is_captain": False, "slot_position": "DEF", "slot_index": 3},
            {"player_id": 13, "is_starting_xi": True, "is_captain": False, "slot_position": "DEF", "slot_index": 4},
            {"player_id": 30, "is_starting_xi": True, "is_captain": False, "slot_position": "MID", "slot_index": 5},
            {"player_id": 31, "is_starting_xi": True, "is_captain": False, "slot_position": "MID", "slot_index": 6},
            {"player_id": 32, "is_starting_xi": True, "is_captain": False, "slot_position": "MID", "slot_index": 7},
            {"player_id": 50, "is_starting_xi": True, "is_captain": True, "slot_position": "FWD", "slot_index": 8},
            {"player_id": 51, "is_starting_xi": True, "is_captain": False, "slot_position": "FWD", "slot_index": 9},
            {"player_id": 52, "is_starting_xi": True, "is_captain": False, "slot_position": "FWD", "slot_index": 10},
        ]
    }
    save_resp = await client.put("/api/teams/me/roster", json=roster_payload, headers=headers)
    assert save_resp.status_code == 200

    # Fetch team roster
    me_resp = await client.get("/api/teams/me", headers=headers)
    assert me_resp.status_code == 200
    my_roster = me_resp.json()
    assert len(my_roster["players"]) == 11
    assert my_roster["formation"] == "4-3-3"
    assert my_roster["total_cost"] <= 100.0

@pytest.mark.asyncio
async def test_admin_api_usage_and_simulation(client):
    usage_resp = await client.get("/api/admin/usage")
    assert usage_resp.status_code == 200
    usage = usage_resp.json()
    assert usage["daily_limit"] == 100

    sim_resp = await client.post("/api/admin/simulate-tick")
    assert sim_resp.status_code == 200
    assert sim_resp.json()["message"] == "Simulated match tick executed"
