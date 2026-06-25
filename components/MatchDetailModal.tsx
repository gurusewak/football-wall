'use client'

import { useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tournament, Match, MatchStatistics } from '@/lib/types'
import { teamFlagEmoji } from '@/lib/flagUtils'

// ── Helpers ────────────────────────────────────────────────────────────────────

function flagE(name: string) {
  return teamFlagEmoji(name)
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return dateStr }
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16',
    qf: 'Quarter-Final', sf: 'Semi-Final', '3p': 'Third Place Play-off', final: 'Final',
  }
  return map[stage] ?? stage.toUpperCase()
}

function getStat(stats: MatchStatistics | null, side: 'home' | 'away', type: string): number | string | null {
  if (!stats) return null
  const block = stats[side]
  const entry = block.statistics.find(s => s.type === type)
  return entry?.value ?? null
}

function parseNum(v: number | string | null): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  const s = String(v).replace('%', '').trim()
  return parseFloat(s) || 0
}

// ── Timeline event types ───────────────────────────────────────────────────────

type TimelineEvent =
  | { kind: 'goal'; minute: number; minuteExtra?: number | null; player: string; team: string; teamId: string; penalty: boolean; ownGoal: boolean; assist?: string }
  | { kind: 'card'; minute: number; minuteExtra?: number | null; player: string; team: string; teamId: string; cardType: 'yellow' | 'red' }

// ── Stat bar row ──────────────────────────────────────────────────────────────

function StatBar({ label, homeVal, awayVal, isPercent = false }: {
  label: string
  homeVal: number | string | null
  awayVal: number | string | null
  isPercent?: boolean
}) {
  const hNum = parseNum(homeVal)
  const aNum = parseNum(awayVal)
  const total = hNum + aNum
  const homeW = total > 0 ? (hNum / total) * 100 : 50
  const awayW = total > 0 ? (aNum / total) * 100 : 50

  const homeDisplay = isPercent
    ? (typeof homeVal === 'string' ? homeVal : `${Math.round(hNum)}%`)
    : String(hNum || (homeVal ?? '—'))
  const awayDisplay = isPercent
    ? (typeof awayVal === 'string' ? awayVal : `${Math.round(aNum)}%`)
    : String(aNum || (awayVal ?? '—'))

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: '#c8c8c8', fontWeight: 600 }}>{homeDisplay}</span>
        <span style={{ fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'center' }}>{label}</span>
        <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: '#c8c8c8', fontWeight: 600 }}>{awayDisplay}</span>
      </div>
      <div style={{ display: 'flex', height: 3, borderRadius: 2, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${homeW}%`, background: 'rgba(255,255,255,0.35)', borderRadius: '2px 0 0 2px', transition: 'width 0.5s ease' }} />
        <div style={{ width: `${awayW}%`, background: 'rgba(255,255,255,0.15)', borderRadius: '0 2px 2px 0', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function MatchDetailModal({
  matchId,
  tournament,
  onClose,
}: {
  matchId: string | null
  tournament: Tournament
  onClose: () => void
}) {
  // Close on Escape
  useEffect(() => {
    if (!matchId) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [matchId, onClose])

  // Find match in tournament data
  const match = useMemo((): Match | null => {
    if (!matchId) return null
    for (const m of tournament.matches ?? []) {
      if (m.id === matchId) return m
    }
    for (const bracket of tournament.knockoutBracket) {
      for (const m of bracket.matches) {
        if (m.id === matchId) return m
      }
    }
    return null
  }, [matchId, tournament])

  // Match statistics (possession, shots, etc.)
  const stats = useMemo((): MatchStatistics | null => {
    if (!matchId) return null
    return tournament.matchStatistics?.find(s => s.matchId === matchId) ?? null
  }, [matchId, tournament])

  // Player of the match
  const potm = useMemo(() => {
    if (!matchId) return null
    return tournament.playerOfTheMatch?.find(p => p.matchId === matchId) ?? null
  }, [matchId, tournament])

  // Build timeline: goals + cards sorted by minute
  const timeline = useMemo((): TimelineEvent[] => {
    if (!match) return []
    const events: TimelineEvent[] = []

    for (const g of match.goals ?? []) {
      const raw = g as any
      events.push({
        kind: 'goal',
        minute: raw.minute ?? g.minute ?? 0,
        minuteExtra: raw.minuteExtra ?? null,
        player: raw.scorerPlayerName ?? g.player ?? '',
        team: raw.scoringTeam ?? '',
        teamId: raw.scoringTeamId ?? '',
        penalty: raw.isPenalty ?? g.penalty ?? false,
        ownGoal: raw.isOwnGoal ?? g.ownGoal ?? false,
        assist: raw.assistPlayerName ?? undefined,
      })
    }

    for (const c of match.cards ?? []) {
      const raw = c as any
      events.push({
        kind: 'card',
        minute: c.minute ?? 0,
        minuteExtra: raw.minuteExtra ?? null,
        player: raw.playerName ?? c.player ?? '',
        team: raw.team ?? '',
        teamId: raw.teamId ?? '',
        cardType: c.cardType,
      })
    }

    return events.sort((a, b) => a.minute - b.minute || 0)
  }, [match])

  const isPlayed = match?.status === 'completed' || (match?.homeScore !== null && match?.awayScore !== null)
  const homeWin = isPlayed && (match?.homeScore ?? 0) > (match?.awayScore ?? 0)
  const awayWin = isPlayed && (match?.awayScore ?? 0) > (match?.homeScore ?? 0)

  // Which stats are available
  const hasStats = stats !== null
  const STAT_ROWS: Array<{ label: string; key: string; isPercent?: boolean }> = [
    { label: 'Possession', key: 'Ball Possession', isPercent: true },
    { label: 'Shots on Target', key: 'Shots on Goal' },
    { label: 'Total Shots', key: 'Total Shots' },
    { label: 'Corners', key: 'Corner Kicks' },
    { label: 'Fouls', key: 'Fouls' },
    { label: 'Offsides', key: 'Offsides' },
    { label: 'Passes Acc.', key: 'Passes accurate' },
  ]

  return (
    <AnimatePresence>
      {matchId && match && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 60,
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            }}
          />

          {/* Mobile: bottom-anchored sheet (avoids URL bar). Desktop: centered overlay. */}
          <div className="fixed bottom-0 left-0 right-0 md:inset-0 flex justify-center md:items-center md:p-6 pointer-events-none" style={{ zIndex: 61 }}>
          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-t-[20px] md:rounded-2xl min-h-[45vh] md:min-h-0 max-h-[calc(100vh-120px)] md:max-h-[88vh]"
            style={{
              width: '100%', maxWidth: 720,
              background: 'rgba(8,8,8,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              pointerEvents: 'auto',
            }}
          >
            {/* ── Sticky header with close button (always visible) ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px 12px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {stageLabel(match.stage)}{match.matchLabel ? ` · ${match.matchLabel}` : ''}
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer',
                  color: '#aaa', fontSize: 18, lineHeight: 1,
                  width: 36, height: 36, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

              {/* ── Sub-header: date / venue ── */}
              <div style={{ padding: '12px 24px 0' }}>
                <div style={{ fontSize: 11, color: '#505050', marginBottom: 20, lineHeight: 1.5 }}>
                  {formatFullDate(match.date)}
                  {match.venue && <span> · {match.venue}</span>}
                  {match.city && <span>, {match.city}</span>}
                  {match.attendance && <span> · {match.attendance.toLocaleString()} att.</span>}
                </div>
              </div>

              {/* ── Score block ── */}
              <div style={{ padding: '0 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {/* ET/PKS badges */}
                {(match.wentToExtraTime || match.wentToPenaltyShootout) && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    {match.wentToExtraTime && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', color: '#666', letterSpacing: '0.06em' }}>EXTRA TIME</span>
                    )}
                    {match.wentToPenaltyShootout && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', color: '#888', letterSpacing: '0.06em' }}>PENALTY SHOOTOUT</span>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Home */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 28 }}>{flagE(match.homeTeam)}</span>
                    <span style={{ fontSize: 15, fontWeight: homeWin ? 700 : 400, color: homeWin ? '#e8e8e8' : '#888', textAlign: 'right' }}>
                      {match.homeTeam}
                    </span>
                  </div>

                  {/* Score */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
                    {isPlayed ? (
                      <>
                        <span style={{ fontSize: 42, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', color: '#f0f0f0', fontVariantNumeric: 'tabular-nums' }}>
                          {match.homeScore}<span style={{ color: '#555', margin: '0 4px' }}>–</span>{match.awayScore}
                        </span>
                        {match.wentToPenaltyShootout && match.homePenaltyScore !== null && match.awayPenaltyScore !== null && (
                          <span style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                            ({match.homePenaltyScore}–{match.awayPenaltyScore} pens)
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 28, color: '#555' }}>vs</span>
                    )}
                  </div>

                  {/* Away */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <span style={{ fontSize: 28 }}>{flagE(match.awayTeam)}</span>
                    <span style={{ fontSize: 15, fontWeight: awayWin ? 700 : 400, color: awayWin ? '#e8e8e8' : '#888' }}>
                      {match.awayTeam}
                    </span>
                  </div>
                </div>

                {/* Player of the match */}
                {potm && (
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Player of the Match</span>
                    <span style={{ fontSize: 13, color: '#b8b8b8', fontWeight: 600 }}>{potm.playerName}</span>
                  </div>
                )}
              </div>

              {/* ── Timeline ── */}
              {timeline.length > 0 && (
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 16 }}>
                    Match Events
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {timeline.map((ev, i) => {
                      const isHome = ev.teamId === match.homeTeamId || ev.team === match.homeTeam
                      const minStr = `${ev.minute}${ev.minuteExtra ? '+' + ev.minuteExtra : ''}'`

                      return (
                        <div
                          key={i}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 48px 1fr',
                            alignItems: 'center',
                            padding: '6px 0',
                            borderBottom: i < timeline.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          }}
                        >
                          {/* Home side */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 8 }}>
                            {isHome && (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  {ev.kind === 'goal' && <span style={{ fontSize: 12 }}>⚽</span>}
                                  {ev.kind === 'card' && <span style={{ fontSize: 12 }}>{ev.cardType === 'yellow' ? '🟨' : '🟥'}</span>}
                                  <span style={{ fontSize: 13, color: '#c8c8c8', fontWeight: ev.kind === 'goal' ? 500 : 400 }}>{ev.player}</span>
                                </div>
                                {ev.kind === 'goal' && (
                                  <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
                                    {ev.ownGoal && '(og) '}
                                    {ev.penalty && '(pen) '}
                                    {ev.assist && `↳ ${ev.assist}`}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Minute */}
                          <div style={{ textAlign: 'center', fontSize: 11, color: '#505050', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {minStr}
                          </div>

                          {/* Away side */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingLeft: 8 }}>
                            {!isHome && (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  {ev.kind === 'goal' && <span style={{ fontSize: 12 }}>⚽</span>}
                                  {ev.kind === 'card' && <span style={{ fontSize: 12 }}>{ev.cardType === 'yellow' ? '🟨' : '🟥'}</span>}
                                  <span style={{ fontSize: 13, color: '#c8c8c8', fontWeight: ev.kind === 'goal' ? 500 : 400 }}>{ev.player}</span>
                                </div>
                                {ev.kind === 'goal' && (
                                  <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
                                    {ev.ownGoal && '(og) '}
                                    {ev.penalty && '(pen) '}
                                    {ev.assist && `↳ ${ev.assist}`}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Team stats ── */}
              {hasStats && (
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 16 }}>
                    Match Statistics
                  </div>

                  {/* Team name headers */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{match.homeTeam}</span>
                    <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{match.awayTeam}</span>
                  </div>

                  {STAT_ROWS.map(({ label, key, isPercent }) => {
                    const hv = getStat(stats, 'home', key)
                    const av = getStat(stats, 'away', key)
                    if (hv === null && av === null) return null
                    return (
                      <StatBar
                        key={key}
                        label={label}
                        homeVal={hv}
                        awayVal={av}
                        isPercent={isPercent}
                      />
                    )
                  })}
                </div>
              )}

              {/* ── No data state for unplayed matches ── */}
              {!isPlayed && (
                <div style={{ padding: '28px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#555' }}>Match not yet played</div>
                  {match.date && (
                    <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>{formatFullDate(match.date)}</div>
                  )}
                </div>
              )}

              <div style={{ height: 48 }} />
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
