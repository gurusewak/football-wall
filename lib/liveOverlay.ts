import { ApiFetchedData, ApiFixture, ApiMatchEvent, ApiMatchStatBlock, ApiStandingEntry } from './apiFootball'
import { normalizeTeamName } from './teamNames'

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

const DAY_MS = 24 * 60 * 60 * 1000

// Once the World Cup is over there is nothing left to pull, so the sync should
// stop hitting the API entirely. Two independent triggers:
//   1. Data-driven: the final is completed and its goals are captured.
//   2. Date backstop: a couple of days past the scheduled end date — guarantees
//      pulls stop (≈ July 20-21 2026) even if the final's events never arrive.
export function isTournamentOver(rawTournament: any, now: Date): boolean {
  const matches: any[] = rawTournament.matches ?? []
  const final = matches.find(m => m.round === 'final')
  if (final && final.status === 'completed' && final.homeScore != null && final.awayScore != null) {
    const expectedGoals = (final.homeScore ?? 0) + (final.awayScore ?? 0)
    if ((final.goals?.length ?? 0) >= expectedGoals) return true
  }
  const endDate: string | undefined = rawTournament.tournamentSummary?.endDate
  const backstop = endDate
    ? new Date(endDate).getTime() + 2 * DAY_MS
    : Date.parse('2026-07-21T00:00:00Z')
  return now.getTime() > backstop
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
    // A goal must have a scorer — drop upstream phantoms with a null player
    .filter(e => e.type === 'Goal' && e.player?.name)
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

  // Build fixture map keyed by both orderings so our JSON home/away doesn't
  // need to match what API-Football considers home/away (World Cup has no real home)
  const apiFixtureMap = new Map<string, ApiFixture>()
  for (const fixture of apiData.fixtures) {
    const normHome = normalizeTeamName(fixture.teams.home.name)
    const normAway = normalizeTeamName(fixture.teams.away.name)
    apiFixtureMap.set(`${normHome}__${normAway}`, fixture)
    apiFixtureMap.set(`${normAway}__${normHome}`, fixture)
  }

  let matchesUpdated = 0
  let liveMatchCount = 0
  const gkFetchedIds = new Set(apiData.gkFetchedFixtureIds ?? [])

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
    // We sync only hourly, so an in-progress "live" score is a stale, misleading
    // snapshot. Surface a result ONLY once the match is final; until then keep it
    // scheduled with no score — clearing anything a prior (pre-fix) sync stored.
    if (!(match.status === 'completed' && match.homeScore != null && match.awayScore != null)) {
      if (apiStatus === 'completed') {
        match.homeScore = apiFixture.goals.home
        match.awayScore = apiFixture.goals.away
        match.status = 'completed'

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

        matchesUpdated++
      } else {
        // Live or scheduled — no final result yet. Reset to a clean scheduled
        // state so nothing (score, goals, cards, saves, stats) shows until FT.
        match.status = 'scheduled'
        match.homeScore = null
        match.awayScore = null
        match.wentToExtraTime = false
        match.wentToPenaltyShootout = false
        match.homePenaltyScore = null
        match.awayPenaltyScore = null
        match.goals = []
        match.cards = []
        match.goalkeeperSaves = []
        if (Array.isArray(tournament.teamMatchStatistics)) {
          const sIdx = tournament.teamMatchStatistics.findIndex((ts: any) => ts.matchId === match.id)
          if (sIdx >= 0) tournament.teamMatchStatistics.splice(sIdx, 1)
        }
      }
    }

    if (apiStatus === 'live') liveMatchCount++

    // Everything below this point is final-result data — only ever applied to a
    // completed match, mirroring the score rule (no live data leaks anywhere).
    const isCompletedNow = match.status === 'completed' && match.homeScore != null && match.awayScore != null

    // ── Events: goals + cards ──────────────────────────────────────────────
    // Backfill events for finished matches missing them, or where the stored goal
    // count doesn't match the final score (late API data arrival).
    const events = apiData.fixtureEvents[fixtureId]
    if (events?.length && isCompletedNow) {
      const hasExistingEvents = (match.goals?.length > 0) || (match.cards?.length > 0)
      const expectedGoals = (match.homeScore ?? 0) + (match.awayScore ?? 0)
      const goalCountMismatch = (match.goals?.length ?? 0) !== expectedGoals
      if (!hasExistingEvents || goalCountMismatch) {
        match.goals = eventsToGoals(events, match.id, homeTeamName, awayTeamName, match.homeTeamId ?? '', match.awayTeamId ?? '', normHome)
        match.cards = eventsToCards(events, match.id, homeTeamName, awayTeamName, match.homeTeamId ?? '', match.awayTeamId ?? '', normHome)
        matchesUpdated++
      }
    }

    // ── Match statistics ───────────────────────────────────────────────────
    const stats = apiData.fixtureStats[fixtureId]
    if (stats?.length && isCompletedNow) {
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

    // ── Goalkeeper saves (per-match, persisted so the season tally is stable) ──
    if (isCompletedNow) {
      const gkSaves = apiData.fixtureGkSaves[fixtureId]
      if (gkSaves?.length) {
        match.goalkeeperSaves = gkSaves.map(k => {
          const isHome = normalizeTeamName(k.teamName) === normHome
          return {
            playerName: k.playerName,
            team: isHome ? homeTeamName : awayTeamName,
            teamId: isHome ? (match.homeTeamId ?? '') : (match.awayTeamId ?? ''),
            saves: k.saves,
          }
        })
      }
      // Mark as checked once we've queried it (even if empty), so a match with no
      // keeper data doesn't perpetually block the capped back-fill.
      if (gkFetchedIds.has(fixtureId)) {
        match.goalkeeperSavesChecked = true
        if (!Array.isArray(match.goalkeeperSaves)) match.goalkeeperSaves = []
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

    // Keep the stored table order + completeness flag current (the seed values go
    // stale as results come in; downstream readers shouldn't depend on them).
    sorted.forEach((s: any, i: number) => { s.rank = i + 1 })
    group.standingsStatus = groupComplete ? 'complete' : 'partial'

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

  // ── Resolve knockout bracket occupants (DB-driven) ─────────────────────────
  // Write real teams into each knockout match as results come in, so the bracket
  // (and downstream score-matching) read fully-resolved teams straight from the DB:
  //   (a) 1X/2X     → group winner / runner-up once that group is complete
  //   (b) W{n}/L{n} → winner / loser of match n (processed in match-number order)
  //   (c) best-third opponents → filled from resolved API-Football fixtures
  {
    const isReal = (s: string) => !!s && !/^(winner|runner-?up|third-?place|loser|tbd)\b/i.test(s) && !/^[123][A-L]+$/.test(s)
    const rosterByNorm = new Map<string, { id: string; name: string }>()
    for (const tm of tournament.teams ?? []) if (tm?.name) rosterByNorm.set(normalizeTeamName(tm.name), { id: tm.id ?? '', name: tm.name })
    const setSide = (match: any, side: 'home' | 'away', name: string) => {
      const c = rosterByNorm.get(normalizeTeamName(name)) ?? { name, id: '' }
      match[`${side}Team`] = c.name
      if (c.id) match[`${side}TeamId`] = c.id
    }

    const groupOrder = new Map<string, any[]>()
    for (const g of groups) {
      const s: any[] = g.standings ?? []
      const mpt = s.length - 1
      if (mpt > 0 && s.every((x: any) => (x.played ?? 0) >= mpt)) groupOrder.set(g.group, [...s].sort(byStanding))
    }
    const groupSlot = (letter: string, pos: number): string | null => groupOrder.get(letter)?.[pos - 1]?.team ?? null

    const koByNumber = new Map<number, any>()
    for (const m of tournament.matches ?? []) {
      if ((m.stage === 'knockout' || m.stage === 'placement') && m.matchNumber != null) koByNumber.set(m.matchNumber, m)
    }
    const winnerSide = (m: any): 'home' | 'away' | null => {
      if (!m || m.status !== 'completed' || m.homeScore == null || m.awayScore == null) return null
      if (m.wentToPenaltyShootout && m.homePenaltyScore != null && m.awayPenaltyScore != null) {
        return m.homePenaltyScore > m.awayPenaltyScore ? 'home' : 'away'
      }
      if (m.homeScore === m.awayScore) return null
      return m.homeScore > m.awayScore ? 'home' : 'away'
    }

    const koSorted = (tournament.matches ?? [])
      .filter((m: any) => m.stage === 'knockout' || m.stage === 'placement')
      .sort((a: any, b: any) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0))

    // (a) group positions + (b) match progression, in match order so feeders resolve first
    for (const match of koSorted) {
      for (const side of ['home', 'away'] as const) {
        // Already a real team — just normalize to our canonical roster name
        // (a prior sync may have stored a raw API name like "Cape Verde Islands").
        if (isReal(match[`${side}Team`])) { setSide(match, side, match[`${side}Team`]); continue }
        const code: string = match[`${side}SlotCode`] ?? ''
        let mm: RegExpMatchArray | null
        if ((mm = code.match(/^([12])([A-L])$/))) {
          const team = groupSlot(mm[2], parseInt(mm[1], 10))
          if (team) setSide(match, side, team)
        } else if ((mm = code.match(/^W(\d+)$/))) {
          const src = koByNumber.get(parseInt(mm[1], 10)); const w = winnerSide(src)
          if (src && w && isReal(src[`${w}Team`])) setSide(match, side, src[`${w}Team`])
        } else if ((mm = code.match(/^(?:RU|L)(\d+)$/))) {
          const src = koByNumber.get(parseInt(mm[1], 10)); const w = winnerSide(src)
          const loser = w === 'home' ? 'away' : w === 'away' ? 'home' : null
          if (src && loser && isReal(src[`${loser}Team`])) setSide(match, side, src[`${loser}Team`])
        }
      }
    }

    // (c) fill remaining unknown sides (e.g. best-third opponents) from resolved
    // API fixtures, anchoring on the side we now know + the round.
    const apiRoundMatcher = (r: string): ((x: string) => boolean) => {
      switch (r) {
        case 'r32': return x => /round of 32/i.test(x)
        case 'r16': return x => /round of 16/i.test(x)
        case 'qf': return x => /quarter/i.test(x)
        case 'sf': return x => /semi/i.test(x)
        case 'final': return x => /final/i.test(x) && !/semi/i.test(x)
        case '3p': case 'third_place': return x => /3rd|third/i.test(x)
        default: return () => false
      }
    }
    const apiKo = apiData.fixtures.filter(f => isReal(f.teams.home.name) && isReal(f.teams.away.name))
    for (const match of koSorted) {
      const homeKnown = isReal(match.homeTeam), awayKnown = isReal(match.awayTeam)
      if (homeKnown === awayKnown) continue
      const rm = apiRoundMatcher(match.round ?? '')
      const anchor = normalizeTeamName(homeKnown ? match.homeTeam : match.awayTeam)
      const hits = apiKo.filter(f => rm(f.league.round) && (normalizeTeamName(f.teams.home.name) === anchor || normalizeTeamName(f.teams.away.name) === anchor))
      if (hits.length !== 1) continue
      const f = hits[0]
      const other = normalizeTeamName(f.teams.home.name) === anchor ? f.teams.away.name : f.teams.home.name
      setSide(match, homeKnown ? 'away' : 'home', other)
    }
  }

  // ── Sanitize stored goal events ───────────────────────────────────────────
  // Drop any goal with no scorer (upstream data errors, e.g. a phantom goal with
  // a null player). Runs over every match — even those outside the fetch window —
  // so the per-scorer breakdown can never exceed the actual score.
  for (const match of tournament.matches ?? []) {
    if (Array.isArray(match.goals) && match.goals.length) {
      match.goals = match.goals.filter((g: any) => g.scorerPlayerName)
    }
  }

  // ── Recompute aggregate tournament stats from the merged matches ──────────
  // tournament.matches holds every match (group + knockout + placement), so the
  // totals here stay correct through the whole tournament.
  {
    const all: any[] = tournament.matches ?? []
    const completed = all.filter(m => m.status === 'completed' && m.homeScore != null && m.awayScore != null)
    const totalGoals = completed.reduce((sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0)
    const completedCount = completed.length
    if (!tournament.tournamentSummary) tournament.tournamentSummary = {}
    const summary = tournament.tournamentSummary
    summary.totalGoals = totalGoals
    summary.completedMatches = completedCount
    summary.totalMatchesPlayed = completedCount
    summary.scheduledMatches = all.length - completedCount
    summary.averageGoalsPerMatch = completedCount > 0 ? Math.round((totalGoals / completedCount) * 1000) / 1000 : 0
  }

  // ── Player leaderboards (Golden Boot + Top Assists) from API ──────────────
  // The API aggregates by player ID, which is more reliable than summing event
  // names (the same player can appear under different spellings across fixtures).
  const teamByNorm = new Map<string, { id: string; name: string }>()
  for (const t of tournament.teams ?? []) {
    if (t?.name) teamByNorm.set(normalizeTeamName(t.name), { id: t.id ?? '', name: t.name })
  }
  const toLeaders = (entries: typeof apiData.topScorers) =>
    entries.slice(0, 10).map((p, i) => {
      const stat = p.statistics?.[0]
      const team = stat ? teamByNorm.get(normalizeTeamName(stat.team.name)) : undefined
      return {
        rank: i + 1,
        playerName: p.player.name,
        playerId: p.player.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        teamId: team?.id ?? '',
        teamName: team?.name ?? stat?.team.name ?? '',
        goals: stat?.goals.total ?? 0,
        assists: stat?.goals.assists ?? 0,
        verified: true,
        sourceIds: ['api-football'],
        minutesPlayed: null,
      }
    })

  const upsertAward = (name: string, matcher: RegExp, leaders: any[]) => {
    if (!leaders.length) return
    if (!tournament.awardStandings) tournament.awardStandings = []
    const existing = tournament.awardStandings.find((s: any) => matcher.test(s.awardName))
    if (existing) {
      existing.leaders = leaders
    } else {
      tournament.awardStandings.push({
        id: name.toLowerCase().replace(/ /g, '-'),
        awardName: name,
        leaders,
        verified: true,
        sourceIds: ['api-football'],
        tournamentYear: tournament.year,
      })
    }
  }

  upsertAward('Golden Boot', /boot|scorer/i, toLeaders(apiData.topScorers))
  upsertAward('Top Assists', /assist/i, toLeaders(apiData.topAssists))

  // Keep tournament.players in sync as a flat fallback leaderboard
  if (apiData.topScorers.length > 0) {
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

  // ── Player of the Match: hidden for 2026 ──────────────────────────────────
  // API-Football has no official POTM; rather than show a guess or stale seed,
  // clear it so the match view simply omits the section.
  tournament.playerOfTheMatch = []

  // ── Auto-generated fun facts from live data ───────────────────────────────
  // No fun-facts endpoint exists, so derive them from the data we already have.
  {
    const facts: any[] = []
    let fid = 1
    const add = (factType: string, statement: string) =>
      facts.push({ id: `auto-fact-${fid++}`, factType, statement, verified: true })

    const completed: any[] = (tournament.matches ?? [])
      .filter((m: any) => m.status === 'completed' && m.homeScore != null && m.awayScore != null)
    const summary = tournament.tournamentSummary ?? {}

    if ((summary.completedMatches ?? 0) > 0) {
      add('tournament totals', `${summary.totalGoals} goals in ${summary.completedMatches} matches so far — averaging ${summary.averageGoalsPerMatch} per game.`)
    }

    const topScorer = apiData.topScorers?.[0]
    const tsGoals = topScorer?.statistics?.[0]?.goals?.total ?? 0
    if (topScorer && tsGoals > 0) {
      add('golden boot race', `${topScorer.player.name} leads the scoring charts with ${tsGoals} goal${tsGoals === 1 ? '' : 's'}.`)
    }

    let hi: any = null
    for (const m of completed) { const tot = (m.homeScore ?? 0) + (m.awayScore ?? 0); if (!hi || tot > hi.tot) hi = { tot, m } }
    if (hi && hi.tot >= 4) {
      add('highest scoring', `${hi.m.homeTeam} ${hi.m.homeScore}–${hi.m.awayScore} ${hi.m.awayTeam} was the highest-scoring match with ${hi.tot} goals.`)
    }

    let big: any = null
    for (const m of completed) { const mar = Math.abs((m.homeScore ?? 0) - (m.awayScore ?? 0)); if (mar > 0 && (!big || mar > big.mar)) big = { mar, m } }
    if (big && big.mar >= 3) {
      const homeWon = big.m.homeScore > big.m.awayScore
      add('biggest win', `${homeWon ? big.m.homeTeam : big.m.awayTeam}'s ${Math.max(big.m.homeScore, big.m.awayScore)}–${Math.min(big.m.homeScore, big.m.awayScore)} win over ${homeWon ? big.m.awayTeam : big.m.homeTeam} is the biggest margin so far.`)
    }

    for (const m of completed) {
      const counts = new Map<string, number>()
      for (const g of m.goals ?? []) if (!g.isOwnGoal && g.scorerPlayerName) counts.set(g.scorerPlayerName, (counts.get(g.scorerPlayerName) ?? 0) + 1)
      for (const [name, c] of counts) if (c >= 3) {
        add('hat-trick', `${name} scored ${c === 3 ? 'a hat-trick' : `${c} goals`} in ${m.homeTeam} ${m.homeScore}–${m.awayScore} ${m.awayTeam}.`)
      }
    }

    const pks = completed.filter((m: any) => m.wentToPenaltyShootout).length
    if (pks > 0) add('penalty drama', `${pks} knockout tie${pks === 1 ? ' has been' : 's have been'} settled on penalties.`)

    tournament.facts = facts
  }

  return {
    tournament,
    dataSource: 'json+api',
    apiCacheFetchedAt: apiData.fetchedAt,
    matchesUpdated,
    liveMatchCount,
  }
}
