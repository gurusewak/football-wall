'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tournament, GroupStanding, Match, Team } from '@/lib/types'
import { flagEmoji, teamFlagEmoji } from '@/lib/flagUtils'

// ── Helpers ────────────────────────────────────────────────────────────────────

function getFlag(flagCode: string): string {
  return flagEmoji(flagCode)
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  } catch {
    return dateStr
  }
}

// ── Column header row ──────────────────────────────────────────────────────────

function StandingsHeader({ compact = false }: { compact?: boolean }) {
  const headerColor = '#777'
  const fontSize = compact ? '10px' : '11px'
  return (
    <div
      className="flex items-center justify-between px-3 py-1"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <span style={{ fontSize, color: headerColor, flex: 1 }}>&nbsp;</span>
      <div className="flex items-center" style={{ gap: compact ? '8px' : '10px' }}>
        {['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'PTS'].map(col => (
          <span
            key={col}
            className="tabular-nums text-right"
            style={{
              fontSize,
              color: headerColor,
              width: col === 'PTS' ? '22px' : col === 'GD' ? '22px' : col === 'GF' || col === 'GA' ? '18px' : '14px',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            {col}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Single team row ────────────────────────────────────────────────────────────

function TeamRow({
  team,
  index,
  total,
  compact = false,
}: {
  team: Team
  index: number
  total: number
  compact?: boolean
}) {
  // qualified: true = confirmed in, false = confirmed out, undefined = use position
  const isQ = team.qualified === true || (team.qualified === undefined && index < 2)
  const is3rdContender = index === 2 && team.qualified !== true && team.qualified !== false && total === 4
  const flag = getFlag(team.flagCode)
  const fontSize = compact ? '12px' : '13px'
  const borderColor = isQ ? 'rgba(255,255,255,0.2)' : is3rdContender ? 'rgba(255,255,255,0.09)' : 'transparent'
  const nameColor = isQ ? '#e0e0e0' : is3rdContender ? '#999' : '#777'

  return (
    <div
      className="flex items-center justify-between px-3"
      style={{
        paddingTop: compact ? '5px' : '7px',
        paddingBottom: compact ? '5px' : '7px',
        background: isQ ? 'rgba(255,255,255,0.025)' : 'transparent',
        borderBottom: index < total - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
        borderLeft: `2px solid ${borderColor}`,
      }}
    >
      {/* Team name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span style={{ fontSize: compact ? '13px' : '14px' }}>{flag}</span>
        <span className="truncate" style={{ fontSize, color: nameColor }}>
          {team.name}
        </span>
        {is3rdContender && (
          <span style={{ fontSize: '9px', color: '#555', letterSpacing: '0.06em', flexShrink: 0 }}>3RD</span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center" style={{ gap: compact ? '8px' : '10px' }}>
        {/* P */}
        <span className="tabular-nums text-right" style={{ fontSize: '12px', color: '#777', width: '14px' }}>
          {team.played}
        </span>
        {/* W */}
        <span className="tabular-nums text-right" style={{ fontSize: '12px', color: '#777', width: '14px' }}>
          {team.wins}
        </span>
        {/* D */}
        <span className="tabular-nums text-right" style={{ fontSize: '12px', color: '#777', width: '14px' }}>
          {team.draws}
        </span>
        {/* L */}
        <span className="tabular-nums text-right" style={{ fontSize: '12px', color: '#777', width: '14px' }}>
          {team.losses}
        </span>
        {/* GF */}
        <span className="tabular-nums text-right" style={{ fontSize: '12px', color: '#777', width: '18px' }}>
          {team.goalsFor}
        </span>
        {/* GA */}
        <span className="tabular-nums text-right" style={{ fontSize: '12px', color: '#777', width: '18px' }}>
          {team.goalsAgainst}
        </span>
        {/* GD */}
        <span
          className="tabular-nums text-right"
          style={{
            fontSize: '12px',
            width: '22px',
            color:
              team.goalDifference > 0
                ? '#7ecf9e'
                : team.goalDifference < 0
                ? '#cf7e7e'
                : '#555',
          }}
        >
          {team.goalDifference > 0 ? '+' : ''}
          {team.goalDifference}
        </span>
        {/* PTS */}
        <span
          className="tabular-nums text-right font-bold"
          style={{
            fontSize,
            width: '22px',
            color: isQ ? '#e8e8e8' : '#505050',
          }}
        >
          {team.points}
        </span>
      </div>
    </div>
  )
}

// ── Match row ─────────────────────────────────────────────────────────────────

function MatchRow({ match, onMatchClick }: { match: Match; onMatchClick?: (id: string) => void }) {
  const homeFlag = teamFlagEmoji(match.homeTeam)
  const awayFlag = teamFlagEmoji(match.awayTeam)
  const isPlayed = match.status === 'completed' || (match.homeScore !== null && match.awayScore !== null)
  const isLive = match.status === 'live'
  // Support both old format (g.player) and new API format (g.scorerPlayerName)
  const allScorers = match.goals?.filter(g => g.player || (g as any).scorerPlayerName) ?? []
  const hasET = match.wentToExtraTime
  const hasPKS = match.wentToPenaltyShootout
  const homeWin = isPlayed && (match.homeScore ?? 0) > (match.awayScore ?? 0)
  const awayWin = isPlayed && (match.awayScore ?? 0) > (match.homeScore ?? 0)

  return (
    <div
      className="px-4 py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: (isPlayed || onMatchClick) ? 'pointer' : 'default' }}
      onClick={() => onMatchClick && onMatchClick(match.id)}
    >
      {/* Top row: date + label + venue + badges */}
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: '11px', color: '#555' }}>
          {match.matchLabel && <span style={{ color: '#666', marginRight: '6px' }}>{match.matchLabel}</span>}
          {formatDate(match.date)}
          {match.city && <span style={{ color: '#505050', marginLeft: '6px' }}>{match.city.replace(/\s*\([^)]*\)/g, '')}</span>}
        </span>
        {hasET && (
          <span className="px-1.5 py-0.5 rounded" style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(255,255,255,0.07)', color: '#666', letterSpacing: '0.05em' }}>ET</span>
        )}
        {hasPKS && (
          <span className="px-1.5 py-0.5 rounded" style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(255,255,255,0.07)', color: '#888', letterSpacing: '0.05em' }}>PKS</span>
        )}
        {isLive && (
          <span className="px-1.5 py-0.5 rounded" style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#f87171', letterSpacing: '0.05em' }}>LIVE</span>
        )}
      </div>

      {/* Main row: home flag+name — score — away flag+name */}
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex items-center gap-2 justify-end flex-1 min-w-0">
          <span className="truncate text-right" style={{ fontSize: '14px', fontWeight: homeWin ? 600 : 400, color: homeWin ? '#e8e8e8' : '#888' }}>
            {match.homeTeam}
          </span>
          <span style={{ fontSize: '15px', flexShrink: 0 }}>{homeFlag}</span>
        </div>

        {/* Score / vs */}
        <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '60px' }}>
          {isPlayed ? (
            <>
              <span className="tabular-nums font-bold" style={{ fontSize: '15px', color: '#d0d0d0', letterSpacing: '0.02em' }}>
                {match.homeScore} – {match.awayScore}
              </span>
              {hasPKS && match.homePenaltyScore !== null && match.awayPenaltyScore !== null && (
                <span className="tabular-nums" style={{ fontSize: '11px', color: '#555', marginTop: '1px' }}>
                  ({match.homePenaltyScore}–{match.awayPenaltyScore} pens)
                </span>
              )}
            </>
          ) : (
            <span style={{ fontSize: '12px', color: '#555', letterSpacing: '0.08em' }}>vs</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span style={{ fontSize: '15px', flexShrink: 0 }}>{awayFlag}</span>
          <span className="truncate" style={{ fontSize: '14px', fontWeight: awayWin ? 600 : 400, color: awayWin ? '#e8e8e8' : '#888' }}>
            {match.awayTeam}
          </span>
        </div>
      </div>

      {/* Side-by-side match events: home left | minute | away right */}
      {(allScorers.length > 0 || (match.cards && match.cards.length > 0)) && (() => {
        type Ev = { minute: number; minuteExtra?: number | null; icon: string; player: string; detail?: string; isHome: boolean }
        const events: Ev[] = []
        for (const g of allScorers) {
          const raw = g as any
          const scorer = raw.scorerPlayerName ?? g.player ?? ''
          const assist = raw.assistPlayerName ?? null
          const isPen = raw.isPenalty ?? g.penalty
          const isOG = raw.isOwnGoal ?? g.ownGoal
          const scoringTeam = raw.scoringTeam ?? raw.team ?? ''
          const scoringTeamId = raw.scoringTeamId ?? raw.teamId ?? ''
          const isHome = scoringTeamId
            ? scoringTeamId === (match as any).homeTeamId
            : scoringTeam === match.homeTeam
          const detail = [isPen ? '(pen)' : null, isOG ? '(og)' : null, assist ? `↳ ${assist}` : null].filter(Boolean).join(' ')
          events.push({ minute: raw.minute ?? g.minute ?? 0, minuteExtra: raw.minuteExtra ?? null, icon: '⚽', player: scorer, detail: detail || undefined, isHome })
        }
        for (const c of match.cards ?? []) {
          const raw = c as any
          const cardTeam = raw.team ?? ''
          const cardTeamId = raw.teamId ?? ''
          const isHome = cardTeamId
            ? cardTeamId === (match as any).homeTeamId
            : cardTeam === match.homeTeam
          events.push({ minute: c.minute ?? 0, minuteExtra: raw.minuteExtra ?? null, icon: c.cardType === 'yellow' ? '🟨' : '🟥', player: raw.playerName ?? c.player ?? '', isHome })
        }
        events.sort((a, b) => a.minute - b.minute)
        return (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {events.map((ev, i) => {
              const minStr = `${ev.minute}${ev.minuteExtra ? '+' + ev.minuteExtra : ''}'`
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 36px 1fr', alignItems: 'start', padding: '3px 0' }}>
                  {/* Home side */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 6 }}>
                    {ev.isHome && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11 }}>{ev.icon}</span>
                          <span style={{ fontSize: 11, color: '#c0c0c0' }}>{ev.player}</span>
                        </div>
                        {ev.detail && <span style={{ fontSize: 10, color: '#555' }}>{ev.detail}</span>}
                      </>
                    )}
                  </div>
                  {/* Minute */}
                  <div style={{ textAlign: 'center', fontSize: 10, color: '#505050', fontVariantNumeric: 'tabular-nums', paddingTop: 1 }}>{minStr}</div>
                  {/* Away side */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingLeft: 6 }}>
                    {!ev.isHome && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11 }}>{ev.icon}</span>
                          <span style={{ fontSize: 11, color: '#c0c0c0' }}>{ev.player}</span>
                        </div>
                        {ev.detail && <span style={{ fontSize: 10, color: '#555' }}>{ev.detail}</span>}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}

// ── Group detail view ─────────────────────────────────────────────────────────

function GroupDetail({
  group,
  matches,
  onBack,
  onMatchClick,
}: {
  group: GroupStanding
  matches: Match[]
  onBack: () => void
  onMatchClick?: (id: string) => void
}) {
  const groupMatches = matches.filter(
    m => m.group === group.group || m.stage === 'group'
      ? m.group === group.group
      : false
  )

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-5 px-1 py-2"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#777',
          fontSize: '14px',
          letterSpacing: '0.04em',
        }}
      >
        <span style={{ fontSize: '14px' }}>←</span>
        <span>Group {group.group}</span>
      </button>

      {/* Standings card */}
      <div
        className="rounded overflow-hidden mb-4"
        style={{
          background: 'rgba(7,7,7,0.82)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="px-3 py-2.5"
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <span
            className="font-bold tracking-widest uppercase"
            style={{ fontSize: '12px', color: '#c0c0c0' }}
          >
            Group {group.group} — Standings
          </span>
        </div>
        <StandingsHeader />
        {group.teams.map((team, ti) => (
          <TeamRow
            key={team.id}
            team={team}
            index={ti}
            total={group.teams.length}
          />
        ))}
      </div>

      {/* Matches card */}
      <div
        className="rounded overflow-hidden"
        style={{
          background: 'rgba(7,7,7,0.82)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="px-3 py-2.5"
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <span
            className="font-bold tracking-widest uppercase"
            style={{ fontSize: '12px', color: '#c0c0c0' }}
          >
            Matches
          </span>
        </div>

        {groupMatches.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <span style={{ fontSize: '12px', color: '#666' }}>Match data coming soon</span>
          </div>
        ) : (
          groupMatches.map(match => (
            <MatchRow key={match.id} match={match} onMatchClick={onMatchClick} />
          ))
        )}
      </div>
    </motion.div>
  )
}

// ── Groups grid (compact card per group) ──────────────────────────────────────

function GroupCard({
  group,
  onClick,
  animDelay,
}: {
  group: GroupStanding
  onClick: () => void
  animDelay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: animDelay }}
      onClick={onClick}
      className="overflow-hidden rounded cursor-pointer"
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        minWidth: '220px',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      whileHover={{ borderColor: 'rgba(255,255,255,0.18)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 flex items-center justify-between"
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <span
          className="font-bold tracking-widest uppercase"
          style={{ fontSize: '12px', color: '#c0c0c0' }}
        >
          Group {group.group}
        </span>
        <span style={{ fontSize: '10px', color: '#777', letterSpacing: '0.06em' }}>↗</span>
      </div>

      {/* Column headers (compact) */}
      <div
        className="flex items-center justify-between px-3 py-1"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span style={{ fontSize: '10px', color: '#606060', flex: 1 }}>&nbsp;</span>
        <div className="flex items-center gap-2">
          {['P', 'GD', 'PTS'].map(col => (
            <span
              key={col}
              className="tabular-nums text-right"
              style={{
                fontSize: '10px',
                color: '#666',
                width: col === 'PTS' ? '20px' : col === 'GD' ? '20px' : '14px',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Teams */}
      {group.teams.map((team, ti) => {
        const isQ = team.qualified === true || (team.qualified === undefined && ti < 2)
        const is3rd = ti === 2 && team.qualified !== true && team.qualified !== false && group.teams.length === 4
        const flag = getFlag(team.flagCode)
        const borderColor = isQ ? 'rgba(255,255,255,0.2)' : is3rd ? 'rgba(255,255,255,0.09)' : 'transparent'
        return (
          <div
            key={team.id}
            className="flex items-center justify-between px-3 py-2.5"
            style={{
              background: isQ ? 'rgba(255,255,255,0.025)' : 'transparent',
              borderBottom:
                ti < group.teams.length - 1
                  ? '1px solid rgba(255,255,255,0.05)'
                  : 'none',
              borderLeft: `2px solid ${borderColor}`,
            }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span style={{ fontSize: '14px' }}>{flag}</span>
              <span
                className="truncate"
                style={{ fontSize: '13px', color: isQ ? '#e0e0e0' : is3rd ? '#999' : '#777' }}
              >
                {team.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* P */}
              <span
                className="tabular-nums text-right"
                style={{ fontSize: '12px', color: '#777', width: '14px' }}
              >
                {team.played}
              </span>
              {/* GD */}
              <span
                className="tabular-nums text-right"
                style={{
                  fontSize: '12px',
                  width: '20px',
                  color:
                    team.goalDifference > 0
                      ? '#7ecf9e'
                      : team.goalDifference < 0
                      ? '#cf7e7e'
                      : '#555',
                }}
              >
                {team.goalDifference > 0 ? '+' : ''}
                {team.goalDifference}
              </span>
              {/* PTS */}
              <span
                className="tabular-nums text-right font-bold"
                style={{
                  fontSize: '13px',
                  width: '20px',
                  color: isQ ? '#e8e8e8' : '#505050',
                }}
              >
                {team.points}
              </span>
            </div>
          </div>
        )
      })}
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function GroupsPanel({ tournament, onMatchClick }: { tournament: Tournament; onMatchClick?: (id: string) => void }) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  // Collect all matches: from tournament.matches if present, or from group.matches
  const allMatches: Match[] = (() => {
    // tournament type doesn't have matches in strict types, but data may include it
    const t = tournament as Tournament & { matches?: Match[] }
    if (t.matches && t.matches.length > 0) return t.matches

    // Fallback: aggregate from groups if group.matches is present
    const gs = tournament.groups as (GroupStanding & { matches?: Match[] })[]
    return gs.flatMap(g => g.matches ?? [])
  })()

  if (selectedGroup !== null) {
    const group = tournament.groups.find(g => g.group === selectedGroup)
    if (group) {
      return (
        <AnimatePresence mode="wait">
          <GroupDetail
            key={selectedGroup}
            group={group}
            matches={allMatches}
            onBack={() => setSelectedGroup(null)}
            onMatchClick={onMatchClick}
          />
        </AnimatePresence>
      )
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
        }}
      >
        {tournament.groups.map((group, idx) => (
          <GroupCard
            key={group.group}
            group={group}
            onClick={() => setSelectedGroup(group.group)}
            animDelay={idx * 0.04}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
