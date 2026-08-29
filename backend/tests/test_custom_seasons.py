import pytest

@pytest.mark.asyncio
async def test_user_season_creation_and_listing(client):
    # 1. List existing leagues
    list_resp = await client.get("/api/leagues")
    assert list_resp.status_code == 200
    leagues = list_resp.json()
    assert isinstance(leagues, list)
    assert any(l["season_code"] == "BARCA-2026" for l in leagues)

    # 2. User creates their own custom season
    custom_season = {
        "season_code": "CHAMPIONS-2026",
        "name": "Champions Fantasy Cup",
        "max_teams": 12,
        "salary_cap": 120.0
    }
    create_resp = await client.post("/api/leagues", json=custom_season)
    assert create_resp.status_code == 201
    created_league = create_resp.json()
    assert created_league["season_code"] == "CHAMPIONS-2026"
    assert created_league["name"] == "Champions Fantasy Cup"
    assert created_league["salary_cap"] == 120.0

    # 3. Founding user creates team in their new custom season
    team_resp = await client.post("/api/teams", json={
        "season_code": "CHAMPIONS-2026",
        "team_name": "Galactic Dynamos FC",
        "formation": "3-5-2"
    })
    assert team_resp.status_code == 201
    team_data = team_resp.json()
    assert team_data["team_name"] == "Galactic Dynamos FC"
    assert team_data["season_code"] == "CHAMPIONS-2026"
    assert "manager_code" in team_data

    # 4. Check that GET /api/leagues now lists the new custom season with team_count = 1
    updated_list = (await client.get("/api/leagues")).json()
    found = next(l for l in updated_list if l["season_code"] == "CHAMPIONS-2026")
    assert found["name"] == "Champions Fantasy Cup"
    assert found["team_count"] == 1
    assert found["salary_cap"] == 120.0

    # 5. Check duplicate season code prevention
    dup_resp = await client.post("/api/leagues", json=custom_season)
    assert dup_resp.status_code == 400
    assert "already exists" in dup_resp.json()["detail"]
