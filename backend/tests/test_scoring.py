import pytest

try:
    from backend.app.rules import calculate_fantasy_points
except ImportError:
    from app.rules import calculate_fantasy_points

def test_calculate_fantasy_points_forward():
    # Forward playing 90 mins, scoring 2 goals, 1 assist, 1 yellow card
    stats = {
        "minutes_played": 90,
        "goals": 2,
        "assists": 1,
        "clean_sheet": 0,
        "yellow_cards": 1,
        "red_cards": 0,
    }
    # 2 pts (60+ mins) + 2*4 (fwd goals) + 3 (assist) - 1 (yellow) = 2 + 8 + 3 - 1 = 12 pts
    pts = calculate_fantasy_points("FWD", stats)
    assert pts == 12

def test_calculate_fantasy_points_midfielder():
    # Midfielder playing 70 mins, 1 goal, 1 assist, clean sheet
    stats = {
        "minutes_played": 70,
        "goals": 1,
        "assists": 1,
        "clean_sheet": 1,
        "yellow_cards": 0,
    }
    # 2 pts (60+ mins) + 5 (mid goal) + 3 (assist) + 1 (mid clean sheet) = 11 pts
    pts = calculate_fantasy_points("MID", stats)
    assert pts == 11

def test_calculate_fantasy_points_defender_and_goalkeeper():
    # Defender playing 90 mins, 1 goal, clean sheet
    stats = {
        "minutes_played": 90,
        "goals": 1,
        "assists": 0,
        "clean_sheet": 1,
        "yellow_cards": 0,
    }
    # 2 pts (60+ mins) + 6 (def goal) + 4 (def clean sheet) = 12 pts
    pts = calculate_fantasy_points("DEF", stats)
    assert pts == 12

    # Goalkeeper playing 90 mins, clean sheet, 6 saves (+2 pts), 1 penalty saved (+5 pts)
    gk_stats = {
        "minutes_played": 90,
        "goals": 0,
        "assists": 0,
        "clean_sheet": 1,
        "saves": 6,
        "penalties_saved": 1,
    }
    # 2 (mins) + 4 (clean sheet) + 2 (6 saves // 3 = 2) + 5 (pen saved) = 13 pts
    gk_pts = calculate_fantasy_points("GK", gk_stats)
    assert gk_pts == 13

def test_calculate_fantasy_points_cards_and_own_goals():
    # Player with red card and own goal
    stats = {
        "minutes_played": 45,
        "goals": 0,
        "assists": 0,
        "yellow_cards": 1,
        "red_cards": 1,
        "own_goals": 1,
    }
    # 1 (played <60) - 1 (yellow) - 3 (red) - 2 (own goal) = -5 pts
    pts = calculate_fantasy_points("DEF", stats)
    assert pts == -5
