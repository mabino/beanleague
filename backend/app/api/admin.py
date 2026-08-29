import aiosqlite
import json
import logging
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header, Response, status
from typing import Dict, Any, Optional, List
from ..database import get_db
from ..config import settings
from ..pipeline.api_client import ApiFootballClient
from ..pipeline.seeder import run_daily_seeder
from ..pipeline.poller import run_matchday_poller, simulate_live_tick
from ..pipeline.scoring import run_scoring_engine
from ..models import ApiUsageSummary

import hmac

logger = logging.getLogger("beanleague.admin")

router = APIRouter(tags=["Admin, Pipeline & System Status"])

def verify_admin_pin(x_admin_pin: Optional[str] = Header(None, alias="X-Admin-PIN")):
    """
    Security guard: enforces that admin endpoints require the valid Admin PIN.
    Uses timing-safe comparison to prevent side-channel timing attacks.
    """
    expected_pin = settings.ADMIN_PIN.strip()
    if not x_admin_pin or not hmac.compare_digest(x_admin_pin.strip(), expected_pin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Admin Security PIN."
        )
    return True

# ==========================================
# PUBLIC SYSTEM STATUS (No PIN required)
# ==========================================

@router.get("/api/system/status")
async def get_system_status(db: aiosqlite.Connection = Depends(get_db)):
    """
    Returns public, read-only operational telemetry & health metrics:
    - Real-time SSE Stream health
    - Database metrics (player count, teams, fixtures, active matches)
    - Data adapters & background poller status
    - External API usage summary
    """
    today_str = date.today().isoformat()
    client = ApiFootballClient()
    used = await client.get_today_usage(db)
    remaining = max(0, settings.API_DAILY_LIMIT - used)

    p_cur = await db.execute("SELECT COUNT(*) as c FROM players")
    p_count = (await p_cur.fetchone())["c"]

    t_cur = await db.execute("SELECT COUNT(*) as c FROM teams")
    t_count = (await t_cur.fetchone())["c"]

    f_cur = await db.execute("SELECT COUNT(*) as c FROM fixtures")
    f_count = (await f_cur.fetchone())["c"]

    live_cur = await db.execute("SELECT COUNT(*) as c FROM fixtures WHERE status = 'In-Play'")
    live_count = (await live_cur.fetchone())["c"]

    return {
        "status": "operational",
        "app_version": "2.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "status": "healthy",
            "registered_players": p_count,
            "fantasy_teams": t_count,
            "fixtures_synced": f_count,
            "active_in_play_matches": live_count
        },
        "sse_stream": {
            "status": "active",
            "endpoint": "/api/events/live",
            "reconnect_strategy": "automatic"
        },
        "poller": {
            "scheduler_enabled": settings.ENABLE_SCHEDULER,
            "interval_minutes": settings.POLL_INTERVAL_MINUTES,
            "thesportsdb_adapter": "active (real-time free live scores)",
            "api_football_adapter": "ready" if settings.API_FOOTBALL_KEY else "standby"
        },
        "api_usage": {
            "date": today_str,
            "requests_used": used,
            "daily_limit": settings.API_DAILY_LIMIT,
            "remaining": remaining
        }
    }

# ==========================================
# PROTECTED ADMIN PORTAL (Requires Admin PIN)
# ==========================================

@router.post("/api/admin/verify")
async def verify_admin_access(_: bool = Depends(verify_admin_pin)):
    """Validates the Admin Security PIN."""
    return {"success": True, "message": "Admin authenticated successfully."}

@router.get("/api/admin/export")
async def export_all_user_data(
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """
    Exports/dumps all seasons of user data (leagues, user teams, rosters, custom kits,
    embedded YouTube highlights & notes) to a clean, downloadable JSON file.
    Does NOT dump raw upstream API sports data (players/fixtures).
    """
    # Fetch all leagues
    l_cur = await db.execute("SELECT id, season_code, name, max_teams, salary_cap, created_at FROM leagues ORDER BY created_at ASC")
    leagues = await l_cur.fetchall()

    export_seasons = []
    total_teams_count = 0
    total_roster_count = 0

    for l in leagues:
        league_id = l["id"]
        # Fetch all teams in this league
        t_cur = await db.execute(
            """
            SELECT id, manager_code, team_name, formation, total_points, kit_config,
                   recovery_player_1_id, recovery_player_2_id, recovery_player_3_id, recovery_word, created_at
            FROM teams
            WHERE league_id = ?
            ORDER BY total_points DESC, created_at ASC
            """,
            (league_id,)
        )
        teams = await t_cur.fetchall()
        season_teams = []

        for t in teams:
            team_id = t["id"]
            total_teams_count += 1

            # Parse kit config
            kit_parsed = None
            if t["kit_config"]:
                try:
                    kit_parsed = json.loads(t["kit_config"])
                except Exception:
                    kit_parsed = t["kit_config"]

            # Fetch roster
            r_cur = await db.execute(
                """
                SELECT r.player_id, r.is_starting_xi, r.is_captain, r.slot_position, r.slot_index,
                       r.youtube_links, r.custom_notes, r.created_at,
                       p.name as player_name, p.position, p.real_team_name, p.current_price
                FROM rosters r
                LEFT JOIN players p ON r.player_id = p.id
                WHERE r.team_id = ?
                ORDER BY r.is_starting_xi DESC, r.slot_index ASC
                """,
                (team_id,)
            )
            roster_rows = await r_cur.fetchall()
            roster_items = []

            for r in roster_rows:
                total_roster_count += 1
                media_parsed = []
                if r["youtube_links"]:
                    try:
                        media_parsed = json.loads(r["youtube_links"])
                    except Exception:
                        media_parsed = []

                roster_items.append({
                    "player_id": r["player_id"],
                    "player_name": r["player_name"],
                    "real_team": r["real_team_name"],
                    "position": r["position"],
                    "price": r["current_price"],
                    "is_starting_xi": bool(r["is_starting_xi"]),
                    "is_captain": bool(r["is_captain"]),
                    "slot_position": r["slot_position"],
                    "slot_index": r["slot_index"],
                    "youtube_links": media_parsed,
                    "custom_notes": r["custom_notes"],
                    "created_at": r["created_at"]
                })

            season_teams.append({
                "team_id": t["id"],
                "team_name": t["team_name"],
                "manager_code": t["manager_code"],
                "formation": t["formation"],
                "total_points": t["total_points"],
                "kit_config": kit_parsed,
                "created_at": t["created_at"],
                "roster_count": len(roster_items),
                "roster": roster_items
            })

        export_seasons.append({
            "league_id": l["id"],
            "season_code": l["season_code"],
            "league_name": l["name"],
            "salary_cap": l["salary_cap"],
            "max_teams": l["max_teams"],
            "created_at": l["created_at"],
            "teams_count": len(season_teams),
            "teams": season_teams
        })

    ts_now = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    export_payload = {
        "export_metadata": {
            "app": "BeanLeague",
            "version": "2.1.0",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "total_seasons": len(export_seasons),
            "total_teams": total_teams_count,
            "total_roster_entries": total_roster_count,
        },
        "seasons": export_seasons
    }

    json_content = json.dumps(export_payload, indent=2)
    filename = f"beanleague_userdata_export_{ts_now}.json"

    return Response(
        content=json_content,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store"
        }
    )

@router.get("/api/admin/seasons")
async def get_all_seasons_and_users(
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """
    Returns an overview list of all seasons and registered user teams for selective admin clearance.
    """
    l_cur = await db.execute("SELECT id, season_code, name, created_at FROM leagues ORDER BY created_at ASC")
    leagues = await l_cur.fetchall()

    results = []
    for l in leagues:
        t_cur = await db.execute(
            """
            SELECT t.id, t.team_name, t.manager_code, t.formation, t.total_points, t.kit_config, t.created_at,
                   COUNT(r.id) as squad_count
            FROM teams t
            LEFT JOIN rosters r ON t.id = r.team_id
            WHERE t.league_id = ?
            GROUP BY t.id
            ORDER BY t.total_points DESC, t.created_at ASC
            """,
            (l["id"],)
        )
        teams = await t_cur.fetchall()
        team_list = []
        for t in teams:
            kit_parsed = None
            if t["kit_config"]:
                try:
                    kit_parsed = json.loads(t["kit_config"])
                except Exception:
                    kit_parsed = None

            team_list.append({
                "team_id": t["id"],
                "team_name": t["team_name"],
                "manager_code": t["manager_code"],
                "formation": t["formation"],
                "total_points": t["total_points"],
                "squad_count": t["squad_count"],
                "kit_config": kit_parsed,
                "created_at": t["created_at"]
            })

        results.append({
            "league_id": l["id"],
            "season_code": l["season_code"],
            "league_name": l["name"],
            "created_at": l["created_at"],
            "teams_count": len(team_list),
            "teams": team_list
        })

    return results

@router.delete("/api/admin/teams/{team_id}")
async def delete_individual_team(
    team_id: str,
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """
    Deletes an individual user team and its associated roster.
    """
    t_cur = await db.execute("SELECT team_name, manager_code FROM teams WHERE id = ?", (team_id,))
    team_row = await t_cur.fetchone()
    if not team_row:
        raise HTTPException(status_code=404, detail="Team not found.")

    team_name = team_row["team_name"]
    await db.execute("DELETE FROM rosters WHERE team_id = ?", (team_id,))
    await db.execute("DELETE FROM teams WHERE id = ?", (team_id,))
    await db.commit()

    return {"success": True, "message": f"User team '{team_name}' ({team_id}) successfully deleted."}

@router.delete("/api/admin/seasons/{season_code}")
async def clear_season_users(
    season_code: str,
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """
    Selectively clears all user teams and rosters in a given season/league.
    """
    l_cur = await db.execute("SELECT id, name FROM leagues WHERE season_code = ?", (season_code,))
    league_row = await l_cur.fetchone()
    if not league_row:
        raise HTTPException(status_code=404, detail=f"Season '{season_code}' not found.")

    league_id = league_row["id"]
    # Delete all rosters belonging to teams in this league
    await db.execute(
        "DELETE FROM rosters WHERE team_id IN (SELECT id FROM teams WHERE league_id = ?)",
        (league_id,)
    )
    # Delete all teams in this league
    t_del = await db.execute("DELETE FROM teams WHERE league_id = ?", (league_id,))
    deleted_count = t_del.rowcount
    await db.commit()

    return {
        "success": True,
        "message": f"Successfully cleared {deleted_count} user team(s) from season '{season_code}'."
    }

@router.delete("/api/admin/clear-all-users")
async def clear_all_users_all_seasons(
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """
    Entirely clears all user teams and rosters across ALL seasons.
    Preserves upstream sports API data (players, fixtures, match events, stats).
    """
    await db.execute("DELETE FROM rosters")
    t_del = await db.execute("DELETE FROM teams")
    deleted_count = t_del.rowcount
    await db.commit()

    return {
        "success": True,
        "message": f"Successfully purged all {deleted_count} user team(s) across all seasons."
    }

# ==========================================
# PIPELINE & SIMULATION CONTROLS
# ==========================================

@router.get("/api/admin/usage", response_model=ApiUsageSummary)
async def get_api_usage(
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """Returns today's API-Football request usage."""
    today_str = date.today().isoformat()
    client = ApiFootballClient()
    used = await client.get_today_usage(db)
    remaining = max(0, settings.API_DAILY_LIMIT - used)
    
    return ApiUsageSummary(
        today_date=today_str,
        requests_used_today=used,
        daily_limit=settings.API_DAILY_LIMIT,
        remaining_requests=remaining,
        can_request_external=(remaining > 0 and bool(settings.API_FOOTBALL_KEY))
    )

@router.post("/api/admin/simulate-tick")
async def trigger_simulated_tick(
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """
    Simulates a live goal or event, recalculates scores, and broadcasts to frontend via SSE.
    """
    result = await simulate_live_tick(db)
    return {"message": "Simulated match tick executed", "result": result}

@router.post("/api/admin/seed")
async def trigger_seeder(
    force_mock: bool = False,
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """Manually triggers the Daily Seeder."""
    try:
        result = await run_daily_seeder(db, force_mock=force_mock)
        return {"message": "Daily Seeder completed", "result": result}
    except Exception as e:
        import traceback
        logger.exception(f"Daily Seeder failed: {e}")
        return {"error": str(e), "traceback": traceback.format_exc()}

@router.post("/api/admin/poll")
async def trigger_poller(
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """Manually triggers the Matchday Poller."""
    result = await run_matchday_poller(db)
    return {"message": "Matchday Poller completed", "result": result}

@router.post("/api/admin/recalculate-scores")
async def trigger_recalculate_scores(
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """Manually triggers the Scoring Engine."""
    result = await run_scoring_engine(db)
    return {"message": "Scoring engine executed", "result": result}

@router.get("/api/admin/api-status")
async def check_external_api_status(_: bool = Depends(verify_admin_pin)):
    """Queries API-Sports /status to inspect real account status and API-side quota usage."""
    if not settings.API_FOOTBALL_KEY:
        return {"error": "API_FOOTBALL_KEY not configured"}
    import httpx
    headers = {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-apisports-key": settings.API_FOOTBALL_KEY,
        "x-rapidapi-key": settings.API_FOOTBALL_KEY,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{settings.API_FOOTBALL_BASE_URL.rstrip('/')}/status", headers=headers)
        return resp.json()

@router.get("/api/admin/logs")
async def get_recent_api_logs(
    limit: int = 50,
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """Returns recent API usage log entries from SQLite."""
    cursor = await db.execute(
        "SELECT id, date, endpoint, status_code, cost, timestamp FROM api_usage_log ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]

@router.post("/api/admin/reset-usage")
async def reset_local_usage_log(
    db: aiosqlite.Connection = Depends(get_db),
    _: bool = Depends(verify_admin_pin)
):
    """Resets today's local usage counter in SQLite so new calls can be made."""
    today_str = date.today().isoformat()
    await db.execute("DELETE FROM api_usage_log WHERE date = ?", (today_str,))
    await db.commit()
    return {"message": f"Local API usage counter for {today_str} reset to 0."}
