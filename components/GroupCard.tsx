'use client'

import { GroupStanding } from '@/lib/types'
import { getGroupStandings } from '@/lib/tournament-utils'
import { TeamRow } from './TeamRow'
import { motion } from 'framer-motion'

interface GroupCardProps {
  group: GroupStanding
  index?: number
}

export function GroupCard({ group, index = 0 }: GroupCardProps) {
  const standings = getGroupStandings(group)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="border border-border/40 rounded-lg overflow-hidden bg-gradient-to-br from-card via-card/50 to-card/30 backdrop-blur"
    >
      <div className="bg-gradient-to-r from-primary/20 to-accent/10 px-4 py-3 border-b border-border/40">
        <h3 className="text-lg font-bold text-accent">Group {group.group}</h3>
      </div>

      <div className="p-3 space-y-2">
        {/* Header row */}
        <div className="text-xs text-muted-foreground px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <span className="w-6 text-center">#</span>
            <span>Team</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex gap-1 min-w-[60px]">
              <span className="w-5 text-center">W</span>
              <span className="w-5 text-center">D</span>
              <span className="w-5 text-center">L</span>
            </span>
            <span className="min-w-[40px] text-center">GF-GA</span>
            <span className="min-w-[30px] text-right">PTS</span>
          </div>
        </div>

        {/* Teams */}
        <div className="space-y-1">
          {standings.map((team, idx) => (
            <TeamRow key={team.id} team={team} rank={idx + 1} />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
