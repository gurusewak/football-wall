'use client'

import { useState, useMemo, useEffect } from 'react'
import { Tournament, Match } from '@/lib/types'
import { motion } from 'framer-motion'

interface AnimatedTournamentSimulationProps {
  tournament: Tournament
  progress: number
  isPlaying: boolean
}

interface AnimatedMatch {
  match: Match
  round: string
  roundNumber: number
  position: number
}

export function AnimatedTournamentSimulation({
  tournament,
  progress,
  isPlaying,
}: AnimatedTournamentSimulationProps) {
  const [displayedMatches, setDisplayedMatches] = useState<Map<string, boolean>>(new Map())

  // Organize all knockout matches with timing
  const allMatches = useMemo(() => {
    const matches: AnimatedMatch[] = []
    const roundOrder = ['r32', 'r16', 'qf', 'sf', 'final']
    
    tournament.knockoutBracket.forEach((bracket) => {
      const roundNum = roundOrder.indexOf(bracket.round)
      if (roundNum >= 0) {
        bracket.matches.forEach((match, idx) => {
          matches.push({
            match,
            round: bracket.round,
            roundNumber: roundNum,
            position: idx,
          })
        })
      }
    })
    
    return matches.sort((a, b) => {
      if (a.roundNumber !== b.roundNumber) return a.roundNumber - b.roundNumber
      return a.position - b.position
    })
  }, [tournament.knockoutBracket])

  // Determine which matches to show based on progress
  useEffect(() => {
    const currentMatchIndex = Math.floor(progress * allMatches.length)
    const newDisplayed = new Map<string, boolean>()

    allMatches.slice(0, Math.min(currentMatchIndex + 1, allMatches.length)).forEach((am) => {
      newDisplayed.set(am.match.id, true)
    })

    setDisplayedMatches(newDisplayed)
  }, [progress, allMatches])

  const getTeamFlag = (flagCode: string) => {
    const codePoints = flagCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  const getRoundLabel = (round: string) => {
    const labels: Record<string, string> = {
      r32: 'Round of 32',
      r16: 'Round of 16',
      qf: 'Quarter Finals',
      sf: 'Semi Finals',
      final: 'Final',
    }
    return labels[round] || round
  }

  const getTileProgress = (animMatch: AnimatedMatch) => {
    return Math.min(1, Math.max(0, progress - animMatch.roundNumber * 0.15) * 6)
  }

  const MatchTile = ({ animMatch, isLeft }: { animMatch: AnimatedMatch; isLeft: boolean }) => {
    if (!displayedMatches.has(animMatch.match.id)) return null
    
    const tileProgress = getTileProgress(animMatch)
    const totalMatches = allMatches.filter((m) => m.position % 2 === (isLeft ? 0 : 1)).length
    const tileIndex = allMatches
      .filter((m) => m.position % 2 === (isLeft ? 0 : 1))
      .findIndex((m) => m.match.id === animMatch.match.id)
    
    // Calculate vertical position - centered among its peers
    const verticalPercent = totalMatches > 1 ? (tileIndex / (totalMatches - 1)) * 100 : 50

    return (
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -80 : 80 }}
        animate={{
          opacity: tileProgress > 0 ? 1 : 0,
          x: isLeft ? -50 * (1 - tileProgress) : 50 * (1 - tileProgress),
        }}
        transition={{ duration: 0.9, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          [isLeft ? 'left' : 'right']: '0',
          top: `${verticalPercent}%`,
          transform: 'translateY(-50%)',
        }}
        className="w-40 sm:w-48 lg:w-56 flex-shrink-0"
      >
        <div className="bg-card/95 border-2 border-accent/70 rounded-lg p-2 sm:p-3 backdrop-blur hover:border-accent/100 transition-all shadow-lg shadow-black/50 hover:shadow-accent/30">
          <div className="text-xs font-bold text-accent mb-1.5 sm:mb-2 bg-primary/35 px-2 py-0.5 sm:py-1 rounded text-center line-clamp-1">
            {getRoundLabel(animMatch.round)}
          </div>

          {/* Home Team */}
          <div className="py-1.5 sm:py-2 px-1.5 sm:px-2 rounded bg-primary/35 border border-primary/70 mb-1 sm:mb-1.5 hover:bg-primary/45 transition-colors">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
                <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0">
                  {getTeamFlag(animMatch.match.homeTeam === 'Argentina' ? 'AR' : animMatch.match.homeTeam === 'Spain' ? 'ES' : 'FR')}
                </span>
                <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                  {animMatch.match.homeTeam}
                </span>
              </div>
              <span className="text-base sm:text-lg lg:text-xl font-bold text-accent flex-shrink-0">
                {animMatch.match.homeScore}
              </span>
            </div>
          </div>

          {/* Away Team */}
          <div className="py-1.5 sm:py-2 px-1.5 sm:px-2 rounded bg-accent/35 border border-accent/70 hover:bg-accent/45 transition-colors">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
                <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0">
                  {getTeamFlag(animMatch.match.awayTeam === 'Argentina' ? 'AR' : animMatch.match.awayTeam === 'Spain' ? 'ES' : 'FR')}
                </span>
                <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                  {animMatch.match.awayTeam}
                </span>
              </div>
              <span className="text-base sm:text-lg lg:text-xl font-bold text-accent flex-shrink-0">
                {animMatch.match.awayScore}
              </span>
            </div>
          </div>

          <div className="text-xs text-foreground/90 mt-1 sm:mt-1.5 pt-1 sm:pt-1.5 border-t border-border/70 font-medium text-center line-clamp-1">
            {new Date(animMatch.match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </motion.div>
    )
  }

  const leftMatches = allMatches.filter((m) => m.position % 2 === 0)
  const rightMatches = allMatches.filter((m) => m.position % 2 === 1)

  return (
    <div className="w-full space-y-6">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-foreground">Tournament Progress</span>
          <span className="text-xs font-bold text-accent">
            {Math.round(Math.min(progress, 1) * 100)}%
          </span>
        </div>
        <div className="w-full h-3 bg-card/70 rounded-full border border-accent/50 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-accent to-primary"
            animate={{ width: `${Math.min(progress, 1) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main animation area - Proper bracket convergence */}
      <div className="relative w-full bg-card/50 border-2 border-accent/60 rounded-lg p-2 sm:p-4 lg:p-8 backdrop-blur overflow-hidden" style={{ minHeight: 'clamp(350px, 70vh, 650px)' }}>
        {/* SVG connecting lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <defs>
            <linearGradient id="bracketGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(100, 100, 100, 0.4)" />
              <stop offset="50%" stopColor="rgba(140, 140, 140, 0.3)" />
              <stop offset="100%" stopColor="rgba(100, 100, 100, 0.4)" />
            </linearGradient>
          </defs>
          
          {/* Connecting lines from tiles to center */}
          {allMatches.map((animMatch) => {
            if (!displayedMatches.has(animMatch.match.id)) return null
            const tileProgress = getTileProgress(animMatch)
            if (tileProgress === 0) return null
            
            const isLeft = animMatch.position % 2 === 0
            const totalMatches = allMatches.filter((m) => m.position % 2 === (isLeft ? 0 : 1)).length
            const tileIndex = allMatches
              .filter((m) => m.position % 2 === (isLeft ? 0 : 1))
              .findIndex((m) => m.match.id === animMatch.match.id)
            
            const verticalPercent = totalMatches > 1 ? (tileIndex / (totalMatches - 1)) * 100 : 50
            const xStart = isLeft ? 0 : 100
            const xEnd = 50
            
            return (
              <line
                key={`line-${animMatch.match.id}`}
                x1={`${xStart}%`}
                y1={`${verticalPercent}%`}
                x2={`${xEnd + (xStart === 0 ? -12 : 12) * (1 - tileProgress)}%`}
                y2={`${verticalPercent}%`}
                stroke="url(#bracketGradient)"
                strokeWidth="1.5"
                opacity={tileProgress * 0.7}
              />
            )
          })}
        </svg>

        {/* Content */}
        <div className="relative z-10 w-full h-full">
          {/* Left side */}
          <div className="absolute left-0 top-0 w-1/3 h-full">
            {leftMatches.map((animMatch) => (
              <MatchTile key={animMatch.match.id} animMatch={animMatch} isLeft={true} />
            ))}
          </div>

          {/* Center Trophy */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 text-center">
            {progress >= 0.95 ? (
              <motion.div
                initial={{ scale: 0, opacity: 0, rotateY: -180 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                transition={{ duration: 1.2, type: 'spring', stiffness: 80 }}
              >
                <div className="text-6xl sm:text-7xl lg:text-9xl mb-2 sm:mb-4 drop-shadow-2xl">🏆</div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-accent drop-shadow-lg">Champion</h2>
                <p className="text-sm sm:text-base lg:text-lg text-foreground/95 mt-1 sm:mt-2 drop-shadow-lg font-semibold">{tournament.year}</p>
              </motion.div>
            ) : (
              <div className="text-center opacity-40">
                <div className="text-5xl sm:text-6xl lg:text-8xl mb-1 sm:mb-2 drop-shadow-md">🏆</div>
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="absolute right-0 top-0 w-1/3 h-full">
            {rightMatches.map((animMatch) => (
              <MatchTile key={animMatch.match.id} animMatch={animMatch} isLeft={false} />
            ))}
          </div>
        </div>
      </div>

      {/* Status text */}
      <div className="text-center px-2">
        <motion.p
          key={Math.floor(progress * 5)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm sm:text-base lg:text-lg font-semibold text-foreground"
        >
          {progress >= 0.95
            ? '🎉 Tournament Complete!'
            : progress >= 0.8
              ? 'Final: Championship Match'
              : progress >= 0.6
                ? 'Semi Finals'
                : progress >= 0.4
                  ? 'Quarter Finals'
                  : progress >= 0.2
                    ? 'Round of 16'
                    : 'Round of 32'}
        </motion.p>
      </div>
    </div>
  )
}
