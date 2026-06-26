import { ApiFetchedData, ApiFixture, ApiMatchEvent, ApiMatchStatBlock, ApiStandingEntry } from './apiFootball'

export function toDateOnly(date: string | null | undefined): string | null {
  if (!date) return null
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

// ── Name normalization for fuzzy team-name matching ───────────────────────────

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

// ── API fixture status → JSON status ─────────────────────────────────────────

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT'])
const COMPLETED_STATUSES = new Set(['FT', 'AET', 'PEN'])

function mapApiStatus(short: string): 'scheduled' | 'live' | 'completed' {
  if (LIVE_STATUSES.has(short)) return 'live'
  if (COMPLETED_STATUSES.has(short)) return 'completed'
  return 'scheduled'
}

// ── Event → goal/card conversion ─────────────────────────────────────────────

function eventsToGoals(
  events: ApiMatchEvent[],
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  homeTeamId: string,
  awayTeamId: string,
  normHome: string,
): any[] {
  return events
    .filter(e => e.type === 'Goal')
    .map((e, i) => {
      const isHome = normalizeTeamName(e.team.name) === normHome
      return {
        id: `api-evt-${matchId}-g${i}`,
        matchId,
        minute: e.time.elapsed,
        minuteExtra: e.time.extra ?? null,
        scoringTeam: isHome ? homeTeam : awayTeam,
        scoringTeamId: isHome ? homeTeamId : awayTeamId,
        scorerPlayerName: e.player.name,
        assistPlayerName: e.assist?.name ?? null,
        isOwnGoal: e.detail === 'Own Goal',
        isPenalty: e.detail === 'Penalty',
        sourceIds: ['api-football'],
        verified: true,
      }
    })
}

function eventsToCards(
  events: ApiMatchEvent[],
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  homeTeamId: string,
  awayTeamId: string,
  normHome: string,
): any[] {
  return events
    .filter(e => e.type === 'Card' && (e.detail === 'Yellow Card' || e.detail === 'Red Card' || e.detail === 'Yellow Red Card'))
    .map((e, i) => {
      const isHome = normalizeTeamName(e.team.name) === normHome
      const cardType = e.detail === 'Yellow Card' ? 'yellow' : 'red'
      return {
        id: `api-evt-${matchId}-c${i}`,
        matchId,
        minute: e.time.elapsed,
        minuteExtra: e.time.extra ?? null,
        team: isHome ? homeTeam : awayTeam,
        teamId: isHome ? homeTeamId : awayTeamId,
        playerName: e.player.name,
        cardType,
        sourceIds: ['api-football'],
        verified: true,
      }
    })
}

function statsToMatchStatEntry(
  stats: ApiMatchStatBlock[],
  matchId: string,
  homeTeamId: string,
  homeTeamName: string,
  awayTeamId: string,
  awayTeamName: string,
  normHome: string,
): any {
  const homeBlock = stats.find(s => normalizeTeamName(s.team.name) === normHome)
  const awayBlock = stats.find(s => normalizeTeamName(s.team.name) !== normHome)
  return {
    matchId,
    home: { teamId: homeTeamId, teamName: homeTeamName, statistics: homeBlock?.statistics ?? [] },
    away: { teamId: awayTeamId, teamName: awayTeamName, statistics: awayBlock?.statistics ?? [] },
  }
}

// ── Main merge types ──────────────────────────────────────────────────────────

export interface MergeResult {
  tournament: any
  dataSource: 'json' | 'json+api'
  apiCacheFetchedAt: string | null
  matchesUpdated: number
  liveMatchCount: number
}

// ── Core merge function ───────────────────────────────────────────────────────

export function mergeApiOverlay(rawTournament: any, apiData: ApiFetchedData): MergeResult {
  const tournament = JSON.parse(JSON.stringify(rawTournament))

  // Build fixture map: normHome__normAway → ApiFixture
  const apiFixtureMap = new Map<string, ApiFixture>()
  for (const fixture of apiData.fixtures) {
    const normHome = normalizeTeamName(fixture.teams.home.name)
    const normAway = normalizeTeamName(fixture.teams.away.name)
    apiFixtureMap.set(`${normHome}__${normAway}`, fixture)
  }

  let matchesUpdated = 0
  let liveMatchCount = 0

  const matches: any[] = tournament.matches ?? []
  for (const match of matches) {
    const homeTeamName: string = match.homeTeam ?? ''
    const awayTeamName: string = match.awayTeam ?? ''
    if (!homeTeamName || !awayTeamName) continue

    const normHome = normalizeTeamName(homeTeamName)
    const normAway = normalizeTeamName(awayTeamName)
    const apiFixture = apiFixtureMap.get(`${normHome}__${normAway}`)
    if (!apiFixture) continue

    const fixtureId = apiFixture.fixture.id
    const apiStatus = mapApiStatus(apiFixture.fixture.status.short)

    // ── Score + status update ──────────────────────────────────────────────
    if (!(match.status === 'completed' && match.homeScore != null && match.awayScore != null)) {
      match.homeScore = apiFixture.goals.home
      match.awayScore = apiFixture.goals.away
      match.status = apiStatus

      const etHome = apiFixture.score.extratime.home
      const etAway = apiFixture.score.extratime.away
      if (etHome != null || etAway != null) match.wentToExtraTime = true

      const penHome = apiFixture.score.penalty.home
      const penAway = apiFixture.score.penalty.away
      if (penHome != null || penAway != null) {
        match.wentToPenaltyShootout = true
        match.homePenaltyScore = penHome
        match.awayPenaltyScore = penAway
      }

      if (apiStatus === 'completed') matchesUpdated++
    }

    if (apiStatus === 'live') liveMatchCount++

    // ── Events: goals + cards ──────────────────────────────────────────────
    // Update events for live matches, matches missing events, or completed matches
    // where stored goal count doesn't match the actual score (late API data arrival)
    const events = apiData.fixtureEvents[fixtureId]
    if (events?.length) {
      const hasExistingEvents = (match.goals?.length > 0) || (match.cards?.length > 0)
      const expectedGoals = (match.homeScore ?? 0) + (match.awayScore ?? 0)
      const goalCountMismatch = (match.goals?.length ?? 0) !== expectedGoals
      if (apiStatus === 'live' || !hasExistingEvents || goalCountMismatch) {
        match.goals = eventsToGoals(events, match.id, homeTeamName, awayTeamName, match.homeTeamId ?? '', match.awayTeamId ?? '', normHome)
        match.cards = eventsToCards(events, match.id, homeTeamName, awayTeamName, match.homeTeamId ?? '', match.awayTeamId ?? '', normHome)
        if (apiStatus !== 'live') matchesUpdated++
      }
    }

    // ── Match statistics ───────────────────────────────────────────────────
    const stats = apiData.fixtureStats[fixtureId]
    if (stats?.length) {
      if (!tournament.teamMatchStatistics) tournament.teamMatchStatistics = []
      const statEntry = statsToMatchStatEntry(
        stats, match.id,
        match.homeTeamId ?? '', homeTeamName,
        match.awayTeamId ?? '', awayTeamName,
        normHome,
      )
      const existingIdx: number = tournament.teamMatchStatistics.findIndex((ts: any) => ts.matchId === match.id)
      if (existingIdx >= 0) {
        tournament.teamMatchStatistics[existingIdx] = statEntry
      } else {
        tournament.teamMatchStatistics.push(statEntry)
      }
    }
  }

  // ── Group standings update ────────────────────────────────────────────────
  if (apiData.standings.length > 0) {
    const standingsMap = new Map<string, ApiStandingEntry>()
    for (const s of apiData.standings) {
      standingsMap.set(normalizeTeamName(s.team.name), s)
    }
    for (const group of tournament.groups ?? []) {
      for (const standing of group.standings ?? []) {
        const normName = normalizeTeamName(standing.team ?? '')
        const apiS = standingsMap.get(normName)
        if (!apiS) continue
        standing.played = apiS.all.played
        standing.wins = apiS.all.win
        standing.draws = apiS.all.draw
        standing.losses = apiS.all.lose
        standing.goalsFor = apiS.all.goals.for
        standing.goalsAgainst = apiS.all.goals.against
        standing.goalDifference = apiS.goalsDiff
        standing.points = apiS.points
      }
    }
  }

  // ── Qualification status recompute ────────────────────────────────────────
  // Sort helper: points → GD → GF
  const byStanding = (a: any, b: any) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    return b.goalsFor - a.goalsFor
  }

  const groups: any[] = tournament.groups ?? []
  const is48Team = groups.length === 12   // 2026: 12 groups of 4

  for (const group of groups) {
    const standings: any[] = group.standings ?? []
    if (!standings.length) continue
    const matchesPerTeam = standings.length - 1  // 3 in a 4-team group
    const groupComplete = matchesPerTeam > 0 && standings.every((s: any) => (s.played ?? 0) >= matchesPerTeam)

    const sorted = [...standings].sort(byStanding)

    if (!groupComplete) {
      // Group still in progress: clear all qualification so position heuristic drives the UI
      if (is48Team) {
        for (const s of sorted) {
          s.qualified = undefined
          s.qualificationType = null
        }
      }
      continue
    }

    // Top 2 always advance
    sorted[0].qualified = true
    sorted[0].qualificationType = 'automatic_group_top_two'
    sorted[1].qualified = true
    sorted[1].qualificationType = 'automatic_group_top_two'
    // 3rd: mark undefined for now — resolved below if all groups done
    if (sorted[2]) { sorted[2].qualified = undefined; sorted[2].qualificationType = null }
    // 4th (or last): eliminated
    if (sorted[3]) { sorted[3].qualified = false; sorted[3].qualificationType = null }
    // Non-48 formats (8 groups of 4): 3rd never qualifies
    if (!is48Team && sorted[2]) { sorted[2].qualified = false }
  }

  // For 2026 (48-team): once all 12 groups finish, rank all thirds, best 8 qualify
  if (is48Team) {
    const allGroupsComplete = groups.every((g: any) => {
      const s: any[] = g.standings ?? []
      if (!s.length) return false
      const mpt = s.length - 1
      return mpt > 0 && s.every((t: any) => (t.played ?? 0) >= mpt)
    })
    if (allGroupsComplete) {
      const thirds: any[] = groups.map((g: any) => {
        const s = [...(g.standings ?? [])].sort(byStanding)
        return s[2] ?? null
      }).filter(Boolean)
      thirds.sort(byStanding)
      thirds.forEach((s: any, i: number) => {
        s.qualified = i < 8
        s.qualificationType = i < 8 ? 'best_third_place' : null
      })
    }
  }

  // ── Top scorers fallback ──────────────────────────────────────────────────
  if ((!tournament.players || tournament.players.length === 0) && apiData.topScorers.length > 0) {
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
