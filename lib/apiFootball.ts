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

export interface ApiGoalEvent {
  time: { elapsed: number; extra: number | null }
  team: { name: string }
  player: { name: string }
  type: 'Goal' | 'Card' | 'subst' | 'Var'
  detail: string
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
}

async function apiFetch<T>(path: string): Promise<T | null> {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return null

  try {
    const url = `${BASE_URL}${path}`
    const res = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
      },
    })
    if (!res.ok) return null
    const json = await res.json()
    return (json.response as T) ?? null
  } catch {
    return null
  }
}

export async function fetchWc2026Data(): Promise<ApiFetchedData | null> {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return null

  const [fixtures, liveFixtures, standingsRaw, topScorers] = await Promise.all([
    apiFetch<ApiFixture[]>(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`),
    apiFetch<ApiFixture[]>(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}&live=all`),
    apiFetch<ApiStandingEntry[][]>(`/standings?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`),
    apiFetch<ApiTopScorer[]>(`/players/topscorers?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`),
  ])

  if (!fixtures) return null

  // Standings comes back as nested ApiStandingEntry[][] — flatten it
  const standings: ApiStandingEntry[] = standingsRaw ? standingsRaw.flat() : []

  return {
    fetchedAt: new Date().toISOString(),
    leagueId: WC_LEAGUE_ID,
    fixtures,
    liveFixtures: liveFixtures ?? [],
    standings,
    topScorers: topScorers ?? [],
  }
}
