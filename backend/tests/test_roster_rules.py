import pytest
from backend.app.rules import validate_roster, FORMATIONS

def create_valid_squad_433():
    """Generates a valid 11-player 4-3-3 squad + 1 captain."""
    squad = []
    # 1 GK
    squad.append({"id": 1, "position": "GK", "current_price": 5.5, "is_starting_xi": True, "is_captain": False})
    # 4 DEF
    for i in range(10, 14):
        squad.append({"id": i, "position": "DEF", "current_price": 6.0, "is_starting_xi": True, "is_captain": False})
    # 3 MID
    for i in range(30, 33):
        squad.append({"id": i, "position": "MID", "current_price": 8.0, "is_starting_xi": True, "is_captain": False})
    # 3 FWD (Yamal as captain)
    squad.append({"id": 50, "position": "FWD", "current_price": 11.0, "is_starting_xi": True, "is_captain": True})
    squad.append({"id": 51, "position": "FWD", "current_price": 10.0, "is_starting_xi": True, "is_captain": False})
    squad.append({"id": 52, "position": "FWD", "current_price": 9.5, "is_starting_xi": True, "is_captain": False})
    return squad

def test_validate_valid_roster():
    squad = create_valid_squad_433()
    res = validate_roster(formation="4-3-3", players=squad, salary_cap=100.0)
    assert res.is_valid is True
    assert res.captain_id == 50
    assert len(res.errors) == 0

def test_validate_exceeded_salary_cap():
    squad = create_valid_squad_433()
    # Artificially increase prices to exceed 100M
    for p in squad:
        p["current_price"] = 15.0 # 11 * 15 = 165M
    res = validate_roster(formation="4-3-3", players=squad, salary_cap=100.0)
    assert res.is_valid is False
    assert any("Budget exceeded" in e for e in res.errors)

def test_validate_missing_captain():
    squad = create_valid_squad_433()
    for p in squad:
        p["is_captain"] = False
    res = validate_roster(formation="4-3-3", players=squad, salary_cap=100.0)
    assert res.is_valid is False
    assert any("You must designate exactly 1 Captain" in e for e in res.errors)

def test_validate_multiple_captains():
    squad = create_valid_squad_433()
    squad[0]["is_captain"] = True
    squad[1]["is_captain"] = True
    res = validate_roster(formation="4-3-3", players=squad, salary_cap=100.0)
    assert res.is_valid is False
    assert any("You can only select 1 Captain" in e for e in res.errors)

def test_validate_formation_mismatch():
    squad = create_valid_squad_433()
    # Try validating a 4-3-3 squad as a 3-5-2
    res = validate_roster(formation="3-5-2", players=squad, salary_cap=100.0)
    assert res.is_valid is False
    assert any("Formation 3-5-2 requires" in e for e in res.errors)

def test_validate_duplicate_players():
    squad = create_valid_squad_433()
    squad[1]["id"] = squad[0]["id"] # duplicate ID
    res = validate_roster(formation="4-3-3", players=squad, salary_cap=100.0)
    assert res.is_valid is False
    assert any("Duplicate players" in e for e in res.errors)
