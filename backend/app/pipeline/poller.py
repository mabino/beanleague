import aiosqlite
import logging
import random
from typing import Dict, Any, List
from .api_client import ApiFootballClient
from .scoring import run_scoring_engine, broadcast_event
from ..config import settings

logger = logging.getLogger("beanleague.poller")

async def run_matchday_poller(db: aiosqlite.Connection) -> Dict[str, Any]:
    """
    Matchday Poller:
    - Reads local fixtures table for In-Play matches.
    - If active matches exist, polls statistics & events from API-Football (if key configured).
    - Writes events and player stats to SQLite.
    - Triggers the Scoring Engine immediately.
    """
    # 1. Check local fixtures table for active matches
    cursor = await db.execute(
        "SELECT id, home_team_name, away_team_name, status FROM fixtures WHERE status = 'In-Play'"
    )
    active_fixtures = await cursor.fetchall()
    
    if not active_fixtures:
        logger.info("Matchday Poller: No matches currently 'In-Play'. Standing by.")
        return {"status": "idle", "active_matches": 0}

    logger.info(f"Matchday Poller: Found {len(active_fixtures)} In-Play match(es). Polling stats...")
    client = ApiFootballClient()
    polled_count = 0

    if settings.API_FOOTBALL_KEY:
        for fix in active_fixtures:
            fixture_id = fix["id"]
            
            # Fetch events
            events_resp = await client.fetch("fixtures/events", params={"fixture": fixture_id}, db=db)
            if events_resp and "response" in events_resp:
                for ev in events_resp["response"]:
                    player = ev.get("player", {})
                    p_id = player.get("id")
                    ev_type = ev.get("type", "").lower()
                    ev_detail = ev.get("detail", "")
                    time_elapsed = ev.get("time", {}).get("elapsed", 0)
                    
                    if p_id:
                        # Check if player exists in directory
                        p_cur = await db.execute("SELECT id FROM players WHERE id = ?", (p_id,))
                        if await p_cur.fetchone():
                            # Record match event
                            norm_type = "goal" if "goal" in ev_type else ("yellow_card" if "card" in ev_type and "yellow" in ev_detail.lower() else ("red_card" if "red" in ev_detail.lower() else "sub"))
                            await db.execute(
                                "INSERT INTO match_events (fixture_id, player_id, event_type, minute, detail) VALUES (?, ?, ?, ?, ?)",
                                (fixture_id, p_id, norm_type, time_elapsed, ev_detail)
                            )
            polled_count += 1

    # 2. Run scoring engine immediately after poller
    scoring_result = await run_scoring_engine(db)
    
    return {
        "status": "success",
        "active_matches": len(active_fixtures),
        "polled_count": polled_count,
        "scoring_result": scoring_result
    }

async def simulate_live_tick(db: aiosqlite.Connection) -> Dict[str, Any]:
    """
    Simulates a live match tick for demonstration / testing:
    - Randomly picks an In-Play match and a player.
    - Generates a goal, assist, save, clean sheet, or card event.
    - Updates player_match_stats.
    - Triggers scoring engine and broadcasts SSE event with points delta.
    """
    cursor = await db.execute("SELECT id, home_team_name, away_team_name, home_score, away_score FROM fixtures WHERE status = 'In-Play'")
    fixtures = await cursor.fetchall()
    
    if not fixtures:
        # Toggle a scheduled fixture to In-Play
        await db.execute("UPDATE fixtures SET status = 'In-Play' WHERE status = 'Scheduled' LIMIT 1")
        await db.commit()
        cursor = await db.execute("SELECT id, home_team_name, away_team_name, home_score, away_score FROM fixtures WHERE status = 'In-Play'")
        fixtures = await cursor.fetchall()
        
    if not fixtures:
        return {"status": "no_fixtures"}

    target_fixture = random.choice(fixtures)
    fix_id = target_fixture["id"]

    # Pick a random player
    p_cursor = await db.execute("SELECT id, name, position, real_team_name FROM players ORDER BY RANDOM() LIMIT 1")
    player = await p_cursor.fetchone()
    if not player:
        return {"status": "no_players"}

    p_id = player["id"]
    p_name = player["name"]
    p_pos = player["position"]

    # Choose an event
    event_choices = ["goal", "assist", "save", "yellow_card"] if p_pos == "GK" else (["goal", "assist", "yellow_card"] if p_pos in ("MID", "FWD") else ["goal", "clean_sheet", "yellow_card"])
    chosen_event = random.choice(event_choices)
    minute = random.randint(15, 89)

    # Fetch existing stats
    stat_cur = await db.execute("SELECT * FROM player_match_stats WHERE player_id = ? AND fixture_id = ?", (p_id, fix_id))
    stat_row = await stat_cur.fetchone()
    
    current_goals = stat_row["goals"] if stat_row else 0
    current_assists = stat_row["assists"] if stat_row else 0
    current_saves = stat_row["saves"] if stat_row else 0
    current_clean_sheet = stat_row["clean_sheet"] if stat_row else 0
    current_yellows = stat_row["yellow_cards"] if stat_row else 0
    current_minutes = stat_row["minutes_played"] if stat_row else 75

    points_delta = 0
    detail_msg = ""

    if chosen_event == "goal":
        current_goals += 1
        points_delta = 6 if p_pos in ("GK", "DEF") else (5 if p_pos == "MID" else 4)
        detail_msg = f"⚽ GOAL! {p_name} ({player['real_team_name']}) scores in min {minute}'! (+{points_delta} pts)"
        # Update score
        await db.execute("UPDATE fixtures SET home_score = home_score + 1 WHERE id = ?", (fix_id,))
    elif chosen_event == "assist":
        current_assists += 1
        points_delta = 3
        detail_msg = f"👟 ASSIST! Brilliant pass by {p_name}! (+3 pts)"
    elif chosen_event == "clean_sheet":
        current_clean_sheet = 1
        points_delta = 4 if p_pos in ("GK", "DEF") else 1
        detail_msg = f"🛡️ CLEAN SHEET! Solid defense by {p_name}! (+{points_delta} pts)"
    elif chosen_event == "save":
        current_saves += 3
        points_delta = 1
        detail_msg = f"🧤 BIG SAVE! {p_name} denies a top-corner shot! (+1 pt)"
    elif chosen_event == "yellow_card":
        current_yellows += 1
        points_delta = -1
        detail_msg = f"🟨 YELLOW CARD for {p_name} ({minute}'). (-1 pt)"

    await db.execute(
        """
        INSERT INTO player_match_stats (player_id, fixture_id, minutes_played, goals, assists, saves, clean_sheet, yellow_cards)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(player_id, fixture_id) DO UPDATE SET
            goals = excluded.goals,
            assists = excluded.assists,
            saves = excluded.saves,
            clean_sheet = excluded.clean_sheet,
            yellow_cards = excluded.yellow_cards,
            updated_at = CURRENT_TIMESTAMP
        """,
        (p_id, fix_id, current_minutes, current_goals, current_assists, current_saves, current_clean_sheet, current_yellows)
    )

    # Insert into match_events
    await db.execute(
        "INSERT INTO match_events (fixture_id, player_id, event_type, minute, detail) VALUES (?, ?, ?, ?, ?)",
        (fix_id, p_id, chosen_event, minute, detail_msg)
    )
    await db.commit()

    # Run scoring engine
    await run_scoring_engine(db)

    # Broadcast event to frontend via SSE
    event_payload = {
        "event_type": chosen_event,
        "fixture_id": fix_id,
        "fixture_summary": f"{target_fixture['home_team_name']} vs {target_fixture['away_team_name']}",
        "player_id": p_id,
        "player_name": p_name,
        "player_team": player["real_team_name"],
        "position": p_pos,
        "minute": minute,
        "detail": detail_msg,
        "points_delta": points_delta,
        "timestamp": ""
    }
    await broadcast_event(event_payload)

    return {
        "status": "success",
        "simulated_event": event_payload
    }
