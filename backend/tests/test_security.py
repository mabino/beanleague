import pytest

@pytest.mark.asyncio
async def test_security_headers(client):
    """Verify essential security headers are injected in all responses."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "SAMEORIGIN"
    assert resp.headers.get("X-XSS-Protection") == "1; mode=block"
    assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"

@pytest.mark.asyncio
async def test_admin_pin_timing_safe_auth(client):
    """Verify Admin PIN requires exact matching and returns 401 on bad pin."""
    # Bad PIN
    resp = await client.post("/api/admin/verify", headers={"X-Admin-PIN": "WRONG-PIN-1234"})
    assert resp.status_code == 401
    assert "Invalid or missing Admin Security PIN" in resp.json()["detail"]

    # Valid PIN
    resp_ok = await client.post("/api/admin/verify", headers={"X-Admin-PIN": "BEAN-ADMIN-2026"})
    assert resp_ok.status_code == 200
    assert resp_ok.json()["success"] is True

@pytest.mark.asyncio
async def test_media_input_sanitization_and_validation(client):
    """Verify strict YouTube video ID validation and script escaping in notes."""
    # Create team
    t_resp = await client.post("/api/teams", json={
        "season_code": "BARCA-2026",
        "team_name": "Security Test Club",
        "formation": "4-3-3"
    })
    assert t_resp.status_code == 201
    pin = t_resp.json()["manager_code"]

    # Save a player on roster
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
        headers={"Authorization": f"Bearer {pin}"},
        json={"formation": "4-3-3", "players": roster_players}
    )
    assert r_resp.status_code == 200

    # 1. Attempt invalid video ID format (e.g. javascript/xss or non-11 chars)
    bad_media = await client.put(
        "/api/teams/me/players/50/media",
        headers={"Authorization": f"Bearer {pin}"},
        json={
            "youtube_links": [
                {"url": "javascript:alert(1)", "video_id": "bad_id_too_short", "title": "<script>alert(1)</script>"}
            ],
            "custom_notes": "<b>Dangerous script</b> <script>stealCookies()</script>"
        }
    )
    assert bad_media.status_code == 422 or bad_media.status_code == 400

    # 2. Valid video ID with HTML characters in title and notes (should be safely escaped)
    good_media = await client.put(
        "/api/teams/me/players/50/media",
        headers={"Authorization": f"Bearer {pin}"},
        json={
            "youtube_links": [
                {"url": "https://youtu.be/dQw4w9WgXcQ", "video_id": "dQw4w9WgXcQ", "title": "<b>Cool Goals</b>"}
            ],
            "custom_notes": "Great player & <fast> dribbler."
        }
    )
    assert good_media.status_code == 200
    media_data = good_media.json()
    assert "&lt;b&gt;Cool Goals&lt;/b&gt;" in media_data["youtube_links"][0]["title"]
    assert "&lt;fast&gt;" in media_data["custom_notes"]

@pytest.mark.asyncio
async def test_league_input_validation(client):
    """Verify invalid league season codes are rejected."""
    # Invalid characters in season_code
    bad_league = await client.post("/api/leagues", json={
        "season_code": "INVALID CODE WITH SPACES & $PECIAL",
        "name": "Bad League",
        "salary_cap": 100.0
    })
    assert bad_league.status_code == 422
