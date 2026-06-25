'use client'

import { motion } from 'framer-motion'
import { GroupStanding, Team } from '@/lib/types'
import { sortTeamsByStanding } from '@/lib/tournament-utils'

interface CompactGroupTableProps {
  group: GroupStanding
  side: 'left' | 'right'
  animDelay?: number
}

function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace('GB', 'GB')
    .split('')
    .map(c => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
}

function qualBadge(rank: number) {
  if (rank === 0) return { label: 'Q', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' }  // 1st – qualified
  if (rank === 1) return { label: 'Q', color: '#60a5fa', bg: 'rgba(96,165,250,0.10)' }  // 2nd – qualified
  return null
}

export function CompactGroupTable({ group, side, animDelay = 0 }: CompactGroupTableProps) {
  const sorted = sortTeamsByStanding(group.teams)

  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -16 : 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: animDelay }}
      className="w-full"
    >
      {/* Group header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1 mb-0.5 rounded-t"
        style={{
          background: 'linear-gradient(90deg, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0.05) 100%)',
          borderBottom: '1px solid rgba(59,130,246,0.3)',
        }}
      >
        <span
          className="text-[10px] font-bold tracking-widest"
          style={{ color: '#93c5fd', letterSpacing: '0.12em' }}
        >
          GROUP {group.group}
        </span>
      </div>

      {/* Column headers */}
      <div
        className="grid gap-0 px-1.5 py-0.5"
        style={{
          gridTemplateColumns: side === 'left' ? '1fr 20px 20px 20px' : '20px 20px 20px 1fr',
          background: 'rgba(15,18,28,0.6)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {side === 'left' ? (
          <>
            <span className="text-[8px] text-slate-500 font-medium uppercase tracking-wider">Team</span>
            <span className="text-[8px] text-slate-500 font-medium text-center">P</span>
            <span className="text-[8px] text-slate-500 font-medium text-center">GD</span>
            <span className="text-[8px] text-slate-500 font-medium text-center">Pts</span>
          </>
        ) : (
          <>
            <span className="text-[8px] text-slate-500 font-medium text-center">Pts</span>
            <span className="text-[8px] text-slate-500 font-medium text-center">GD</span>
            <span className="text-[8px] text-slate-500 font-medium text-center">P</span>
            <span className="text-[8px] text-slate-500 font-medium">Team</span>
          </>
        )}
      </div>

      {/* Team rows */}
      {sorted.map((team, idx) => {
        const badge = qualBadge(idx)
        const isTop2 = idx < 2
        return (
          <div
            key={team.id}
            className="grid items-center gap-0 px-1.5 py-[3px] transition-colors"
            style={{
              gridTemplateColumns: side === 'left' ? '1fr 20px 20px 20px' : '20px 20px 20px 1fr',
              background: isTop2 ? 'rgba(59,130,246,0.04)' : 'transparent',
              borderBottom: idx < sorted.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              borderLeft: side === 'left' && isTop2 ? '2px solid rgba(59,130,246,0.4)' : side === 'left' ? '2px solid transparent' : undefined,
              borderRight: side === 'right' && isTop2 ? '2px solid rgba(59,130,246,0.4)' : side === 'right' ? '2px solid transparent' : undefined,
            }}
          >
            {side === 'left' ? (
              <>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[11px] leading-none flex-shrink-0">{flagEmoji(team.flagCode)}</span>
                  <span
                    className="text-[9px] font-medium truncate"
                    style={{ color: isTop2 ? '#e2e8f0' : '#94a3b8' }}
                  >
                    {team.name.length > 11 ? team.name.slice(0, 10) + '.' : team.name}
                  </span>
                  {badge && (
                    <span
                      className="text-[7px] font-bold px-0.5 rounded flex-shrink-0"
                      style={{ color: badge.color, background: badge.bg }}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-center" style={{ color: '#64748b' }}>{team.played}</span>
                <span
                  className="text-[9px] text-center font-medium"
                  style={{ color: team.goalDifference > 0 ? '#86efac' : team.goalDifference < 0 ? '#fca5a5' : '#94a3b8' }}
                >
                  {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                </span>
                <span
                  className="text-[9px] text-center font-bold"
                  style={{ color: isTop2 ? '#93c5fd' : '#64748b' }}
                >
                  {team.points}
                </span>
              </>
            ) : (
              <>
                <span
                  className="text-[9px] text-center font-bold"
                  style={{ color: isTop2 ? '#93c5fd' : '#64748b' }}
                >
                  {team.points}
                </span>
                <span
                  className="text-[9px] text-center font-medium"
                  style={{ color: team.goalDifference > 0 ? '#86efac' : team.goalDifference < 0 ? '#fca5a5' : '#94a3b8' }}
                >
                  {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                </span>
                <span className="text-[9px] text-center" style={{ color: '#64748b' }}>{team.played}</span>
                <div className="flex items-center gap-1 min-w-0 justify-end">
                  {badge && (
                    <span
                      className="text-[7px] font-bold px-0.5 rounded flex-shrink-0"
                      style={{ color: badge.color, background: badge.bg }}
                    >
                      {badge.label}
                    </span>
                  )}
                  <span
                    className="text-[9px] font-medium truncate"
                    style={{ color: isTop2 ? '#e2e8f0' : '#94a3b8' }}
                  >
                    {team.name.length > 11 ? team.name.slice(0, 10) + '.' : team.name}
                  </span>
                  <span className="text-[11px] leading-none flex-shrink-0">{flagEmoji(team.flagCode)}</span>
                </div>
              </>
            )}
          </div>
        )
      })}
    </motion.div>
  )
}
