'use client'

import { useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { Bracket, Match } from '@/lib/types'
import { PosterMatchBox } from './PosterMatchBox'
import { teamFlagCode } from '@/lib/flagUtils'

interface Props {
  knockoutBracket: Bracket[]
  simKey?: number
  onMatchClick?: (matchId: string) => void
}

// ─── Layout constants ─────────────────────────────────────────────────────────
const COL_W    = 140   // match box width
const GAP_W    = 18    // gap between columns (connector space)
const STEP     = COL_W + GAP_W  // 158px per column
const TOTAL_H  = 720   // fixed canvas height
const CAPTION_H = 16   // date/city label above each match box

// ── 48-team (R32 → R16 → QF → SF → Final) ────────────────────────────────────
const SLOT_H_48   = TOTAL_H / 8     // 90px per slot
const MATCH_H_48  = 56              // sm boxH
const COL_X_48    = Array.from({ length: 9 }, (_, i) => i * STEP)
const TOTAL_W_48  = 8 * STEP + COL_W  // 1404px

const R32_CY_48 = Array.from({ length: 8 }, (_, i) => i * SLOT_H_48 + SLOT_H_48 / 2)
const R16_CY_48 = Array.from({ length: 4 }, (_, i) => (R32_CY_48[2*i] + R32_CY_48[2*i+1]) / 2)
const QF_CY_48  = Array.from({ length: 2 }, (_, i) => (R16_CY_48[2*i] + R16_CY_48[2*i+1]) / 2)
const SF_CY_48  = (QF_CY_48[0] + QF_CY_48[1]) / 2
const FINAL_CY_48  = SF_CY_48
const THIRD_CY_48  = TOTAL_H - SLOT_H_48 / 2

// ── 32-team (R16 → QF → SF → Final) ─────────────────────────────────────────
const SLOT_H_32   = TOTAL_H / 4     // 180px per slot
const MATCH_H_32  = 56              // sm boxH
const COL_X_32    = Array.from({ length: 7 }, (_, i) => i * STEP)
const TOTAL_W_32  = 6 * STEP + COL_W  // 1088px

const R16_CY_32 = Array.from({ length: 4 }, (_, i) => i * SLOT_H_32 + SLOT_H_32 / 2)
const QF_CY_32  = Array.from({ length: 2 }, (_, i) => (R16_CY_32[2*i] + R16_CY_32[2*i+1]) / 2)
const SF_CY_32  = (QF_CY_32[0] + QF_CY_32[1]) / 2
const FINAL_CY_32  = SF_CY_32
const THIRD_CY_32  = TOTAL_H - SLOT_H_32 / 2

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Simulate: reveal tiles one at a time in true chronological order (match
// date + kickoff time), SIM_TILE_INTERVAL seconds apart — the bracket "plays
// out" in the order the matches are actually scheduled. Tune the interval here.
const SIM_TILE_INTERVAL = 0.8

function computeChronoDelays(matches: (Match | null)[]): Map<string, number> {
  const delays = new Map<string, number>()
  const valid = matches.filter((m): m is Match => !!m?.id && !!m?.date && !isNaN(Date.parse(m.date)))
  const sorted = [...valid].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  sorted.forEach((m, i) => delays.set(m.id, i * SIM_TILE_INTERVAL))
  return delays
}

// scroll-margin so a tile aligned to the top edge clears the sticky header,
// and isn't flush against the bottom edge.
const SIM_SCROLL_STYLE: React.CSSProperties = { scrollMarginTop: 90, scrollMarginBottom: 48 }

// During a simulate run, scroll each tile into view right as it reveals (in
// chronological order) so none appear off-screen above/below the fold. Uses
// block:'nearest' → only scrolls when the tile is actually out of view.
function useSimulateAutoScroll(simKey: number, isSimulate: boolean, simDelays: Map<string, number>) {
  const delaysRef = useRef(simDelays)
  delaysRef.current = simDelays
  useEffect(() => {
    if (!isSimulate) return
    const entries = [...delaysRef.current.entries()].sort((a, b) => a[1] - b[1])
    const timers: ReturnType<typeof setTimeout>[] = []
    for (const [id, delay] of entries) {
      timers.push(setTimeout(() => {
        document.querySelector(`[data-sim-tile="${id}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
      }, delay * 1000))
    }
    return () => timers.forEach(clearTimeout)
  }, [simKey, isSimulate]) // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── SVG path builders ────────────────────────────────────────────────────────
function leftPath(colX: number, y1: number, y2: number, nextX: number): string {
  const mx = colX + COL_W + GAP_W / 2
  const yMid = (y1 + y2) / 2
  return `M${colX+COL_W},${y1} H${mx} V${y2} M${colX+COL_W},${y2} H${mx} M${mx},${yMid} H${nextX}`
}

function rightPath(colX: number, y1: number, y2: number, prevRightX: number): string {
  const mx = colX - GAP_W / 2
  const yMid = (y1 + y2) / 2
  return `M${colX},${y1} H${mx} V${y2} M${colX},${y2} H${mx} M${mx},${yMid} H${prevRightX+COL_W}`
}

function sfToFinal(sfColX: number, sfCY: number, finalColX: number, fromRight: boolean): string {
  return fromRight
    ? `M${sfColX},${sfCY} H${finalColX+COL_W}`
    : `M${sfColX+COL_W},${sfCY} H${finalColX}`
}

// ─── Main component ───────────────────────────────────────────────────────────
export function KnockoutPosterBracket({ knockoutBracket, simKey = 0, onMatchClick }: Props) {
  const rounds = useMemo(() => {
    const m: Record<string, Match[]> = {}
    knockoutBracket.forEach(b => { m[b.round] = b.matches })
    return m
  }, [knockoutBracket])

  const is48 = !!rounds['r32']

  if (is48) return <Bracket48 rounds={rounds} simKey={simKey} onMatchClick={onMatchClick} />
  return <Bracket32 rounds={rounds} simKey={simKey} onMatchClick={onMatchClick} />
}

// ─── 48-team bracket ──────────────────────────────────────────────────────────
function Bracket48({ rounds, simKey, onMatchClick }: { rounds: Record<string, Match[]>; simKey: number; onMatchClick?: (id: string) => void }) {
  const r32 = rounds['r32'] || []
  const r16 = rounds['r16'] || []
  const qf  = rounds['qf']  || []
  const sf  = rounds['sf']  || []
  const fin = rounds['final'] || []
  const tp  = rounds['3p']  || []

  const r32L = r32.slice(0, 8),  r32R = r32.slice(8, 16)
  const r16L = r16.slice(0, 4),  r16R = r16.slice(4, 8)
  const qfL  = qf.slice(0, 2),   qfR  = qf.slice(2, 4)
  const sfL  = sf[0] ?? null,    sfR  = sf[1] ?? null
  const final = fin[0] ?? null
  const third = tp[0]  ?? null

  const isSimulate = simKey > 0
  // Simulate → one global chronological reveal across every tile. Otherwise →
  // the original quick round-by-round cascade.
  const simDelays = useMemo(
    () => isSimulate ? computeChronoDelays([...r32L, ...r32R, ...r16L, ...r16R, ...qfL, ...qfR, sfL, sfR, final, third]) : new Map<string, number>(),
    [isSimulate, r32L, r32R, r16L, r16R, qfL, qfR, sfL, sfR, final, third],
  )
  const simAt = (m: Match | null) => (m ? simDelays.get(m.id) : undefined) ?? 0
  const r16BaseDelay = 0.2
  const qfBaseDelay  = 0.32
  const sfBaseDelay  = 0.42
  const finalBaseDelay = 0.5
  useSimulateAutoScroll(simKey, isSimulate, simDelays)

  const svgPaths = useMemo(() => {
    const p: string[] = []
    for (let i = 0; i < 4; i++) p.push(leftPath(COL_X_48[0], R32_CY_48[2*i], R32_CY_48[2*i+1], COL_X_48[1]))
    for (let i = 0; i < 2; i++) p.push(leftPath(COL_X_48[1], R16_CY_48[2*i], R16_CY_48[2*i+1], COL_X_48[2]))
    p.push(leftPath(COL_X_48[2], QF_CY_48[0], QF_CY_48[1], COL_X_48[3]))
    p.push(sfToFinal(COL_X_48[3], SF_CY_48, COL_X_48[4], false))
    for (let i = 0; i < 4; i++) p.push(rightPath(COL_X_48[8], R32_CY_48[2*i], R32_CY_48[2*i+1], COL_X_48[7]))
    for (let i = 0; i < 2; i++) p.push(rightPath(COL_X_48[7], R16_CY_48[2*i], R16_CY_48[2*i+1], COL_X_48[6]))
    p.push(rightPath(COL_X_48[6], QF_CY_48[0], QF_CY_48[1], COL_X_48[5]))
    p.push(sfToFinal(COL_X_48[5], SF_CY_48, COL_X_48[4], true))
    return p
  }, [])

  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
    color: '#606060', textTransform: 'uppercase', textAlign: 'center',
  }

  return (
    <div className="relative select-none" style={{ width: TOTAL_W_48, height: TOTAL_H + 80 }}>
      {/* Round headers */}
      <div className="absolute top-0 left-0 right-0" style={{ height: '28px' }}>
        {[
          { label: 'Round of 32', x: COL_X_48[0] },
          { label: 'Round of 16', x: COL_X_48[1] },
          { label: 'Qtr-Finals',  x: COL_X_48[2] },
          { label: 'Semi-Finals', x: COL_X_48[3] },
          { label: 'Final',       x: COL_X_48[4] },
          { label: 'Semi-Finals', x: COL_X_48[5] },
          { label: 'Qtr-Finals',  x: COL_X_48[6] },
          { label: 'Round of 16', x: COL_X_48[7] },
          { label: 'Round of 32', x: COL_X_48[8] },
        ].map(({ label, x }) => (
          <div key={`hdr-${x}`} className="absolute" style={{ left: x, width: COL_W, top: 0, ...labelStyle }}>{label}</div>
        ))}
      </div>

      {/* Bracket area */}
      <div className="absolute" style={{ top: '32px', left: 0, width: TOTAL_W_48, height: TOTAL_H }}>
        <svg className="absolute inset-0 pointer-events-none" width={TOTAL_W_48} height={TOTAL_H} style={{ zIndex: 0 }}>
          {svgPaths.map((d, i) => <path key={i} d={d} className="bracket-line" />)}
        </svg>

        <MatchCol matches={r32L} colX={COL_X_48[0]} cyList={R32_CY_48} matchH={MATCH_H_48} side="left"  delay={0}             simKey={simKey} delayMap={isSimulate ? simDelays : undefined} enterX={simKey > 0 ? -110 : undefined} onMatchClick={onMatchClick} />
        <MatchCol matches={r16L} colX={COL_X_48[1]} cyList={R16_CY_48} matchH={MATCH_H_48} side="left"  delay={r16BaseDelay}   simKey={simKey} delayMap={isSimulate ? simDelays : undefined} enterX={simKey > 0 ? -110 : undefined} onMatchClick={onMatchClick} />
        <MatchCol matches={qfL}  colX={COL_X_48[2]} cyList={QF_CY_48}  matchH={MATCH_H_48} side="left"  delay={qfBaseDelay}    simKey={simKey} delayMap={isSimulate ? simDelays : undefined} enterX={simKey > 0 ? -110 : undefined} onMatchClick={onMatchClick} />
        {sfL && <SingleMatch match={sfL} colX={COL_X_48[3]} cy={SF_CY_48} matchH={MATCH_H_48} side="left"  delay={isSimulate ? simAt(sfL) : sfBaseDelay}  simKey={simKey} enterX={simKey > 0 ? -110 : undefined} onMatchClick={onMatchClick} />}

        <FinalBox match={final} colX={COL_X_48[4]} cy={FINAL_CY_48} delay={isSimulate ? simAt(final) : finalBaseDelay} simKey={simKey} onMatchClick={onMatchClick} />
        {third && <ThirdBox match={third} colX={COL_X_48[4]} cy={THIRD_CY_48} matchH={MATCH_H_48} delay={isSimulate ? simAt(third) : finalBaseDelay + 0.03} simKey={simKey} onMatchClick={onMatchClick} />}

        {sfR && <SingleMatch match={sfR} colX={COL_X_48[5]} cy={SF_CY_48} matchH={MATCH_H_48} side="right" delay={isSimulate ? simAt(sfR) : sfBaseDelay}  simKey={simKey} enterX={simKey > 0 ? 110 : undefined} onMatchClick={onMatchClick} />}
        <MatchCol matches={qfR}  colX={COL_X_48[6]} cyList={QF_CY_48}  matchH={MATCH_H_48} side="right" delay={qfBaseDelay}    simKey={simKey} delayMap={isSimulate ? simDelays : undefined} enterX={simKey > 0 ? 110 : undefined} onMatchClick={onMatchClick} />
        <MatchCol matches={r16R} colX={COL_X_48[7]} cyList={R16_CY_48} matchH={MATCH_H_48} side="right" delay={r16BaseDelay}   simKey={simKey} delayMap={isSimulate ? simDelays : undefined} enterX={simKey > 0 ? 110 : undefined} onMatchClick={onMatchClick} />
        <MatchCol matches={r32R} colX={COL_X_48[8]} cyList={R32_CY_48} matchH={MATCH_H_48} side="right" delay={0}             simKey={simKey} delayMap={isSimulate ? simDelays : undefined} enterX={simKey > 0 ? 110 : undefined} onMatchClick={onMatchClick} />
      </div>
    </div>
  )
}

// ─── 32-team bracket ──────────────────────────────────────────────────────────
function Bracket32({ rounds, simKey, onMatchClick }: { rounds: Record<string, Match[]>; simKey: number; onMatchClick?: (id: string) => void }) {
  const r16 = rounds['r16'] || []
  const qf  = rounds['qf']  || []
  const sf  = rounds['sf']  || []
  const fin = rounds['final'] || []
  const tp  = rounds['3p']  || []

  const r16L = r16.slice(0, 4), r16R = r16.slice(4, 8)
  const qfL  = qf.slice(0, 2),  qfR  = qf.slice(2, 4)
  const sfL  = sf[0] ?? null,   sfR  = sf[1] ?? null
  const final = fin[0] ?? null
  const third = tp[0]  ?? null

  const isSimulate = simKey > 0
  const simDelays = useMemo(
    () => isSimulate ? computeChronoDelays([...r16L, ...r16R, ...qfL, ...qfR, sfL, sfR, final, third]) : new Map<string, number>(),
    [isSimulate, r16L, r16R, qfL, qfR, sfL, sfR, final, third],
  )
  const simAt = (m: Match | null) => (m ? simDelays.get(m.id) : undefined) ?? 0
  const qfBaseDelay  = 0.2
  const sfBaseDelay  = 0.32
  const finalBaseDelay = 0.42
  useSimulateAutoScroll(simKey, isSimulate, simDelays)

  const svgPaths = useMemo(() => {
    const p: string[] = []
    for (let i = 0; i < 2; i++) p.push(leftPath(COL_X_32[0], R16_CY_32[2*i], R16_CY_32[2*i+1], COL_X_32[1]))
    p.push(leftPath(COL_X_32[1], QF_CY_32[0], QF_CY_32[1], COL_X_32[2]))
    p.push(sfToFinal(COL_X_32[2], SF_CY_32, COL_X_32[3], false))
    for (let i = 0; i < 2; i++) p.push(rightPath(COL_X_32[6], R16_CY_32[2*i], R16_CY_32[2*i+1], COL_X_32[5]))
    p.push(rightPath(COL_X_32[5], QF_CY_32[0], QF_CY_32[1], COL_X_32[4]))
    p.push(sfToFinal(COL_X_32[4], SF_CY_32, COL_X_32[3], true))
    return p
  }, [])

  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
    color: '#606060', textTransform: 'uppercase', textAlign: 'center',
  }

  return (
    <div className="relative select-none" style={{ width: TOTAL_W_32, height: TOTAL_H + 80 }}>
      {/* Round headers */}
      <div className="absolute top-0 left-0 right-0" style={{ height: '28px' }}>
        {[
          { label: 'Round of 16', x: COL_X_32[0] },
          { label: 'Qtr-Finals',  x: COL_X_32[1] },
          { label: 'Semi-Finals', x: COL_X_32[2] },
          { label: 'Final',       x: COL_X_32[3] },
          { label: 'Semi-Finals', x: COL_X_32[4] },
          { label: 'Qtr-Finals',  x: COL_X_32[5] },
          { label: 'Round of 16', x: COL_X_32[6] },
        ].map(({ label, x }) => (
          <div key={`hdr32-${x}`} className="absolute" style={{ left: x, width: COL_W, top: 0, ...labelStyle }}>{label}</div>
        ))}
      </div>

      {/* Bracket area */}
      <div className="absolute" style={{ top: '32px', left: 0, width: TOTAL_W_32, height: TOTAL_H }}>
        <svg className="absolute inset-0 pointer-events-none" width={TOTAL_W_32} height={TOTAL_H} style={{ zIndex: 0 }}>
          {svgPaths.map((d, i) => <path key={i} d={d} className="bracket-line" />)}
        </svg>

        <MatchCol matches={r16L} colX={COL_X_32[0]} cyList={R16_CY_32} matchH={MATCH_H_32} side="left"  delay={0}           simKey={simKey} delayMap={isSimulate ? simDelays : undefined} enterX={simKey > 0 ? -110 : undefined} onMatchClick={onMatchClick} />
        <MatchCol matches={qfL}  colX={COL_X_32[1]} cyList={QF_CY_32}  matchH={MATCH_H_32} side="left"  delay={qfBaseDelay}  simKey={simKey} delayMap={isSimulate ? simDelays : undefined} enterX={simKey > 0 ? -110 : undefined} onMatchClick={onMatchClick} />
        {sfL && <SingleMatch match={sfL} colX={COL_X_32[2]} cy={SF_CY_32} matchH={MATCH_H_32} side="left"  delay={isSimulate ? simAt(sfL) : sfBaseDelay} simKey={simKey} enterX={simKey > 0 ? -110 : undefined} onMatchClick={onMatchClick} />}

        <FinalBox match={final} colX={COL_X_32[3]} cy={FINAL_CY_32} delay={isSimulate ? simAt(final) : finalBaseDelay} simKey={simKey} onMatchClick={onMatchClick} />
        {third && <ThirdBox match={third} colX={COL_X_32[3]} cy={THIRD_CY_32} matchH={MATCH_H_32} delay={isSimulate ? simAt(third) : finalBaseDelay + 0.03} simKey={simKey} onMatchClick={onMatchClick} />}

        {sfR && <SingleMatch match={sfR} colX={COL_X_32[4]} cy={SF_CY_32} matchH={MATCH_H_32} side="right" delay={isSimulate ? simAt(sfR) : sfBaseDelay} simKey={simKey} enterX={simKey > 0 ? 110 : undefined} onMatchClick={onMatchClick} />}
        <MatchCol matches={qfR}  colX={COL_X_32[5]} cyList={QF_CY_32}  matchH={MATCH_H_32} side="right" delay={qfBaseDelay}  simKey={simKey} delayMap={isSimulate ? simDelays : undefined} enterX={simKey > 0 ? 110 : undefined} onMatchClick={onMatchClick} />
        <MatchCol matches={r16R} colX={COL_X_32[6]} cyList={R16_CY_32} matchH={MATCH_H_32} side="right" delay={0}           simKey={simKey} delayMap={isSimulate ? simDelays : undefined} enterX={simKey > 0 ? 110 : undefined} onMatchClick={onMatchClick} />
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function cleanCity(city: string): string {
  return city.replace(/\s*\([^)]*\)/g, '').trim()
}

function MatchCaption({ match }: { match: Match | null }) {
  if (!match) return <div style={{ height: CAPTION_H }} />
  const parts = [
    fmtDate(match.date),
    match.city ? cleanCity(match.city) : undefined,
  ].filter(Boolean)
  return (
    <div
      style={{
        height: CAPTION_H,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: '3px',
      }}
    >
      <span style={{ fontSize: '10px', color: '#666', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
        {parts.join(' · ')}
      </span>
    </div>
  )
}

function MatchCol({ matches, colX, cyList, matchH, side, delay, simKey, delayMap, enterX, onMatchClick }: {
  matches: (Match | null)[]
  colX: number
  cyList: number[]
  matchH: number
  side: 'left' | 'right'
  delay: number
  simKey: number
  delayMap?: Map<string, number>
  enterX?: number
  onMatchClick?: (id: string) => void
}) {
  return (
    <>
      {matches.map((match, i) => {
        const cy = cyList[i] ?? 0
        const isSimulate = enterX !== undefined
        const stagger = isSimulate ? 0.06 : 0.03
        // delayMap (simulate) carries each tile's own chronological delay — use it
        // directly; otherwise fall back to the round's base delay + index stagger.
        const matchDelay = match && delayMap?.has(match.id)
          ? delayMap.get(match.id)!
          : delay + i * stagger
        const initAnim = isSimulate
          ? { opacity: 0, x: enterX, y: 0 }
          : { opacity: 0, x: 0, y: 6 }
        return (
          <motion.div
            key={`${simKey}-${match?.id ?? `tbd-${colX}-${i}`}`}
            initial={initAnim}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: isSimulate ? 0.55 : 0.35, delay: matchDelay }}
            className="absolute"
            data-sim-tile={match?.id}
            style={{ ...SIM_SCROLL_STYLE, left: colX, top: cy - matchH / 2 - CAPTION_H, width: COL_W }}
          >
            <MatchCaption match={match} />
            <PosterMatchBox match={match} size="sm" showLabel={false} popoverSide={side === 'left' ? 'right' : 'left'} onMatchClick={onMatchClick} />
          </motion.div>
        )
      })}
    </>
  )
}

function SingleMatch({ match, colX, cy, matchH, side, delay, simKey, enterX, onMatchClick }: {
  match: Match | null; colX: number; cy: number; matchH: number; side: 'left' | 'right'; delay: number; simKey: number; enterX?: number; onMatchClick?: (id: string) => void
}) {
  const initAnim = enterX !== undefined ? { opacity: 0, x: enterX, y: 0 } : { opacity: 0, x: 0, y: 6 }
  return (
    <motion.div
      key={`${simKey}-sf-${colX}`}
      initial={initAnim}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: enterX !== undefined ? 0.55 : 0.4, delay }}
      className="absolute"
      data-sim-tile={match?.id}
      style={{ ...SIM_SCROLL_STYLE, left: colX, top: cy - matchH / 2 - CAPTION_H, width: COL_W }}
    >
      <MatchCaption match={match} />
      <PosterMatchBox match={match} size="sm" showLabel={false} popoverSide={side === 'left' ? 'right' : 'left'} onMatchClick={onMatchClick} />
    </motion.div>
  )
}

const TROPHY_H = 150  // space above match box (winner + trophy)
const FINAL_H  = 72   // lg boxH

function flagEmoji(code: string): string {
  if (!code || code === 'UN') return '🏳'
  return code.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
}

function getFinalWinner(match: Match | null): { name: string; flag: string } | null {
  if (!match || match.status !== 'completed') return null
  const { homeScore, awayScore, homeTeam, awayTeam, wentToPenaltyShootout, homePenaltyScore, awayPenaltyScore } = match
  if (homeScore === null || awayScore === null) return null
  let winnerName: string
  if (wentToPenaltyShootout && homePenaltyScore != null && awayPenaltyScore != null) {
    winnerName = homePenaltyScore > awayPenaltyScore ? homeTeam : awayTeam
  } else {
    if (homeScore === awayScore) return null
    winnerName = homeScore > awayScore ? homeTeam : awayTeam
  }
  return { name: winnerName, flag: flagEmoji(teamFlagCode(winnerName)) }
}

function FinalBox({ match, colX, cy, delay, simKey, onMatchClick }: { match: Match | null; colX: number; cy: number; delay: number; simKey: number; onMatchClick?: (id: string) => void }) {
  const winner = getFinalWinner(match)
  return (
    <motion.div
      key={`${simKey}-final`}
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className="absolute"
      data-sim-tile={match?.id}
      style={{ ...SIM_SCROLL_STYLE, left: colX, top: cy - FINAL_H / 2 - TROPHY_H, width: COL_W }}
    >
      {/* Winner flag + name above trophy */}
      <div style={{ height: TROPHY_H - 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: winner ? 'space-between' : 'flex-end', paddingTop: winner ? 6 : 0 }}>
        {winner && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: '38px', lineHeight: 1 }}>{winner.flag}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#e8e8e8', textTransform: 'uppercase', textAlign: 'center', maxWidth: COL_W - 8 }}>{winner.name}</span>
          </div>
        )}
        <img
          src="/trophy.svg"
          alt="World Cup Trophy"
          width={56}
          height={68}
          style={{ objectFit: 'contain', display: 'block' }}
        />
      </div>
      {/* Match caption */}
      <MatchCaption match={match} />
      {/* Final match box */}
      <PosterMatchBox match={match} size="lg" showLabel={false} popoverSide="top" onMatchClick={onMatchClick} />
    </motion.div>
  )
}

function ThirdBox({ match, colX, cy, matchH, delay, simKey, onMatchClick }: { match: Match | null; colX: number; cy: number; matchH: number; delay: number; simKey: number; onMatchClick?: (id: string) => void }) {
  return (
    <motion.div
      key={`${simKey}-third`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay }}
      className="absolute"
      data-sim-tile={match?.id}
      style={{ ...SIM_SCROLL_STYLE, left: colX, top: cy - matchH / 2 - CAPTION_H - 18 - (getFinalWinner(match) ? 28 : 0), width: COL_W }}
    >
      {/* 3rd place winner */}
      {(() => {
        const third = getFinalWinner(match)
        return third ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 10 }}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{third.flag}</span>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#c0c0c0', letterSpacing: '0.04em' }}>{third.name}</span>
          </div>
        ) : null
      })()}
      <div
        className="flex items-center justify-center mb-2 rounded-sm"
        style={{ height: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#666' }}>3RD PLACE</span>
      </div>
      <MatchCaption match={match} />
      <PosterMatchBox match={match} size="sm" showLabel={false} popoverSide="top" onMatchClick={onMatchClick} />
    </motion.div>
  )
}
