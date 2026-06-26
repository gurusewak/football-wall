import 'server-only'

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
  // Per-fixture detail for live + recently completed matches (keyed by fixture ID)
  fixtureEvents: Record<number, ApiMatchEvent[]>
  fixtureStats: Record<number, ApiMatchStatBlock[]>
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

const LIVE_STATUS_SET = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT'])
const DONE_STATUS_SET = new Set(['FT', 'AET', 'PEN'])
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

// Actual shape of /standings response: [{league: {standings: ApiStandingEntry[][]}}]
type StandingsResponse = Array<{ league: { standings: ApiStandingEntry[][] } }>

const NAME_ALIASES: Record<string, string> = {
  'united states': 'usa',
  'korea republic': 'south korea',
  'ir iran': 'iran',
  'côte d ivoire': 'ivory coast',
  'cote d ivoire': 'ivory coast',
}
function normName(n: string): string {
  const lower = n.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  return NAME_ALIASES[lower] ?? lower
}

// rawMatches: existing DB matches — used to detect goal-count mismatches so we
// can back-fill event detail for completed matches outside the 3-day window
export async function fetchWc2026Data(rawMatches: any[] = []): Promise<ApiFetchedData | null> {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return null

  const [fixtures, liveFixtures, standingsWrapper, topScorers] = await Promise.all([
    apiFetch<ApiFixture[]>(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`),
    apiFetch<ApiFixture[]>(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}&live=all`),
    apiFetch<StandingsResponse>(`/standings?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`),
    apiFetch<ApiTopScorer[]>(`/players/topscorers?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`),
  ])

  if (!fixtures) return null

  const standings: ApiStandingEntry[] = standingsWrapper?.[0]?.league?.standings?.flat() ?? []

  // Build a lookup from DB matches: normHome__normAway → stored goal count
  const matchGoalCounts = new Map<string, number>()
  for (const m of rawMatches) {
    if (!m.homeTeam || !m.awayTeam) continue
    matchGoalCounts.set(`${normName(m.homeTeam)}__${normName(m.awayTeam)}`, m.goals?.length ?? 0)
  }

  // Identify fixtures where stored goal count != actual score (need back-fill)
  const priorityIds: number[] = []
  for (const f of fixtures) {
    if (!DONE_STATUS_SET.has(f.fixture.status.short)) continue
    const key = `${normName(f.teams.home.name)}__${normName(f.teams.away.name)}`
    const stored = matchGoalCounts.get(key)
    if (stored === undefined) continue
    const actual = (f.goals.home ?? 0) + (f.goals.away ?? 0)
    if (stored !== actual) priorityIds.push(f.fixture.id)
  }

  const prioritySet = new Set(priorityIds)

  // Recent completed/live fixtures (last 3 days)
  const cutoff = Date.now() - THREE_DAYS_MS
  const recentFixtures = fixtures.filter(f => {
    const status = f.fixture.status.short
    if (!LIVE_STATUS_SET.has(status) && !DONE_STATUS_SET.has(status)) return false
    return new Date(f.fixture.date).getTime() > cutoff
  })

  // Priority fixtures not already covered by the recent window
  const recentIds = new Set(recentFixtures.map(f => f.fixture.id))
  const priorityOnly = fixtures.filter(f => prioritySet.has(f.fixture.id) && !recentIds.has(f.fixture.id))

  // Combined: priority first, then recent — cap at 20 fixtures (40 API calls)
  const detailFixtures = [...priorityOnly, ...recentFixtures].slice(0, 20)

  // Fetch events + statistics in parallel
  const fixtureEvents: Record<number, ApiMatchEvent[]> = {}
  const fixtureStats: Record<number, ApiMatchStatBlock[]> = {}

  await Promise.all(
    detailFixtures.flatMap(f => [
      apiFetch<ApiMatchEvent[]>(`/fixtures/events?fixture=${f.fixture.id}`)
        .then(ev => { if (ev?.length) fixtureEvents[f.fixture.id] = ev }),
      apiFetch<ApiMatchStatBlock[]>(`/fixtures/statistics?fixture=${f.fixture.id}`)
        .then(st => { if (st?.length) fixtureStats[f.fixture.id] = st }),
    ])
  )

  return {
    fetchedAt: new Date().toISOString(),
    leagueId: WC_LEAGUE_ID,
    fixtures,
    liveFixtures: liveFixtures ?? [],
    standings,
    topScorers: topScorers ?? [],
    fixtureEvents,
    fixtureStats,
  }
}
