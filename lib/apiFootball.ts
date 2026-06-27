import 'server-only'
import { normalizeTeamName } from './teamNames'

const BASE_URL = 'https://v3.football.api-sports.io'
const WC_LEAGUE_ID = 1  // FIFA World Cup
const WC_SEASON = 2026

export interface ApiFixture {
  fixture: {
    id: number
    date: string  // ISO string
    status: { short: string; long: string; elapsed: number | null }
  }
  league: { id: number; season: number; round: string }
  teams: {
    home: { id: number; name: string }
    away: { id: number; name: string }
  }
  goals: { home: number | null; away: number | null }
  score: {
    extratime: { home: number | null; away: number | null }
    penalty: { home: number | null; away: number | null }
  }
}

export interface ApiMatchEvent {
  time: { elapsed: number; extra: number | null }
  team: { id: number; name: string }
  player: { id: number; name: string }
  assist: { id: number | null; name: string | null }
  type: 'Goal' | 'Card' | 'subst' | 'Var'
  detail: string
  comments: string | null
}

export interface ApiMatchStatBlock {
  team: { id: number; name: string }
  statistics: Array<{ type: string; value: number | string | null }>
}

export interface ApiStandingEntry {
  rank: number
  team: { id: number; name: string }
  points: number
  goalsDiff: number
  group: string
  all: {
    played: number
    win: number
    draw: number
    lose: number
    goals: { for: number; against: number }
  }
}

export interface ApiTopScorer {
  player: { name: string; nationality: string }
  statistics: Array<{
    team: { name: string }
    goals: { total: number; assists: number | null }
  }>
}

export interface ApiFetchedData {
  fetchedAt: string
  leagueId: number
  fixtures: ApiFixture[]
  liveFixtures: ApiFixture[]
  standings: ApiStandingEntry[]
  topScorers: ApiTopScorer[]
  topAssists: ApiTopScorer[]
  // Per-fixture detail for live + recently completed matches (keyed by fixture ID)
  fixtureEvents: Record<number, ApiMatchEvent[]>
  fixtureStats: Record<number, ApiMatchStatBlock[]>
  // Per-fixture goalkeeper saves (keyed by fixture ID)
  fixtureGkSaves: Record<number, Array<{ playerName: string; teamName: string; saves: number }>>
  // Fixture IDs whose /fixtures/players we successfully queried this run (even if
  // no keeper data came back) — lets the merge mark them done so empty results
  // don't block the capped back-fill from reaching other matches.
  gkFetchedFixtureIds: number[]
}

// Shape of /fixtures/players response (only the bits we need)
interface ApiFixturePlayers {
  team: { id: number; name: string }
  players: Array<{
    player: { id: number; name: string }
    statistics: Array<{ games: { position: string | null }; goals: { saves: number | null } }>
  }>
}

async function apiFetch<T>(path: string): Promise<T | null> {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return null

  try {
    const url = `${BASE_URL}${path}`
    const res = await fetch(url, {
      headers: { 'x-apisports-key': apiKey },
    })
    if (!res.ok) return null
    const json = await res.json()
    return (json.response as T) ?? null
  } catch {
    return null
  }
}

// Retry wrapper for transient failures (proxy drops, brief network blips).
// Only re-fires when apiFetch returns null (a real error) — a successful but
// empty response (e.g. []) is returned as-is, so normal call volume is unchanged.
async function apiFetchRetry<T>(path: string, retries = 1): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    const result = await apiFetch<T>(path)
    if (result !== null || attempt >= retries) return result
  }
}

const LIVE_STATUS_SET = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT'])
const DONE_STATUS_SET = new Set(['FT', 'AET', 'PEN'])
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

// Actual shape of /standings response: [{league: {standings: ApiStandingEntry[][]}}]
type StandingsResponse = Array<{ league: { standings: ApiStandingEntry[][] } }>

// rawMatches: existing DB matches — used to find completed matches still missing
// goalkeeper-saves data so we can back-fill them (a few per run) without re-pulling
// per-player data for the whole tournament every sync.
export async function fetchWc2026Data(rawMatches: any[] = []): Promise<ApiFetchedData | null> {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return null

  const [fixtures, liveFixtures, standingsWrapper, topScorers, topAssists] = await Promise.all([
    apiFetch<ApiFixture[]>(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`),
    apiFetch<ApiFixture[]>(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}&live=all`),
    apiFetch<StandingsResponse>(`/standings?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`),
    apiFetch<ApiTopScorer[]>(`/players/topscorers?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`),
    apiFetch<ApiTopScorer[]>(`/players/topassists?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`),
  ])

  if (!fixtures) return null

  const standings: ApiStandingEntry[] = standingsWrapper?.[0]?.league?.standings?.flat() ?? []

  // Only fetch event/stat detail for live + recently-finished matches (last 2
  // days). Historical detail already lives in the DB, so there's no need to
  // re-pull it every run; a 2-day window covers late-night finishes and gives
  // each new match many hourly passes to capture its events reliably.
  const cutoff = Date.now() - TWO_DAYS_MS
  const detailFixtures = fixtures.filter(f => {
    const status = f.fixture.status.short
    if (!LIVE_STATUS_SET.has(status) && !DONE_STATUS_SET.has(status)) return false
    return new Date(f.fixture.date).getTime() > cutoff
  })

  // Fetch events + statistics in batches. Firing all detail calls at once
  // (up to 80 parallel requests) can overwhelm a proxy/connection pool and
  // drop responses silently; batching keeps concurrency bounded and reliable.
  const fixtureEvents: Record<number, ApiMatchEvent[]> = {}
  const fixtureStats: Record<number, ApiMatchStatBlock[]> = {}

  const BATCH_SIZE = 6  // 6 fixtures = 12 concurrent requests per batch
  for (let i = 0; i < detailFixtures.length; i += BATCH_SIZE) {
    const batch = detailFixtures.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.flatMap(f => [
        apiFetchRetry<ApiMatchEvent[]>(`/fixtures/events?fixture=${f.fixture.id}`)
          .then(ev => { if (ev?.length) fixtureEvents[f.fixture.id] = ev }),
        apiFetchRetry<ApiMatchStatBlock[]>(`/fixtures/statistics?fixture=${f.fixture.id}`)
          .then(st => { if (st?.length) fixtureStats[f.fixture.id] = st }),
      ])
    )
  }

  // ── Goalkeeper saves (per-fixture player data) ─────────────────────────────
  // /fixtures/players is the only source of per-keeper saves (no season endpoint).
  // Fetch it for the same window, plus a capped back-fill of completed matches
  // that don't have saves stored yet — so the season tally fills in over a few
  // runs and then only new matches cost a call.
  const fixtureGkSaves: ApiFetchedData['fixtureGkSaves'] = {}
  const gkAttempted = new Set<number>()
  const pairKey = (a: string, b: string) => [normalizeTeamName(a), normalizeTeamName(b)].sort().join('__')
  const needSaves = new Set<string>()
  for (const m of rawMatches) {
    if (m?.status === 'completed' && m.homeTeam && m.awayTeam && !m.goalkeeperSavesChecked && !(Array.isArray(m.goalkeeperSaves) && m.goalkeeperSaves.length)) {
      needSaves.add(pairKey(m.homeTeam, m.awayTeam))
    }
  }
  const windowIds = new Set(detailFixtures.map(f => f.fixture.id))
  const savesBackfill = fixtures
    .filter(f => DONE_STATUS_SET.has(f.fixture.status.short) && !windowIds.has(f.fixture.id) && needSaves.has(pairKey(f.teams.home.name, f.teams.away.name)))
    .slice(0, 12)
  const gkFixtures = [
    ...detailFixtures.filter(f => DONE_STATUS_SET.has(f.fixture.status.short) || LIVE_STATUS_SET.has(f.fixture.status.short)),
    ...savesBackfill,
  ]
  for (let i = 0; i < gkFixtures.length; i += BATCH_SIZE) {
    const batch = gkFixtures.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(f =>
      apiFetchRetry<ApiFixturePlayers[]>(`/fixtures/players?fixture=${f.fixture.id}`).then(resp => {
        if (resp == null) return  // transient error → leave for a later retry
        gkAttempted.add(f.fixture.id)  // got a definitive response (even if empty)
        const keepers: Array<{ playerName: string; teamName: string; saves: number }> = []
        for (const team of resp) {
          for (const p of team.players ?? []) {
            const st = p.statistics?.[0]
            if (st?.games?.position === 'G') keepers.push({ playerName: p.player.name, teamName: team.team.name, saves: st.goals?.saves ?? 0 })
          }
        }
        if (keepers.length) fixtureGkSaves[f.fixture.id] = keepers
      })
    ))
  }

  return {
    fetchedAt: new Date().toISOString(),
    leagueId: WC_LEAGUE_ID,
    fixtures,
    liveFixtures: liveFixtures ?? [],
    standings,
    topScorers: topScorers ?? [],
    topAssists: topAssists ?? [],
    fixtureEvents,
    fixtureStats,
    fixtureGkSaves,
    gkFetchedFixtureIds: [...gkAttempted],
  }
}
