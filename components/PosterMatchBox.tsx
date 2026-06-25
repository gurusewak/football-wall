'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Match } from '@/lib/types'

interface PosterMatchBoxProps {
  match: Match | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  popoverSide?: 'left' | 'right' | 'top'
}

function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
}

function teamFlagCode(teamName: string): string {
  const map: Record<string, string> = {
    Argentina: 'AR', France: 'FR', Poland: 'PL', Mexico: 'MX',
    Spain: 'ES', Germany: 'DE', Japan: 'JP', 'Costa Rica': 'CR',
    Brazil: 'BR', England: 'GB', Serbia: 'RS', Switzerland: 'CH',
    Italy: 'IT', Netherlands: 'NL', Belgium: 'BE', Canada: 'CA',
    Portugal: 'PT', Uruguay: 'UY', 'South Korea': 'KR', Ghana: 'GH',
    Croatia: 'HR', Morocco: 'MA', Denmark: 'DK', Australia: 'AU',
    Senegal: 'SN', Ecuador: 'EC', Qatar: 'QA', Iran: 'IR',
    'Saudi Arabia': 'SA', Tunisia: 'TN', Peru: 'PE', 'New Zealand': 'NZ',
    Colombia: 'CO', Nigeria: 'NG', Chile: 'CL', Turkey: 'TR',
    USA: 'US', Egypt: 'EG', Panama: 'PA', Algeria: 'DZ',
    Austria: 'AT', 'Ivory Coast': 'CI', Bolivia: 'BO', Iraq: 'IQ',
    Jamaica: 'JM', China: 'CN', Greece: 'GR', Indonesia: 'ID',
  }
  return map[teamName] || 'UN'
}

function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function MatchHoverPopover({ match, side }: { match: Match; side: 'left' | 'right' | 'top' }) {
  const isScheduled = match.status === 'scheduled'
  const offsetX = side === 'left' ? 'auto' : side === 'right' ? 'auto' : '-50%'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: side === 'top' ? 6 : 0, x: side === 'left' ? 6 : side === 'right' ? -6 : 0 }}
      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 w-52 rounded-lg overflow-hidden"
      style={{
        ...(side === 'left' ? { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' } : {}),
        ...(side === 'right' ? { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' } : {}),
        ...(side === 'top' ? { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' } : {}),
        background: 'rgba(10, 14, 22, 0.97)',
        border: '1px solid rgba(96, 165, 250, 0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(96,165,250,0.1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Popover header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ background: 'rgba(59,130,246,0.12)', borderBottom: '1px solid rgba(96,165,250,0.15)' }}
      >
        <span className="text-[9px] font-bold tracking-widest" style={{ color: '#93c5fd' }}>
          {match.matchLabel || match.stage.toUpperCase()}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px]" style={{ color: '#64748b' }}>{formatMatchDate(match.date)}</span>
          {match.status === 'live' && (
            <span className="text-[8px] font-bold px-1 rounded" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>LIVE</span>
          )}
        </div>
      </div>

      {/* Venue */}
      <div className="px-3 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[8px] leading-tight" style={{ color: '#475569' }}>{match.venue}</p>
        <p className="text-[9px] font-medium" style={{ color: '#64748b' }}>{match.city}</p>
        {match.attendance && (
          <p className="text-[8px]" style={{ color: '#334155' }}>{match.attendance.toLocaleString()} att.</p>
        )}
      </div>

      {/* Score block */}
      <div className="px-3 py-2.5">
        {/* Home */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{flagEmoji(teamFlagCode(match.homeTeam))}</span>
            <span className="text-[10px] font-semibold" style={{ color: '#e2e8f0' }}>{match.homeTeam}</span>
          </div>
          <span
            className="text-base font-bold tabular-nums"
            style={{ color: !isScheduled && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? '#93c5fd' : '#e2e8f0', minWidth: '16px', textAlign: 'right' }}
          >
            {isScheduled ? '—' : (match.homeScore ?? '?')}
          </span>
        </div>
        {/* Away */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{flagEmoji(teamFlagCode(match.awayTeam))}</span>
            <span className="text-[10px] font-semibold" style={{ color: '#e2e8f0' }}>{match.awayTeam}</span>
          </div>
          <span
            className="text-base font-bold tabular-nums"
            style={{ color: !isScheduled && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? '#93c5fd' : '#e2e8f0', minWidth: '16px', textAlign: 'right' }}
          >
            {isScheduled ? '—' : (match.awayScore ?? '?')}
          </span>
        </div>
      </div>

      {/* Goals */}
      {match.goals && match.goals.length > 0 && (
        <div className="px-3 pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[8px] font-semibold mt-1.5 mb-1" style={{ color: '#475569', letterSpacing: '0.08em' }}>GOALS</p>
          <div className="space-y-0.5 max-h-20 overflow-y-auto">
            {match.goals.map((g, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[8px]" style={{ color: '#60a5fa' }}>⚽</span>
                <span className="text-[9px]" style={{ color: '#94a3b8' }}>
                  {g.player}
                  {g.penalty && <span style={{ color: '#60a5fa' }}> (P)</span>}
                  {g.ownGoal && <span style={{ color: '#f87171' }}> (OG)</span>}
                </span>
                <span className="text-[8px] ml-auto" style={{ color: '#475569' }}>{g.minute}&apos;</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards */}
      {match.cards && match.cards.length > 0 && (
        <div className="px-3 pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[8px] font-semibold mt-1.5 mb-1" style={{ color: '#475569', letterSpacing: '0.08em' }}>CARDS</p>
          <div className="space-y-0.5">
            {match.cards.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[9px]">{c.cardType === 'yellow' ? '🟨' : '🟥'}</span>
                <span className="text-[9px]" style={{ color: '#94a3b8' }}>{c.player}</span>
                <span className="text-[8px] ml-auto" style={{ color: '#475569' }}>{c.minute}&apos;</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isScheduled && (
        <div className="px-3 pb-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[9px] text-center mt-2" style={{ color: '#3b82f6' }}>
            {new Date(match.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' · '}
            {new Date(match.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
    </motion.div>
  )
}

export function PosterMatchBox({ match, size = 'sm', showLabel = true, popoverSide = 'right' }: PosterMatchBoxProps) {
  const [hovered, setHovered] = useState(false)

  const isScheduled = !match || match.status === 'scheduled'
  const isFinal = size === 'lg'
  const isMed = size === 'md'

  const boxH = isFinal ? 72 : isMed ? 60 : 52
  const nameMaxLen = isFinal ? 14 : 11

  const bgBase = 'rgba(12, 15, 24, 0.85)'
  const bgHovered = 'rgba(16, 22, 36, 0.95)'
  const borderBase = 'rgba(30, 40, 60, 0.8)'
  const borderHovered = 'rgba(96, 165, 250, 0.45)'

  if (!match) {
    return (
      <div
        className="rounded flex flex-col overflow-hidden"
        style={{
          width: '100%',
          height: `${boxH}px`,
          background: 'rgba(10, 13, 20, 0.5)',
          border: `1px solid rgba(30, 40, 60, 0.5)`,
        }}
      >
        {showLabel && (
          <div className="px-1.5 py-0.5" style={{ background: 'rgba(15,20,32,0.6)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="text-[8px]" style={{ color: '#334155' }}>TBD</span>
          </div>
        )}
        <div className="flex-1 flex flex-col justify-center gap-1 px-1.5">
          <div className="h-[18px] rounded" style={{ background: 'rgba(30,40,60,0.3)' }} />
          <div className="h-[18px] rounded" style={{ background: 'rgba(30,40,60,0.3)' }} />
        </div>
      </div>
    )
  }

  const homeWin = !isScheduled && (match.homeScore ?? 0) > (match.awayScore ?? 0)
  const awayWin = !isScheduled && (match.awayScore ?? 0) > (match.homeScore ?? 0)

  return (
    <div
      className="relative rounded flex flex-col overflow-hidden match-box-hover cursor-pointer select-none"
      style={{
        width: '100%',
        height: `${boxH}px`,
        background: hovered ? bgHovered : bgBase,
        border: `1px solid ${hovered ? borderHovered : borderBase}`,
        transition: 'background 0.2s, border-color 0.2s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Label bar */}
      {showLabel && match.matchLabel && (
        <div
          className="px-1.5 py-0.5 flex items-center justify-between flex-shrink-0"
          style={{
            background: 'rgba(10,14,24,0.8)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <span className="mono-label" style={{ color: '#3b82f6' }}>{match.matchLabel}</span>
          <div className="flex items-center gap-1">
            {match.status === 'live' && (
              <span className="text-[7px] font-bold" style={{ color: '#f87171' }}>●LIVE</span>
            )}
            <span className="mono-label" style={{ color: '#334155' }}>{formatMatchDate(match.date)}</span>
          </div>
        </div>
      )}

      {/* Teams */}
      <div className="flex-1 flex flex-col justify-evenly px-1.5 py-0.5">
        {/* Home */}
        <div
          className="flex items-center justify-between gap-1 rounded-sm px-1 py-0.5"
          style={{ background: homeWin ? 'rgba(59,130,246,0.1)' : 'transparent' }}
        >
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[11px] leading-none flex-shrink-0">{flagEmoji(teamFlagCode(match.homeTeam))}</span>
            <span
              className="truncate"
              style={{
                fontSize: isFinal ? '10px' : '9px',
                fontWeight: homeWin ? 600 : 400,
                color: homeWin ? '#e2e8f0' : '#94a3b8',
                maxWidth: isFinal ? '88px' : '70px',
              }}
            >
              {match.homeTeam.length > nameMaxLen ? match.homeTeam.slice(0, nameMaxLen - 1) + '.' : match.homeTeam}
            </span>
          </div>
          <span
            className="tabular-nums font-bold flex-shrink-0"
            style={{ fontSize: isFinal ? '13px' : '11px', color: homeWin ? '#93c5fd' : isScheduled ? '#1e293b' : '#64748b' }}
          >
            {isScheduled ? '·' : match.homeScore ?? '?'}
          </span>
        </div>

        {/* Away */}
        <div
          className="flex items-center justify-between gap-1 rounded-sm px-1 py-0.5"
          style={{ background: awayWin ? 'rgba(59,130,246,0.1)' : 'transparent' }}
        >
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[11px] leading-none flex-shrink-0">{flagEmoji(teamFlagCode(match.awayTeam))}</span>
            <span
              className="truncate"
              style={{
                fontSize: isFinal ? '10px' : '9px',
                fontWeight: awayWin ? 600 : 400,
                color: awayWin ? '#e2e8f0' : '#94a3b8',
                maxWidth: isFinal ? '88px' : '70px',
              }}
            >
              {match.awayTeam.length > nameMaxLen ? match.awayTeam.slice(0, nameMaxLen - 1) + '.' : match.awayTeam}
            </span>
          </div>
          <span
            className="tabular-nums font-bold flex-shrink-0"
            style={{ fontSize: isFinal ? '13px' : '11px', color: awayWin ? '#93c5fd' : isScheduled ? '#1e293b' : '#64748b' }}
          >
            {isScheduled ? '·' : match.awayScore ?? '?'}
          </span>
        </div>
      </div>

      {/* City micro-label */}
      {isFinal && (
        <div className="px-1.5 pb-0.5 flex-shrink-0">
          <span className="text-[8px]" style={{ color: '#334155' }}>{match.city}</span>
        </div>
      )}

      {/* Hover glow line */}
      {hovered && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.6), transparent)' }}
        />
      )}

      {/* Popover */}
      <AnimatePresence>
        {hovered && match && (
          <MatchHoverPopover match={match} side={popoverSide} />
        )}
      </AnimatePresence>
    </div>
  )
}
