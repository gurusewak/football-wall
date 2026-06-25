'use client'

import { motion } from 'framer-motion'
import { GroupStanding } from '@/lib/types'
import { sortTeamsByStanding } from '@/lib/tournament-utils'

interface CompactGroupTableProps {
  group: GroupStanding
  side: 'left' | 'right'
  animDelay?: number
}

function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
}

export function CompactGroupTable({ group, side, animDelay = 0 }: CompactGroupTableProps) {
  const sorted = sortTeamsByStanding(group.teams)

  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -14 : 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: animDelay }}
      className="w-full overflow-hidden rounded"
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header */}
      <div
        className="flex items-center px-2 py-[5px]"
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <span className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: '#c8c8c8' }}>
          GROUP {group.group}
        </span>
      </div>

      {/* Column headers */}
      <div
        className="grid px-1.5 py-[3px]"
        style={{
          gridTemplateColumns: side === 'left' ? '1fr 18px 22px 22px' : '22px 22px 18px 1fr',
          background: 'rgba(0,0,0,0.3)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {side === 'left' ? (
          <>
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#777' }}>Team</span>
            <span className="text-[10px] font-medium text-center" style={{ color: '#777' }}>P</span>
            <span className="text-[10px] font-medium text-center" style={{ color: '#777' }}>GD</span>
            <span className="text-[10px] font-medium text-center" style={{ color: '#777' }}>Pts</span>
          </>
        ) : (
          <>
            <span className="text-[10px] font-medium text-center" style={{ color: '#777' }}>Pts</span>
            <span className="text-[10px] font-medium text-center" style={{ color: '#777' }}>GD</span>
            <span className="text-[10px] font-medium text-center" style={{ color: '#777' }}>P</span>
            <span className="text-[10px] font-medium text-right" style={{ color: '#777' }}>Team</span>
          </>
        )}
      </div>

      {/* Team rows */}
      {sorted.map((team, idx) => {
        // qualified: true = confirmed in, false = confirmed out, undefined = use position heuristic
        const isQ = team.qualified === true || (team.qualified === undefined && idx < 2)
        // 3rd-place contender in 48-team format (position 3, not confirmed eliminated)
        const is3rdContender = idx === 2 && team.qualified !== true && team.qualified !== false && sorted.length === 4
        const textColor = isQ ? '#e8e8e8' : is3rdContender ? '#999' : '#666'
        const ptsColor = isQ ? '#f0f0f0' : is3rdContender ? '#777' : '#505050'
        const gdColor = team.goalDifference > 0 ? '#7ecf9e' : team.goalDifference < 0 ? '#cf7e7e' : '#666'
        const borderColor = isQ ? 'rgba(255,255,255,0.25)' : is3rdContender ? 'rgba(255,255,255,0.1)' : 'transparent'

        return (
          <div
            key={team.id}
            className="grid items-center px-1.5 py-[4px]"
            style={{
              gridTemplateColumns: side === 'left' ? '1fr 18px 22px 22px' : '22px 22px 18px 1fr',
              background: isQ ? 'rgba(255,255,255,0.03)' : 'transparent',
              borderBottom: idx < sorted.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              borderLeft: side === 'left' ? `2px solid ${borderColor}` : undefined,
              borderRight: side === 'right' ? `2px solid ${borderColor}` : undefined,
            }}
          >
            {side === 'left' ? (
              <>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[12px] leading-none flex-shrink-0">{flagEmoji(team.flagCode)}</span>
                  <span className="text-[11px] font-medium truncate" style={{ color: textColor }}>
                    {team.name.length > 10 ? team.name.slice(0, 9) + '.' : team.name}
                  </span>
                </div>
                <span className="text-[11px] text-center" style={{ color: '#777' }}>{team.played}</span>
                <span className="text-[11px] text-center font-medium" style={{ color: gdColor }}>
                  {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                </span>
                <span className="text-[11px] text-center font-bold" style={{ color: ptsColor }}>{team.points}</span>
              </>
            ) : (
              <>
                <span className="text-[11px] text-center font-bold" style={{ color: ptsColor }}>{team.points}</span>
                <span className="text-[11px] text-center font-medium" style={{ color: gdColor }}>
                  {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                </span>
                <span className="text-[11px] text-center" style={{ color: '#777' }}>{team.played}</span>
                <div className="flex items-center gap-1 min-w-0 justify-end">
                  <span className="text-[11px] font-medium truncate text-right" style={{ color: textColor }}>
                    {team.name.length > 10 ? team.name.slice(0, 9) + '.' : team.name}
                  </span>
                  <span className="text-[12px] leading-none flex-shrink-0">{flagEmoji(team.flagCode)}</span>
                </div>
              </>
            )}
          </div>
        )
      })}
    </motion.div>
  )
}
