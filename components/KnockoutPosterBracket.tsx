'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Bracket, Match } from '@/lib/types'
import { PosterMatchBox } from './PosterMatchBox'

interface Props {
  knockoutBracket: Bracket[]
}

// ─── Layout constants ─────────────────────────────────────────────────────────
const COL_W  = 140   // match box width
const GAP_W  = 18    // gap between columns (connector space)
const STEP   = COL_W + GAP_W  // 158px per column step
const TOTAL_H = 608  // fixed height for both formats

// ── 48-team (R32 → R16 → QF → SF → Final) ────────────────────────────────────
// 9 columns: [R32L][R16L][QFL][SFL][FINAL][SFR][QFR][R16R][R32R]
const SLOT_H_48  = TOTAL_H / 8   // 76px per slot
const MATCH_H_48 = 60
const COL_X_48 = Array.from({ length: 9 }, (_, i) => i * STEP)
const TOTAL_W_48 = 8 * STEP + COL_W  // 8*158+140 = 1404px

const R32_CY_48 = Array.from({ length: 8 }, (_, i) => i * SLOT_H_48 + SLOT_H_48 / 2)
const R16_CY_48 = Array.from({ length: 4 }, (_, i) => (R32_CY_48[2*i] + R32_CY_48[2*i+1]) / 2)
const QF_CY_48  = Array.from({ length: 2 }, (_, i) => (R16_CY_48[2*i] + R16_CY_48[2*i+1]) / 2)
const SF_CY_48  = (QF_CY_48[0] + QF_CY_48[1]) / 2
const FINAL_CY_48  = SF_CY_48
const THIRD_CY_48  = TOTAL_H - SLOT_H_48 / 2

// ── 32-team (R16 → QF → SF → Final) ─────────────────────────────────────────
// 7 columns: [R16L][QFL][SFL][FINAL][SFR][QFR][R16R]
const SLOT_H_32  = TOTAL_H / 4   // 152px per slot
const MATCH_H_32 = 72
const COL_X_32 = Array.from({ length: 7 }, (_, i) => i * STEP)
const TOTAL_W_32 = 6 * STEP + COL_W  // 6*158+140 = 1088px

const R16_CY_32 = Array.from({ length: 4 }, (_, i) => i * SLOT_H_32 + SLOT_H_32 / 2)
const QF_CY_32  = Array.from({ length: 2 }, (_, i) => (R16_CY_32[2*i] + R16_CY_32[2*i+1]) / 2)
const SF_CY_32  = (QF_CY_32[0] + QF_CY_32[1]) / 2
const FINAL_CY_32  = SF_CY_32
const THIRD_CY_32  = TOTAL_H - SLOT_H_32 / 2

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
export function KnockoutPosterBracket({ knockoutBracket }: Props) {
  const rounds = useMemo(() => {
    const m: Record<string, Match[]> = {}
    knockoutBracket.forEach(b => { m[b.round] = b.matches })
    return m
  }, [knockoutBracket])

  const is48 = !!rounds['r32']

  if (is48) return <Bracket48 rounds={rounds} />
  return <Bracket32 rounds={rounds} />
}

// ─── 48-team bracket ──────────────────────────────────────────────────────────
function Bracket48({ rounds }: { rounds: Record<string, Match[]> }) {
  const r32 = rounds['r32'] || []
  const r16 = rounds['r16'] || []
  const qf  = rounds['qf']  || []
  const sf  = rounds['sf']  || []
  const fin = rounds['final'] || []
  const tp  = rounds['3p']  || []

  const r32L = r32.slice(0, 8), r32R = r32.slice(8, 16)
  const r16L = r16.slice(0, 4), r16R = r16.slice(4, 8)
  const qfL  = qf.slice(0, 2),  qfR  = qf.slice(2, 4)
  const sfL  = sf[0] ?? null,   sfR  = sf[1] ?? null
  const final = fin[0] ?? null
  const third = tp[0]  ?? null

  const svgPaths = useMemo(() => {
    const p: string[] = []
    // Left: R32→R16
    for (let i = 0; i < 4; i++) p.push(leftPath(COL_X_48[0], R32_CY_48[2*i], R32_CY_48[2*i+1], COL_X_48[1]))
    // Left: R16→QF
    for (let i = 0; i < 2; i++) p.push(leftPath(COL_X_48[1], R16_CY_48[2*i], R16_CY_48[2*i+1], COL_X_48[2]))
    // Left: QF→SF
    p.push(leftPath(COL_X_48[2], QF_CY_48[0], QF_CY_48[1], COL_X_48[3]))
    // Left: SF→Final
    p.push(sfToFinal(COL_X_48[3], SF_CY_48, COL_X_48[4], false))
    // Right: R32→R16
    for (let i = 0; i < 4; i++) p.push(rightPath(COL_X_48[8], R32_CY_48[2*i], R32_CY_48[2*i+1], COL_X_48[7]))
    // Right: R16→QF
    for (let i = 0; i < 2; i++) p.push(rightPath(COL_X_48[7], R16_CY_48[2*i], R16_CY_48[2*i+1], COL_X_48[6]))
    // Right: QF→SF
    p.push(rightPath(COL_X_48[6], QF_CY_48[0], QF_CY_48[1], COL_X_48[5]))
    // Right: SF→Final
    p.push(sfToFinal(COL_X_48[5], SF_CY_48, COL_X_48[4], true))
    return p
  }, [])

  const labelStyle: React.CSSProperties = { fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', color: '#333', textTransform: 'uppercase', textAlign: 'center' }

  return (
    <div className="relative select-none" style={{ width: TOTAL_W_48, height: TOTAL_H + 56 }}>
      {/* Round headers */}
      <div className="absolute top-0 left-0 right-0" style={{ height: '22px' }}>
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
      <div className="absolute" style={{ top: '26px', left: 0, width: TOTAL_W_48, height: TOTAL_H }}>
        {/* SVG connectors */}
        <svg className="absolute inset-0 pointer-events-none" width={TOTAL_W_48} height={TOTAL_H} style={{ zIndex: 0 }}>
          {svgPaths.map((d, i) => <path key={i} d={d} className="bracket-line" />)}
        </svg>

        {/* Left bracket */}
        <MatchCol matches={r32L} colX={COL_X_48[0]} cyList={R32_CY_48} matchH={MATCH_H_48} side="left" delay={0.05} />
        <MatchCol matches={r16L} colX={COL_X_48[1]} cyList={R16_CY_48} matchH={MATCH_H_48} side="left" delay={0.12} />
        <MatchCol matches={qfL}  colX={COL_X_48[2]} cyList={QF_CY_48}  matchH={MATCH_H_48} side="left" delay={0.20} />
        {sfL && <SingleMatch match={sfL} colX={COL_X_48[3]} cy={SF_CY_48}    matchH={MATCH_H_48} side="left"  delay={0.28} />}

        {/* Final */}
        <FinalBox match={final} colX={COL_X_48[4]} cy={FINAL_CY_48} delay={0.35} />

        {/* 3rd place */}
        {third && <ThirdBox match={third} colX={COL_X_48[4]} cy={THIRD_CY_48} matchH={MATCH_H_48} delay={0.38} />}

        {/* Right bracket */}
        {sfR && <SingleMatch match={sfR} colX={COL_X_48[5]} cy={SF_CY_48} matchH={MATCH_H_48} side="right" delay={0.28} />}
        <MatchCol matches={qfR}  colX={COL_X_48[6]} cyList={QF_CY_48}  matchH={MATCH_H_48} side="right" delay={0.20} />
        <MatchCol matches={r16R} colX={COL_X_48[7]} cyList={R16_CY_48} matchH={MATCH_H_48} side="right" delay={0.12} />
        <MatchCol matches={r32R} colX={COL_X_48[8]} cyList={R32_CY_48} matchH={MATCH_H_48} side="right" delay={0.05} />
      </div>
    </div>
  )
}

// ─── 32-team bracket ──────────────────────────────────────────────────────────
function Bracket32({ rounds }: { rounds: Record<string, Match[]> }) {
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

  const svgPaths = useMemo(() => {
    const p: string[] = []
    // Left: R16→QF
    for (let i = 0; i < 2; i++) p.push(leftPath(COL_X_32[0], R16_CY_32[2*i], R16_CY_32[2*i+1], COL_X_32[1]))
    // Left: QF→SF
    p.push(leftPath(COL_X_32[1], QF_CY_32[0], QF_CY_32[1], COL_X_32[2]))
    // Left: SF→Final
    p.push(sfToFinal(COL_X_32[2], SF_CY_32, COL_X_32[3], false))
    // Right: R16→QF
    for (let i = 0; i < 2; i++) p.push(rightPath(COL_X_32[6], R16_CY_32[2*i], R16_CY_32[2*i+1], COL_X_32[5]))
    // Right: QF→SF
    p.push(rightPath(COL_X_32[5], QF_CY_32[0], QF_CY_32[1], COL_X_32[4]))
    // Right: SF→Final
    p.push(sfToFinal(COL_X_32[4], SF_CY_32, COL_X_32[3], true))
    return p
  }, [])

  const labelStyle: React.CSSProperties = { fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', color: '#333', textTransform: 'uppercase', textAlign: 'center' }

  return (
    <div className="relative select-none" style={{ width: TOTAL_W_32, height: TOTAL_H + 56 }}>
      {/* Round headers */}
      <div className="absolute top-0 left-0 right-0" style={{ height: '22px' }}>
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
      <div className="absolute" style={{ top: '26px', left: 0, width: TOTAL_W_32, height: TOTAL_H }}>
        <svg className="absolute inset-0 pointer-events-none" width={TOTAL_W_32} height={TOTAL_H} style={{ zIndex: 0 }}>
          {svgPaths.map((d, i) => <path key={i} d={d} className="bracket-line" />)}
        </svg>

        {/* Left bracket */}
        <MatchCol matches={r16L} colX={COL_X_32[0]} cyList={R16_CY_32} matchH={MATCH_H_32} side="left" delay={0.05} />
        <MatchCol matches={qfL}  colX={COL_X_32[1]} cyList={QF_CY_32}  matchH={MATCH_H_32} side="left" delay={0.15} />
        {sfL && <SingleMatch match={sfL} colX={COL_X_32[2]} cy={SF_CY_32} matchH={MATCH_H_32} side="left" delay={0.25} />}

        {/* Final */}
        <FinalBox match={final} colX={COL_X_32[3]} cy={FINAL_CY_32} delay={0.35} />

        {/* 3rd place */}
        {third && <ThirdBox match={third} colX={COL_X_32[3]} cy={THIRD_CY_32} matchH={MATCH_H_32} delay={0.38} />}

        {/* Right bracket */}
        {sfR && <SingleMatch match={sfR} colX={COL_X_32[4]} cy={SF_CY_32} matchH={MATCH_H_32} side="right" delay={0.25} />}
        <MatchCol matches={qfR}  colX={COL_X_32[5]} cyList={QF_CY_32}  matchH={MATCH_H_32} side="right" delay={0.15} />
        <MatchCol matches={r16R} colX={COL_X_32[6]} cyList={R16_CY_32} matchH={MATCH_H_32} side="right" delay={0.05} />
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MatchCol({ matches, colX, cyList, matchH, side, delay }: {
  matches: (Match | null)[]
  colX: number
  cyList: number[]
  matchH: number
  side: 'left' | 'right'
  delay: number
}) {
  return (
    <>
      {matches.map((match, i) => {
        const cy = cyList[i] ?? 0
        return (
          <motion.div
            key={match?.id ?? `tbd-${colX}-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: delay + i * 0.03 }}
            className="absolute"
            style={{ left: colX, top: cy - matchH / 2, width: COL_W }}
          >
            <PosterMatchBox match={match} size="sm" showLabel popoverSide={side === 'left' ? 'right' : 'left'} />
          </motion.div>
        )
      })}
    </>
  )
}

function SingleMatch({ match, colX, cy, matchH, side, delay }: {
  match: Match | null; colX: number; cy: number; matchH: number; side: 'left' | 'right'; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, delay }}
      className="absolute"
      style={{ left: colX, top: cy - matchH / 2, width: COL_W }}
    >
      <PosterMatchBox match={match} size="sm" showLabel popoverSide={side === 'left' ? 'right' : 'left'} />
    </motion.div>
  )
}

function FinalBox({ match, colX, cy, delay }: { match: Match | null; colX: number; cy: number; delay: number }) {
  const FINAL_H = 80
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className="absolute"
      style={{ left: colX, top: cy - FINAL_H / 2 - 20, width: COL_W }}
    >
      {/* Final banner */}
      <div
        className="flex items-center justify-center mb-1 rounded-sm"
        style={{ height: '15px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <span style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '0.22em', color: '#d0d0d0' }}>FINAL</span>
      </div>
      <PosterMatchBox match={match} size="lg" showLabel={false} popoverSide="top" />
    </motion.div>
  )
}

function ThirdBox({ match, colX, cy, matchH, delay }: { match: Match | null; colX: number; cy: number; matchH: number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, delay }}
      className="absolute"
      style={{ left: colX, top: cy - matchH / 2 - 14, width: COL_W }}
    >
      <div
        className="flex items-center justify-center mb-1 rounded-sm"
        style={{ height: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span style={{ fontSize: '7px', fontWeight: 700, letterSpacing: '0.14em', color: '#444' }}>3RD PLACE</span>
      </div>
      <PosterMatchBox match={match} size="sm" showLabel={false} popoverSide="top" />
    </motion.div>
  )
}
