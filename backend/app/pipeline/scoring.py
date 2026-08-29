import aiosqlite
import logging
from typing import Dict, Any, List
from ..rules import calculate_fantasy_points

logger = logging.getLogger("beanleague.scoring")

# Global event broadcast queue / listener list for Server-Sent Events (SSE)
_event_subscribers: List[Any] = []

def subscribe_sse(queue):
    _event_subscribers.append(queue)

def unsubscribe_sse(queue):
    if queue in _event_subscribers:
        _event_subscribers.remove(queue)

async def broadcast_event(event_data: Dict[str, Any]):
    """Broadcast an event (like a goal or score update) to all connected SSE clients."""
    for queue in list(_event_subscribers):
        try:
            await queue.put(event_data)
        except Exception as e:
            logger.debug(f"Failed to push to SSE queue: {e}")

async def run_scoring_engine(db: aiosqlite.Connection) -> Dict[str, Any]:
    """
    Executes the Scoring Engine:
    1. Recalculates fantasy points for all player match stats based on player position & rules.
    2. Recalculates total points for all teams, accounting for Starting XI & Captain 2x bonus.
    3. Updates teams.total_points.
    4. Notifies connected frontends.
    """
    logger.info("Starting Scoring Engine run...")
    
    # 1. Fetch player match stats and their positions
    cursor = await db.execute(
        """
        SELECT pms.id, pms.player_id, pms.fixture_id, pms.minutes_played, pms.goals,
               pms.assists, pms.clean_sheet, pms.yellow_cards, pms.red_cards,
               pms.saves, pms.penalties_saved, pms.own_goals, p.position, p.name as player_name
        FROM player_match_stats pms
        JOIN players p ON pms.player_id = p.id
        """
    )
    rows = await cursor.fetchall()
    
    updated_pms_count = 0
    for row in rows:
        r_dict = dict(row)
        pts = calculate_fantasy_points(r_dict["position"], r_dict)
        await db.execute(
            "UPDATE player_match_stats SET fantasy_points_calculated = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (pts, r_dict["id"])
        )
        updated_pms_count += 1
        
    # 2. Recalculate each team's score
    cursor = await db.execute("SELECT id, team_name, manager_code, league_id FROM teams")
    teams = await cursor.fetchall()
    
    team_updates = []
    for team in teams:
        team_id = team["id"]
        # Fetch Starting XI players and captaincy
        roster_cursor = await db.execute(
            """
            SELECT r.player_id, r.is_starting_xi, r.is_captain,
                   COALESCE(SUM(pms.fantasy_points_calculated), 0) as player_pts
            FROM rosters r
            LEFT JOIN player_match_stats pms ON r.player_id = pms.player_id
            WHERE r.team_id = ?
            GROUP BY r.player_id, r.is_starting_xi, r.is_captain
            """,
            (team_id,)
        )
        roster_rows = await roster_cursor.fetchall()
        
        team_total = 0
        for r_row in roster_rows:
            if r_row["is_starting_xi"]:
                pts = r_row["player_pts"]
                if r_row["is_captain"]:
                    pts *= 2 # Captain gets 2x points!
                team_total += pts
                
        await db.execute(
            "UPDATE teams SET total_points = ? WHERE id = ?",
            (team_total, team_id)
        )
        team_updates.append({
            "team_id": team_id,
            "team_name": team["team_name"],
            "total_points": team_total
        })
        
    await db.commit()
    logger.info(f"Scoring Engine completed: updated {updated_pms_count} player stats and {len(team_updates)} teams.")
    
    # Broadcast standings updated event
    await broadcast_event({
        "event_type": "standings_update",
        "detail": "Leaderboard standings recalculated",
        "teams": team_updates
    })
    
    return {
        "status": "success",
        "updated_player_stats": updated_pms_count,
        "updated_teams": len(team_updates)
    }
