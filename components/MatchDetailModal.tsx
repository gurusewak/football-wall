'use client'

import { Match } from '@/lib/types'
import { countryFlagEmoji, formatDate, formatVenue } from '@/lib/tournament-utils'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

interface MatchDetailModalProps {
  match: Match
  onClose: () => void
}

export function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border/40 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="text-sm text-muted-foreground mb-4">
            {match.stage.toUpperCase()} • {formatDate(match.date)}
          </div>

          {/* Score */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-3xl">{countryFlagEmoji(match.homeTeam.substring(0, 2).toUpperCase())}</span>
              </div>
              <p className="font-bold text-lg">{match.homeTeam}</p>
              <p className="text-2xl font-bold text-accent mt-1">{match.homeScore}</p>
            </div>

            <div className="px-4 py-2">
              <div className="text-center text-muted-foreground text-sm">vs</div>
            </div>

            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-3xl">{countryFlagEmoji(match.awayTeam.substring(0, 2).toUpperCase())}</span>
              </div>
              <p className="font-bold text-lg">{match.awayTeam}</p>
              <p className="text-2xl font-bold text-accent mt-1">{match.awayScore}</p>
            </div>
          </div>
        </div>

        {/* Match Info */}
        <div className="space-y-4 mb-6 pb-6 border-b border-border/40">
          <div>
            <p className="text-xs text-muted-foreground mb-1">VENUE</p>
            <p className="text-sm">{formatVenue(match.venue, match.city)}</p>
          </div>

          {match.attendance > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">ATTENDANCE</p>
              <p className="text-sm">{match.attendance.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Goals */}
        {match.goals && match.goals.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Goals</p>
            <div className="space-y-2">
              {match.goals.map((goal, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="text-accent font-semibold">{goal.minute}'</span>
                  <span>{goal.player}</span>
                  {goal.penalty && <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded">PEN</span>}
                  {goal.ownGoal && <span className="text-xs bg-muted/20 text-muted-foreground px-2 py-0.5 rounded">OG</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cards */}
        {match.cards && match.cards.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Cards</p>
            <div className="space-y-2">
              {match.cards.map((card, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground font-semibold">{card.minute}'</span>
                  <span>{card.player}</span>
                  <span
                    className={`w-4 h-5 rounded-sm ${card.cardType === 'yellow' ? 'bg-yellow-500' : 'bg-red-600'}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player of Match */}
        {match.playerOfMatch && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">PLAYER OF MATCH</p>
            <p className="text-sm font-semibold">{match.playerOfMatch}</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
