'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Tournament } from '@/lib/types'

// ─── Style helpers ────────────────────────────────────────────────────────────

function labelStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: '#777',
    ...extra,
  }
}

function valueStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    fontSize: 13,
    fontVariantNumeric: 'tabular-nums',
    color: '#d0d0d0',
    ...extra,
  }
}

function flagEmoji(code: string): string {
  if (!code || code === 'UN') return ''
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    group: 'Group', r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', '3p': '3rd', final: 'Final',
  }
  return map[stage] ?? stage.toUpperCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...labelStyle(), marginBottom: 10 }}>{children}</div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(12,12,12,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 6,
        padding: '12px 14px',
        flex: '1 1 160px',
        minWidth: 0,
      }}
    >
      <div style={{ ...labelStyle(), marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function TeamRow({
  rank, flagCode, name, value, valueLabel, accent,
}: {
  rank: number
  flagCode: string
  name: string
  value: number
  valueLabel?: string
  accent?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 0',
        borderBottom: rank < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none',
      }}
    >
      <span style={{ fontSize: 11, color: '#555', width: 14, textAlign: 'right', flexShrink: 0 }}>{rank}</span>
      <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1 }}>{flagEmoji(flagCode)}</span>
      <span style={{ fontSize: 12, color: '#b0b0b0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
      <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: accent ?? '#e0e0e0', flexShrink: 0 }}>
        {value}
        {valueLabel && <span style={{ fontSize: 10, color: '#666', marginLeft: 2 }}>{valueLabel}</span>}
      </span>
    </div>
  )
}

function RecordRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={labelStyle({ fontSize: 10, width: 130, flexShrink: 0, lineHeight: 1.4 })}>{label}</span>
      <span style={{ fontSize: 12, color: '#a8a8a8', flex: 1 }}>{value}</span>
      {badge && (
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#666', flexShrink: 0, textTransform: 'uppercase' }}>
          {badge}
        </span>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StatsPanel({ tournament }: { tournament: Tournament }) {
  const stats = useMemo(() => {
    const allTeams = tournament.groups.flatMap(g => g.teams)

    // All completed matches
    const groupMatches = (tournament.matches ?? []).filter(m => m.status === 'completed')
    const allKnockoutMatches = tournament.knockoutBracket.flatMap(r => r.matches)
    const completedKnockout = allKnockoutMatches.filter(m => m.status === 'completed')
    const allCompleted = [...groupMatches, ...completedKnockout]

    // Goals
    const computedGoals = allCompleted.reduce((s, m) => s + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0)
    const displayTotalGoals = tournament.totalGoals ?? computedGoals
    const displayAvgGoals = tournament.averageGoalsPerMatch
      ? tournament.averageGoalsPerMatch.toFixed(2)
      : allCompleted.length > 0 ? (computedGoals / allCompleted.length).toFixed(2) : '—'
    const displayTotalMatches = tournament.totalMatchesPlayed ?? allCompleted.length

    // ET / PKS across all matches
    const etCount = allCompleted.filter(m => m.wentToExtraTime).length
    const pksCount = allCompleted.filter(m => m.wentToPenaltyShootout).length

    // Draws at 90 min (group draws + knockout games that went to ET/PKS)
    const groupDraws = groupMatches.filter(m => m.homeScore !== null && m.homeScore === m.awayScore).length
    const knockoutDraws90 = completedKnockout.filter(m => m.wentToExtraTime || m.wentToPenaltyShootout).length
    const totalDraws90 = groupDraws + knockoutDraws90

    // ── Team leaderboards (from group standings) ──────────────────────────────
    const bestAttack = [...allTeams]
      .sort((a, b) => b.goalsFor - a.goalsFor || b.goalDifference - a.goalDifference)
      .slice(0, 5)

    const bestDefense = [...allTeams]
      .filter(t => t.played >= 3)
      .sort((a, b) => a.goalsAgainst - b.goalsAgainst || b.played - a.played)
      .slice(0, 5)

    const bestGD = [...allTeams]
      .sort((a, b) => b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
      .slice(0, 5)

    const mostWins = [...allTeams]
      .sort((a, b) => b.wins - a.wins || b.points - a.points || b.goalDifference - a.goalDifference)
      .slice(0, 5)

    // ── Clean sheets from match data ──────────────────────────────────────────
    const teamFlagMap = new Map<string, string>()
    for (const t of allTeams) teamFlagMap.set(t.name, t.flagCode)

    const cleanSheetMap = new Map<string, { name: string; flagCode: string; count: number }>()
    for (const m of allCompleted) {
      if (m.homeScore === null || m.awayScore === null) continue
      if (m.awayScore === 0) {
        const e = cleanSheetMap.get(m.homeTeam) ?? { name: m.homeTeam, flagCode: teamFlagMap.get(m.homeTeam) ?? '', count: 0 }
        e.count++
        cleanSheetMap.set(m.homeTeam, e)
      }
      if (m.homeScore === 0) {
        const e = cleanSheetMap.get(m.awayTeam) ?? { name: m.awayTeam, flagCode: teamFlagMap.get(m.awayTeam) ?? '', count: 0 }
        e.count++
        cleanSheetMap.set(m.awayTeam, e)
      }
    }
    const topCleanSheets = [...cleanSheetMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // ── Match records (all stages) ────────────────────────────────────────────
    let highestScoring: { label: string; total: number; stage: string } | null = null
    let biggestMargin: { label: string; margin: number; stage: string } | null = null

    for (const m of allCompleted) {
      if (m.homeScore === null || m.awayScore === null) continue
      const total = m.homeScore + m.awayScore
      const margin = Math.abs(m.homeScore - m.awayScore)
      const sl = stageLabel(m.stage)

      if (!highestScoring || total > highestScoring.total) {
        highestScoring = { label: `${m.homeTeam} ${m.homeScore}–${m.awayScore} ${m.awayTeam}`, total, stage: sl }
      }
      if (margin > 0 && (!biggestMargin || margin > biggestMargin.margin)) {
        const [winner, loser] = m.homeScore > m.awayScore
          ? [m.homeTeam, m.awayTeam]
          : [m.awayTeam, m.homeTeam]
        const wScore = Math.max(m.homeScore, m.awayScore)
        const lScore = Math.min(m.homeScore, m.awayScore)
        biggestMargin = { label: `${winner} ${wScore}–${lScore} ${loser}`, margin, stage: sl }
      }
    }

    // ── Runner-up and third place from bracket ────────────────────────────────
    const finalMatch = tournament.knockoutBracket.find(r => r.round === 'final')?.matches?.[0]
    const thirdPlaceMatch = tournament.knockoutBracket.find(r => r.round === '3p')?.matches?.[0]

    let runnerUp: string | null = null
    let thirdPlace: string | null = null

    if (finalMatch?.status === 'completed' && finalMatch.homeScore !== null && finalMatch.awayScore !== null) {
      if (finalMatch.homePenaltyScore != null && finalMatch.awayPenaltyScore != null) {
        runnerUp = finalMatch.homePenaltyScore > finalMatch.awayPenaltyScore ? finalMatch.awayTeam : finalMatch.homeTeam
      } else {
        runnerUp = finalMatch.homeScore > finalMatch.awayScore ? finalMatch.awayTeam : finalMatch.homeTeam
      }
    }

    if (thirdPlaceMatch?.status === 'completed' && thirdPlaceMatch.homeScore !== null && thirdPlaceMatch.awayScore !== null) {
      if (thirdPlaceMatch.homePenaltyScore != null && thirdPlaceMatch.awayPenaltyScore != null) {
        thirdPlace = thirdPlaceMatch.homePenaltyScore > thirdPlaceMatch.awayPenaltyScore ? thirdPlaceMatch.homeTeam : thirdPlaceMatch.awayTeam
      } else {
        thirdPlace = thirdPlaceMatch.homeScore >= thirdPlaceMatch.awayScore ? thirdPlaceMatch.homeTeam : thirdPlaceMatch.awayTeam
      }
    }

    // ── Player leaderboards from awardStandings ───────────────────────────────
    const teamFlagById = new Map<string, string>()
    for (const t of allTeams) {
      if (t.id) teamFlagById.set(t.id, t.flagCode)
    }

    const goldenBootStanding = (tournament.awardStandings ?? []).find(s =>
      s.awardName.toLowerCase().includes('boot') || s.awardName.toLowerCase().includes('scorer')
    )
    const topAssistsStanding = (tournament.awardStandings ?? []).find(s =>
      s.awardName.toLowerCase().includes('assist')
    )

    const topScorers = (goldenBootStanding?.leaders ?? []).slice(0, 10).map(l => ({
      ...l,
      flagCode: teamFlagById.get(l.teamId) ?? '',
      displayTeam: l.teamName ?? l.teamId,
    }))

    const topAssists = (topAssistsStanding?.leaders ?? []).slice(0, 5).map(l => ({
      ...l,
      flagCode: teamFlagById.get(l.teamId) ?? '',
      displayTeam: l.teamName ?? l.teamId,
    }))

    // ── Yellow card leaders from match events ─────────────────────────────────
    const yellowMap = new Map<string, { name: string; team: string; flagCode: string; count: number }>()
    for (const m of allCompleted) {
      for (const c of (m.cards as any[]) ?? []) {
        const pName = c.playerName ?? c.player
        if (!pName || c.cardType !== 'yellow') continue
        const entry = yellowMap.get(pName) ?? { name: pName, team: c.team ?? m.homeTeam, flagCode: teamFlagMap.get(c.team ?? '') ?? '', count: 0 }
        entry.count++
        yellowMap.set(pName, entry)
      }
    }
    const topYellowCards = [...yellowMap.values()].filter(p => p.count >= 2).sort((a, b) => b.count - a.count).slice(0, 5)

    // ── Red card leaders from match events ────────────────────────────────────
    const redMap = new Map<string, { name: string; team: string; flagCode: string; count: number }>()
    for (const m of allCompleted) {
      for (const c of (m.cards as any[]) ?? []) {
        const pName = c.playerName ?? c.player
        if (!pName || c.cardType !== 'red') continue
        const entry = redMap.get(pName) ?? { name: pName, team: c.team ?? m.homeTeam, flagCode: teamFlagMap.get(c.team ?? '') ?? '', count: 0 }
        entry.count++
        redMap.set(pName, entry)
      }
    }
    const topRedCards = [...redMap.values()].sort((a, b) => b.count - a.count).slice(0, 5)

    // ── Goalkeeper saves (summed per keeper across matches) ───────────────────
    const saveMap = new Map<string, { name: string; team: string; flagCode: string; count: number }>()
    for (const m of allCompleted) {
      for (const k of (m.goalkeeperSaves as any[]) ?? []) {
        if (!k.playerName) continue
        const entry = saveMap.get(k.playerName) ?? { name: k.playerName, team: k.team ?? '', flagCode: teamFlagMap.get(k.team ?? '') ?? '', count: 0 }
        entry.count += k.saves ?? 0
        saveMap.set(k.playerName, entry)
      }
    }
    const topSaves = [...saveMap.values()].filter(p => p.count > 0).sort((a, b) => b.count - a.count).slice(0, 5)

    // ── Awards — merge winners with goal counts from standings ────────────────
    const standingsGoalMap = new Map<string, number>()
    for (const s of tournament.awardStandings ?? []) {
      const top = s.leaders?.[0]
      if (top?.goals != null) standingsGoalMap.set(s.awardName, top.goals)
    }

    // Build team name map for country display
    const teamNameMap = new Map<string, string>()
    for (const t of allTeams) teamNameMap.set(t.id ?? t.name.toLowerCase(), t.name)

    const AWARD_ORDER = ['Golden Boot', 'Golden Ball', 'Golden Glove', 'Yashin Award', 'Best Young Player']
    const awards = (tournament.awards ?? [])
      .slice()
      .sort((a, b) => {
        const ai = AWARD_ORDER.findIndex(n => a.awardName.includes(n) || n.includes(a.awardName))
        const bi = AWARD_ORDER.findIndex(n => b.awardName.includes(n) || n.includes(b.awardName))
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
      .map(a => ({
        ...a,
        winnerGoals: standingsGoalMap.get(a.awardName) ?? null,
        winnerCountry: teamNameMap.get(a.winnerTeamId) ?? null,
      }))

    return {
      year: tournament.year,
      host: tournament.host ?? '—',
      format: tournament.format ?? null,
      winner: tournament.winner ?? null,
      runnerUp,
      thirdPlace,
      totalMatches: displayTotalMatches,
      totalGoals: displayTotalGoals,
      avgGoals: displayAvgGoals,
      etCount,
      pksCount,
      totalDraws90,
      bestAttack,
      bestDefense,
      bestGD,
      mostWins,
      topCleanSheets,
      topScorers,
      topAssists,
      topYellowCards,
      topRedCards,
      topSaves,
      highestScoring,
      biggestMargin,
      awards,
      facts: tournament.facts ?? [],
      hasMatchData: allCompleted.length > 0,
      hasKnockoutData: completedKnockout.length > 0,
      hasPlayerData: topScorers.length > 0,
    }
  }, [tournament])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'rgba(12,12,12,0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '18px 20px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >

      {/* ── Tournament Summary ── */}
      <SectionTitle>Tournament Summary</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px 20px', marginBottom: 4 }}>
        {[
          { label: 'Year',     value: String(stats.year) },
          { label: 'Host',     value: stats.host },
          { label: 'Format',   value: stats.format ? `${stats.format} Teams` : '—' },
          { label: 'Winner',   value: stats.winner ?? 'TBD' },
          ...(stats.runnerUp  ? [{ label: 'Runner-up',   value: stats.runnerUp }]  : []),
          ...(stats.thirdPlace ? [{ label: 'Third Place',  value: stats.thirdPlace }] : []),
          { label: 'Matches Played',    value: stats.totalMatches > 0 ? String(stats.totalMatches) : '—' },
          { label: 'Total Goals',       value: stats.totalGoals  > 0 ? String(stats.totalGoals)   : '—' },
          { label: 'Goals / Match',     value: String(stats.avgGoals) },
          ...(stats.etCount  > 0 ? [{ label: 'Extra Time',         value: String(stats.etCount)  }] : []),
          ...(stats.pksCount > 0 ? [{ label: 'Penalty Shootouts',  value: String(stats.pksCount) }] : []),
          ...(stats.totalDraws90 > 0 ? [{ label: 'Draws at 90 min', value: String(stats.totalDraws90) }] : []),
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={labelStyle({ fontSize: 10, marginBottom: 3 })}>{label}</div>
            <div style={valueStyle()}>{value}</div>
          </div>
        ))}
      </div>

      <Divider />

      {/* ── Team Leaderboards ── */}
      <SectionTitle>Team Leaderboards</SectionTitle>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>

        <StatCard title="Best Attack">
          {stats.bestAttack.length === 0
            ? <div style={{ fontSize: 12, color: '#555' }}>No data</div>
            : stats.bestAttack.map((t, i) => (
              <TeamRow key={t.id ?? t.name} rank={i + 1} flagCode={t.flagCode} name={t.name} value={t.goalsFor} valueLabel="gf" accent="#7ecf9e" />
            ))}
        </StatCard>

        <StatCard title="Best Defense">
          {stats.bestDefense.length === 0
            ? <div style={{ fontSize: 12, color: '#555' }}>No data</div>
            : stats.bestDefense.map((t, i) => (
              <TeamRow key={t.id ?? t.name} rank={i + 1} flagCode={t.flagCode} name={t.name} value={t.goalsAgainst} valueLabel="ga" accent="#cf9e7e" />
            ))}
        </StatCard>

        <StatCard title="Best Goal Diff">
          {stats.bestGD.length === 0
            ? <div style={{ fontSize: 12, color: '#555' }}>No data</div>
            : stats.bestGD.map((t, i) => (
              <TeamRow key={t.id ?? t.name} rank={i + 1} flagCode={t.flagCode} name={t.name} value={t.goalDifference} valueLabel="gd" accent="#9eb8cf" />
            ))}
        </StatCard>

        <StatCard title="Most Wins">
          {stats.mostWins.length === 0
            ? <div style={{ fontSize: 12, color: '#555' }}>No data</div>
            : stats.mostWins.map((t, i) => (
              <TeamRow key={t.id ?? t.name} rank={i + 1} flagCode={t.flagCode} name={t.name} value={t.wins} valueLabel="w" accent="#c9cf9e" />
            ))}
        </StatCard>

        {stats.topCleanSheets.length > 0 && (
          <StatCard title="Clean Sheets">
            {stats.topCleanSheets.map((t, i) => (
              <TeamRow key={t.name} rank={i + 1} flagCode={t.flagCode} name={t.name} value={t.count} valueLabel="cs" accent="#b0b0c8" />
            ))}
          </StatCard>
        )}

      </div>

      {/* ── Player Leaderboards ── */}
      {stats.hasPlayerData && (
        <>
          <Divider />
          <SectionTitle>Player Leaderboards</SectionTitle>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>

            <StatCard title="Golden Boot — Top Scorers">
              {stats.topScorers.map((p, i) => (
                <div
                  key={p.playerName + i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 0',
                    borderBottom: i < stats.topScorers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#555', width: 14, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1 }}>{flagEmoji(p.flagCode)}</span>
                  <span style={{ fontSize: 12, color: '#b0b0b0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.playerName}
                  </span>
                  <span style={{ fontSize: 11, color: '#666', flexShrink: 0, marginRight: 4 }}>{p.displayTeam}</span>
                  <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#e8c86a', flexShrink: 0 }}>
                    {p.goals}
                    <span style={{ fontSize: 10, color: '#666', marginLeft: 2 }}>g</span>
                  </span>
                </div>
              ))}
            </StatCard>

            {stats.topAssists.length > 0 && (
              <StatCard title="Top Assists">
                {stats.topAssists.map((p, i) => (
                  <div
                    key={p.playerName + i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 0',
                      borderBottom: i < stats.topAssists.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#555', width: 14, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1 }}>{flagEmoji(p.flagCode)}</span>
                    <span style={{ fontSize: 12, color: '#b0b0b0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.playerName}
                    </span>
                    <span style={{ fontSize: 11, color: '#666', flexShrink: 0, marginRight: 4 }}>{p.displayTeam}</span>
                    <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#9eb8cf', flexShrink: 0 }}>
                      {p.assists}
                      <span style={{ fontSize: 10, color: '#666', marginLeft: 2 }}>a</span>
                    </span>
                  </div>
                ))}
              </StatCard>
            )}

            {stats.topYellowCards.length > 0 && (
              <StatCard title="Most Yellow Cards">
                {stats.topYellowCards.map((p, i) => (
                  <TeamRow
                    key={p.name + i}
                    rank={i + 1}
                    flagCode={p.flagCode}
                    name={p.name}
                    value={p.count}
                    valueLabel="yc"
                    accent="#e8d06a"
                  />
                ))}
              </StatCard>
            )}

            {stats.topRedCards.length > 0 && (
              <StatCard title="Most Red Cards">
                {stats.topRedCards.map((p, i) => (
                  <TeamRow
                    key={p.name + i}
                    rank={i + 1}
                    flagCode={p.flagCode}
                    name={p.name}
                    value={p.count}
                    valueLabel="rc"
                    accent="#d96b6b"
                  />
                ))}
              </StatCard>
            )}

            {stats.topSaves.length > 0 && (
              <StatCard title="Most Saves (GK)">
                {stats.topSaves.map((p, i) => (
                  <TeamRow
                    key={p.name + i}
                    rank={i + 1}
                    flagCode={p.flagCode}
                    name={p.name}
                    value={p.count}
                    valueLabel="sv"
                    accent="#6abf8f"
                  />
                ))}
              </StatCard>
            )}

          </div>
        </>
      )}

      {/* ── Match Records ── */}
      {stats.hasMatchData && (
        <>
          <Divider />
          <SectionTitle>
            Match Records
            {!stats.hasKnockoutData && (
              <span style={{ fontSize: 10, color: '#555', textTransform: 'none', letterSpacing: 0, fontWeight: 400, marginLeft: 6 }}>
                (group stage only)
              </span>
            )}
          </SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {stats.highestScoring && (
              <RecordRow
                label="Highest Scoring"
                value={`${stats.highestScoring.label} (${stats.highestScoring.total} goals)`}
                badge={stats.highestScoring.stage}
              />
            )}
            {stats.biggestMargin && (
              <RecordRow
                label="Biggest Margin"
                value={`${stats.biggestMargin.label} (+${stats.biggestMargin.margin})`}
                badge={stats.biggestMargin.stage}
              />
            )}
            {stats.totalDraws90 > 0 && (
              <RecordRow
                label="Draws at 90 min"
                value={`${stats.totalDraws90} match${stats.totalDraws90 !== 1 ? 'es' : ''}`}
              />
            )}
            {stats.etCount > 0 && (
              <RecordRow
                label="Needed Extra Time"
                value={`${stats.etCount} match${stats.etCount !== 1 ? 'es' : ''}`}
              />
            )}
            {stats.pksCount > 0 && (
              <RecordRow
                label="Decided by Penalties"
                value={`${stats.pksCount} match${stats.pksCount !== 1 ? 'es' : ''}`}
              />
            )}
          </div>
        </>
      )}

      {/* ── Tournament Awards ── */}
      {stats.awards.length > 0 && (
        <>
          <Divider />
          <SectionTitle>Tournament Awards</SectionTitle>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '10px 16px',
              marginBottom: 4,
            }}
          >
            {stats.awards.map(award => (
              <div
                key={award.id}
                style={{
                  background: 'rgba(12,12,12,0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  padding: '10px 12px',
                }}
              >
                <div style={labelStyle({ fontSize: 10, marginBottom: 5 })}>{award.awardName}</div>
                <div style={{ fontSize: 13, color: '#d8d8d8', fontWeight: 600 }}>
                  {award.winnerPlayerName}
                </div>
                {award.winnerGoals != null && (
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    {award.winnerGoals} goals
                  </div>
                )}
                {award.winnerCountry && (
                  <div style={{ fontSize: 11, color: '#777', marginTop: 1 }}>{award.winnerCountry}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Notable Facts ── */}
      {stats.facts.length > 0 && (
        <>
          <Divider />
          <SectionTitle>Notable Facts</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.facts.map(f => (
              <div key={f.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, color: '#666', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, minWidth: 80 }}>
                  {f.factType.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{f.statement}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Transparency Note ── */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '14px 0 12px' }} />
      <div style={{ fontSize: 11, color: '#555', lineHeight: 1.55 }}>
        Stats computed from available match data. Scorer and card data available for 2010–2026 via API-Football. Clean sheets derived from match scorelines.
      </div>

    </motion.div>
  )
}
