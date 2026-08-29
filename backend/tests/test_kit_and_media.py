import pytest

@pytest.mark.asyncio
async def test_custom_kit_and_player_media(client):
    # 1. Create a league
    await client.post("/api/leagues", json={
        "season_code": "CUSTOM-2026",
        "name": "Custom League",
        "max_teams": 10,
        "salary_cap": 100.0
    })

    # 2. Create a team with a custom kit
    team_resp = await client.post("/api/teams", json={
        "season_code": "CUSTOM-2026",
        "team_name": "Neon Strikers",
        "formation": "4-3-3",
        "kit_config": {
            "primary_color": "#8B5CF6",
            "secondary_color": "#EC4899",
            "pattern": "vertical_stripes",
            "badge_icon": "lightning"
        }
    })
    assert team_resp.status_code == 201
    team_data = team_resp.json()
    pin = team_data["manager_code"]
    team_id = team_data["id"]
    assert team_data["kit_config"]["primary_color"] == "#8B5CF6"

    # 3. Update kit design
    kit_update = await client.put(
        "/api/teams/me/kit",
        headers={"X-Manager-Code": pin},
        json={
            "kit_config": {
                "primary_color": "#3B82F6",
                "secondary_color": "#F59E0B",
                "pattern": "hoops",
                "badge_icon": "dragon"
            }
        }
    )
    assert kit_update.status_code == 200
    assert kit_update.json()["kit_config"]["pattern"] == "hoops"

    # 4. Save a valid roster (11 starting XI, total cost = 81.5 <= 100.0M)
    roster_players = [
        {"player_id": 1, "is_starting_xi": True, "is_captain": True, "slot_position": "GK", "slot_index": 0},
        {"player_id": 10, "is_starting_xi": True, "is_captain": False, "slot_position": "DEF", "slot_index": 1},
        {"player_id": 11, "is_starting_xi": True, "is_captain": False, "slot_position": "DEF", "slot_index": 2},
        {"player_id": 12, "is_starting_xi": True, "is_captain": False, "slot_position": "DEF", "slot_index": 3},
        {"player_id": 20, "is_starting_xi": True, "is_captain": False, "slot_position": "DEF", "slot_index": 4},
        {"player_id": 30, "is_starting_xi": True, "is_captain": False, "slot_position": "MID", "slot_index": 5},
        {"player_id": 31, "is_starting_xi": True, "is_captain": False, "slot_position": "MID", "slot_index": 6},
        {"player_id": 39, "is_starting_xi": True, "is_captain": False, "slot_position": "MID", "slot_index": 7},
        {"player_id": 50, "is_starting_xi": True, "is_captain": False, "slot_position": "FWD", "slot_index": 8},
        {"player_id": 51, "is_starting_xi": True, "is_captain": False, "slot_position": "FWD", "slot_index": 9},
        {"player_id": 52, "is_starting_xi": True, "is_captain": False, "slot_position": "FWD", "slot_index": 10}
    ]
    roster_save = await client.put(
        "/api/teams/me/roster",
        headers={"X-Manager-Code": pin},
        json={"formation": "4-3-3", "players": roster_players}
    )
    assert roster_save.status_code == 200

    # 5. Embed 2 YouTube highlight videos and a note for player #50 (Lamine Yamal)
    media_save = await client.put(
        "/api/teams/me/players/50/media",
        headers={"X-Manager-Code": pin},
        json={
            "youtube_links": [
                {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "video_id": "dQw4w9WgXcQ", "title": "Insane Goal vs City"},
                {"url": "https://youtu.be/9bZkp7q19f0", "video_id": "9bZkp7q19f0", "title": "Top 10 Assists 2026"}
            ],
            "custom_notes": "Key playmaker for big matchdays."
        }
    )
    assert media_save.status_code == 200
    assert len(media_save.json()["youtube_links"]) == 2

    # 6. Public Scout endpoint for this team
    scout_resp = await client.get(f"/api/teams/{team_id}")
    assert scout_resp.status_code == 200
    scout_data = scout_resp.json()
    assert scout_data["team_name"] == "Neon Strikers"
    assert scout_data["kit_config"]["badge_icon"] == "dragon"
    assert scout_data["kit_config"]["pattern"] == "hoops"

    # Find player 50 in scouted roster
    p50 = next(p for p in scout_data["players"] if p["player_id"] == 50)
    assert len(p50["youtube_links"]) == 2
    assert p50["youtube_links"][0]["video_id"] == "dQw4w9WgXcQ"
    assert p50["custom_notes"] == "Key playmaker for big matchdays."

    # 7. Reject more than 3 videos
    excess_media = await client.put(
        "/api/teams/me/players/50/media",
        headers={"X-Manager-Code": pin},
        json={
            "youtube_links": [
                {"url": "https://www.youtube.com/watch?v=1", "video_id": "1"},
                {"url": "https://www.youtube.com/watch?v=2", "video_id": "2"},
                {"url": "https://www.youtube.com/watch?v=3", "video_id": "3"},
                {"url": "https://www.youtube.com/watch?v=4", "video_id": "4"}
            ]
        }
    )
    assert excess_media.status_code in (400, 422)
