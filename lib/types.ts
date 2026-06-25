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
}

export interface GroupStanding {
  group: string
  teams: Team[]
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
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  homeTeamId: string
  awayTeamId: string
  date: string
  venue: string
  city: string
  attendance: number
  status: 'scheduled' | 'live' | 'completed'
  goals: Goal[]
  cards: Card[]
  playerOfMatch?: string
  group?: string
}

export interface Bracket {
  round: 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  matches: Match[]
}

export interface Tournament {
  name: string
  year: number
  groups: GroupStanding[]
  knockoutBracket: Bracket[]
  players: Player[]
  lastUpdated: string
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
