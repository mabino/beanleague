import pytest
import json

@pytest.mark.asyncio
async def test_admin_export_and_clear_endpoints(client):
    admin_headers = {"X-Admin-PIN": "BEAN-ADMIN-2026"}

    # 1. Create a couple of teams in season BARCA-2026
    t1_resp = await client.post("/api/teams", json={
        "season_code": "BARCA-2026",
        "team_name": "Export Test Club A",
        "formation": "4-3-3",
        "kit_config": {
            "primary_color": "#10B981",
            "secondary_color": "#0F172A",
            "pattern": "hoops",
            "badge_icon": "star"
        }
    })
    assert t1_resp.status_code == 201
    t1 = t1_resp.json()
    t1_id = t1["id"]
    t1_pin = t1["manager_code"]

    t2_resp = await client.post("/api/teams", json={
        "season_code": "BARCA-2026",
        "team_name": "Export Test Club B",
        "formation": "4-3-3",
    })
    assert t2_resp.status_code == 201
    t2 = t2_resp.json()
    t2_id = t2["id"]

    # 2. Add valid 11-player roster and media for t1
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

    r_resp = await client.put(
        "/api/teams/me/roster",
        headers={"Authorization": f"Bearer {t1_pin}"},
        json={
            "formation": "4-3-3",
            "players": roster_players
        }
    )
    assert r_resp.status_code == 200

    # Add media
    m_resp = await client.put(
        "/api/teams/me/players/50/media",
        headers={"Authorization": f"Bearer {t1_pin}"},
        json={
            "youtube_links": [
                {"url": "https://youtu.be/dQw4w9WgXcQ", "video_id": "dQw4w9WgXcQ", "title": "Great Goals 2026"}
            ],
            "custom_notes": "Star winger."
        }
    )
    assert m_resp.status_code == 200

    # 3. Export all user data (Unauthorized test)
    unauth_exp = await client.get("/api/admin/export")
    assert unauth_exp.status_code == 401

    # 4. Export all user data (Authorized)
    exp_resp = await client.get("/api/admin/export", headers=admin_headers)
    assert exp_resp.status_code == 200
    assert "attachment; filename=" in exp_resp.headers.get("Content-Disposition", "")
    
    export_json = exp_resp.json()
    assert "export_metadata" in export_json
    assert "seasons" in export_json
    assert export_json["export_metadata"]["total_teams"] >= 2
    
    # Check that t1 has kit_config and roster in the dump
    season_barca = next(s for s in export_json["seasons"] if s["season_code"] == "BARCA-2026")
    exported_t1 = next(t for t in season_barca["teams"] if t["team_id"] == t1_id)
    assert exported_t1["team_name"] == "Export Test Club A"
    assert exported_t1["kit_config"]["pattern"] == "hoops"
    assert len(exported_t1["roster"]) == 11
    p50 = next(p for p in exported_t1["roster"] if p["player_id"] == 50)
    assert len(p50["youtube_links"]) == 1
    assert p50["custom_notes"] == "Star winger."

    # 5. Test GET /api/admin/seasons
    seasons_resp = await client.get("/api/admin/seasons", headers=admin_headers)
    assert seasons_resp.status_code == 200
    seasons = seasons_resp.json()
    barca_season = next(s for s in seasons if s["season_code"] == "BARCA-2026")
    assert barca_season["teams_count"] >= 2

    # 6. Test Delete Individual Team (t2)
    del_t2_resp = await client.delete(f"/api/admin/teams/{t2_id}", headers=admin_headers)
    assert del_t2_resp.status_code == 200
    assert del_t2_resp.json()["success"] is True

    # Verify t2 is gone
    pub_t2 = await client.get(f"/api/teams/{t2_id}")
    assert pub_t2.status_code == 404

    # 7. Test Clear Season (BARCA-2026)
    clear_season_resp = await client.delete("/api/admin/seasons/BARCA-2026", headers=admin_headers)
    assert clear_season_resp.status_code == 200

    # Verify season has 0 teams now
    seasons_after = (await client.get("/api/admin/seasons", headers=admin_headers)).json()
    barca_after = next(s for s in seasons_after if s["season_code"] == "BARCA-2026")
    assert barca_after["teams_count"] == 0

    # 8. Test Clear All Users Across All Seasons
    clear_all_resp = await client.delete("/api/admin/clear-all-users", headers=admin_headers)
    assert clear_all_resp.status_code == 200
    assert clear_all_resp.json()["success"] is True
