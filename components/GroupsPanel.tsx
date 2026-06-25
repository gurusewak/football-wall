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

function MatchRow({ match }: { match: Match }) {
  const homeFlag = teamFlagEmoji(match.homeTeam)
  const awayFlag = teamFlagEmoji(match.awayTeam)
  const isPlayed = match.status === 'completed' || (match.homeScore !== null && match.awayScore !== null)
  const isLive = match.status === 'live'
  const allScorers = match.goals?.filter(g => g.player) ?? []
  const homeScorers = allScorers.filter(g => !g.ownGoal
    ? match.goals?.indexOf(g) !== -1 && true  // home goals: not own goals scored by home
    : false
  )
  const hasET = match.wentToExtraTime
  const hasPKS = match.wentToPenaltyShootout
  const homeWin = isPlayed && (match.homeScore ?? 0) > (match.awayScore ?? 0)
  const awayWin = isPlayed && (match.awayScore ?? 0) > (match.homeScore ?? 0)

  return (
    <div
      className="px-3 py-2"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Top row: date + label + venue */}
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ fontSize: '10px', color: '#666' }}>
          {match.matchLabel && <span style={{ color: '#777', marginRight: '6px' }}>{match.matchLabel}</span>}
          {formatDate(match.date)}
          {match.city && <span style={{ color: '#606060', marginLeft: '6px' }}>{match.city.replace(/\s*\([^)]*\)/g, '')}</span>}
        </span>
        {hasET && (
          <span className="px-1 rounded-sm" style={{ fontSize: '9px', fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: '#666', letterSpacing: '0.06em' }}>ET</span>
        )}
        {hasPKS && (
          <span className="px-1 rounded-sm" style={{ fontSize: '9px', fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: '#888', letterSpacing: '0.06em' }}>PKS</span>
        )}
        {isLive && (
          <span className="px-1 rounded-sm" style={{ fontSize: '9px', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#f87171', letterSpacing: '0.06em' }}>LIVE</span>
        )}
      </div>

      {/* Main row: teams + score */}
      <div className="flex items-center justify-between gap-2">
        {/* Home team */}
        <div className="flex items-center gap-1.5 justify-end flex-1 min-w-0">
          <span className="truncate text-right" style={{ fontSize: '12px', fontWeight: homeWin ? 600 : 400, color: homeWin ? '#e0e0e0' : '#888' }}>
            {match.homeTeam}
          </span>
          <span style={{ fontSize: '13px', flexShrink: 0 }}>{homeFlag}</span>
        </div>

        {/* Score / vs */}
        <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '52px' }}>
          {isPlayed ? (
            <>
              <span className="tabular-nums font-bold" style={{ fontSize: '13px', color: '#c8c8c8', letterSpacing: '0.04em' }}>
                {match.homeScore} – {match.awayScore}
              </span>
              {hasPKS && match.homePenaltyScore !== null && match.awayPenaltyScore !== null && (
                <span className="tabular-nums" style={{ fontSize: '10px', color: '#555', letterSpacing: '0.02em' }}>
                  ({match.homePenaltyScore} – {match.awayPenaltyScore} pen)
                </span>
              )}
            </>
          ) : (
            <span style={{ fontSize: '11px', color: '#666', letterSpacing: '0.06em' }}>vs</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span style={{ fontSize: '13px', flexShrink: 0 }}>{awayFlag}</span>
          <span className="truncate" style={{ fontSize: '12px', fontWeight: awayWin ? 600 : 400, color: awayWin ? '#e0e0e0' : '#888' }}>
            {match.awayTeam}
          </span>
        </div>
      </div>

      {/* Scorers (when data available) */}
      {allScorers.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {allScorers.map((g, i) => (
            <span key={i} style={{ fontSize: '10px', color: '#888' }}>
              ⚽ {g.player} {g.minute}&apos;{g.penalty ? ' (p)' : ''}{g.ownGoal ? ' (og)' : ''}
            </span>
          ))}
        </div>
      )}
      {match.cards && match.cards.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-3">
          {match.cards.map((c, i) => (
            <span key={i} style={{ fontSize: '10px', color: '#888' }}>
              {c.cardType === 'yellow' ? '🟨' : '🟥'} {c.player} {c.minute}&apos;
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Group detail view ─────────────────────────────────────────────────────────

function GroupDetail({
  group,
  matches,
  onBack,
}: {
  group: GroupStanding
  matches: Match[]
  onBack: () => void
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
        className="flex items-center gap-1.5 mb-4"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: '#777',
          fontSize: '13px',
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
            <MatchRow key={match.id} match={match} />
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
            className="flex items-center justify-between px-3 py-2"
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

export function GroupsPanel({ tournament }: { tournament: Tournament }) {
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

  const cols = tournament.groups.length <= 8 ? 4 : 4  // max 4 cols per spec

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
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(220px, 1fr))`,
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
