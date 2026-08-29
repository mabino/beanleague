from typing import List, Dict, Any

MOCK_LEAGUES: List[Dict[str, Any]] = [
    {
        "id": "league-barca-2026",
        "season_code": "BARCA-2026",
        "name": "Barca & Friends Fantasy League",
        "max_teams": 16,
        "salary_cap": 100.0
    },
    {
        "id": "league-pl-2026",
        "season_code": "PL-2026",
        "name": "Premier League Showdown 2026",
        "max_teams": 16,
        "salary_cap": 100.0
    }
]

MOCK_PLAYERS: List[Dict[str, Any]] = [
    # Goalkeepers (GK)
    {"id": 1, "name": "Marc-André ter Stegen", "short_name": "Ter Stegen", "real_team_id": 529, "real_team_name": "Barcelona", "position": "GK", "current_price": 5.5, "photo_url": "https://media.api-sports.io/football/players/1.png", "status": "Active"},
    {"id": 2, "name": "Thibaut Courtois", "short_name": "Courtois", "real_team_id": 541, "real_team_name": "Real Madrid", "position": "GK", "current_price": 5.5, "photo_url": "https://media.api-sports.io/football/players/2.png", "status": "Active"},
    {"id": 3, "name": "Alisson Becker", "short_name": "Alisson", "real_team_id": 40, "real_team_name": "Liverpool", "position": "GK", "current_price": 5.5, "photo_url": "https://media.api-sports.io/football/players/3.png", "status": "Active"},
    {"id": 4, "name": "David Raya", "short_name": "Raya", "real_team_id": 42, "real_team_name": "Arsenal", "position": "GK", "current_price": 5.5, "photo_url": "https://media.api-sports.io/football/players/4.png", "status": "Active"},
    {"id": 5, "name": "Ederson", "short_name": "Ederson", "real_team_id": 50, "real_team_name": "Manchester City", "position": "GK", "current_price": 5.5, "photo_url": "https://media.api-sports.io/football/players/5.png", "status": "Active"},
    {"id": 6, "name": "Jan Oblak", "short_name": "Oblak", "real_team_id": 530, "real_team_name": "Atletico Madrid", "position": "GK", "current_price": 5.0, "photo_url": "https://media.api-sports.io/football/players/6.png", "status": "Active"},

    # Defenders (DEF)
    {"id": 10, "name": "Pau Cubarsí", "short_name": "Cubarsí", "real_team_id": 529, "real_team_name": "Barcelona", "position": "DEF", "current_price": 6.0, "photo_url": "https://media.api-sports.io/football/players/10.png", "status": "Active"},
    {"id": 11, "name": "Jules Koundé", "short_name": "Koundé", "real_team_id": 529, "real_team_name": "Barcelona", "position": "DEF", "current_price": 6.5, "photo_url": "https://media.api-sports.io/football/players/11.png", "status": "Active"},
    {"id": 12, "name": "Alejandro Balde", "short_name": "Balde", "real_team_id": 529, "real_team_name": "Barcelona", "position": "DEF", "current_price": 5.5, "photo_url": "https://media.api-sports.io/football/players/12.png", "status": "Active"},
    {"id": 13, "name": "Virgil van Dijk", "short_name": "Van Dijk", "real_team_id": 40, "real_team_name": "Liverpool", "position": "DEF", "current_price": 6.5, "photo_url": "https://media.api-sports.io/football/players/13.png", "status": "Active"},
    {"id": 14, "name": "Trent Alexander-Arnold", "short_name": "Trent", "real_team_id": 40, "real_team_name": "Liverpool", "position": "DEF", "current_price": 7.0, "photo_url": "https://media.api-sports.io/football/players/14.png", "status": "Active"},
    {"id": 15, "name": "William Saliba", "short_name": "Saliba", "real_team_id": 42, "real_team_name": "Arsenal", "position": "DEF", "current_price": 6.0, "photo_url": "https://media.api-sports.io/football/players/15.png", "status": "Active"},
    {"id": 16, "name": "Gabriel Magalhães", "short_name": "Gabriel", "real_team_id": 42, "real_team_name": "Arsenal", "position": "DEF", "current_price": 6.0, "photo_url": "https://media.api-sports.io/football/players/16.png", "status": "Active"},
    {"id": 17, "name": "Antonio Rüdiger", "short_name": "Rüdiger", "real_team_id": 541, "real_team_name": "Real Madrid", "position": "DEF", "current_price": 6.0, "photo_url": "https://media.api-sports.io/football/players/17.png", "status": "Active"},
    {"id": 18, "name": "Josko Gvardiol", "short_name": "Gvardiol", "real_team_id": 50, "real_team_name": "Manchester City", "position": "DEF", "current_price": 6.0, "photo_url": "https://media.api-sports.io/football/players/18.png", "status": "Active"},
    {"id": 19, "name": "Pedro Porro", "short_name": "Porro", "real_team_id": 47, "real_team_name": "Tottenham", "position": "DEF", "current_price": 5.5, "photo_url": "https://media.api-sports.io/football/players/19.png", "status": "Active"},
    {"id": 20, "name": "Iñigo Martínez", "short_name": "Iñigo", "real_team_id": 529, "real_team_name": "Barcelona", "position": "DEF", "current_price": 5.0, "photo_url": "https://media.api-sports.io/football/players/20.png", "status": "Active"},

    # Midfielders (MID)
    {"id": 30, "name": "Pedri", "short_name": "Pedri", "real_team_id": 529, "real_team_name": "Barcelona", "position": "MID", "current_price": 8.0, "photo_url": "https://media.api-sports.io/football/players/30.png", "status": "Active"},
    {"id": 31, "name": "Gavi", "short_name": "Gavi", "real_team_id": 529, "real_team_name": "Barcelona", "position": "MID", "current_price": 7.5, "photo_url": "https://media.api-sports.io/football/players/31.png", "status": "Active"},
    {"id": 32, "name": "Dani Olmo", "short_name": "Olmo", "real_team_id": 529, "real_team_name": "Barcelona", "position": "MID", "current_price": 8.5, "photo_url": "https://media.api-sports.io/football/players/32.png", "status": "Active"},
    {"id": 33, "name": "Jude Bellingham", "short_name": "Bellingham", "real_team_id": 541, "real_team_name": "Real Madrid", "position": "MID", "current_price": 10.5, "photo_url": "https://media.api-sports.io/football/players/33.png", "status": "Active"},
    {"id": 34, "name": "Cole Palmer", "short_name": "Palmer", "real_team_id": 49, "real_team_name": "Chelsea", "position": "MID", "current_price": 10.5, "photo_url": "https://media.api-sports.io/football/players/34.png", "status": "Active"},
    {"id": 35, "name": "Bukayo Saka", "short_name": "Saka", "real_team_id": 42, "real_team_name": "Arsenal", "position": "MID", "current_price": 10.0, "photo_url": "https://media.api-sports.io/football/players/35.png", "status": "Active"},
    {"id": 36, "name": "Phil Foden", "short_name": "Foden", "real_team_id": 50, "real_team_name": "Manchester City", "position": "MID", "current_price": 9.5, "photo_url": "https://media.api-sports.io/football/players/36.png", "status": "Active"},
    {"id": 37, "name": "Kevin De Bruyne", "short_name": "De Bruyne", "real_team_id": 50, "real_team_name": "Manchester City", "position": "MID", "current_price": 9.5, "photo_url": "https://media.api-sports.io/football/players/37.png", "status": "Active"},
    {"id": 38, "name": "Martin Ødegaard", "short_name": "Ødegaard", "real_team_id": 42, "real_team_name": "Arsenal", "position": "MID", "current_price": 8.5, "photo_url": "https://media.api-sports.io/football/players/38.png", "status": "Active"},
    {"id": 39, "name": "Frenkie de Jong", "short_name": "De Jong", "real_team_id": 529, "real_team_name": "Barcelona", "position": "MID", "current_price": 7.0, "photo_url": "https://media.api-sports.io/football/players/39.png", "status": "Active"},
    {"id": 40, "name": "Rodri", "short_name": "Rodri", "real_team_id": 50, "real_team_name": "Manchester City", "position": "MID", "current_price": 7.0, "photo_url": "https://media.api-sports.io/football/players/40.png", "status": "Active"},
    {"id": 41, "name": "Federico Valverde", "short_name": "Valverde", "real_team_id": 541, "real_team_name": "Real Madrid", "position": "MID", "current_price": 8.0, "photo_url": "https://media.api-sports.io/football/players/41.png", "status": "Active"},

    # Forwards (FWD)
    {"id": 50, "name": "Lamine Yamal", "short_name": "Yamal", "real_team_id": 529, "real_team_name": "Barcelona", "position": "FWD", "current_price": 11.0, "photo_url": "https://media.api-sports.io/football/players/50.png", "status": "Active"},
    {"id": 51, "name": "Robert Lewandowski", "short_name": "Lewandowski", "real_team_id": 529, "real_team_name": "Barcelona", "position": "FWD", "current_price": 10.0, "photo_url": "https://media.api-sports.io/football/players/51.png", "status": "Active"},
    {"id": 52, "name": "Raphinha", "short_name": "Raphinha", "real_team_id": 529, "real_team_name": "Barcelona", "position": "FWD", "current_price": 9.5, "photo_url": "https://media.api-sports.io/football/players/52.png", "status": "Active"},
    {"id": 53, "name": "Erling Haaland", "short_name": "Haaland", "real_team_id": 50, "real_team_name": "Manchester City", "position": "FWD", "current_price": 14.0, "photo_url": "https://media.api-sports.io/football/players/53.png", "status": "Active"},
    {"id": 54, "name": "Kylian Mbappé", "short_name": "Mbappé", "real_team_id": 541, "real_team_name": "Real Madrid", "position": "FWD", "current_price": 13.5, "photo_url": "https://media.api-sports.io/football/players/54.png", "status": "Active"},
    {"id": 55, "name": "Vinicius Junior", "short_name": "Vinicius Jr", "real_team_id": 541, "real_team_name": "Real Madrid", "position": "FWD", "current_price": 12.0, "photo_url": "https://media.api-sports.io/football/players/55.png", "status": "Active"},
    {"id": 56, "name": "Mohamed Salah", "short_name": "Salah", "real_team_id": 40, "real_team_name": "Liverpool", "position": "FWD", "current_price": 12.5, "photo_url": "https://media.api-sports.io/football/players/56.png", "status": "Active"},
    {"id": 57, "name": "Kai Havertz", "short_name": "Havertz", "real_team_id": 42, "real_team_name": "Arsenal", "position": "FWD", "current_price": 8.0, "photo_url": "https://media.api-sports.io/football/players/57.png", "status": "Active"},
    {"id": 58, "name": "Ollie Watkins", "short_name": "Watkins", "real_team_id": 66, "real_team_name": "Aston Villa", "position": "FWD", "current_price": 8.5, "photo_url": "https://media.api-sports.io/football/players/58.png", "status": "Active"},
    {"id": 59, "name": "Alexander Isak", "short_name": "Isak", "real_team_id": 34, "real_team_name": "Newcastle", "position": "FWD", "current_price": 8.5, "photo_url": "https://media.api-sports.io/football/players/59.png", "status": "Active"},
]

MOCK_FIXTURES: List[Dict[str, Any]] = [
    {
        "id": 1001,
        "league_id": 140,
        "round": "Matchday 24",
        "home_team_id": 529,
        "home_team_name": "Barcelona",
        "home_team_logo": "https://media.api-sports.io/football/teams/529.png",
        "away_team_id": 541,
        "away_team_name": "Real Madrid",
        "away_team_logo": "https://media.api-sports.io/football/teams/541.png",
        "kickoff_time": "2026-08-29T19:00:00Z",
        "status": "In-Play",
        "home_score": 2,
        "away_score": 1
    },
    {
        "id": 1002,
        "league_id": 39,
        "round": "Matchday 24",
        "home_team_id": 50,
        "home_team_name": "Manchester City",
        "home_team_logo": "https://media.api-sports.io/football/teams/50.png",
        "away_team_id": 42,
        "away_team_name": "Arsenal",
        "away_team_logo": "https://media.api-sports.io/football/teams/42.png",
        "kickoff_time": "2026-08-29T16:30:00Z",
        "status": "In-Play",
        "home_score": 1,
        "away_score": 1
    },
    {
        "id": 1003,
        "league_id": 39,
        "round": "Matchday 24",
        "home_team_id": 40,
        "home_team_name": "Liverpool",
        "home_team_logo": "https://media.api-sports.io/football/teams/40.png",
        "away_team_id": 49,
        "away_team_name": "Chelsea",
        "away_team_logo": "https://media.api-sports.io/football/teams/49.png",
        "kickoff_time": "2026-08-29T14:00:00Z",
        "status": "Finished",
        "home_score": 3,
        "away_score": 1
    },
    {
        "id": 1004,
        "league_id": 140,
        "round": "Matchday 24",
        "home_team_id": 530,
        "home_team_name": "Atletico Madrid",
        "home_team_logo": "https://media.api-sports.io/football/teams/530.png",
        "away_team_id": 547,
        "away_team_name": "Girona",
        "away_team_logo": "https://media.api-sports.io/football/teams/547.png",
        "kickoff_time": "2026-08-29T21:00:00Z",
        "status": "Scheduled",
        "home_score": 0,
        "away_score": 0
    }
]
