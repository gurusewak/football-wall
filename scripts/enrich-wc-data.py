#!/usr/bin/env python3
"""
World Cup JSON Enricher
Enriches all 8 WC JSON files with API-FOOTBALL Pro data:
  - Goal events (scorer, minute, type)
  - Card events (player, minute, type)
  - Substitutions
  - Lineups (starting XI, subs, formation, coach)
  - Match statistics (shots, possession, etc.)
  - Top scorers / assists for awardStandings

Usage: python3 scripts/enrich-wc-data.py
       python3 scripts/enrich-wc-data.py --year 2026   (single year)
       python3 scripts/enrich-wc-data.py --dry-run     (no writes)
"""

import json, os, sys, time, re, glob, argparse, ssl
from pathlib import Path
from datetime import datetime, timedelta
import urllib.request, urllib.error

# macOS Python 3.14+ has stricter SSL chain validation — create a permissive context
# for API calls to the known api-football.com endpoint
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

# ─── Config ──────────────────────────────────────────────────────────────────

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / 'public' / 'data'
CACHE_DIR = ROOT / '.api-cache'
BASE_URL = 'https://v3.football.api-sports.io'
LEAGUE_ID = 1  # FIFA World Cup

YEARS = [1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026]
REQUEST_DELAY = 0.25   # seconds between API calls (Pro plan: 300/min max)

# ─── Read API key ─────────────────────────────────────────────────────────────

def read_env_local():
    env_path = ROOT / '.env.local'
    env = {}
    try:
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip()
    except FileNotFoundError:
        pass
    return env

ENV = read_env_local()
API_KEY = ENV.get('API_FOOTBALL_KEY') or os.environ.get('API_FOOTBALL_KEY', '')

if not API_KEY:
    print('ERROR: API_FOOTBALL_KEY not found in .env.local or environment')
    sys.exit(1)

# ─── Team name → JSON teamId mapping ─────────────────────────────────────────

API_TEAM_ALIASES = {
    # API name (lowercased) → JSON teamId
    'united states': 'usa',
    'korea republic': 'south-korea',
    'republic of korea': 'south-korea',
    'ir iran': 'iran',
    "côte d'ivoire": 'ivory-coast',
    "cote d'ivoire": 'ivory-coast',
    'ivory coast': 'ivory-coast',
    'china pr': 'china',
    'china peoples republic': 'china',
    'north korea': 'north-korea',
    'korea dpr': 'north-korea',
    'democratic peoples republic of korea': 'north-korea',
    'curacao': 'curacao',
    'curaçao': 'curacao',
    'dr congo': 'dr-congo',
    'democratic republic of congo': 'dr-congo',
    'cape verde islands': 'cape-verde',
    'cape verde': 'cape-verde',
    'trinidad & tobago': 'trinidad-and-tobago',
    'trinidad and tobago': 'trinidad-and-tobago',
    'bosnia & herzegovina': 'bosnia-and-herzegovina',
    'bosnia and herzegovina': 'bosnia-and-herzegovina',
    'bosnia-herzegovina': 'bosnia-and-herzegovina',
    'federal republic of yugoslavia': 'yugoslavia',
    'yugoslavia': 'yugoslavia',
    'new zealand': 'new-zealand',
    'saudi arabia': 'saudi-arabia',
    'south africa': 'south-africa',
    'costa rica': 'costa-rica',
    'czech republic': 'czech-republic',
    'serbia and montenegro': 'serbia-montenegro',
}

def api_name_to_id(api_name: str, json_teams_by_name: dict) -> str | None:
    """Resolve an API team name to a JSON teamId."""
    lower = api_name.lower().strip()

    # Direct alias map
    if lower in API_TEAM_ALIASES:
        return API_TEAM_ALIASES[lower]

    # Try matching against known JSON team names
    if lower in json_teams_by_name:
        return json_teams_by_name[lower]

    # Fuzzy: remove diacritics (simple ASCII fallback)
    ascii_name = lower.encode('ascii', 'ignore').decode()
    if ascii_name in json_teams_by_name:
        return json_teams_by_name[ascii_name]

    # Slug-style: lowercase hyphenated
    slug = re.sub(r'[^a-z0-9]', '-', lower).strip('-')
    slug = re.sub(r'-+', '-', slug)
    if slug in {v for v in json_teams_by_name.values()}:
        return slug

    return None

def slugify_player(name: str) -> str:
    """Turn 'E. Valencia' → 'e-valencia' for IDs."""
    # Remove control characters first
    clean = re.sub(r'[\x00-\x1f\x7f]', '', name)
    return re.sub(r'[^a-z0-9]', '-', clean.lower().strip()).strip('-')

def sanitize_string(s: str | None) -> str | None:
    """Remove control characters from a string (control chars corrupt JSON)."""
    if s is None:
        return None
    return re.sub(r'[\x00-\x1f\x7f]', '', s)

# ─── API client with disk cache ───────────────────────────────────────────────

CACHE_DIR.mkdir(exist_ok=True)
REQUEST_COUNT = 0

def _cache_key(path: str) -> str:
    safe = re.sub(r'[^a-z0-9_\-]', '_', path.lower())
    return str(CACHE_DIR / f"{safe}.json")

def api_get(path: str, use_cache: bool = True) -> list | dict | None:
    global REQUEST_COUNT
    cache_file = _cache_key(path)

    if use_cache and os.path.exists(cache_file):
        with open(cache_file) as f:
            data = json.load(f)
        print(f"  [cache] {path}")
        return data

    time.sleep(REQUEST_DELAY)
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, headers={'x-apisports-key': API_KEY})
    try:
        with urllib.request.urlopen(req, context=_SSL_CTX, timeout=15) as r:
            raw = json.loads(r.read())
            REQUEST_COUNT += 1

            if raw.get('errors') and raw['errors']:
                errs = raw['errors']
                if isinstance(errs, list):
                    print(f"  [WARN] {path} errors: {errs}")
                elif isinstance(errs, dict) and errs:
                    print(f"  [WARN] {path} errors: {errs}")
                    return None

            result = raw.get('response')
            if use_cache and result is not None:
                with open(cache_file, 'w') as f:
                    json.dump(result, f)
            print(f"  [api #{REQUEST_COUNT}] {path} → {len(result) if isinstance(result, list) else 'dict'} results")
            return result
    except urllib.error.HTTPError as e:
        print(f"  [HTTP {e.code}] {path}")
        return None
    except Exception as e:
        print(f"  [ERR] {path}: {e}")
        return None

# ─── Helpers ─────────────────────────────────────────────────────────────────

def normalize_date(d: str | None) -> str | None:
    """Extract YYYY-MM-DD from ISO string or date-only string."""
    if not d:
        return None
    return d[:10]

def dates_close(d1: str | None, d2: str | None, tolerance_days: int = 1) -> bool:
    if not d1 or not d2:
        return False
    try:
        dt1 = datetime.strptime(d1[:10], '%Y-%m-%d')
        dt2 = datetime.strptime(d2[:10], '%Y-%m-%d')
        return abs((dt1 - dt2).days) <= tolerance_days
    except:
        return False

# ─── Match fixture ↔ JSON match ───────────────────────────────────────────────

def build_team_name_index(json_data: dict) -> dict:
    """Build {lowercased_name: teamId} from teams array."""
    idx = {}
    for t in json_data.get('teams', []):
        name = t.get('name', '')
        tid = t.get('id', '')
        if name and tid:
            idx[name.lower()] = tid
    return idx

def match_api_fixture_to_json(api_fix, json_matches: list, team_index: dict) -> dict | None:
    """Find the JSON match object corresponding to an API fixture."""
    api_home = api_fix['teams']['home']['name']
    api_away = api_fix['teams']['away']['name']
    api_date = api_fix['fixture']['date'][:10] if api_fix['fixture']['date'] else None

    home_id = api_name_to_id(api_home, team_index)
    away_id = api_name_to_id(api_away, team_index)

    if not home_id or not away_id:
        # Try swapped (some APIs use home/away differently)
        return None

    for m in json_matches:
        json_home = m.get('homeTeamId', '')
        json_away = m.get('awayTeamId', '')
        json_date = normalize_date(m.get('date') or m.get('localDate'))

        if json_home == home_id and json_away == away_id:
            if dates_close(api_date, json_date, 2):
                return m

    return None

# ─── Event processing ─────────────────────────────────────────────────────────

def process_events(events: list, match_id: str, match: dict, team_index: dict) -> tuple[list, list, list]:
    """Convert API events → (goals, cards, matchEvents) in JSON schema."""
    goals, cards, all_events = [], [], []
    goal_seq = 1
    card_seq = 1
    event_seq = 1

    for ev in events:
        etype = ev.get('type', '')
        edetail = ev.get('detail', '')
        elapsed = ev.get('time', {}).get('elapsed')
        extra = ev.get('time', {}).get('extra')
        api_team_name = sanitize_string(ev.get('team', {}).get('name', '')) or ''
        player_name = sanitize_string(ev.get('player', {}).get('name', '')) or ''
        assist_name = sanitize_string((ev.get('assist') or {}).get('name'))

        team_id = api_name_to_id(api_team_name, team_index)

        base_event = {
            'id': f"{match_id}-event-{event_seq}",
            'matchId': match_id,
            'minute': elapsed,
            'minuteExtra': extra,
            'teamId': team_id,
            'team': api_team_name,
            'type': etype,
            'detail': edetail,
            'playerName': player_name,
            'sourceIds': ['api-football'],
        }
        all_events.append(base_event)
        event_seq += 1

        if etype == 'Goal':
            is_own = 'own' in edetail.lower()
            is_missed_pen = 'missed' in edetail.lower()
            is_pen = 'penalty' in edetail.lower() and not is_missed_pen

            # Skip penalty shootout kicks: in PKS matches all kicks show at elapsed=120
            # API-FOOTBALL's team for an own goal is ALREADY the benefiting team, no flip needed
            is_pks_event = (
                match.get('wentToPenaltyShootout')
                and elapsed is not None and elapsed >= 120
                and is_pen
            )
            if is_missed_pen or is_pks_event:
                continue

            # team in API event is always the team that SCORED (benefiting team for OGs too)
            scoring_team_id = team_id

            goals.append({
                'id': f"{match_id}-goal-{goal_seq}",
                'matchId': match_id,
                'minute': elapsed,
                'minuteExtra': extra,
                'scoringTeamId': scoring_team_id,
                'scoringTeam': api_team_name,
                'scorerPlayerId': slugify_player(player_name) if player_name else None,
                'scorerPlayerName': player_name,
                'assistPlayerId': slugify_player(assist_name) if assist_name else None,
                'assistPlayerName': assist_name,
                'isOwnGoal': is_own,
                'isPenalty': is_pen,
                'sourceIds': ['api-football'],
                'verified': True,
            })
            goal_seq += 1

        elif etype == 'Card':
            card_type = 'yellow' if 'yellow' in edetail.lower() else ('red' if 'red' in edetail.lower() else edetail.lower())
            cards.append({
                'id': f"{match_id}-card-{card_seq}",
                'matchId': match_id,
                'minute': elapsed,
                'minuteExtra': extra,
                'teamId': team_id,
                'team': api_team_name,
                'playerId': slugify_player(player_name) if player_name else None,
                'playerName': player_name,
                'cardType': card_type,
                'sourceIds': ['api-football'],
                'verified': True,
            })
            card_seq += 1

    return goals, cards, all_events

def process_lineups(lineups_data: list, match_id: str, team_index: dict) -> dict | None:
    if not lineups_data or len(lineups_data) < 2:
        return None

    def parse_team_lineup(team_data):
        return {
            'teamId': api_name_to_id(team_data['team']['name'], team_index),
            'teamName': team_data['team']['name'],
            'formation': team_data.get('formation'),
            'coachName': (team_data.get('coach') or {}).get('name'),
            'startXI': [
                {
                    'playerId': slugify_player(p['player']['name']),
                    'playerName': p['player']['name'],
                    'shirtNumber': p['player'].get('number'),
                    'position': p['player'].get('pos'),
                    'grid': p['player'].get('grid'),
                }
                for p in team_data.get('startXI', [])
            ],
            'substitutes': [
                {
                    'playerId': slugify_player(p['player']['name']),
                    'playerName': p['player']['name'],
                    'shirtNumber': p['player'].get('number'),
                    'position': p['player'].get('pos'),
                }
                for p in team_data.get('substitutes', [])
            ],
        }

    home_lineup = parse_team_lineup(lineups_data[0])
    away_lineup = parse_team_lineup(lineups_data[1])

    return {
        'matchId': match_id,
        'home': home_lineup,
        'away': away_lineup,
        'sourceIds': ['api-football'],
    }

def process_statistics(stats_data: list, match_id: str, team_index: dict) -> dict | None:
    if not stats_data or len(stats_data) < 2:
        return None

    def parse_stats(team_data):
        return {
            'teamId': api_name_to_id(team_data['team']['name'], team_index),
            'teamName': team_data['team']['name'],
            'statistics': team_data.get('statistics', []),
        }

    return {
        'matchId': match_id,
        'home': parse_stats(stats_data[0]),
        'away': parse_stats(stats_data[1]),
        'sourceIds': ['api-football'],
    }

# ─── Main enrichment per tournament ──────────────────────────────────────────

def enrich_year(year: int, dry_run: bool = False) -> dict:
    print(f"\n{'='*60}")
    print(f" Enriching {year} World Cup")
    print(f"{'='*60}")

    json_path = DATA_DIR / f"wc-{year}.json"
    if not json_path.exists():
        print(f"  [SKIP] {json_path} not found")
        return {}

    with open(json_path, encoding='utf-8') as f:
        raw_text = f.read()
    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        # Tolerate existing corrupted files — re-enrichment will overwrite with clean data
        data = json.loads(raw_text, strict=False)

    team_index = build_team_name_index(data)

    # Fetch all fixtures for this year
    print(f"\n[1] Fetching fixtures for {year}...")
    api_fixtures = api_get(f"/fixtures?league={LEAGUE_ID}&season={year}")
    if not api_fixtures:
        print(f"  No fixtures returned, skipping")
        return {}

    completed_api = [
        f for f in api_fixtures
        if f['fixture']['status']['short'] in ('FT', 'AET', 'PEN')
    ]
    print(f"  API: {len(api_fixtures)} total, {len(completed_api)} completed")

    # Get all JSON matches (group + knockout combined)
    all_json_matches = list(data.get('matches', []))

    # Match API fixtures → JSON matches
    fixture_to_match = {}  # api_fixture_id → json_match
    unmatched_api = []

    for api_fix in completed_api:
        json_match = match_api_fixture_to_json(api_fix, all_json_matches, team_index)
        if json_match:
            fixture_to_match[api_fix['fixture']['id']] = (api_fix, json_match)
        else:
            unmatched_api.append(api_fix)

    print(f"  Matched: {len(fixture_to_match)}, Unmatched: {len(unmatched_api)}")
    if unmatched_api:
        for f in unmatched_api[:5]:
            print(f"    UNMATCHED: {f['teams']['home']['name']} vs {f['teams']['away']['name']} ({f['fixture']['date'][:10]})")

    # ── Fetch events, lineups, statistics for each matched fixture ──
    print(f"\n[2] Fetching events for {len(fixture_to_match)} completed fixtures...")

    all_tournament_goals = []
    all_tournament_cards = []
    all_tournament_match_events = []
    lineups_by_match = {}
    stats_by_match = {}

    for idx, (fixture_id, (api_fix, json_match)) in enumerate(fixture_to_match.items()):
        match_id = json_match['id']
        home = api_fix['teams']['home']['name']
        away = api_fix['teams']['away']['name']
        print(f"  [{idx+1}/{len(fixture_to_match)}] {home} vs {away} (fixture {fixture_id})")

        # Events
        events_data = api_get(f"/fixtures/events?fixture={fixture_id}")
        if events_data is not None:
            goals, cards, match_events = process_events(events_data, match_id, json_match, team_index)
            json_match['goals'] = goals
            json_match['cards'] = cards
            all_tournament_goals.extend(goals)
            all_tournament_cards.extend(cards)
            all_tournament_match_events.extend(match_events)
            print(f"    → {len(goals)} goals, {len(cards)} cards, {len(match_events)} events")

        # Lineups
        lineups_data = api_get(f"/fixtures/lineups?fixture={fixture_id}")
        if lineups_data is not None:
            lineup_obj = process_lineups(lineups_data, match_id, team_index)
            if lineup_obj:
                lineups_by_match[match_id] = lineup_obj

        # Statistics
        stats_data = api_get(f"/fixtures/statistics?fixture={fixture_id}")
        if stats_data is not None:
            stats_obj = process_statistics(stats_data, match_id, team_index)
            if stats_obj:
                stats_by_match[match_id] = stats_obj

    # ── Fetch standings ──
    print(f"\n[3] Fetching standings for {year}...")
    standings_raw = api_get(f"/standings?league={LEAGUE_ID}&season={year}")
    if standings_raw and isinstance(standings_raw, list) and standings_raw:
        # standings_raw is [{league: {standings: [[...], [...], ...]}}]
        inner = standings_raw[0]
        if isinstance(inner, dict) and 'league' in inner:
            flat_standings = []
            for group in inner['league']['standings']:
                flat_standings.extend(group)
            print(f"  Got {len(flat_standings)} standing entries")
            # Update groups standings
            _update_group_standings(data, flat_standings, team_index)
        elif isinstance(standings_raw[0], list):
            flat_standings = []
            for group in standings_raw:
                flat_standings.extend(group)
            print(f"  Got {len(flat_standings)} standing entries (flat format)")
            _update_group_standings(data, flat_standings, team_index)

    # ── Fetch top scorers ──
    print(f"\n[4] Fetching top scorers for {year}...")
    topscorers = api_get(f"/players/topscorers?league={LEAGUE_ID}&season={year}")
    if topscorers:
        print(f"  Got {len(topscorers)} top scorers")
        _update_top_scorers(data, topscorers, year)

    # ── Fetch top assists ──
    print(f"\n[5] Fetching top assists for {year}...")
    topassists = api_get(f"/players/topassists?league={LEAGUE_ID}&season={year}")
    if topassists:
        print(f"  Got {len(topassists)} top assist players")
        _update_top_assists(data, topassists, year)

    # ── Write enriched data back ──
    data['goals'] = all_tournament_goals
    data['cards'] = all_tournament_cards
    data['matchEvents'] = all_tournament_match_events
    data['lineups'] = list(lineups_by_match.values())
    data['teamMatchStatistics'] = list(stats_by_match.values())
    data['schemaVersion'] = '3.1'
    data['lastUpdated'] = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

    # Update dataAvailability
    goals_status = 'complete' if all_tournament_goals else 'missing'
    cards_status = 'complete' if all_tournament_cards else 'missing'
    lineups_status = 'complete' if lineups_by_match else 'missing'
    stats_status = 'complete' if stats_by_match else 'missing'

    da = data.get('dataAvailability', {})
    da.update({
        'goals': goals_status,
        'goalMinutes': goals_status,
        'ownGoals': goals_status,
        'penaltyGoals': goals_status,
        'cards': cards_status,
        'lineups': lineups_status,
        'teamMatchStatistics': stats_status,
    })
    data['dataAvailability'] = da

    report = {
        'year': year,
        'fixturesFromApi': len(api_fixtures),
        'completedFromApi': len(completed_api),
        'matched': len(fixture_to_match),
        'unmatched': len(unmatched_api),
        'goalsIngested': len(all_tournament_goals),
        'cardsIngested': len(all_tournament_cards),
        'lineupsIngested': len(lineups_by_match),
        'statsIngested': len(stats_by_match),
    }

    if not dry_run:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n  ✅ Written: {json_path.name}")
    else:
        print(f"\n  [DRY RUN] Would write: {json_path.name}")

    return report

# ─── Standings update ─────────────────────────────────────────────────────────

def _update_group_standings(data: dict, flat_standings: list, team_index: dict):
    """Update group standings in JSON data from API flat standings list."""
    if not flat_standings:
        return

    # Build a lookup: teamId → api standing entry
    standing_by_team = {}
    for s in flat_standings:
        team_name = s['team']['name']
        team_id = api_name_to_id(team_name, team_index)
        if team_id:
            standing_by_team[team_id] = s

    for group in data.get('groups', []):
        for st_entry in group.get('standings', []):
            tid = st_entry.get('teamId')
            if tid and tid in standing_by_team:
                api_st = standing_by_team[tid]
                api_all = api_st.get('all', {})
                api_goals = api_all.get('goals', {})
                st_entry.update({
                    'played': api_all.get('played', st_entry.get('played')),
                    'won': api_all.get('win', st_entry.get('won')),
                    'drawn': api_all.get('draw', st_entry.get('drawn')),
                    'lost': api_all.get('lose', st_entry.get('lost')),
                    'goalsFor': api_goals.get('for', st_entry.get('goalsFor')),
                    'goalsAgainst': api_goals.get('against', st_entry.get('goalsAgainst')),
                    'goalDifference': api_st.get('goalsDiff', st_entry.get('goalDifference')),
                    'points': api_st.get('points', st_entry.get('points')),
                })

# ─── Award standings update ───────────────────────────────────────────────────

def _update_top_scorers(data: dict, topscorers: list, year: int):
    """Update or add Golden Boot / top scorers in awardStandings."""
    leaders = []
    for rank, ts in enumerate(topscorers[:10], 1):
        player_name = ts['player']['name']
        team_stats = ts.get('statistics', [{}])[0]
        team_name = team_stats.get('team', {}).get('name', '')
        goals = (team_stats.get('goals') or {}).get('total') or 0
        assists = (team_stats.get('goals') or {}).get('assists') or 0

        team_index = build_team_name_index(data)
        team_id = api_name_to_id(team_name, team_index)

        leaders.append({
            'rank': rank,
            'playerId': slugify_player(player_name),
            'playerName': player_name,
            'teamId': team_id,
            'teamName': team_name,
            'goals': goals,
            'assists': assists,
            'minutesPlayed': None,
            'sourceIds': ['api-football'],
            'verified': True,
        })

    award_id = f"{year}-golden-boot-standings"
    existing = data.get('awardStandings', [])
    # Replace or add
    updated = [a for a in existing if a.get('id') != award_id]
    updated.append({
        'id': award_id,
        'tournamentYear': year,
        'awardName': 'Golden Boot',
        'leaders': leaders,
        'tieBreakers': [],
        'sourceIds': ['api-football'],
        'verified': True,
        'sourceQuality': 'api_official',
    })
    data['awardStandings'] = updated

def _update_top_assists(data: dict, topassists: list, year: int):
    """Update or add top assists in awardStandings."""
    leaders = []
    team_index = build_team_name_index(data)

    for rank, ta in enumerate(topassists[:10], 1):
        player_name = ta['player']['name']
        team_stats = ta.get('statistics', [{}])[0]
        team_name = team_stats.get('team', {}).get('name', '')
        assists = (team_stats.get('goals') or {}).get('assists') or 0
        goals = (team_stats.get('goals') or {}).get('total') or 0
        team_id = api_name_to_id(team_name, team_index)

        leaders.append({
            'rank': rank,
            'playerId': slugify_player(player_name),
            'playerName': player_name,
            'teamId': team_id,
            'teamName': team_name,
            'goals': goals,
            'assists': assists,
            'minutesPlayed': None,
            'sourceIds': ['api-football'],
            'verified': True,
        })

    award_id = f"{year}-top-assists-standings"
    existing = data.get('awardStandings', [])
    updated = [a for a in existing if a.get('id') != award_id]
    updated.append({
        'id': award_id,
        'tournamentYear': year,
        'awardName': 'Top Assists',
        'leaders': leaders,
        'tieBreakers': [],
        'sourceIds': ['api-football'],
        'verified': True,
        'sourceQuality': 'api_official',
    })
    data['awardStandings'] = updated

# ─── Validation ───────────────────────────────────────────────────────────────

def validate_year(year: int) -> dict:
    json_path = DATA_DIR / f"wc-{year}.json"
    with open(json_path) as f:
        data = json.load(f)

    matches = data.get('matches', [])
    completed = [m for m in matches if m.get('status') == 'completed']
    goals_in_matches = sum(len(m.get('goals', [])) for m in completed)
    cards_in_matches = sum(len(m.get('cards', [])) for m in completed)
    total_goals_field = len(data.get('goals', []))
    lineups = len(data.get('lineups', []))
    stats = len(data.get('teamMatchStatistics', []))

    issues = []
    if completed and goals_in_matches == 0:
        issues.append('No goals ingested for completed matches')
    if total_goals_field != goals_in_matches:
        issues.append(f'Goal count mismatch: match-level={goals_in_matches}, tournament-level={total_goals_field}')

    return {
        'year': year,
        'totalMatches': len(matches),
        'completedMatches': len(completed),
        'goalsInMatches': goals_in_matches,
        'cardsInMatches': cards_in_matches,
        'tournamentGoals': total_goals_field,
        'lineupsIngested': lineups,
        'statsIngested': stats,
        'schemaVersion': data.get('schemaVersion'),
        'issues': issues,
        'ok': len(issues) == 0,
    }

# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Enrich World Cup JSON files with API-FOOTBALL data')
    parser.add_argument('--year', type=int, help='Only process this year')
    parser.add_argument('--dry-run', action='store_true', help='Do not write files')
    parser.add_argument('--no-cache', action='store_true', help='Bypass disk cache')
    args = parser.parse_args()

    use_cache = not args.no_cache
    years_to_process = [args.year] if args.year else YEARS

    print(f"World Cup JSON Enricher")
    print(f"API key: {API_KEY[:8]}...")
    print(f"Years: {years_to_process}")
    print(f"Dry run: {args.dry_run}")
    print(f"Cache: {use_cache}")

    # Monkey-patch api_get to support use_cache arg at module level
    # (we just always pass the global flag)
    original_api_get = globals()['api_get']
    def patched_api_get(path: str, **kwargs):
        return original_api_get(path, use_cache=use_cache)
    globals()['api_get'] = patched_api_get

    reports = []
    for year in years_to_process:
        try:
            report = enrich_year(year, dry_run=args.dry_run)
            reports.append(report)
        except KeyboardInterrupt:
            print('\n[INTERRUPTED]')
            break
        except Exception as e:
            print(f"  [ERROR] Year {year}: {e}")
            import traceback; traceback.print_exc()

    # Validation
    print(f"\n{'='*60}")
    print(f" Validation Report")
    print(f"{'='*60}")
    val_reports = []
    for year in years_to_process:
        if not args.dry_run:
            try:
                v = validate_year(year)
                val_reports.append(v)
                status = '✅' if v['ok'] else '⚠️'
                print(f"  {status} {year}: {v['completedMatches']} completed, {v['goalsInMatches']} goals, {v['cardsInMatches']} cards, {v['lineupsIngested']} lineups")
                for issue in v.get('issues', []):
                    print(f"      Issue: {issue}")
            except Exception as e:
                print(f"  ❌ {year}: validation error: {e}")

    # Write ingestion report
    if not args.dry_run:
        report_path = DATA_DIR / 'api-ingestion-report.json'
        with open(report_path, 'w') as f:
            json.dump({
                'generatedAt': datetime.utcnow().isoformat(),
                'totalRequestsMade': REQUEST_COUNT,
                'ingestionReports': reports,
                'validationReports': val_reports,
            }, f, indent=2)
        print(f"\n  📊 Report: {report_path}")

    print(f"\n  Total API requests made this run: {REQUEST_COUNT}")
    print("Done.")

if __name__ == '__main__':
    main()
