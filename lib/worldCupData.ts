import { Tournament, GroupStanding, Bracket, Match, Team, Award, AwardStanding } from './types'

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

  // Build group winner/runner-up lookup for resolving bracket slots
  const groupWinners = new Map<string, string>()
  const groupRunnersUp = new Map<string, string>();
  (raw.groups ?? []).forEach((rg: any) => {
    if (rg.standingsStatus === 'complete' && Array.isArray(rg.standings) && rg.standings.length >= 2) {
      const sorted = [...rg.standings].sort((a: any, b: any) => (a.rank ?? 99) - (b.rank ?? 99))
      groupWinners.set(rg.group, sorted[0].team ?? '')
      groupRunnersUp.set(rg.group, sorted[1].team ?? '')
    }
  })

  function resolveSlot(slot: string): string {
    const winMatch = slot.match(/Winner\s+Group\s+([A-L])/i)
    if (winMatch) return groupWinners.get(winMatch[1]) ?? slot
    const runMatch = slot.match(/Runner.?up\s+Group\s+([A-L])/i)
    if (runMatch) return groupRunnersUp.get(runMatch[1]) ?? slot
    return slot
  }

  // Knockout bracket — structure from raw.knockoutBracket, data from raw.matches
  const knockoutBracket: Bracket[] = (raw.knockoutBracket ?? []).map((b: any) => {
    const round = b.round === 'third_place' ? '3p' : b.round
    const matches: Match[] = (b.matches ?? []).map((slot: any) => {
      const matchId = slot.matchId ?? slot.id
      const m = matchById.get(matchId)
      if (m) return normalizeMatchV2(m, round)
      return {
        id: matchId,
        stage: round as Match['stage'],
        matchLabel: slot.matchLabel,
        homeTeam: resolveSlot(slot.homeSlot ?? 'TBD'),
        awayTeam: resolveSlot(slot.awaySlot ?? 'TBD'),
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
  }
}

export function normalizeTournament(raw: any): Tournament {
  // Detect V2 schema by presence of schemaVersion or hostCountries
  if (raw.schemaVersion || Array.isArray(raw.hostCountries)) {
    return normalizeV2(raw)
  }
  return raw as Tournament
}
