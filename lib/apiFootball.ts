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

export async function fetchWc2026Data(): Promise<ApiFetchedData | null> {
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

  // Identify fixtures needing per-fixture detail: live or completed within the last 3 days
  const cutoff = Date.now() - THREE_DAYS_MS
  const detailFixtures = fixtures.filter(f => {
    const status = f.fixture.status.short
    if (!LIVE_STATUS_SET.has(status) && !DONE_STATUS_SET.has(status)) return false
    return new Date(f.fixture.date).getTime() > cutoff
  })

  // Fetch events + statistics in parallel for up to 15 fixtures (30 API calls max)
  const fixtureEvents: Record<number, ApiMatchEvent[]> = {}
  const fixtureStats: Record<number, ApiMatchStatBlock[]> = {}

  await Promise.all(
    detailFixtures.slice(0, 15).flatMap(f => [
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
