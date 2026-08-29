import aiosqlite
import logging
from typing import Dict, Any, Optional
from datetime import datetime, date
from .api_client import ApiFootballClient
from .mock_data import MOCK_LEAGUES, MOCK_PLAYERS, MOCK_FIXTURES
from .scoring import run_scoring_engine
from ..config import settings

logger = logging.getLogger("beanleague.seeder")

async def run_daily_seeder(db: aiosqlite.Connection, force_mock: bool = False) -> Dict[str, Any]:
    """
    Daily Seeder:
    Runs at 03:00 AM (or on startup).
    Fetches day's fixtures and squad lists (Cost: 2-5 API requests).
    Decoupled from frontend, writes only to SQLite.
    """
    logger.info("Starting Daily Seeder...")
    client = ApiFootballClient()
    
    # 1. Seed Default Leagues
    for league in MOCK_LEAGUES:
        await db.execute(
            """
            INSERT INTO leagues (id, season_code, name, max_teams, salary_cap)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                salary_cap = excluded.salary_cap
            """,
            (league["id"], league["season_code"], league["name"], league["max_teams"], league["salary_cap"])
        )
    await db.commit()

    # 2. Check if we should fetch from API-Football
    used_api = False
    if settings.API_FOOTBALL_KEY and not force_mock:
        # Check quota
        used_today = await client.get_today_usage(db)
        if used_today < settings.API_DAILY_LIMIT:
            logger.info("Fetching fixtures and players from external API-Football...")
            today = date.today()
            from datetime import timedelta
            from_date = (today - timedelta(days=3)).isoformat()
            to_date = (today + timedelta(days=4)).isoformat()

            # Helper to parse and insert fixture records
            async def insert_fixture_items(items):
                nonlocal used_api
                if not items:
                    return
                used_api = True
                for item in items:
                    fix = item.get("fixture", {})
                    teams = item.get("teams", {})
                    goals = item.get("goals", {})
                    lg = item.get("league", {})
                    
                    status_short = fix.get("status", {}).get("short", "NS")
                    if status_short in ("1H", "2H", "HT", "ET", "P", "LIVE"):
                        mapped_status = "In-Play"
                    elif status_short in ("FT", "AET", "PEN"):
                        mapped_status = "Finished"
                    else:
                        mapped_status = "Scheduled"

                    await db.execute(
                        """
                        INSERT INTO fixtures (id, league_id, round, home_team_id, home_team_name, home_team_logo,
                                              away_team_id, away_team_name, away_team_logo, kickoff_time, status, home_score, away_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                            round = excluded.round,
                            home_score = excluded.home_score,
                            away_score = excluded.away_score,
                            status = excluded.status,
                            updated_at = CURRENT_TIMESTAMP
                        """,
                        (
                            fix.get("id"),
                            lg.get("id", league_id),
                            lg.get("round", "Regular Season"),
                            teams.get("home", {}).get("id", 0),
                            teams.get("home", {}).get("name", "Home Team"),
                            teams.get("home", {}).get("logo"),
                            teams.get("away", {}).get("id", 0),
                            teams.get("away", {}).get("name", "Away Team"),
                            teams.get("away", {}).get("logo"),
                            fix.get("date", today.isoformat()),
                            mapped_status,
                            goals.get("home", 0) or 0,
                            goals.get("away", 0) or 0
                        )
                    )
                await db.commit()

            # Fetch fixtures for target leagues across the weekly window
            for league_id in settings.TARGET_LEAGUE_IDS:
                resp = await client.fetch(
                    "fixtures",
                    params={"league": league_id, "season": settings.TARGET_SEASON, "from": from_date, "to": to_date},
                    db=db
                )
                items = resp.get("response", []) if resp else []
                
                # If no fixtures found in exact date window, fetch next and recent matches
                if not items:
                    next_resp = await client.fetch(
                        "fixtures",
                        params={"league": league_id, "next": 5},
                        db=db
                    )
                    if next_resp and next_resp.get("response"):
                        items.extend(next_resp["response"])
                        
                    last_resp = await client.fetch(
                        "fixtures",
                        params={"league": league_id, "last": 5},
                        db=db
                    )
                    if last_resp and last_resp.get("response"):
                        items.extend(last_resp["response"])

                await insert_fixture_items(items)

            # Fetch live team squads from API-Football for real player directory
            TARGET_TEAMS = [
                {"id": 529, "name": "Barcelona"},
                {"id": 541, "name": "Real Madrid"},
                {"id": 50, "name": "Manchester City"},
                {"id": 42, "name": "Arsenal"},
                {"id": 40, "name": "Liverpool"},
                {"id": 49, "name": "Chelsea"},
                {"id": 530, "name": "Atletico Madrid"},
                {"id": 157, "name": "Bayern Munich"},
                {"id": 489, "name": "Paris Saint Germain"},
                {"id": 496, "name": "Inter"}
            ]

            POS_MAP = {
                "Goalkeeper": "GK",
                "Defender": "DEF",
                "Midfielder": "MID",
                "Attacker": "FWD"
            }

            BASE_PRICES = {
                "GK": 5.5,
                "DEF": 6.0,
                "MID": 7.5,
                "FWD": 8.5
            }

            STAR_PRICES = {p["id"]: p["current_price"] for p in MOCK_PLAYERS}

            for team in TARGET_TEAMS:
                used_now = await client.get_today_usage(db)
                if used_now >= settings.API_DAILY_LIMIT - 5:
                    logger.warning("Approaching daily API limit; stopping squad ingestion.")
                    break

                squad_resp = await client.fetch(
                    "players/squads",
                    params={"team": team["id"]},
                    db=db
                )
                if squad_resp and "response" in squad_resp and squad_resp["response"]:
                    used_api = True
                    for team_data in squad_resp["response"]:
                        team_name = team_data.get("team", {}).get("name", team["name"])
                        team_id = team_data.get("team", {}).get("id", team["id"])
                        for pl in team_data.get("players", []):
                            pl_id = pl["id"]
                            raw_pos = pl.get("position", "Midfielder")
                            pos = POS_MAP.get(raw_pos, "MID")
                            price = STAR_PRICES.get(pl_id, BASE_PRICES.get(pos, 6.0))
                            photo = pl.get("photo") or f"https://media.api-sports.io/football/players/{pl_id}.png"
                            name = pl.get("name", "Unknown Player")
                            parts = name.split()
                            short_name = parts[-1] if len(parts) > 1 else name

                            await db.execute(
                                """
                                INSERT INTO players (id, name, short_name, real_team_id, real_team_name, position, current_price, photo_url, status)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON CONFLICT(id) DO UPDATE SET
                                    name = excluded.name,
                                    short_name = excluded.short_name,
                                    real_team_name = excluded.real_team_name,
                                    position = excluded.position,
                                    photo_url = excluded.photo_url
                                """,
                                (pl_id, name, short_name, team_id, team_name, pos, price, photo, "Active")
                            )
                    await db.commit()

    # 3. If API wasn't used or returned no items, seed from curated dataset
    cursor = await db.execute("SELECT COUNT(*) FROM players")
    player_count = (await cursor.fetchone())[0]
    
    if player_count == 0 or force_mock:
        logger.info("Seeding players directory from curated star players dataset...")
        for p in MOCK_PLAYERS:
            await db.execute(
                """
                INSERT INTO players (id, name, short_name, real_team_id, real_team_name, position, current_price, photo_url, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    short_name = excluded.short_name,
                    current_price = excluded.current_price,
                    status = excluded.status
                """,
                (p["id"], p["name"], p["short_name"], p["real_team_id"], p["real_team_name"], p["position"], p["current_price"], p["photo_url"], p["status"])
            )
        await db.commit()

    cursor = await db.execute("SELECT COUNT(*) FROM fixtures")
    fixture_count = (await cursor.fetchone())[0]
    if fixture_count == 0 or force_mock:
        logger.info("Seeding fixtures from mock fixtures dataset...")
        for f in MOCK_FIXTURES:
            await db.execute(
                """
                INSERT INTO fixtures (id, league_id, round, home_team_id, home_team_name, home_team_logo,
                                      away_team_id, away_team_name, away_team_logo, kickoff_time, status, home_score, away_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    status = excluded.status,
                    home_score = excluded.home_score,
                    away_score = excluded.away_score
                """,
                (f["id"], f["league_id"], f["round"], f["home_team_id"], f["home_team_name"], f["home_team_logo"],
                 f["away_team_id"], f["away_team_name"], f["away_team_logo"], f["kickoff_time"], f["status"], f["home_score"], f["away_score"])
            )
        await db.commit()

    # 4. Seed initial player match stats for demo
    sample_stats = [
        # Lamine Yamal: 1 goal, 1 assist, 88 mins
        {"player_id": 50, "fixture_id": 1001, "minutes_played": 88, "goals": 1, "assists": 1, "clean_sheet": 0, "yellow_cards": 0, "red_cards": 0, "saves": 0},
        # Lewandowski: 1 goal, 75 mins
        {"player_id": 51, "fixture_id": 1001, "minutes_played": 75, "goals": 1, "assists": 0, "clean_sheet": 0, "yellow_cards": 0, "red_cards": 0, "saves": 0},
        # Mbappé: 1 goal, 90 mins
        {"player_id": 54, "fixture_id": 1001, "minutes_played": 90, "goals": 1, "assists": 0, "clean_sheet": 0, "yellow_cards": 1, "red_cards": 0, "saves": 0},
        # Pedri: 1 assist, 90 mins
        {"player_id": 30, "fixture_id": 1001, "minutes_played": 90, "goals": 0, "assists": 1, "clean_sheet": 0, "yellow_cards": 0, "red_cards": 0, "saves": 0},
        # Haaland: 1 goal, 90 mins
        {"player_id": 53, "fixture_id": 1002, "minutes_played": 90, "goals": 1, "assists": 0, "clean_sheet": 0, "yellow_cards": 0, "red_cards": 0, "saves": 0},
        # Saka: 1 goal, 90 mins
        {"player_id": 35, "fixture_id": 1002, "minutes_played": 90, "goals": 1, "assists": 0, "clean_sheet": 0, "yellow_cards": 0, "red_cards": 0, "saves": 0},
        # Salah: 2 goals, 1 assist, 90 mins
        {"player_id": 56, "fixture_id": 1003, "minutes_played": 90, "goals": 2, "assists": 1, "clean_sheet": 0, "yellow_cards": 0, "red_cards": 0, "saves": 0},
        # Ter Stegen: 4 saves, 90 mins
        {"player_id": 1, "fixture_id": 1001, "minutes_played": 90, "goals": 0, "assists": 0, "clean_sheet": 0, "yellow_cards": 0, "red_cards": 0, "saves": 4},
        # Pau Cubarsi: 90 mins
        {"player_id": 10, "fixture_id": 1001, "minutes_played": 90, "goals": 0, "assists": 0, "clean_sheet": 0, "yellow_cards": 0, "red_cards": 0, "saves": 0},
    ]
    for s in sample_stats:
        await db.execute(
            """
            INSERT INTO player_match_stats (player_id, fixture_id, minutes_played, goals, assists, clean_sheet, yellow_cards, red_cards, saves)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(player_id, fixture_id) DO UPDATE SET
                minutes_played = excluded.minutes_played,
                goals = excluded.goals,
                assists = excluded.assists,
                clean_sheet = excluded.clean_sheet,
                yellow_cards = excluded.yellow_cards,
                red_cards = excluded.red_cards,
                saves = excluded.saves
            """,
            (s["player_id"], s["fixture_id"], s["minutes_played"], s["goals"], s["assists"], s["clean_sheet"], s["yellow_cards"], s["red_cards"], s["saves"])
        )
    await db.commit()

    # 5. Seed sample demo teams if empty
    cursor = await db.execute("SELECT COUNT(*) FROM teams")
    team_count = (await cursor.fetchone())[0]
    if team_count == 0:
        demo_teams = [
            {"id": "team-demo-1", "league_id": "league-barca-2026", "manager_code": "849-201", "team_name": "Thunder Strikers", "formation": "4-3-3", "captain_id": 50, "players": [1, 10, 11, 12, 13, 30, 31, 32, 50, 51, 52, 4, 15, 38, 57]},
            {"id": "team-demo-2", "league_id": "league-barca-2026", "manager_code": "319-482", "team_name": "Galactico Kings", "formation": "4-3-3", "captain_id": 54, "players": [2, 17, 18, 19, 20, 33, 36, 41, 54, 55, 59, 6, 16, 40, 58]},
            {"id": "team-demo-3", "league_id": "league-barca-2026", "manager_code": "772-105", "team_name": "Red Devils FC", "formation": "3-5-2", "captain_id": 53, "players": [3, 13, 14, 15, 34, 35, 37, 39, 40, 53, 56, 5, 12, 31, 57]}
        ]
        for dt in demo_teams:
            await db.execute(
                "INSERT INTO teams (id, league_id, manager_code, team_name, formation) VALUES (?, ?, ?, ?, ?)",
                (dt["id"], dt["league_id"], dt["manager_code"], dt["team_name"], dt["formation"])
            )
            for idx, pid in enumerate(dt["players"]):
                is_starting = (idx < 11)
                is_cap = (pid == dt["captain_id"])
                await db.execute(
                    "INSERT INTO rosters (team_id, player_id, is_starting_xi, is_captain, slot_index) VALUES (?, ?, ?, ?, ?)",
                    (dt["id"], pid, 1 if is_starting else 0, 1 if is_cap else 0, idx)
                )
        await db.commit()

    # Run scoring engine to sync all points
    await run_scoring_engine(db)
    
    logger.info("Daily Seeder completed successfully.")
    return {"status": "success", "used_api": used_api}
