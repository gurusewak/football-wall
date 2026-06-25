'use client'

import { Match } from '@/lib/types'
import { countryFlagEmoji, getMatchStatus } from '@/lib/tournament-utils'
import { useState } from 'react'
import { MatchDetailModal } from './MatchDetailModal'
import { motion } from 'framer-motion'

interface BracketMatchCardProps {
  match: Match
  onClick?: () => void
}

export function BracketMatchCard({ match, onClick }: BracketMatchCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  const isCompleted = match.status === 'completed'
  const isLive = match.status === 'live'

  const handleClick = () => {
    setShowDetail(true)
    onClick?.()
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        onClick={handleClick}
        className="cursor-pointer group"
      >
        <div
          className={`border rounded-lg p-3 transition-all duration-300 ${
            isCompleted
              ? 'border-primary/40 bg-card/50 hover:border-primary/60 hover:bg-primary/10'
              : isLive
                ? 'border-accent/60 bg-accent/20 hover:border-accent hover:bg-accent/30 shadow-lg shadow-accent/20'
                : 'border-border/40 bg-card/30 hover:border-border/60 hover:bg-card/50'
          }`}
        >
          {/* Match status badge */}
          <div className="text-xs font-semibold mb-2">
            {isLive && <span className="inline-block px-2 py-1 rounded bg-accent/80 text-accent-foreground">LIVE</span>}
            {isCompleted && match.status !== 'live' && (
              <span className="inline-block px-2 py-1 rounded bg-primary/60 text-primary-foreground">FINAL</span>
            )}
            {match.status === 'scheduled' && (
              <span className="inline-block px-2 py-1 rounded bg-muted/60 text-muted-foreground">Scheduled</span>
            )}
          </div>

          {/* Home team */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-lg flex-shrink-0">{countryFlagEmoji(match.homeTeam.substring(0, 2).toUpperCase())}</span>
              <span className="text-sm font-medium truncate text-foreground">{match.homeTeam}</span>
            </div>
            <span className={`font-bold text-lg ${isCompleted || isLive ? 'text-accent' : 'text-muted-foreground'}`}>
              {match.homeScore}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-border/30 my-2" />

          {/* Away team */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-lg flex-shrink-0">{countryFlagEmoji(match.awayTeam.substring(0, 2).toUpperCase())}</span>
              <span className="text-sm font-medium truncate text-foreground">{match.awayTeam}</span>
            </div>
            <span className={`font-bold text-lg ${isCompleted || isLive ? 'text-accent' : 'text-muted-foreground'}`}>
              {match.awayScore}
            </span>
          </div>

          {/* Venue info */}
          <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30 truncate">
            {match.city}
          </div>
        </div>
      </motion.div>

      {showDetail && <MatchDetailModal match={match} onClose={() => setShowDetail(false)} />}
    </>
  )
}
