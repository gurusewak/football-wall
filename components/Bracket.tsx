'use client'

import { Bracket as BracketType } from '@/lib/types'
import { BracketMatchCard } from './BracketMatchCard'
import { motion } from 'framer-motion'

interface BracketProps {
  brackets: BracketType[]
}

const getRoundLabel = (round: string): string => {
  const labels: Record<string, string> = {
    r32: 'Round of 32',
    r16: 'Round of 16',
    qf: 'Quarter Finals',
    sf: 'Semi Finals',
    final: 'Final',
  }
  return labels[round] || round
}

export function Bracket({ brackets }: BracketProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, staggerChildren: 0.1 }}
      className="space-y-8"
    >
      {brackets.map((bracket, bracketIdx) => (
        <motion.div key={bracket.round} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-accent">{getRoundLabel(bracket.round)}</h3>
          </div>

          {bracket.round === 'final' ? (
            // Final - center single match
            <div className="flex justify-center">
              <div className="w-full sm:w-80">
                <BracketMatchCard match={bracket.matches[0]} />
              </div>
            </div>
          ) : bracket.round === 'sf' ? (
            // Semi-finals - 2 matches
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bracket.matches.map((match, idx) => (
                <div key={match.id}>
                  <BracketMatchCard match={match} />
                </div>
              ))}
            </div>
          ) : (
            // Quarter-finals and earlier - 4+ matches
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {bracket.matches.map((match, idx) => (
                <div key={match.id}>
                  <BracketMatchCard match={match} />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  )
}
