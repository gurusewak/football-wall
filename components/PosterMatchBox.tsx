'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Match } from '@/lib/types'
import { teamFlagCode } from '@/lib/flagUtils'

interface PosterMatchBoxProps {
  match: Match | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  popoverSide?: 'left' | 'right' | 'top'
}

function flagEmoji(code: string): string {
  if (!code || code === 'UN') return '🏳'
  return code.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
}

function teamFlag(name: string): string {
  return teamFlagCode(name)
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const isTBD = (name: string) => !name || name === 'TBD' || /^[A-L][12]$|Winner|Loser|Runner|Third.?place/i.test(name)

function formatSlotName(name: string): string {
  if (!name || name === 'TBD') return 'TBD'
  // "Winner Match 74" → "W M74"
  const winnerMatch = name.match(/Winner\s+Match\s+(\d+)/i)
  if (winnerMatch) return `W M${winnerMatch[1]}`
  // "Runner-up Group A" → "2nd A"
  const runnerUp = name.match(/Runner.?up\s+Group\s+([A-L])/i)
  if (runnerUp) return `2nd ${runnerUp[1]}`
  // "Winner Group A" → "W Grp A"
  const winnerGroup = name.match(/Winner\s+Group\s+([A-L])/i)
  if (winnerGroup) return `W Grp ${winnerGroup[1]}`
  // "Third-place Group A/B/C/D/F" → "3ABCDF"
  const thirdGroup = name.match(/Third.?place\s+Group\s+([A-L/]+)/i)
  if (thirdGroup) return `3${thirdGroup[1].replace(/\//g, '')}`
  if (/Third.?place/i.test(name)) return '3rd'
  // "Loser Match 74" → "L M74"
  const loserMatch = name.match(/Loser\s+Match\s+(\d+)/i)
  if (loserMatch) return `L M${loserMatch[1]}`
  return name.slice(0, 8)
}

// ─── Popover ─────────────────────────────────────────────────────────────────
function MatchPopover({ match, side }: { match: Match; side: 'left' | 'right' | 'top' }) {
  const scheduled = match.status === 'scheduled'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: side === 'top' ? 6 : 0, x: side === 'left' ? 5 : side === 'right' ? -5 : 0 }}
      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, scale: 0.93 }}
      transition={{ duration: 0.14 }}
      className="absolute z-50 w-56 rounded-lg overflow-hidden pointer-events-none"
      style={{
        ...(side === 'left'  ? { left: 'calc(100% + 10px)', top: '50%', transform: 'translateY(-50%)' } : {}),
        ...(side === 'right' ? { right: 'calc(100% + 10px)', top: '50%', transform: 'translateY(-50%)' } : {}),
        ...(side === 'top'   ? { bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)' } : {}),
        background: 'rgba(10,10,10,0.97)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
        backdropFilter: 'blur(14px)',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="text-[9px] font-bold tracking-widest" style={{ color: '#d0d0d0' }}>
          {match.matchLabel || match.stage.toUpperCase()}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px]" style={{ color: '#555' }}>{fmtDate(match.date)}</span>
          {match.status === 'live' && (
            <span className="text-[7px] font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.18)', color: '#f87171' }}>LIVE</span>
          )}
        </div>
      </div>

      {/* Venue */}
      <div className="px-3 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[8px] leading-tight" style={{ color: '#777' }}>{match.venue}</p>
        <p className="text-[9px] font-medium" style={{ color: '#666' }}>{match.city}</p>
        {match.attendance && (
          <p className="text-[8px] mt-0.5" style={{ color: '#666' }}>{match.attendance.toLocaleString()} att.</p>
        )}
      </div>

      {/* Score block */}
      <div className="px-3 py-2.5 space-y-2">
        {[
          { team: match.homeTeam, score: match.homeScore, win: !scheduled && (match.homeScore ?? 0) > (match.awayScore ?? 0) },
          { team: match.awayTeam, score: match.awayScore, win: !scheduled && (match.awayScore ?? 0) > (match.homeScore ?? 0) },
        ].map(({ team, score, win }, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{isTBD(team) ? '🏳' : flagEmoji(teamFlag(team))}</span>
              <span className="text-[10px] font-semibold" style={{ color: win ? '#f0f0f0' : '#a0a0a0' }}>{team}</span>
            </div>
            <span className="text-base font-bold tabular-nums" style={{ color: win ? '#ffffff' : '#686868', minWidth: '16px', textAlign: 'right' }}>
              {scheduled ? '—' : (score ?? '?')}
            </span>
          </div>
        ))}
      </div>

      {/* Goals */}
      {match.goals && match.goals.length > 0 && (
        <div className="px-3 pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[7.5px] font-bold mt-1.5 mb-1 tracking-widest uppercase" style={{ color: '#777' }}>Goals</p>
          <div className="space-y-0.5 max-h-20 overflow-y-auto">
            {match.goals.map((g, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-[8px]" style={{ color: '#888' }}>⚽</span>
                <span className="text-[8.5px]" style={{ color: '#888' }}>
                  {g.player}{g.penalty && <span style={{ color: '#aaa' }}> (P)</span>}{g.ownGoal && <span style={{ color: '#c87878' }}> (OG)</span>}
                </span>
                <span className="text-[8px] ml-auto" style={{ color: '#777' }}>{g.minute}&apos;</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards */}
      {match.cards && match.cards.length > 0 && (
        <div className="px-3 pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[7.5px] font-bold mt-1.5 mb-1 tracking-widest uppercase" style={{ color: '#777' }}>Cards</p>
          {match.cards.map((c, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-[9px]">{c.cardType === 'yellow' ? '🟨' : '🟥'}</span>
              <span className="text-[8.5px]" style={{ color: '#777' }}>{c.player}</span>
              <span className="text-[8px] ml-auto" style={{ color: '#777' }}>{c.minute}&apos;</span>
            </div>
          ))}
        </div>
      )}

      {/* Scheduled date/time */}
      {scheduled && (
        <div className="px-3 pb-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[9px] text-center mt-2" style={{ color: '#888' }}>{fmtDateTime(match.date)}</p>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PosterMatchBox({ match, size = 'sm', showLabel = true, popoverSide = 'right' }: PosterMatchBoxProps) {
  const [hovered, setHovered] = useState(false)

  const boxH = size === 'lg' ? 72 : size === 'md' ? 64 : 56
  const nameFontSize = size === 'lg' ? '13px' : '12px'
  const nameMaxW = size === 'lg' ? '108px' : '94px'
  const scoreFontSize = size === 'lg' ? '15px' : '13px'
  const nameMaxLen = size === 'lg' ? 14 : 12

  // Null match — skeleton placeholder
  if (!match) {
    return (
      <div
        className="rounded flex flex-col overflow-hidden"
        style={{ width: '100%', height: `${boxH}px`, background: 'rgba(12,12,12,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {showLabel && (
          <div className="px-2 py-0.5 flex-shrink-0" style={{ background: 'rgba(20,20,20,0.6)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="text-[8px]" style={{ color: '#606060' }}>TBD</span>
          </div>
        )}
        <div className="flex-1 flex flex-col justify-center gap-1.5 px-2">
          <div className="h-[16px] rounded-sm" style={{ background: 'rgba(255,255,255,0.04)' }} />
          <div className="h-[16px] rounded-sm" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
      </div>
    )
  }

  const scheduled = match.status === 'scheduled'
  const homeTBD = isTBD(match.homeTeam)
  const awayTBD = isTBD(match.awayTeam)
  const homeWin = !scheduled && !homeTBD && (match.homeScore ?? 0) > (match.awayScore ?? 0)
  const awayWin = !scheduled && !awayTBD && (match.awayScore ?? 0) > (match.homeScore ?? 0)

  const borderColor = hovered ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.09)'
  const bgColor = hovered ? 'rgba(22,22,22,0.97)' : 'rgba(13,13,13,0.88)'

  return (
    <div
      className="relative rounded flex flex-col overflow-hidden match-box-hover cursor-pointer select-none"
      style={{ width: '100%', height: `${boxH}px`, background: bgColor, border: `1px solid ${borderColor}`, transition: 'background 0.18s, border-color 0.18s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Label bar */}
      {showLabel && match.matchLabel && (
        <div
          className="px-1.5 py-[3px] flex items-center justify-between flex-shrink-0"
          style={{ background: 'rgba(8,8,8,0.7)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="mono-label" style={{ color: '#909090' }}>{match.matchLabel}</span>
          <div className="flex items-center gap-1.5">
            {match.status === 'live' && <span className="text-[7px] font-bold" style={{ color: '#f87171' }}>●LIVE</span>}
          </div>
        </div>
      )}

      {/* Teams */}
      <div className="flex-1 flex flex-col justify-evenly px-1.5 py-[3px]">
        {/* Home */}
        <div
          className="flex items-center justify-between gap-1 rounded-sm px-1 py-[2px]"
          style={{ background: homeWin ? 'rgba(255,255,255,0.07)' : 'transparent' }}
        >
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[10px] leading-none flex-shrink-0">
              {homeTBD ? '🏳' : flagEmoji(teamFlag(match.homeTeam))}
            </span>
            <span
              className="truncate"
              style={{ fontSize: nameFontSize, fontWeight: homeWin ? 600 : 400, color: homeWin ? '#efefef' : homeTBD ? '#777' : '#888', maxWidth: nameMaxW }}
            >
              {homeTBD ? formatSlotName(match.homeTeam) : match.homeTeam.length > nameMaxLen ? match.homeTeam.slice(0, nameMaxLen - 1) + '.' : match.homeTeam}
            </span>
          </div>
          <span
            className="tabular-nums font-bold flex-shrink-0"
            style={{ fontSize: scoreFontSize, color: homeWin ? '#f5f5f5' : scheduled || homeTBD ? '#505050' : '#888' }}
          >
            {scheduled || homeTBD || match.homeScore === null ? '·' : match.homeScore}
          </span>
        </div>

        {/* Away */}
        <div
          className="flex items-center justify-between gap-1 rounded-sm px-1 py-[2px]"
          style={{ background: awayWin ? 'rgba(255,255,255,0.07)' : 'transparent' }}
        >
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[10px] leading-none flex-shrink-0">
              {awayTBD ? '🏳' : flagEmoji(teamFlag(match.awayTeam))}
            </span>
            <span
              className="truncate"
              style={{ fontSize: nameFontSize, fontWeight: awayWin ? 600 : 400, color: awayWin ? '#efefef' : awayTBD ? '#777' : '#888', maxWidth: nameMaxW }}
            >
              {awayTBD ? formatSlotName(match.awayTeam) : match.awayTeam.length > nameMaxLen ? match.awayTeam.slice(0, nameMaxLen - 1) + '.' : match.awayTeam}
            </span>
          </div>
          <span
            className="tabular-nums font-bold flex-shrink-0"
            style={{ fontSize: scoreFontSize, color: awayWin ? '#f5f5f5' : scheduled || awayTBD ? '#505050' : '#888' }}
          >
            {scheduled || awayTBD || match.awayScore === null ? '·' : match.awayScore}
          </span>
        </div>
      </div>

      {/* Hover shimmer line */}
      {hovered && (
        <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }} />
      )}

      {/* Popover */}
      <AnimatePresence>
        {hovered && (
          <MatchPopover match={match} side={popoverSide} />
        )}
      </AnimatePresence>
    </div>
  )
}
