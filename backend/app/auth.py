import random
import aiosqlite
from fastapi import Header, HTTPException, Depends, status
from typing import Optional, Dict, Any
from .database import get_db

def generate_manager_code() -> str:
    """Generates a memorable 6-digit Manager PIN (e.g. 849-201)."""
    p1 = random.randint(100, 999)
    p2 = random.randint(100, 999)
    return f"{p1}-{p2}"

def normalize_pin(pin: str) -> str:
    """Normalizes pin input, removing spaces or hyphens if needed."""
    clean = pin.strip().replace(" ", "").replace("-", "")
    if len(clean) == 6 and clean.isdigit():
        return f"{clean[:3]}-{clean[3:]}"
    return pin.strip()

async def get_current_team(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_manager_code: Optional[str] = Header(None, alias="X-Manager-Code"),
    db: aiosqlite.Connection = Depends(get_db)
) -> Dict[str, Any]:
    """
    Authenticates a manager by their 6-digit PIN code.
    Accepts Bearer token or X-Manager-Code header.
    """
    manager_code = None
    if x_manager_code:
        manager_code = normalize_pin(x_manager_code)
    elif authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            manager_code = normalize_pin(parts[1])
        elif len(parts) == 1:
            manager_code = normalize_pin(parts[0])

    if not manager_code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Manager Code PIN required in Authorization or X-Manager-Code header."
        )

    cursor = await db.execute(
        """
        SELECT t.id, t.league_id, t.manager_code, t.team_name, t.formation, t.total_points,
               l.season_code, l.name as league_name, l.salary_cap
        FROM teams t
        JOIN leagues l ON t.league_id = l.id
        WHERE t.manager_code = ?
        """,
        (manager_code,)
    )
    team_row = await cursor.fetchone()
    if not team_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Manager Code '{manager_code}' not found. Please verify your PIN."
        )

    return dict(team_row)
