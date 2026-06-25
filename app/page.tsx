'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Tournament, Tournaments } from '@/lib/types'
import { CompactGroupTable } from '@/components/CompactGroupTable'
import { KnockoutPosterBracket } from '@/components/KnockoutPosterBracket'

// ─── Refresh badge ────────────────────────────────────────────────────────────
function RefreshStatusBadge({ lastUpdated }: { lastUpdated: string }) {
  const formatted = useMemo(() => {
    const d = new Date(lastUpdated)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }, [lastUpdated])

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{
        background: 'rgba(10,14,22,0.8)',
        border: '1px solid rgba(30,40,60,0.8)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
      <span className="text-[9px]" style={{ color: '#475569' }}>
        Updates hourly · Last updated {formatted}
      </span>
    </div>
  )
}

// ─── Poster title ─────────────────────────────────────────────────────────────
function PosterTitle({ year, format }: { year: number; format: number }) {
  return (
    <div className="flex flex-col items-center gap-0">
      <div className="flex items-baseline gap-3">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-bold tracking-tight"
          style={{
            fontSize: '26px',
            letterSpacing: '-0.01em',
            background: 'linear-gradient(180deg, #f1f5f9 0%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          FOOTBALL WORLD CUP
        </motion.h1>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-bold"
          style={{
            fontSize: '32px',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {year}
        </motion.span>
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-[10px] tracking-[0.25em] uppercase"
        style={{ color: '#334155' }}
      >
        Wall Chart · {format} Teams · Knockout Bracket
      </motion.p>
    </div>
  )
}

// ─── Stats panel ──────────────────────────────────────────────────────────────
function StatsPanel({ tournament }: { tournament: Tournament }) {
  const stats = useMemo(() => ({
    topScorers: [...tournament.players].sort((a, b) => b.goals - a.goals).slice(0, 5),
    mostAssists: [...tournament.players].sort((a, b) => b.assists - a.assists).slice(0, 5),
    yellowCards: [...tournament.players].sort((a, b) => b.yellowCards - a.yellowCards).slice(0, 5),
    mom: [...tournament.players].sort((a, b) => b.playerOfMatch - a.playerOfMatch).slice(0, 5),
  }), [tournament.players])

  function StatBlock({ title, items, valueKey }: { title: string; items: typeof stats.topScorers; valueKey: keyof typeof stats.topScorers[0] }) {
    return (
      <div
        className="flex-1 rounded"
        style={{ background: 'rgba(10,13,22,0.6)', border: '1px solid rgba(30,40,60,0.7)', minWidth: '140px' }}
      >
        <div className="px-3 py-1.5" style={{ borderBottom: '1px solid rgba(30,40,60,0.7)' }}>
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#475569' }}>{title}</span>
        </div>
        <div className="px-3 py-1.5 space-y-1">
          {items.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] w-3 text-right flex-shrink-0" style={{ color: i === 0 ? '#93c5fd' : '#334155' }}>{i + 1}</span>
                <span className="text-[10px] truncate" style={{ color: i === 0 ? '#e2e8f0' : '#94a3b8' }}>{p.name}</span>
              </div>
              <span className="text-[11px] font-bold flex-shrink-0" style={{ color: i === 0 ? '#60a5fa' : '#475569' }}>
                {p[valueKey] as number}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="flex gap-3 flex-wrap"
    >
      <StatBlock title="Top Scorers" items={stats.topScorers} valueKey="goals" />
      <StatBlock title="Most Assists" items={stats.mostAssists} valueKey="assists" />
      <StatBlock title="Yellow Cards" items={stats.yellowCards} valueKey="yellowCards" />
      <StatBlock title="Player of Match" items={stats.mom} valueKey="playerOfMatch" />
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Page() {
  const [allTournaments, setAllTournaments] = useState<Tournaments | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'wallchart' | 'stats'>('wallchart')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/world-cups.json')
      .then(r => r.json())
      .then((data: Tournaments) => {
        setAllTournaments(data)
        setSelectedYear(data.latestYear)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const tournament = useMemo(() => {
    if (!allTournaments || !selectedYear) return null
    return allTournaments.tournaments.find(t => t.year === selectedYear) ?? null
  }, [allTournaments, selectedYear])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
          <span className="text-[11px] tracking-widest uppercase" style={{ color: '#334155' }}>Loading bracket…</span>
        </div>
      </main>
    )
  }

  if (!tournament) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: '#475569' }}>Failed to load tournament data.</p>
      </main>
    )
  }

  const leftGroups = tournament.groups.slice(0, 6)
  const rightGroups = tournament.groups.slice(6, 12)

  return (
    <main className="min-h-screen pb-12">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-2"
        style={{
          background: 'rgba(6,8,14,0.92)',
          borderBottom: '1px solid rgba(30,40,60,0.7)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
          >
            <span style={{ fontSize: '12px' }}>⚽</span>
          </div>
          <span className="text-[11px] font-bold tracking-wider" style={{ color: '#93c5fd' }}>FOOTBALL WC</span>
        </div>

        {/* Nav tabs */}
        <div className="flex items-center gap-1">
          {(['wallchart', 'stats'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-1 rounded text-[10px] font-semibold tracking-wider uppercase transition-all"
              style={{
                background: activeTab === tab ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: activeTab === tab ? '#60a5fa' : '#475569',
                border: `1px solid ${activeTab === tab ? 'rgba(59,130,246,0.4)' : 'transparent'}`,
              }}
            >
              {tab === 'wallchart' ? 'Wall Chart' : 'Stats'}
            </button>
          ))}
        </div>

        {/* Year selector + badge */}
        <div className="flex items-center gap-3">
          <select
            value={selectedYear ?? ''}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="text-[10px] px-2 py-1 rounded cursor-pointer"
            style={{
              background: 'rgba(10,14,22,0.9)',
              border: '1px solid rgba(30,40,60,0.8)',
              color: '#94a3b8',
            }}
          >
            {allTournaments?.tournaments
              .sort((a, b) => b.year - a.year)
              .map(t => (
                <option key={t.year} value={t.year}>{t.year} ({t.format ?? 32} teams)</option>
              ))}
          </select>
          <RefreshStatusBadge lastUpdated={tournament.lastUpdated} />
        </div>
      </div>

      {/* ── Poster header ───────────────────────────────────────── */}
      <div className="flex items-center justify-center py-4">
        <PosterTitle year={tournament.year} format={tournament.format ?? 48} />
      </div>

      {/* ── Main content ────────────────────────────────────────── */}
      {activeTab === 'wallchart' && (
        <div
          className="poster-scroll mx-auto overflow-x-auto"
          style={{ maxWidth: '100vw' }}
        >
          {/* Poster card */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative mx-auto rounded-xl"
            style={{
              minWidth: '1480px',
              width: 'max-content',
              background: 'rgba(8,10,18,0.75)',
              border: '1px solid rgba(30,40,60,0.6)',
              boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(30,40,60,0.3)',
              backdropFilter: 'blur(4px)',
              padding: '16px 12px',
            }}
          >
            {/* Subtle top shimmer line */}
            <div
              className="absolute top-0 left-12 right-12 h-px rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.3), transparent)' }}
            />

            <div className="flex gap-2 items-start">
              {/* LEFT GROUPS (A–F) */}
              <div className="flex-shrink-0 flex flex-col gap-1.5" style={{ width: '136px' }}>
                {leftGroups.map((group, idx) => (
                  <CompactGroupTable
                    key={group.group}
                    group={group}
                    side="left"
                    animDelay={idx * 0.05}
                  />
                ))}
              </div>

              {/* BRACKET CENTER */}
              <div className="flex-1 overflow-hidden">
                <KnockoutPosterBracket knockoutBracket={tournament.knockoutBracket} />
              </div>

              {/* RIGHT GROUPS (G–L) */}
              <div className="flex-shrink-0 flex flex-col gap-1.5" style={{ width: '136px' }}>
                {rightGroups.map((group, idx) => (
                  <CompactGroupTable
                    key={group.group}
                    group={group}
                    side="right"
                    animDelay={idx * 0.05}
                  />
                ))}
              </div>
            </div>

            {/* Bottom shimmer */}
            <div
              className="absolute bottom-0 left-12 right-12 h-px rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.15), transparent)' }}
            />
          </motion.div>

          {/* Scroll hint on small viewports */}
          <p className="text-center mt-2 text-[9px] tracking-widest" style={{ color: '#1e293b' }}>
            ← SCROLL HORIZONTALLY FOR FULL BRACKET →
          </p>
        </div>
      )}

      {/* ── Stats tab ───────────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div className="max-w-4xl mx-auto px-6 py-4">
          <StatsPanel tournament={tournament} />
        </div>
      )}
    </main>
  )
}
