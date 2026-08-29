import pytest

@pytest.mark.asyncio
async def test_team_code_recovery_flow(client):
    # 1. Create a league
    await client.post("/api/leagues", json={
        "season_code": "RECOVER-2026",
        "name": "Recovery League 2026",
        "max_teams": 10,
        "salary_cap": 100.0
    })

    # 2. Create team with 3 Security Players and Secret Word
    team_resp = await client.post("/api/teams", json={
        "season_code": "RECOVER-2026",
        "team_name": "Vault Strikers",
        "formation": "4-3-3",
        "recovery_player_1_id": 101,
        "recovery_player_2_id": 102,
        "recovery_player_3_id": 103,
        "secret_word": "golden-dragon"
    })
    assert team_resp.status_code == 201
    created = team_resp.json()
    original_pin = created["manager_code"]

    # 3. Successful recovery with exact 3 players and word
    recover_resp = await client.post("/api/teams/recover", json={
        "season_code": "RECOVER-2026",
        "player_1_id": 101,
        "player_2_id": 102,
        "player_3_id": 103,
        "secret_word": "GOLDEN-DRAGON"  # Case-insensitive
    })
    assert recover_resp.status_code == 200
    rec_data = recover_resp.json()
    assert rec_data["success"] is True
    assert rec_data["manager_code"] == original_pin
    assert rec_data["team_name"] == "Vault Strikers"

    # 4. Failure when player order is wrong
    wrong_order = await client.post("/api/teams/recover", json={
        "season_code": "RECOVER-2026",
        "player_1_id": 102,  # Swapped
        "player_2_id": 101,
        "player_3_id": 103,
        "secret_word": "golden-dragon"
    })
    assert wrong_order.status_code in (400, 404)

    # 5. Failure when secret word is wrong
    wrong_word = await client.post("/api/teams/recover", json={
        "season_code": "RECOVER-2026",
        "player_1_id": 101,
        "player_2_id": 102,
        "player_3_id": 103,
        "secret_word": "wrong-word"
    })
    assert wrong_word.status_code in (400, 404)
