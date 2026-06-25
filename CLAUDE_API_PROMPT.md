# 2026 World Cup Data Pipeline - API Development Prompt

## Project Overview
Build a complete data pipeline to fetch, store, and manage 2026 FIFA World Cup data in Neon PostgreSQL. The system must ingest initial JSON data into properly structured tables, then run automated syncs every 2 hours until July 20, 2026 (tournament end date).

## Current Neon Setup
Your Neon project is already configured with:
- **Project ID**: `restless-snow-28362357`
- **Database URL**: Stored as `DATABASE_URL` environment variable (auto-provisioned)
- **Existing Table**: `sports_data` (generic JSON storage - deprecate in favor of detailed schema below)

## Required Neon Database Schema

You must create these tables to support bracket, group, match, and event-level data:

```sql
-- World Cup Information
CREATE TABLE world_cups (
  id SERIAL PRIMARY KEY,
  year INT UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(255),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Groups/Pools
CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  world_cup_id INT NOT NULL REFERENCES world_cups(id),
  name VARCHAR(50) NOT NULL,
  letter CHAR(1),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(world_cup_id, name)
);

-- Teams
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  fifa_code VARCHAR(10) UNIQUE,
  name VARCHAR(255) NOT NULL,
  flag_url VARCHAR(500),
  elo_rating INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Team Group Assignment
CREATE TABLE team_groups (
  id SERIAL PRIMARY KEY,
  team_id INT NOT NULL REFERENCES teams(id),
  group_id INT NOT NULL REFERENCES groups(id),
  seed_position INT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, group_id)
);

-- Group Standings
CREATE TABLE group_standings (
  id SERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES groups(id),
  team_id INT NOT NULL REFERENCES teams(id),
  matches_played INT DEFAULT 0,
  wins INT DEFAULT 0,
  draws INT DEFAULT 0,
  losses INT DEFAULT 0,
  goals_for INT DEFAULT 0,
  goals_against INT DEFAULT 0,
  goal_difference INT DEFAULT 0,
  points INT DEFAULT 0,
  position INT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, team_id)
);

-- Matches
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  world_cup_id INT NOT NULL REFERENCES world_cups(id),
  match_id VARCHAR(50) UNIQUE NOT NULL,
  stage VARCHAR(50), -- 'group', 'round_of_16', 'quarterfinal', 'semifinal', 'final', etc.
  home_team_id INT REFERENCES teams(id),
  away_team_id INT REFERENCES teams(id),
  group_id INT REFERENCES groups(id),
  scheduled_date TIMESTAMP,
  status VARCHAR(50), -- 'scheduled', 'in_progress', 'completed'
  home_score INT,
  away_score INT,
  home_penalty_score INT,
  away_penalty_score INT,
  venue VARCHAR(255),
  referee VARCHAR(255),
  attendance INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Match Events (Goals, Cards, Substitutions, etc.)
CREATE TABLE match_events (
  id SERIAL PRIMARY KEY,
  match_id INT NOT NULL REFERENCES matches(id),
  event_type VARCHAR(50), -- 'goal', 'yellow_card', 'red_card', 'substitution', 'own_goal'
  minute INT,
  team_id INT NOT NULL REFERENCES teams(id),
  player_name VARCHAR(255),
  player_id VARCHAR(50),
  detail VARCHAR(500), -- Additional details (e.g., penalty, free kick)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Knockout Bracket
CREATE TABLE knockout_bracket (
  id SERIAL PRIMARY KEY,
  world_cup_id INT NOT NULL REFERENCES world_cups(id),
  round VARCHAR(50), -- 'round_of_16', 'quarterfinal', 'semifinal', 'final'
  position INT,
  match_id INT REFERENCES matches(id),
  winner_team_id INT REFERENCES teams(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Data Sync Log
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50),
  status VARCHAR(50), -- 'success', 'failed', 'partial'
  records_processed INT,
  error_message TEXT,
  synced_at TIMESTAMP DEFAULT NOW()
);
```

## Data Structure Requirements

Your API must handle and store this data hierarchy:

```
World Cup (2026)
├── Groups (A, B, C, D, E, F, G, H)
│   ├── Teams (8 teams per group)
│   │   └── Player Details
│   └── Group Standings
├── Matches
│   ├── Group Stage Matches
│   │   └── Events (goals, cards, subs)
│   ├── Knockout Matches (Round of 16, QF, SF, Final)
│   │   └── Events
│   └── Match Statistics
└── Bracket/Knockout Tree
    └── Winners & Progression
```

## API Implementation Requirements

### 1. Initial Data Ingestion
Create an endpoint `/api/worldcup/ingest` that:
- Accepts JSON files as POST payload (from your initial data source)
- Parses JSON and inserts into appropriate Neon tables
- Returns summary of records inserted: groups, teams, matches, events
- Runs **once** to populate historical/starting data
- Example payload structure:
```json
{
  "world_cup": { "year": 2026, "name": "FIFA World Cup 2026", ... },
  "groups": [...],
  "teams": [...],
  "matches": [...],
  "events": [...]
}
```

### 2. Scheduled Sync Endpoint
Create an endpoint `/api/worldcup/sync` that:
- Fetches live data for 2026 World Cup only
- Runs via cron job every 2 hours
- Cron schedule: `0 */2 * * *` (every 2 hours)
- Only active from now until July 20, 2026 (11:59 PM UTC)
- Updates only changed records (matches, scores, events, standings)
- Inserts new events without duplicating existing ones
- Logs all syncs to `sync_logs` table with record counts and status

### 3. Query Endpoints
Create read endpoints for the frontend:

**GET `/api/worldcup/groups`** - Returns all groups with teams and standings:
```json
{
  "groups": [
    {
      "id": 1,
      "name": "Group A",
      "teams": [...],
      "standings": [...]
    }
  ]
}
```

**GET `/api/worldcup/matches?stage=group`** - Filter matches by stage:
- Stages: `group`, `round_of_16`, `quarterfinal`, `semifinal`, `final`

**GET `/api/worldcup/matches/:matchId/events`** - Get all events for a match

**GET `/api/worldcup/bracket`** - Return knockout bracket structure with winners and progression

**GET `/api/worldcup/standings?groupId=1`** - Get standings for specific group

## Cron Job Configuration

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/worldcup-sync",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

The cron endpoint should:
- Call `/api/worldcup/sync` internally
- Check if current date is before July 20, 2026 (disable after)
- Return 200 status with sync summary
- Log any failures for debugging

## Integration with Existing Code

Your project already has:
- Drizzle ORM setup at `lib/db/index.ts`
- Database client shared via `pg` Pool
- `/api/sports-data` endpoint (deprecate or refactor)
- Environment variable `DATABASE_URL` automatically set

You must:
1. Use the existing `lib/db/index.ts` and add your schema to `lib/db/schema.ts`
2. Use Drizzle ORM for all queries (not raw SQL)
3. Scope by world_cup_id where needed (e.g., only 2026 data)
4. Follow the existing API pattern in `/app/api/` directory
5. Push changes to the `publish-site` branch
6. Changes will auto-deploy to Vercel via GitHub integration

## Data Sources

Recommended APIs for 2026 World Cup data:
- **RapidAPI World Cup** (rapidapi.com)
- **API Football** (api-football.com)
- **Football-Data.org** (football-data.org)
- **ESPN API** (direct ESPN endpoints)

Choose one and document the API key requirement in `.env.example`.

## Testing Checklist

- [ ] Ingest endpoint successfully loads initial data
- [ ] All groups, teams, matches stored correctly
- [ ] Sync endpoint runs every 2 hours without errors
- [ ] Match scores and events update in real-time
- [ ] Group standings recalculate after each match
- [ ] Bracket updates after knockout matches
- [ ] Sync logs show successful records processed
- [ ] All read endpoints return complete data structure
- [ ] Sync disables automatically on July 20, 2026
- [ ] Deployed successfully to Vercel and data persists

## Notes

- Use transactions for multi-table inserts (groups → teams → standings) to ensure data consistency
- Deduplicate match events by event_id or unique combination of (match_id, minute, event_type, player_id)
- Cache group standings calculation to avoid recalculating on every request
- Consider adding indexes on frequently queried columns: world_cup_id, match_date, team_id, stage
- Add proper error handling and rollback for failed syncs
- All timestamps should use UTC timezone
