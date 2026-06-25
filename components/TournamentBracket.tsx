'use client'

import { useState, useMemo } from 'react'
import { Match, Bracket } from '@/lib/types'
import { motion } from 'framer-motion'

interface BracketProps {
  brackets: Bracket[]
  year: number
}

interface BracketMatch {
  match: Match
  round: string
  position: number
  totalInRound: number
}

export function TournamentBracket({ brackets, year }: BracketProps) {
  const [hoveredMatch, setHoveredMatch] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)

  const bracketStructure = useMemo(() => {
    const structure: Record<string, BracketMatch[]> = {}
    brackets.forEach((bracket) => {
      const roundName = bracket.round.toUpperCase()
      structure[roundName] = bracket.matches.map((match, idx) => ({
        match,
        round: bracket.round,
        position: idx,
        totalInRound: bracket.matches.length,
      }))
    })
    return structure
  }, [brackets])

  const getRoundDisplay = (round: string) => {
    const roundMap: Record<string, string> = {
      r32: 'Round of 32',
      r16: 'Round of 16',
      qf: 'Quarterfinals',
      sf: 'Semifinals',
      final: 'Final',
    }
    return roundMap[round] || round
  }

  const getTeamFlag = (flagCode: string) => {
    const codePoints = flagCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  const renderMatch = (bracketMatch: BracketMatch, isLeft: boolean) => {
    const { match, position, totalInRound, round } = bracketMatch
    const isHome = isLeft ? position % 2 === 0 : position % 2 === 1

    return (
      <motion.div
        key={match.id}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: position * 0.05 }}
        onMouseEnter={() => setHoveredMatch(match.id)}
        onMouseLeave={() => setHoveredMatch(null)}
        onClick={() => setSelectedMatch(match)}
        className="cursor-pointer"
      >
        <div
          className={`relative w-48 rounded-lg border border-border/40 bg-card/40 backdrop-blur transition-all duration-300 ${
            hoveredMatch === match.id
              ? 'border-accent/60 shadow-lg shadow-accent/20 bg-card/80'
              : 'hover:border-accent/30'
          }`}
        >
          {/* Match card content */}
          <div className="p-3 space-y-2">
            {/* Date and venue */}
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="font-mono">{new Date(match.date).toLocaleDateString()}</div>
              <div className="text-xs truncate">{match.city}</div>
            </div>

            {/* Home Team */}
            <div className="py-1 px-2 rounded bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-lg">{getTeamFlag(match.homeTeam === 'Argentina' ? 'AR' : 'ES')}</span>
                  <span className="text-sm font-medium truncate">{match.homeTeam}</span>
                </div>
                <span className="font-bold text-accent">{match.homeScore}</span>
              </div>
            </div>

            {/* Away Team */}
            <div className="py-1 px-2 rounded bg-accent/10 border border-accent/20">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-lg">{getTeamFlag(match.awayTeam === 'Argentina' ? 'AR' : 'ES')}</span>
                  <span className="text-sm font-medium truncate">{match.awayTeam}</span>
                </div>
                <span className="font-bold text-accent">{match.awayScore}</span>
              </div>
            </div>

            {/* Attendance */}
            {hoveredMatch === match.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-xs text-muted-foreground pt-1 border-t border-border/40">
                <div>👥 {(match.attendance ?? 0).toLocaleString()}</div>
                {match.goals.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {match.goals.map((goal, idx) => (
                      <div key={idx} className="text-xs">
                        {goal.player} {goal.minute}'
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  const rounds = ['r32', 'r16', 'qf', 'sf', 'final']
  const displayRounds = rounds.filter((r) => r.toUpperCase() in bracketStructure)

  return (
    <div className="w-full space-y-8">
      {displayRounds.map((round) => {
        const roundKey = round.toUpperCase()
        const matches = bracketStructure[roundKey] || []
        if (matches.length === 0) return null

        return (
          <div key={round} className="space-y-4">
            <h3 className="text-lg font-bold text-accent text-center">{getRoundDisplay(round)}</h3>
            <div className="flex flex-wrap justify-center gap-8">
              {matches.map((bracketMatch) => (
                <div key={bracketMatch.match.id} className="flex items-center">
                  {renderMatch(bracketMatch, true)}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Match detail popover */}
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
