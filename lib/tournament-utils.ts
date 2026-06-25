import { Team, GroupStanding, Match } from './types'

export const countryFlagEmoji = (flagCode: string): string => {
  // Convert flag code to emoji flag
  const codePoints = flagCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

export const sortTeamsByStanding = (teams: Team[]): Team[] => {
  return [...teams].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points
    }
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference
    }
    return b.goalsFor - a.goalsFor
  })
}

export const getGroupStandings = (group: GroupStanding): Team[] => {
  return sortTeamsByStanding(group.teams)
}

export const getQualifiedTeams = (groups: GroupStanding[]): Team[] => {
  const qualified: Team[] = []
  for (const group of groups) {
    const sorted = sortTeamsByStanding(group.teams)
    qualified.push(sorted[0], sorted[1])
  }
  return qualified
}

export const getThirdPlaceTeams = (groups: GroupStanding[]): Team[] => {
  const thirdPlace = groups.map((g) => sortTeamsByStanding(g.teams)[2]).filter(Boolean)
  return thirdPlace.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    return b.goalsFor - a.goalsFor
  })
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatVenue = (venue: string, city: string): string => {
  return `${venue}, ${city}`
}

export const getMatchStatus = (match: Match): string => {
  if (match.status === 'completed') {
    return 'Final'
  }
  if (match.status === 'live') {
    return 'LIVE'
  }
  return 'Scheduled'
}
