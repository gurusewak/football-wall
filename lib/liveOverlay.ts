import { ApiFetchedData, ApiFixture } from './apiFootball'

export function toDateOnly(date: string | null | undefined): string | null {
  if (!date) return null
  // handles ISO "2026-06-15T18:00:00Z" → "2026-06-15"
  // and localDate "2026-06-15" → "2026-06-15"
  return date.slice(0, 10)
}

export function getMatchesNeedingApi(rawMatches: any[], now: Date): any[] {
  const today = toDateOnly(now.toISOString())!
  return rawMatches.filter(m => {
    const matchDate = m.localDate ?? toDateOnly(m.date)
    if (!matchDate) return false
    if (matchDate > today) return false
    if (matchDate === today && m.status !== 'completed') return true
    if (matchDate < today && m.status !== 'completed') return true
    if (m.status === 'completed' && (m.homeScore == null || m.awayScore == null)) return true
    return false
  })
}

export function isJsonFreshForToday(rawTournament: any, now: Date): boolean {
  const allMatches: any[] = rawTournament.matches ?? []
  return getMatchesNeedingApi(allMatches, now).length === 0
}

// Name normalization for fuzzy matching API team names to JSON team names
const NAME_ALIASES: Record<string, string> = {
  'united states': 'usa',
  'korea republic': 'south korea',
  'ir iran': 'iran',
  'côte d ivoire': 'ivory coast',
  'cote d ivoire': 'ivory coast',
}

function normalizeTeamName(name: string): string {
  const lower = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  return NAME_ALIASES[lower] ?? lower
}

// API fixture status → JSON status
const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT'])
const COMPLETED_STATUSES = new Set(['FT', 'AET', 'PEN'])

function mapApiStatus(short: string): 'scheduled' | 'live' | 'completed' {
  if (LIVE_STATUSES.has(short)) return 'live'
  if (COMPLETED_STATUSES.has(short)) return 'completed'
  return 'scheduled'
}

export interface MergeResult {
  tournament: any          // merged raw tournament JSON
  dataSource: 'json' | 'json+api'
  apiCacheFetchedAt: string | null
  matchesUpdated: number
  liveMatchCount: number
}

export function mergeApiOverlay(rawTournament: any, apiData: ApiFetchedData): MergeResult {
  // Deep-clone the raw tournament before mutating
  const tournament = JSON.parse(JSON.stringify(rawTournament))

  // Build a map from api fixtures: key = `${normTeamHome}__${normTeamAway}` → ApiFixture
  const apiFixtureMap = new Map<string, ApiFixture>()
  for (const fixture of apiData.fixtures) {
    const normHome = normalizeTeamName(fixture.teams.home.name)
    const normAway = normalizeTeamName(fixture.teams.away.name)
    const key = `${normHome}__${normAway}`
    apiFixtureMap.set(key, fixture)
  }

  let matchesUpdated = 0
  let liveMatchCount = 0

  // Process all matches in rawTournament.matches
  const matches: any[] = tournament.matches ?? []
  for (const match of matches) {
    const homeTeamName = match.homeTeam ?? ''
    const awayTeamName = match.awayTeam ?? ''
    if (!homeTeamName || !awayTeamName) continue

    const normHome = normalizeTeamName(homeTeamName)
    const normAway = normalizeTeamName(awayTeamName)
    const key = `${normHome}__${normAway}`
    const apiFixture = apiFixtureMap.get(key)

    if (!apiFixture) continue

    const apiStatus = mapApiStatus(apiFixture.fixture.status.short)

    // If json match is 'completed' and has both scores → JSON wins, skip
    if (match.status === 'completed' && match.homeScore != null && match.awayScore != null) {
      continue
    }

    // Apply: homeScore, awayScore, status, wentToExtraTime, wentToPenaltyShootout, homePenaltyScore, awayPenaltyScore
    match.homeScore = apiFixture.goals.home
    match.awayScore = apiFixture.goals.away
    match.status = apiStatus

    // Extra time
    const etHome = apiFixture.score.extratime.home
    const etAway = apiFixture.score.extratime.away
    if (etHome != null || etAway != null) {
      match.wentToExtraTime = true
    }

    // Penalty shootout
    const penHome = apiFixture.score.penalty.home
    const penAway = apiFixture.score.penalty.away
    if (penHome != null || penAway != null) {
      match.wentToPenaltyShootout = true
      match.homePenaltyScore = penHome
      match.awayPenaltyScore = penAway
    }

    // If API status is 'completed' and json was not → increment matchesUpdated
    if (apiStatus === 'completed' && match.status !== 'completed') {
      matchesUpdated++
    }

    // Track live matches
    if (apiStatus === 'live') {
      liveMatchCount++
    }
  }

  // topScorers overlay: if rawTournament.players is empty and apiData.topScorers has results
  if (
    (!tournament.players || tournament.players.length === 0) &&
    apiData.topScorers.length > 0
  ) {
    tournament.players = apiData.topScorers.slice(0, 20).map(p => ({
      id: p.player.name.toLowerCase().replace(/ /g, '-'),
      name: p.player.name,
      country: p.player.nationality,
      position: '',
      goals: p.statistics[0]?.goals.total ?? 0,
      assists: p.statistics[0]?.goals.assists ?? 0,
      yellowCards: 0,
      redCards: 0,
      playerOfMatch: 0,
    }))
  }

  return {
    tournament,
    dataSource: 'json+api',
    apiCacheFetchedAt: apiData.fetchedAt,
    matchesUpdated,
    liveMatchCount,
  }
}
