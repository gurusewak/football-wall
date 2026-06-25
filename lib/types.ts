export interface Team {
  id: string
  name: string
  flagCode: string
  group?: string
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  played: number
  qualified?: boolean
}

export interface GroupStanding {
  group: string
  teams: Team[]
  matches?: Match[]
}

export interface Player {
  id: string
  name: string
  country: string
  position: string
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  playerOfMatch: number
  cleanSheets?: number
  saves?: number
}

export interface Goal {
  player: string
  minute: number
  penalty: boolean
  ownGoal: boolean
}

export interface Card {
  player: string
  minute: number
  cardType: 'yellow' | 'red'
}

export interface Match {
  id: string
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3p' | 'final'
  matchLabel?: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  homeTeamId: string
  awayTeamId: string
  date: string
  venue: string
  city: string
  attendance: number | null
  status: 'scheduled' | 'live' | 'completed'
  goals: Goal[]
  cards: Card[]
  playerOfMatch?: string
  group?: string
  wentToExtraTime?: boolean
  wentToPenaltyShootout?: boolean
  homePenaltyScore?: number | null
  awayPenaltyScore?: number | null
}

export interface Bracket {
  round: 'r32' | 'r16' | 'qf' | 'sf' | '3p' | 'final'
  matches: Match[]
}

export type Group = GroupStanding

export interface TournamentFact {
  id: string
  factType: string
  statement: string
}

export interface Award {
  id: string
  awardName: string
  winnerPlayerName: string
  winnerTeamId: string
  rank: number
  verified: boolean
}

export interface AwardLeader {
  rank: number
  playerName: string
  teamId: string
  teamName?: string
  goals: number | null
  assists: number | null
}

export interface AwardStanding {
  id: string
  awardName: string
  leaders: AwardLeader[]
  verified: boolean
}

export interface MatchStatEntry {
  type: string
  value: number | string | null
}

export interface TeamStatBlock {
  teamId: string
  teamName: string
  statistics: MatchStatEntry[]
}

export interface MatchStatistics {
  matchId: string
  home: TeamStatBlock
  away: TeamStatBlock
}

export interface MatchPOTM {
  matchId: string
  playerName: string
  playerId?: string
  playerTeamId?: string
}

export interface Tournament {
  name: string
  year: number
  host?: string
  winner?: string | null
  format?: number
  status?: 'completed' | 'in_progress'
  groups: GroupStanding[]
  knockoutBracket: Bracket[]
  players: Player[]
  matches?: Match[]
  lastUpdated: string
  totalGoals?: number
  averageGoalsPerMatch?: number
  totalMatchesPlayed?: number
  facts?: TournamentFact[]
  awards?: Award[]
  awardStandings?: AwardStanding[]
  matchStatistics?: MatchStatistics[]
  playerOfTheMatch?: MatchPOTM[]
}

export interface SimulationState {
  currentRound: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  isPlaying: boolean
  progress: number
}

export interface Tournaments {
  tournaments: Tournament[]
  latestYear: number
}

export interface TournamentStat {
  topScorers: Player[]
  mostAssists: Player[]
  mostYellowCards: Player[]
  mostRedCards: Player[]
  playerOfMatch: Player[]
  hatTricks: Array<{ player: string; country: string; count: number }>
  cleanSheets: Array<{ player: string; country: string; count: number }>
}
