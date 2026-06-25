'use client'

import { Player } from '@/lib/types'
import { motion } from 'framer-motion'

interface StatCard {
  label: string
  icon: string
  players: Array<{ name: string; country: string; value: number }>
}

interface StatsBoardProps {
  players: Player[]
}

export function StatsBoard({ players }: StatsBoardProps) {
  const stats: StatCard[] = [
    {
      label: 'Top Scorers',
      icon: '⚽',
      players: players
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 5)
        .map((p) => ({ name: p.name, country: p.country, value: p.goals })),
    },
    {
      label: 'Most Assists',
      icon: '🎯',
      players: players
        .sort((a, b) => b.assists - a.assists)
        .slice(0, 5)
        .map((p) => ({ name: p.name, country: p.country, value: p.assists })),
    },
    {
      label: 'Yellow Cards',
      icon: '🟨',
      players: players
        .sort((a, b) => b.yellowCards - a.yellowCards)
        .slice(0, 5)
        .map((p) => ({ name: p.name, country: p.country, value: p.yellowCards })),
    },
    {
      label: 'Red Cards',
      icon: '🟥',
      players: players
        .sort((a, b) => b.redCards - a.redCards)
        .filter((p) => p.redCards > 0)
        .slice(0, 5)
        .map((p) => ({ name: p.name, country: p.country, value: p.redCards })),
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.4 }}
          className="border border-border/40 rounded-lg overflow-hidden bg-gradient-to-br from-card via-card/50 to-card/30 backdrop-blur"
        >
          <div className="bg-gradient-to-r from-primary/20 to-accent/10 px-4 py-3 border-b border-border/40">
            <h3 className="text-lg font-bold">
              <span className="mr-2">{stat.icon}</span>
              {stat.label}
            </h3>
          </div>

          <div className="p-4 space-y-3">
            {stat.players.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data available</p>
            ) : (
              stat.players.map((player, playerIdx) => (
                <motion.div
                  key={player.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: playerIdx * 0.05 }}
                  className="flex items-center justify-between p-2 rounded bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{player.name}</p>
                    <p className="text-xs text-muted-foreground">{player.country}</p>
                  </div>
                  <span className="ml-2 font-bold text-accent">{player.value}</span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
