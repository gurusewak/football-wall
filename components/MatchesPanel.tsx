'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Tournament, Match } from '@/lib/types'
import { teamFlagCode, flagEmoji } from '@/lib/flagUtils'

interface Props {
  tournament: Tournament
  onMatchClick: (id: string) => void
}

const STAGE_LABELS: Record<string, string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-final',
  sf: 'Semi-final',
  '3p': 'Third-place Play-off',
  final: 'Final',
}

// A slot holds a real nation only when it isn't a placeholder label
// ("Winner Group I", "Runner-up Group K", "Third-place Group A/B/C/D/F",
// "Winner Match 74", "TBD", "1A"/"2B"…). Same rule the bracket resolver uses.
function isRealTeam(s: string | undefined | null): boolean {
  return !!s && !/^(winner|runner-?up|third-?place|loser|tbd)\b/i.test(s) && !/^[123][A-L]+$/.test(s)
}

function isKnown(m: Match): boolean {
  return isRealTeam(m.homeTeam) && isRealTeam(m.awayTeam)
}

function stageLabel(m: Match): string {
  if (m.stage === 'group') return m.group ? `Group ${m.group}` : 'Group Stage'
  return STAGE_LABELS[m.stage] ?? m.stage.toUpperCase()
}

function cleanCity(city: string): string {
  return city.replace(/\s*\([^)]*\)/g, '').trim()
}

function fmtDateTime(iso: string): { day: string; time: string } {
  if (!iso) return { day: 'TBD', time: '' }
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { day: 'TBD', time: '' }
  return {
    day: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  }
}

function ts(m: Match): number {
  const t = m.date ? Date.parse(m.date) : NaN
  return isNaN(t) ? 0 : t
}

function winner(m: Match): { home: boolean; away: boolean } {
  const none = { home: false, away: false }
  if (m.status !== 'completed' || m.homeScore == null || m.awayScore == null) return none
  if (m.wentToPenaltyShootout && m.homePenaltyScore != null && m.awayPenaltyScore != null) {
    return m.homePenaltyScore > m.awayPenaltyScore ? { home: true, away: false } : { home: false, away: true }
  }
  if (m.homeScore === m.awayScore) return none
  return m.homeScore > m.awayScore ? { home: true, away: false } : { home: false, away: true }
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function LiveDot() {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
      style={{ background: '#e0564f', boxShadow: '0 0 6px #e0564f' }}
    />
  )
}

function SectionHeader({ label, count, live }: { label: string; count: number; live?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      {live && <LiveDot />}
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: live ? '#e06b6b' : '#9a9a9a' }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: '#5a5a5a' }}>{count}</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

function TeamLine({ name, score, win, show }: { name: string; score: number | null; win: boolean; show: boolean }) {
  const real = isRealTeam(name)
  return (
    <div className="flex items-center justify-between py-[3px]">
      <div className="flex items-center gap-2.5 min-w-0">
        <span style={{ fontSize: 17, lineHeight: 1, width: 22, textAlign: 'center', flexShrink: 0 }}>
          {flagEmoji(teamFlagCode(name))}
        </span>
        <span
          className="truncate"
          style={{
            fontSize: 14,
            color: real ? (win ? '#ffffff' : '#cfcfcf') : '#7a7a7a',
            fontWeight: win ? 700 : 500,
            fontStyle: real ? 'normal' : 'italic',
          }}
        >
          {name}
        </span>
      </div>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: win ? '#ffffff' : '#bdbdbd',
          fontVariantNumeric: 'tabular-nums',
          minWidth: 16,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {show && score != null ? score : ''}
      </span>
    </div>
  )
}

function MatchRow({ m, index, onClick }: { m: Match; index: number; onClick: () => void }) {
  const { day, time } = fmtDateTime(m.date)
  const w = winner(m)
  const isLive = m.status === 'live'
  const isDone = m.status === 'completed'
  const city = cleanCity(m.city || '')
  const extra = isDone
    ? (m.wentToPenaltyShootout && m.homePenaltyScore != null && m.awayPenaltyScore != null
        ? `Pens ${m.homePenaltyScore}–${m.awayPenaltyScore}`
        : m.wentToExtraTime ? 'AET' : '')
    : ''

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.015, 0.3) }}
      onClick={onClick}
      className="w-full text-left rounded-lg px-3 sm:px-4 py-2.5 border border-white/[0.07] bg-white/[0.035] hover:bg-white/[0.07] transition-colors"
    >
      {/* Meta line — stage left, date/time (or LIVE) right */}
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7a7a' }}>
          {stageLabel(m)}
        </span>
        <span style={{ fontSize: 11, color: isLive ? '#e06b6b' : '#8a8a8a', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          {isLive && <LiveDot />}
          {isLive ? 'LIVE' : `${day}${time ? ` · ${time}` : ''}`}
        </span>
      </div>

      <TeamLine name={m.homeTeam} score={m.homeScore} win={w.home} show={isDone || isLive} />
      <TeamLine name={m.awayTeam} score={m.awayScore} win={w.away} show={isDone || isLive} />

      {(city || extra) && (
        <div className="flex items-center justify-between mt-1.5 gap-2">
          <span className="truncate" style={{ fontSize: 10.5, color: '#5f5f5f' }}>{city}</span>
          {extra && <span style={{ fontSize: 10, color: '#6f6f6f', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{extra}</span>}
        </div>
      )}
    </motion.button>
  )
}

// ─── Main panel ─────────────────────────────────────────────────────────────
export function MatchesPanel({ tournament, onMatchClick }: Props) {
  const sections = useMemo(() => {
    const all: Match[] = [
      ...(tournament.matches ?? []),
      ...tournament.knockoutBracket.flatMap(b => b.matches),
    ]
    const asc = (a: Match, b: Match) => ts(a) - ts(b)
    const desc = (a: Match, b: Match) => ts(b) - ts(a)

    const live = all.filter(m => m.status === 'live').sort(asc)
    const upcoming = all.filter(m => m.status !== 'completed' && m.status !== 'live')
    const known = upcoming.filter(isKnown).sort(asc)        // §1 — real matchups, soonest first
    const unknown = upcoming.filter(m => !isKnown(m)).sort(asc) // §2 — W85-vs-W86 placeholders
    const past = all.filter(m => m.status === 'completed').sort(desc) // §3 — most recent first

    return [
      { key: 'live', label: 'Live Now', matches: live },
      { key: 'upcoming', label: 'Upcoming', matches: known },
      { key: 'tbd', label: 'Yet to be Decided', matches: unknown },
      { key: 'completed', label: 'Completed', matches: past },
    ].filter(s => s.matches.length > 0)
  }, [tournament])

  if (!sections.length) {
    return (
      <div className="text-center py-16" style={{ color: '#666', fontSize: 13, letterSpacing: '0.06em' }}>
        No matches available.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      {sections.map(section => (
        <div key={section.key}>
          <SectionHeader label={section.label} count={section.matches.length} live={section.key === 'live'} />
          <div className="flex flex-col gap-2">
            {section.matches.map((m, i) => (
              <MatchRow key={m.id} m={m} index={i} onClick={() => onMatchClick(m.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
