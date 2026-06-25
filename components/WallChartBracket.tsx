'use client'

import { useState, useMemo } from 'react'
import { Match, Bracket, Group, Tournament } from '@/lib/types'
import { motion } from 'framer-motion'

interface WallChartBracketProps {
  tournament: Tournament
}

interface RoundMatch {
  match: Match
  position: number
}

export function WallChartBracket({ tournament }: WallChartBracketProps) {
  const [hoveredMatch, setHoveredMatch] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)

  // Get groups for left and right sides
  const leftGroups = tournament.groups.slice(0, Math.ceil(tournament.groups.length / 2))
  const rightGroups = tournament.groups.slice(Math.ceil(tournament.groups.length / 2))

  // Organize matches by round
  const matchesByRound = useMemo(() => {
    const rounds: Record<string, RoundMatch[]> = {}
    tournament.knockoutBracket.forEach((bracket) => {
      rounds[bracket.round] = bracket.matches.map((match, idx) => ({
        match,
        position: idx,
      }))
    })
    return rounds
  }, [tournament.knockoutBracket])

  const getTeamFlag = (flagCode: string) => {
    const codePoints = flagCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  const getMatchupLabel = (match: Match) => {
    // Extract group and position from match context
    return `${match.homeTeam} vs ${match.awayTeam}`
  }

  const GroupStanding = ({ group, isLeft }: { group: Group; isLeft: boolean }) => (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className={`w-24 sm:w-28 lg:w-32 text-xs space-y-0.5 ${isLeft ? 'text-right' : 'text-left'}`}
    >
      <div className="font-bold text-accent mb-1 text-xs sm:text-sm line-clamp-1">GROUP {group.group}</div>
      {group.teams.map((team) => (
        <div
          key={team.id}
          className="py-1 px-1.5 sm:px-2 rounded bg-card/50 border border-border/40 hover:bg-card/70 transition-colors"
        >
          <div className="flex items-center justify-between gap-0.5 sm:gap-1">
            {isLeft ? (
              <>
                <span className="font-medium truncate text-xs">{team.name}</span>
                <span className="text-base sm:text-lg flex-shrink-0">{getTeamFlag(team.flagCode)}</span>
              </>
            ) : (
              <>
                <span className="text-base sm:text-lg flex-shrink-0">{getTeamFlag(team.flagCode)}</span>
                <span className="font-medium truncate text-xs">{team.name}</span>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {team.wins}W {team.draws}D {team.losses}L
          </div>
        </div>
      ))}
    </motion.div>
  )

  const MatchCard = ({ roundMatch, roundName }: { roundMatch: RoundMatch; roundName: string }) => {
    const { match, position } = roundMatch

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: position * 0.05 }}
        onMouseEnter={() => setHoveredMatch(match.id)}
        onMouseLeave={() => setHoveredMatch(null)}
        onClick={() => setSelectedMatch(match)}
        className="cursor-pointer"
      >
        <div
          className={`relative w-36 sm:w-40 lg:w-44 rounded-lg border bg-card/50 backdrop-blur transition-all duration-300 overflow-hidden ${
            hoveredMatch === match.id
              ? 'border-accent/60 shadow-lg shadow-accent/20 bg-card/80'
              : 'border-border/40 hover:border-accent/30'
          }`}
        >
          {/* Round label */}
          <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/20 border-b border-border/40 text-xs font-semibold text-accent line-clamp-1">
            {roundName}
          </div>

          <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2">
            {/* Date and venue */}
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div className="font-mono text-xs">{new Date(match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
              <div className="truncate text-xs line-clamp-1">{match.city}</div>
            </div>

            {/* Home Team */}
            <div className="py-1 sm:py-1.5 px-1.5 sm:px-2 rounded bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between gap-1 sm:gap-2">
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-sm sm:text-base flex-shrink-0">{getTeamFlag(match.homeTeam === 'Argentina' ? 'AR' : 'ES')}</span>
                  <span className="text-xs font-medium truncate">{match.homeTeam}</span>
                </div>
                <span className="font-bold text-accent text-xs sm:text-sm flex-shrink-0">{match.homeScore}</span>
              </div>
            </div>

            {/* Away Team */}
            <div className="py-1 sm:py-1.5 px-1.5 sm:px-2 rounded bg-accent/10 border border-accent/20">
              <div className="flex items-center justify-between gap-1 sm:gap-2">
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-sm sm:text-base flex-shrink-0">{getTeamFlag(match.awayTeam === 'Argentina' ? 'AR' : 'ES')}</span>
                  <span className="text-xs font-medium truncate">{match.awayTeam}</span>
                </div>
                <span className="font-bold text-accent text-xs sm:text-sm flex-shrink-0">{match.awayScore}</span>
              </div>
            </div>

            {/* Goals on hover */}
            {hoveredMatch === match.id && match.goals.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-xs text-muted-foreground pt-2 border-t border-border/40 space-y-0.5"
              >
                {match.goals.map((goal, idx) => (
                  <div key={idx}>
                    {goal.player} {goal.minute}'
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  const RoundSection = ({ roundKey, label }: { roundKey: string; label: string }) => {
    const matches = matchesByRound[roundKey] || []
    if (matches.length === 0) return null

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-accent text-center">{label}</h3>
        <div className="flex flex-col gap-4">
          {matches.map((roundMatch) => (
            <MatchCard key={roundMatch.match.id} roundMatch={roundMatch} roundName={label} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Main Wall Chart Grid */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="space-y-4 sm:space-y-6">
        {/* Title */}
        <div className="text-center mb-4 sm:mb-8 px-2">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent mb-1 sm:mb-2">
            Football World Cup {tournament.year}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Tournament Bracket - {tournament.format} Teams</p>
        </div>

        {/* Two-column layout: Groups on sides, Rounds in middle */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 lg:gap-6 items-start px-1 sm:px-0 overflow-x-auto">
          {/* LEFT SIDE - Groups A-F */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            {leftGroups.map((group) => (
              <GroupStanding key={group.group} group={group} isLeft={true} />
            ))}
          </motion.div>

          {/* CENTER - Knockout Rounds */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-1 lg:col-span-3 space-y-4 sm:space-y-6 lg:space-y-8 overflow-x-auto"
          >
            {/* Round of 32 */}
            {matchesByRound['r32'] && <RoundSection roundKey="r32" label="Round of 32" />}

            {/* Round of 16 */}
            {matchesByRound['r16'] && <RoundSection roundKey="r16" label="Round of 16" />}

            {/* Quarter Finals */}
            {matchesByRound['qf'] && <RoundSection roundKey="qf" label="Quarter Finals" />}

            {/* Semi Finals */}
            {matchesByRound['sf'] && <RoundSection roundKey="sf" label="Semi Finals" />}

            {/* Final */}
            {matchesByRound['final'] && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-accent text-center">FINAL</h3>
                <div className="flex justify-center">
                  {matchesByRound['final'][0] && (
                    <MatchCard roundMatch={matchesByRound['final'][0]} roundName="Final" />
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* RIGHT SIDE - Groups G-L */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            {rightGroups.map((group) => (
              <GroupStanding key={group.group} group={group} isLeft={false} />
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedMatch(null)}
          className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-card border border-accent/40 rounded-lg p-6 max-w-md w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-accent">Match Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Date & Venue</p>
                <p className="font-semibold">{new Date(selectedMatch.date).toLocaleDateString()}</p>
                <p className="text-sm">{selectedMatch.venue}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedMatch.city}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{selectedMatch.homeTeam}</p>
                  <p className="text-2xl font-bold text-accent">{selectedMatch.homeScore}</p>
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-muted-foreground">vs</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{selectedMatch.awayTeam}</p>
                  <p className="text-2xl font-bold text-accent">{selectedMatch.awayScore}</p>
                </div>
              </div>
              {selectedMatch.goals.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Goals</p>
                  <div className="space-y-1">
                    {selectedMatch.goals.map((goal, idx) => (
                      <div key={idx} className="text-sm">
                        {goal.player} {goal.minute}' {goal.penalty && '(P)'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">👥 {(selectedMatch.attendance ?? 0).toLocaleString()}</p>
            </div>
            <button
              onClick={() => setSelectedMatch(null)}
              className="w-full py-2 bg-primary/20 hover:bg-primary/30 rounded text-sm font-medium transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
