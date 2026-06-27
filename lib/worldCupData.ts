import { Tournament, GroupStanding, Bracket, Match, Team, Award, AwardStanding, MatchStatistics, MatchPOTM } from './types'

function normalizeFlagCode(code: string): string {
  if (!code) return 'UN'
  // Sub-country codes like GB-ENG, GB-WLS → take the country part only
  return code.split('-')[0]
}

function normalizeMatchV2(raw: any, stage: string): Match {
  const date = raw.date ?? (raw.localDate ? raw.localDate + 'T00:00:00Z' : '')
  return {
    id: raw.id,
    stage: stage as Match['stage'],
    matchLabel: raw.matchLabel ?? (raw.matchNumber ? `M${raw.matchNumber}` : undefined),
    homeTeam: raw.homeTeam ?? 'TBD',
    awayTeam: raw.awayTeam ?? 'TBD',
    homeTeamId: raw.homeTeamId ?? '',
    awayTeamId: raw.awayTeamId ?? '',
    homeScore: raw.homeScore ?? null,
    awayScore: raw.awayScore ?? null,
    date,
    venue: raw.venue ?? '',
    city: raw.city ?? '',
    attendance: raw.attendance ?? null,
    status: raw.status ?? 'scheduled',
    goals: raw.goals ?? [],
    cards: raw.cards ?? [],
    playerOfMatch: raw.playerOfMatch,
    group: raw.group ?? undefined,
    wentToExtraTime: raw.wentToExtraTime ?? false,
    wentToPenaltyShootout: raw.wentToPenaltyShootout ?? false,
    homePenaltyScore: raw.homePenaltyScore ?? null,
    awayPenaltyScore: raw.awayPenaltyScore ?? null,
  }
}

function normalizeV2(raw: any): Tournament {
  // Build team lookup: teamId → { name, flagCode, group }
  const teamMap = new Map<string, { name: string; flagCode: string; group?: string }>(
    (raw.teams ?? []).map((t: any) => [
      t.id,
      { name: t.name, flagCode: normalizeFlagCode(t.flagCode ?? ''), group: t.group },
    ])
  )

  // Winner
  const winnerId = raw.tournamentSummary?.winnerTeamId
  const winner = winnerId ? (teamMap.get(winnerId)?.name ?? null) : null

  // Host
  const host = Array.isArray(raw.hostCountries)
    ? raw.hostCountries.join(' / ')
    : (raw.host ?? '')

  // Match lookup by ID
  const matchById = new Map<string, any>((raw.matches ?? []).map((m: any) => [m.id, m]))

  // Groups
  const groups: GroupStanding[] = (raw.groups ?? []).map((g: any) => {
    const standingsData: any[] = g.standings ?? g.teams ?? []
    const teams: Team[] = standingsData.map((t: any) => {
      if ('teamId' in t) {
        const info = teamMap.get(t.teamId)
        return {
          id: t.teamId,
          name: t.team ?? info?.name ?? t.teamId,
          flagCode: info?.flagCode ?? '',
          group: g.group,
          played: t.played ?? 0,
          wins: t.wins ?? 0,
          draws: t.draws ?? 0,
          losses: t.losses ?? 0,
          goalsFor: t.goalsFor ?? 0,
          goalsAgainst: t.goalsAgainst ?? 0,
          goalDifference: t.goalDifference ?? 0,
          points: t.points ?? 0,
          qualified: typeof t.qualified === 'boolean' ? t.qualified : undefined,
        }
      }
      // Old-format team row — pass through with flagCode normalization
      return { ...t, flagCode: normalizeFlagCode(t.flagCode ?? '') }
    })
    return { group: g.group, teams }
  })

  // ── Live knockout-slot resolution ──────────────────────────────────────────
  // Resolve who occupies each bracket slot from current results, every render.
  // Slot codes: "1E"/"2A" = group winner/runner-up, "W74" = winner of match 74,
  // "RU101"/"L101" = loser of match 101, "3ABCDF" = a best-third (not yet known).
  const groupByLetter = new Map<string, any>()
  for (const g of raw.groups ?? []) groupByLetter.set(g.group, g)

  const groupSlot = (letter: string, rank: number): string | null => {
    const g = groupByLetter.get(letter)
    if (!g || g.standingsStatus !== 'complete' || !Array.isArray(g.standings)) return null
    const sorted = [...g.standings].sort((a: any, b: any) => (a.rank ?? 99) - (b.rank ?? 99))
    return sorted[rank - 1]?.team ?? null
  }

  const koByNumber = new Map<number, any>()
  for (const m of raw.matches ?? []) {
    if ((m.stage === 'knockout' || m.stage === 'placement') && m.matchNumber != null) {
      koByNumber.set(m.matchNumber, m)
    }
  }

  const matchWinnerSide = (m: any): 'home' | 'away' | null => {
    if (!m || m.status !== 'completed' || m.homeScore == null || m.awayScore == null) return null
    if (m.wentToPenaltyShootout && m.homePenaltyScore != null && m.awayPenaltyScore != null) {
      return m.homePenaltyScore > m.awayPenaltyScore ? 'home' : 'away'
    }
    if (m.homeScore === m.awayScore) return null
    return m.homeScore > m.awayScore ? 'home' : 'away'
  }

  const resolvedSlots = new Map<string, { home: string; away: string }>()

  // Returns a resolved team name, the slot's human label if not yet decided, or
  // null when this slot type can't be resolved here (e.g. best-third pools).
  const resolveCode = (code: string | undefined, label: string | undefined): string | null => {
    if (!code) return null
    let mm: RegExpMatchArray | null
    if ((mm = code.match(/^([12])([A-L])$/))) return groupSlot(mm[2], parseInt(mm[1], 10)) ?? (label ?? null)
    if ((mm = code.match(/^W(\d+)$/))) {
      const src = koByNumber.get(parseInt(mm[1], 10))
      const side = matchWinnerSide(src)
      const r = src ? resolvedSlots.get(src.id) : null
      return side && r ? r[side] : (label ?? null)
    }
    if ((mm = code.match(/^(?:RU|L)(\d+)$/))) {
      const src = koByNumber.get(parseInt(mm[1], 10))
      const side = matchWinnerSide(src)
      const r = src ? resolvedSlots.get(src.id) : null
      if (!side || !r) return label ?? null
      return side === 'home' ? r.away : r.home  // loser is the other side
    }
    return null  // best-third pools (3XXXXX) — resolved later via matrix/API
  }

  // Resolve in ascending match order so a feeder's result is known before its parent
  const koSorted = [...(raw.matches ?? [])]
    .filter((m: any) => m.stage === 'knockout' || m.stage === 'placement')
    .sort((a: any, b: any) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0))
  for (const m of koSorted) {
    resolvedSlots.set(m.id, {
      home: resolveCode(m.homeSlotCode, m.homeSlotLabel) ?? m.homeTeam ?? 'TBD',
      away: resolveCode(m.awaySlotCode, m.awaySlotLabel) ?? m.awayTeam ?? 'TBD',
    })
  }

  // Knockout bracket — structure from raw.knockoutBracket, occupants resolved live
  const knockoutBracket: Bracket[] = (raw.knockoutBracket ?? []).map((b: any) => {
    const round = b.round === 'third_place' ? '3p' : b.round
    const matches: Match[] = (b.matches ?? []).map((slot: any) => {
      const matchId = slot.matchId ?? slot.id
      const m = matchById.get(matchId)
      const resolved = resolvedSlots.get(matchId)
      if (m) {
        const nm = normalizeMatchV2(m, round)
        // Override placeholder/stale occupants ("Winner Group E", a stale seed
        // guess) with the live-resolved team, but never replace a real team with
        // a slot label (resolveCode returns null for pools we can't resolve).
        const rh = resolveCode(m.homeSlotCode, m.homeSlotLabel)
        const ra = resolveCode(m.awaySlotCode, m.awaySlotLabel)
        if (rh != null) nm.homeTeam = rh
        if (ra != null) nm.awayTeam = ra
        return nm
      }
      return {
        id: matchId,
        stage: round as Match['stage'],
        matchLabel: slot.matchLabel,
        homeTeam: resolved?.home ?? slot.homeSlot ?? 'TBD',
        awayTeam: resolved?.away ?? slot.awaySlot ?? 'TBD',
        homeTeamId: '',
        awayTeamId: '',
        homeScore: null,
        awayScore: null,
        date: '',
        venue: '',
        city: '',
        attendance: null,
        status: 'scheduled' as const,
        goals: [],
        cards: [],
      }
    })
    return { round: round as Bracket['round'], matches }
  })

  // Group stage matches (top-level)
  const groupMatches: Match[] = (raw.matches ?? [])
    .filter((m: any) => m.stage === 'group')
    .map((m: any) => normalizeMatchV2(m, 'group'))

  const summary = raw.tournamentSummary ?? {}
  const facts = (raw.facts ?? []).map((f: any) => ({
    id: f.id,
    factType: f.factType,
    statement: f.statement,
  }))

  // Awards — keep only rank-1 winners with a real player name
  const awards: Award[] = (raw.awards ?? [])
    .filter((a: any) => a.rank === 1 && a.winnerPlayerName)
    .map((a: any) => ({
      id: a.id,
      awardName: a.awardName,
      winnerPlayerName: a.winnerPlayerName,
      winnerTeamId: a.winnerTeamId ?? '',
      rank: a.rank,
      verified: a.verified ?? false,
    }))

  // Award standings — ranked leaderboards (Golden Boot etc.)
  const awardStandings: AwardStanding[] = (raw.awardStandings ?? [])
    .filter((s: any) => Array.isArray(s.leaders) && s.leaders.length > 0)
    .map((s: any) => ({
      id: s.id,
      awardName: s.awardName,
      leaders: s.leaders.map((l: any) => ({
        rank: l.rank,
        playerName: l.playerName,
        teamId: l.teamId ?? '',
        teamName: l.teamName ?? undefined,
        goals: l.goals ?? null,
        assists: l.assists ?? null,
      })),
      verified: s.verified ?? false,
    }))

  // Match statistics (team-level: possession, shots, passes, etc.)
  const matchStatistics: MatchStatistics[] = (raw.teamMatchStatistics ?? []).map((ms: any) => ({
    matchId: ms.matchId,
    home: {
      teamId: ms.home?.teamId ?? '',
      teamName: ms.home?.teamName ?? '',
      statistics: (ms.home?.statistics ?? []).map((s: any) => ({ type: s.type, value: s.value ?? null })),
    },
    away: {
      teamId: ms.away?.teamId ?? '',
      teamName: ms.away?.teamName ?? '',
      statistics: (ms.away?.statistics ?? []).map((s: any) => ({ type: s.type, value: s.value ?? null })),
    },
  }))

  // Player of the match per game
  const playerOfTheMatch: MatchPOTM[] = (raw.playerOfTheMatch ?? []).map((p: any) => ({
    matchId: p.matchId,
    playerName: p.playerName ?? p.player ?? '',
    playerId: p.playerId ?? undefined,
    playerTeamId: p.playerTeamId ?? p.teamId ?? undefined,
  })).filter((p: MatchPOTM) => p.playerName)

  return {
    name: raw.name,
    year: raw.year,
    host,
    winner,
    format: raw.formatConfig?.totalTeams ?? raw.format,
    status: raw.status,
    groups,
    knockoutBracket,
    players: raw.players ?? [],
    matches: groupMatches,
    lastUpdated: raw.lastUpdated ?? '',
    totalGoals: summary.totalGoals ?? undefined,
    averageGoalsPerMatch: summary.averageGoalsPerMatch ?? undefined,
    totalMatchesPlayed: summary.totalMatchesPlayed ?? summary.completedMatches ?? undefined,
    facts: facts.length > 0 ? facts : undefined,
    awards: awards.length > 0 ? awards : undefined,
    awardStandings: awardStandings.length > 0 ? awardStandings : undefined,
    matchStatistics: matchStatistics.length > 0 ? matchStatistics : undefined,
    playerOfTheMatch: playerOfTheMatch.length > 0 ? playerOfTheMatch : undefined,
  }
}

export function normalizeTournament(raw: any): Tournament {
  // Detect V2 schema by presence of schemaVersion or hostCountries
  if (raw.schemaVersion || Array.isArray(raw.hostCountries)) {
    return normalizeV2(raw)
  }
  return raw as Tournament
}
