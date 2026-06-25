'use client'

import { useRef, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface YearEntry {
  year: number
  host: string
  winner: string | null
  format: number
  file: string
}

const TrophyImg = () => (
  <img
    src="/trophy.svg"
    width={12}
    height={15}
    style={{
      objectFit: 'contain',
      display: 'inline-block',
      verticalAlign: 'middle',
      filter: 'brightness(0.6)',
    }}
    alt=""
  />
)

export function YearSelector({
  yearIndex,
  selectedYear,
  onChange,
}: {
  yearIndex: YearEntry[] | null
  selectedYear: number | null
  onChange: (year: number) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const selected = yearIndex?.find(e => e.year === selectedYear) ?? null

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-[12px] px-2.5 py-1.5 rounded cursor-pointer outline-none flex items-center gap-1.5"
        style={{
          background: 'rgba(10,10,10,0.95)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#d8d8d8',
          userSelect: 'none',
        }}
      >
        {selected ? (
          <>
            <span>{selected.year}</span>
            <span style={{ color: '#666' }}>·</span>
            <span>{selected.host}</span>
            {selected.winner ? (
              <>
                <span style={{ color: '#666' }}>·</span>
                <span>{selected.winner}</span>
                <TrophyImg />
              </>
            ) : selected.year === 2026 ? (
              <>
                <span style={{ color: '#666' }}>·</span>
                <span style={{ color: '#666' }}>In Progress</span>
              </>
            ) : null}
          </>
        ) : (
          <span>Select year</span>
        )}
        <span style={{ marginLeft: 4, color: '#888', fontSize: 10 }}>▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: 4,
              width: 340,
              borderRadius: 6,
              overflow: 'hidden',
              background: 'rgba(8,8,8,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              zIndex: 50,
              transformOrigin: 'top right',
            }}
          >
            {/* Column headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr 120px',
                gap: '0 12px',
                padding: '6px 12px 5px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {['Year', 'Host', 'Winner'].map((h, i) => (
                <span
                  key={h}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#555',
                    textAlign: i === 0 ? 'right' : i === 2 ? 'right' : 'left',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {[...(yearIndex ?? [])].sort((a, b) => b.year - a.year).map(e => {
              const isSelected = e.year === selectedYear
              return (
                <div
                  key={e.year}
                  onClick={() => { onChange(e.year); setOpen(false) }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr 120px',
                    gap: '0 12px',
                    alignItems: 'center',
                    padding: '7px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: isSelected ? '#e8e8e8' : '#999',
                    background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={ev => { if (!isSelected) (ev.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={ev => { if (!isSelected) (ev.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  {/* Col 1: Year */}
                  <span style={{ textAlign: 'right', fontWeight: isSelected ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>
                    {e.year}
                  </span>
                  {/* Col 2: Host */}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isSelected ? '#c8c8c8' : '#888' }}>
                    {e.host}
                  </span>
                  {/* Col 3: Winner + Trophy */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                    {e.winner ? (
                      <>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isSelected ? '#d8d8d8' : '#aaa' }}>
                          {e.winner}
                        </span>
                        <TrophyImg />
                      </>
                    ) : (
                      <span style={{ color: '#555', fontStyle: 'italic' }}>In Progress</span>
                    )}
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
