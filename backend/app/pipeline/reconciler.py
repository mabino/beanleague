import re
from typing import Dict, Any, List, Optional
from .adapters.base import NormalizedFixture

# Canonical team aliases mapping
TEAM_ALIASES = {
    "manchester city": "Manchester City",
    "man city": "Manchester City",
    "manchester city fc": "Manchester City",
    "manchester united": "Manchester United",
    "man utd": "Manchester United",
    "manchester united fc": "Manchester United",
    "fc barcelona": "Barcelona",
    "barcelona": "Barcelona",
    "real madrid": "Real Madrid",
    "real madrid cf": "Real Madrid",
    "atletico madrid": "Atletico Madrid",
    "club atletico de madrid": "Atletico Madrid",
    "arsenal": "Arsenal",
    "arsenal fc": "Arsenal",
    "liverpool": "Liverpool",
    "liverpool fc": "Liverpool",
    "chelsea": "Chelsea",
    "chelsea fc": "Chelsea",
    "tottenham": "Tottenham",
    "tottenham hotspur": "Tottenham",
    "tottenham hotspur fc": "Tottenham",
    "newcastle": "Newcastle",
    "newcastle united": "Newcastle",
    "newcastle united fc": "Newcastle",
    "aston villa": "Aston Villa",
    "aston villa fc": "Aston Villa",
    "wolverhampton wanderers": "Wolves",
    "wolverhampton": "Wolves",
    "wolves": "Wolves",
    "brighton": "Brighton",
    "brighton and hove albion": "Brighton",
    "brighton & hove albion fc": "Brighton",
    "athletic club": "Athletic Club",
    "athletic bilbao": "Athletic Club",
    "real betis": "Real Betis",
    "real betis balompie": "Real Betis",
    "girona": "Girona",
    "girona fc": "Girona",
    "celta vigo": "Celta Vigo",
    "rc celta de vigo": "Celta Vigo",
    "villarreal": "Villarreal",
    "villarreal cf": "Villarreal",
    "valencia": "Valencia",
    "valencia cf": "Valencia",
    "sevilla": "Sevilla",
    "sevilla fc": "Sevilla",
    "real sociedad": "Real Sociedad",
    "deportivo alaves": "Alaves",
    "alaves": "Alaves"
}

def normalize_team_name(name: str) -> str:
    """Normalizes variations of a team name to its canonical form."""
    if not name:
        return ""
    clean = name.strip().lower()
    if clean in TEAM_ALIASES:
        return TEAM_ALIASES[clean]
    
    # Strip common suffixes like FC, CF, etc.
    clean = re.sub(r"\b(fc|cf|afc|sc|ca)\b", "", clean, flags=re.IGNORECASE).strip()
    return TEAM_ALIASES.get(clean, name.strip())

def make_fixture_fingerprint(home_team: str, away_team: str, kickoff_date: str) -> str:
    """Creates a deduplication fingerprint for a match."""
    h = normalize_team_name(home_team).lower()
    a = normalize_team_name(away_team).lower()
    # Extract just the date part YYYY-MM-DD
    d = kickoff_date[:10] if kickoff_date else ""
    return f"{h}__vs__{a}__{d}"

def reconcile_fixtures(fixtures: List[NormalizedFixture]) -> List[NormalizedFixture]:
    """
    Reconciles fixtures across ranked sources.
    Higher-ranked sources retain precedence for logos, exact kickoff time, and score updates.
    """
    seen: Dict[str, NormalizedFixture] = {}
    
    for f in fixtures:
        fp = make_fixture_fingerprint(f.home_team_name, f.away_team_name, f.kickoff_time)
        if fp not in seen:
            f.home_team_name = normalize_team_name(f.home_team_name)
            f.away_team_name = normalize_team_name(f.away_team_name)
            seen[fp] = f
        else:
            existing = seen[fp]
            # Merge richer attributes if missing
            if not existing.home_team_logo and f.home_team_logo:
                existing.home_team_logo = f.home_team_logo
            if not existing.away_team_logo and f.away_team_logo:
                existing.away_team_logo = f.away_team_logo
            # Update score and status if newer source has In-Play or Finished status
            if f.status in ("In-Play", "Finished") and existing.status == "Scheduled":
                existing.status = f.status
                existing.home_score = f.home_score
                existing.away_score = f.away_score

    return list(seen.values())
