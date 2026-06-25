'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Bracket, Match } from '@/lib/types'
import { PosterMatchBox } from './PosterMatchBox'

interface KnockoutPosterBracketProps {
  knockoutBracket: Bracket[]
}

// ─── Layout constants ────────────────────────────────────────────────────────
const SLOT_H = 68      // height of one R32 slot (match box height + gap)
const MATCH_H = 52     // match box height
const ROWS = 8         // R32 matches per side
const TOTAL_H = ROWS * SLOT_H   // 544px

const COL_W = 112      // match column width
const GAP_W = 22       // gap between columns (SVG connector space)
const STEP = COL_W + GAP_W  // 134px per round

// Column left-x positions (9 match columns, left → right)
//   R32L   R16L   QFL   SFL   FINAL   SFR   QFR   R16R   R32R
const COL_X = [
  0,                                 // R32 left
  STEP,                              // R16 left
  2 * STEP,                          // QF left
  3 * STEP,                          // SF left
  4 * STEP,                          // Final (center)
  5 * STEP,                          // SF right
  6 * STEP,                          // QF right
  7 * STEP,                          // R16 right
  8 * STEP,                          // R32 right
]
const TOTAL_W = 8 * STEP + COL_W    // 1085 + 112 = 1197px

// ─── Vertical center-Y of each match position ────────────────────────────────
function matchCY(slotIndex: number): number {
  return slotIndex * SLOT_H + SLOT_H / 2
}

// R32: slots 0-7 → CY 34, 102, 170, 238, 306, 374, 442, 510
const R32_CY = Array.from({ length: 8 }, (_, i) => matchCY(i))
// R16: each spans 2 R32 slots
const R16_CY = Array.from({ length: 4 }, (_, i) => (R32_CY[2 * i] + R32_CY[2 * i + 1]) / 2)
// QF: each spans 4 R32 slots
const QF_CY = Array.from({ length: 2 }, (_, i) => (R16_CY[2 * i] + R16_CY[2 * i + 1]) / 2)
// SF: spans 8 slots
const SF_CY = (QF_CY[0] + QF_CY[1]) / 2  // = TOTAL_H / 2 = 272
// Final: same vertical center
const FINAL_CY = SF_CY
// 3rd place: below final
const THIRD_CY = TOTAL_H - SLOT_H / 2

// ─── SVG connector path builder ──────────────────────────────────────────────
// Left side: connector exits from RIGHT edge of colX, enters LEFT edge of nextColX
function leftConnector(colX: number, y1: number, y2: number, nextX: number): string {
  const mx = colX + COL_W + GAP_W / 2  // midpoint x in gap
  const yMid = (y1 + y2) / 2
  return `M${colX + COL_W},${y1} H${mx} V${y2} M${colX + COL_W},${y2} H${mx} M${mx},${yMid} H${nextX}`
}

// Right side: connector exits from LEFT edge of colX, enters RIGHT edge of prevX+COL_W
function rightConnector(colX: number, y1: number, y2: number, prevRightX: number): string {
  const mx = colX - GAP_W / 2  // midpoint x in gap to the left of colX
  const yMid = (y1 + y2) / 2
  return `M${colX},${y1} H${mx} V${y2} M${colX},${y2} H${mx} M${mx},${yMid} H${prevRightX + COL_W}`
}

// Single horizontal line into final from SF
function sfToFinal(sfColX: number, sfCY: number, finalColX: number, finalCY: number, fromRight: boolean): string {
  if (fromRight) {
    return `M${sfColX},${sfCY} H${finalColX + COL_W}`
  }
  return `M${sfColX + COL_W},${sfCY} H${finalColX}`
}

export function KnockoutPosterBracket({ knockoutBracket }: KnockoutPosterBracketProps) {
  const rounds = useMemo(() => {
    const map: Record<string, Match[]> = {}
    knockoutBracket.forEach(b => { map[b.round] = b.matches })
    return map
  }, [knockoutBracket])

  const r32 = rounds['r32'] || []
  const r16 = rounds['r16'] || []
  const qf  = rounds['qf']  || []
  const sf  = rounds['sf']  || []
  const fin = rounds['final'] || []
  const tp  = rounds['3p']  || []

  // Split left/right
  const r32L = r32.slice(0, 8)
  const r32R = r32.slice(8, 16)
  const r16L = r16.slice(0, 4)
  const r16R = r16.slice(4, 8)
  const qfL  = qf.slice(0, 2)
  const qfR  = qf.slice(2, 4)
  const sfL  = sf[0] ?? null
  const sfR  = sf[1] ?? null
  const final = fin[0] ?? null
  const third = tp[0] ?? null

  // ─── SVG connector paths ─────────────────────────────────────────────────
  const svgPaths = useMemo(() => {
    const paths: { d: string; key: string; highlighted?: boolean }[] = []

    // LEFT SIDE connectors (R32L → R16L → QFL → SFL → Final)
    // R32L → R16L
    for (let i = 0; i < 4; i++) {
      paths.push({
        key: `l-r32-r16-${i}`,
        d: leftConnector(COL_X[0], R32_CY[2 * i], R32_CY[2 * i + 1], COL_X[1]),
      })
    }
    // R16L → QFL
    for (let i = 0; i < 2; i++) {
      paths.push({
        key: `l-r16-qf-${i}`,
        d: leftConnector(COL_X[1], R16_CY[2 * i], R16_CY[2 * i + 1], COL_X[2]),
      })
    }
    // QFL → SFL
    paths.push({ key: 'l-qf-sf', d: leftConnector(COL_X[2], QF_CY[0], QF_CY[1], COL_X[3]) })
    // SFL → Final
    paths.push({ key: 'l-sf-final', d: sfToFinal(COL_X[3], SF_CY, COL_X[4], FINAL_CY, false) })

    // RIGHT SIDE connectors (R32R → R16R → QFR → SFR → Final)
    // R32R → R16R
    for (let i = 0; i < 4; i++) {
      paths.push({
        key: `r-r32-r16-${i}`,
        d: rightConnector(COL_X[8], R32_CY[2 * i], R32_CY[2 * i + 1], COL_X[7]),
      })
    }
    // R16R → QFR
    for (let i = 0; i < 2; i++) {
      paths.push({
        key: `r-r16-qf-${i}`,
        d: rightConnector(COL_X[7], R16_CY[2 * i], R16_CY[2 * i + 1], COL_X[6]),
      })
    }
    // QFR → SFR
    paths.push({ key: 'r-qf-sf', d: rightConnector(COL_X[6], QF_CY[0], QF_CY[1], COL_X[5]) })
    // SFR → Final
    paths.push({ key: 'r-sf-final', d: sfToFinal(COL_X[5], SF_CY, COL_X[4], FINAL_CY, true) })

    return paths
  }, [])

  // Helper: render a match column
  function MatchColumn({
    matches,
    colIdx,
    cyList,
    side,
    animDelay = 0,
  }: {
    matches: (Match | null)[]
    colIdx: number
    cyList: number[]
    side: 'left' | 'right'
    animDelay?: number
  }) {
    return (
      <>
        {matches.map((match, i) => {
          const cy = cyList[i]
          const top = cy - MATCH_H / 2
          const popoverSide = side === 'left' ? 'right' : 'left'
          return (
            <motion.div
              key={match?.id ?? `tbd-${colIdx}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: animDelay + i * 0.04 }}
              className="absolute"
              style={{ left: COL_X[colIdx], top, width: COL_W }}
            >
              <PosterMatchBox match={match} size="sm" showLabel popoverSide={popoverSide} />
            </motion.div>
          )
        })}
      </>
    )
  }

  const roundLabelStyle: React.CSSProperties = {
    fontSize: '8px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: '#334155',
    textTransform: 'uppercase',
  }

  return (
    <div className="relative select-none" style={{ width: TOTAL_W, height: TOTAL_H + 48 }}>
      {/* Round header labels */}
      <div className="absolute top-0 left-0 right-0 flex" style={{ height: '20px' }}>
        {[
          { label: 'Round of 32', x: COL_X[0] },
          { label: 'Round of 16', x: COL_X[1] },
          { label: 'Quarter-Finals', x: COL_X[2] },
          { label: 'Semi-Finals', x: COL_X[3] },
          { label: 'Final', x: COL_X[4] },
          { label: 'Semi-Finals', x: COL_X[5] },
          { label: 'Quarter-Finals', x: COL_X[6] },
          { label: 'Round of 16', x: COL_X[7] },
          { label: 'Round of 32', x: COL_X[8] },
        ].map(({ label, x }) => (
          <div key={label + x} className="absolute text-center" style={{ left: x, width: COL_W, top: 0, ...roundLabelStyle }}>
            {label}
          </div>
        ))}
      </div>

      {/* Main bracket area */}
      <div className="absolute" style={{ top: '24px', left: 0, width: TOTAL_W, height: TOTAL_H }}>
        {/* SVG connector lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={TOTAL_W}
          height={TOTAL_H}
          style={{ zIndex: 0 }}
        >
          {svgPaths.map(({ d, key }) => (
            <path key={key} d={d} className="bracket-line" />
          ))}
          {/* Highlight lines for completed path (thicker, brighter) */}
        </svg>

        {/* LEFT BRACKET */}
        <MatchColumn matches={r32L} colIdx={0} cyList={R32_CY} side="left" animDelay={0.1} />
        <MatchColumn matches={r16L} colIdx={1} cyList={R16_CY} side="left" animDelay={0.2} />
        <MatchColumn matches={qfL}  colIdx={2} cyList={QF_CY}  side="left" animDelay={0.3} />
        {sfL && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="absolute"
            style={{ left: COL_X[3], top: SF_CY - MATCH_H / 2, width: COL_W }}
          >
            <PosterMatchBox match={sfL} size="sm" showLabel popoverSide="right" />
          </motion.div>
        )}

        {/* CENTER: Final */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="absolute"
          style={{ left: COL_X[4], top: FINAL_CY - 36, width: COL_W }}
        >
          {/* Final label banner */}
          <div
            className="flex items-center justify-center mb-1 rounded-sm"
            style={{
              height: '16px',
              background: 'linear-gradient(90deg, rgba(59,130,246,0.15), rgba(59,130,246,0.25), rgba(59,130,246,0.15))',
              border: '1px solid rgba(59,130,246,0.3)',
            }}
          >
            <span style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '0.2em', color: '#60a5fa' }}>FINAL</span>
          </div>
          <PosterMatchBox match={final} size="lg" showLabel={false} popoverSide="top" />
        </motion.div>

        {/* CENTER: 3rd Place */}
        {third && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.55 }}
            className="absolute"
            style={{ left: COL_X[4], top: THIRD_CY - MATCH_H / 2 - 8, width: COL_W }}
          >
            <div
              className="flex items-center justify-center mb-1 rounded-sm"
              style={{
                height: '12px',
                background: 'rgba(30,40,60,0.5)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span style={{ fontSize: '7px', fontWeight: 700, letterSpacing: '0.15em', color: '#475569' }}>3RD PLACE</span>
            </div>
            <PosterMatchBox match={third} size="sm" showLabel={false} popoverSide="top" />
          </motion.div>
        )}

        {/* RIGHT BRACKET */}
        {sfR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="absolute"
            style={{ left: COL_X[5], top: SF_CY - MATCH_H / 2, width: COL_W }}
          >
            <PosterMatchBox match={sfR} size="sm" showLabel popoverSide="left" />
          </motion.div>
        )}
        <MatchColumn matches={qfR}  colIdx={6} cyList={QF_CY}  side="right" animDelay={0.3} />
        <MatchColumn matches={r16R} colIdx={7} cyList={R16_CY} side="right" animDelay={0.2} />
        <MatchColumn matches={r32R} colIdx={8} cyList={R32_CY} side="right" animDelay={0.1} />
      </div>
    </div>
  )
}
