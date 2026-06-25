'use client'

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tournament } from '@/lib/types'
import { CompactGroupTable } from '@/components/CompactGroupTable'
import { KnockoutPosterBracket } from '@/components/KnockoutPosterBracket'
import dynamic from 'next/dynamic'

// Lazy-load simulation to avoid SSR issues
const SimulationPlayer   = dynamic(() => import('@/components/SimulationPlayer').then(m => ({ default: m.SimulationPlayer })), { ssr: false })
const AnimatedSimulation = dynamic(() => import('@/components/AnimatedTournamentSimulation').then(m => ({ default: m.AnimatedTournamentSimulation })), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────
interface YearEntry {
  year: number
  host: string
  winner: string | null
  format: number
  file: string
}

// ── Refresh badge ─────────────────────────────────────────────────────────────
function RefreshBadge({ ts }: { ts: string }) {
  const label = useMemo(() => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }, [ts])
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(8,8,8,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)' }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#6fcf7a', boxShadow: '0 0 4px #6fcf7a88' }} />
      <span className="text-[8.5px]" style={{ color: '#444' }}>Updated {label}</span>
    </div>
  )
}

// ── Stats panel ───────────────────────────────────────────────────────────────
function StatsPanel({ tournament }: { tournament: Tournament }) {
  const s = useMemo(() => ({
    scorers:  [...tournament.players].sort((a, b) => b.goals - a.goals).slice(0, 6),
    assists:  [...tournament.players].sort((a, b) => b.assists - a.assists).slice(0, 6),
    yellows:  [...tournament.players].sort((a, b) => b.yellowCards - a.yellowCards).slice(0, 6),
    mom:      [...tournament.players].sort((a, b) => b.playerOfMatch - a.playerOfMatch).slice(0, 6),
  }), [tournament.players])

  function Block({ title, items, val }: { title: string; items: typeof s.scorers; val: keyof typeof s.scorers[0] }) {
    return (
      <div className="flex-1 rounded overflow-hidden min-w-[140px]" style={{ background: 'rgba(12,12,12,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#555' }}>{title}</span>
        </div>
        <div className="px-3 py-2 space-y-1.5">
          {items.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[8.5px] w-3 text-right flex-shrink-0" style={{ color: i === 0 ? '#d0d0d0' : '#383838' }}>{i + 1}</span>
                <span className="text-[9.5px] truncate" style={{ color: i === 0 ? '#e8e8e8' : '#888' }}>{p.name}</span>
              </div>
              <span className="text-[11px] font-bold flex-shrink-0" style={{ color: i === 0 ? '#f0f0f0' : '#505050' }}>{p[val] as number}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (tournament.players.length === 0) {
    return <p className="text-[11px] text-center py-12" style={{ color: '#383838' }}>No player stats available for this tournament.</p>
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-4 flex-wrap">
      <Block title="Top Scorers"     items={s.scorers} val="goals" />
      <Block title="Most Assists"    items={s.assists} val="assists" />
      <Block title="Yellow Cards"    items={s.yellows} val="yellowCards" />
      <Block title="Player of Match" items={s.mom}     val="playerOfMatch" />
    </motion.div>
  )
}

// ── Groups grid ───────────────────────────────────────────────────────────────
function GroupsPanel({ tournament }: { tournament: Tournament }) {
  const cols = tournament.groups.length <= 8 ? 4 : 6
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${Math.min(cols, 4)}, minmax(180px, 1fr))` }}
    >
      {tournament.groups.map((group, idx) => (
        <div key={group.group} className="overflow-hidden rounded" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Header */}
          <div className="px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#c0c0c0' }}>Group {group.group}</span>
          </div>
          {/* Teams */}
          {group.teams.map((team, ti) => {
            const isQ = ti < 2
            const flag = team.flagCode.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
            return (
              <div
                key={team.id}
                className="flex items-center justify-between px-3 py-1.5"
                style={{
                  background: isQ ? 'rgba(255,255,255,0.025)' : 'transparent',
                  borderBottom: ti < group.teams.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  borderLeft: isQ ? '2px solid rgba(255,255,255,0.2)' : '2px solid transparent',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px]">{flag}</span>
                  <span className="text-[11px]" style={{ color: isQ ? '#e0e0e0' : '#777' }}>{team.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px]" style={{ color: '#444' }}>{team.played}G</span>
                  <span className="text-[10px] w-6 text-right" style={{ color: team.goalDifference > 0 ? '#7ecf9e' : team.goalDifference < 0 ? '#cf7e7e' : '#555' }}>
                    {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                  </span>
                  <span className="text-[11px] font-bold w-5 text-right" style={{ color: isQ ? '#e8e8e8' : '#505050' }}>{team.points}</span>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </motion.div>
  )
}

// ── Simulation ────────────────────────────────────────────────────────────────
function SimulationTab({ tournament }: { tournament: Tournament }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const roundLabels = tournament.knockoutBracket.map(b => {
    const m: Record<string, string> = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter Finals', sf: 'Semi Finals', '3p': 'Third Place', final: 'Final' }
    return m[b.round] || b.round
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-4">
      <Suspense fallback={<div className="h-40 flex items-center justify-center"><span className="text-[11px]" style={{ color: '#444' }}>Loading simulation…</span></div>}>
        <SimulationPlayer
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(p => !p)}
          onReset={() => { setIsPlaying(false); setProgress(0) }}
          onStepForward={() => setProgress(p => Math.min(1, p + 1 / (tournament.knockoutBracket.reduce((acc, b) => acc + b.matches.length, 0))))}
          progress={progress}
          onProgressChange={setProgress}
          roundLabels={roundLabels}
        />
        <AnimatedSimulation tournament={tournament} progress={progress} isPlaying={isPlaying} />
      </Suspense>
    </motion.div>
  )
}

// ── Poster layout ─────────────────────────────────────────────────────────────
function WallChartPoster({ tournament }: { tournament: Tournament }) {
  const leftGroups  = tournament.groups.slice(0, Math.ceil(tournament.groups.length / 2))
  const rightGroups = tournament.groups.slice(Math.ceil(tournament.groups.length / 2))

  return (
    <div className="poster-scroll mx-auto overflow-x-auto" style={{ maxWidth: '100vw' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
        className="relative mx-auto rounded-xl"
        style={{
          width: 'max-content',
          background: 'rgba(7,7,7,0.82)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 0 80px rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)',
          padding: '16px 10px',
        }}
      >
        {/* Top shimmer */}
        <div className="absolute top-0 left-16 right-16 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />

        <div className="flex gap-2 items-start">
          {/* Left groups */}
          <div className="flex-shrink-0 flex flex-col gap-1.5" style={{ width: '128px' }}>
            {leftGroups.map((g, idx) => (
              <CompactGroupTable key={g.group} group={g} side="left" animDelay={idx * 0.04} />
            ))}
          </div>

          {/* Bracket */}
          <div className="flex-1 overflow-visible">
            <KnockoutPosterBracket knockoutBracket={tournament.knockoutBracket} />
          </div>

          {/* Right groups */}
          <div className="flex-shrink-0 flex flex-col gap-1.5" style={{ width: '128px' }}>
            {rightGroups.map((g, idx) => (
              <CompactGroupTable key={g.group} group={g} side="right" animDelay={idx * 0.04} />
            ))}
          </div>
        </div>

        {/* Bottom shimmer */}
        <div className="absolute bottom-0 left-16 right-16 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
      </motion.div>

      <p className="text-center mt-2 text-[8px] tracking-[0.2em] uppercase" style={{ color: '#222' }}>
        ← scroll for full bracket →
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
type TopTab = 'home' | 'simulation'
type HomeTab = 'brackets' | 'groups' | 'stats'

export default function Page() {
  const [yearIndex, setYearIndex]     = useState<YearEntry[] | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [tournament, setTournament]   = useState<Tournament | null>(null)
  const [cache, setCache]             = useState<Map<number, Tournament>>(new Map())
  const [loading, setLoading]         = useState(true)
  const [topTab, setTopTab]           = useState<TopTab>('home')
  const [homeTab, setHomeTab]         = useState<HomeTab>('brackets')

  // Load index
  useEffect(() => {
    fetch('/data/wc-index.json')
      .then(r => r.json())
      .then(idx => {
        setYearIndex(idx.years)
        setSelectedYear(idx.latestYear)
      })
      .catch(console.error)
  }, [])

  // Load selected year
  useEffect(() => {
    if (!selectedYear || !yearIndex) return
    const entry = yearIndex.find(e => e.year === selectedYear)
    if (!entry) return
    if (cache.has(selectedYear)) {
      setTournament(cache.get(selectedYear)!)
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(entry.file)
      .then(r => r.json())
      .then(data => {
        setCache(prev => new Map(prev).set(selectedYear, data))
        setTournament(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedYear, yearIndex])

  const changeYear = useCallback((y: number) => {
    setSelectedYear(y)
    setHomeTab('brackets')
  }, [])

  // ── Render ──
  if (loading || !tournament) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
          <span className="text-[10px] tracking-widest uppercase" style={{ color: '#333' }}>Loading…</span>
        </div>
      </main>
    )
  }

  const currentEntry = yearIndex?.find(e => e.year === selectedYear)

  return (
    <main className="min-h-screen pb-16">
      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-5 py-2.5"
        style={{ background: 'rgba(5,5,5,0.94)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(14px)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <span style={{ fontSize: '12px' }}>⚽</span>
          </div>
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase hidden sm:block" style={{ color: '#888' }}>Football WC</span>
        </div>

        {/* Top tabs: Home | Simulation */}
        <div className="flex items-center gap-1">
          {(['home', 'simulation'] as TopTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setTopTab(tab)}
              className="px-3 py-1.5 rounded text-[9.5px] font-semibold tracking-wider uppercase transition-all"
              style={{
                background: topTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: topTab === tab ? '#e8e8e8' : '#484848',
                border: `1px solid ${topTab === tab ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
              }}
            >
              {tab === 'home' ? 'Home' : 'Simulation'}
            </button>
          ))}
        </div>

        {/* Year selector + badge */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <select
            value={selectedYear ?? ''}
            onChange={e => changeYear(Number(e.target.value))}
            className="text-[9.5px] px-2 py-1 rounded cursor-pointer outline-none"
            style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}
          >
            {yearIndex?.map(e => (
              <option key={e.year} value={e.year}>
                {e.year} · {e.host} {e.winner ? `· ${e.winner} 🏆` : ''}
              </option>
            ))}
          </select>
          {tournament.lastUpdated && <RefreshBadge ts={tournament.lastUpdated} />}
        </div>
      </div>

      {/* ── Poster title ── */}
      <div className="flex flex-col items-center pt-5 pb-3">
        <motion.div
          key={selectedYear}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-baseline gap-3"
        >
          <h1
            className="font-bold tracking-tight"
            style={{ fontSize: '24px', letterSpacing: '-0.01em', background: 'linear-gradient(180deg, #e8e8e8 0%, #888888 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            FOOTBALL WORLD CUP
          </h1>
          <span
            className="font-bold"
            style={{ fontSize: '30px', letterSpacing: '-0.02em', background: 'linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            {selectedYear}
          </span>
        </motion.div>
        <p className="text-[9px] tracking-[0.22em] uppercase mt-0.5" style={{ color: '#2e2e2e' }}>
          {currentEntry?.host} · {tournament.format ?? 32} Teams · {currentEntry?.winner ? `Winner: ${currentEntry.winner}` : 'In Progress'}
        </p>
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {topTab === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {/* Home sub-tabs */}
            <div className="flex items-center justify-center gap-1 mb-4">
              {(['brackets', 'groups', 'stats'] as HomeTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setHomeTab(tab)}
                  className="px-4 py-1.5 rounded text-[9px] font-semibold tracking-wider uppercase transition-all"
                  style={{
                    background: homeTab === tab ? 'rgba(255,255,255,0.07)' : 'transparent',
                    color: homeTab === tab ? '#d0d0d0' : '#3c3c3c',
                    border: `1px solid ${homeTab === tab ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`,
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {homeTab === 'brackets' && (
                <motion.div key="brackets" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <WallChartPoster tournament={tournament} />
                </motion.div>
              )}
              {homeTab === 'groups' && (
                <motion.div key="groups" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="max-w-5xl mx-auto px-6">
                  <GroupsPanel tournament={tournament} />
                </motion.div>
              )}
              {homeTab === 'stats' && (
                <motion.div key="stats" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="max-w-3xl mx-auto px-6">
                  <StatsPanel tournament={tournament} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {topTab === 'simulation' && (
          <motion.div key="sim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="max-w-5xl mx-auto px-6">
            <SimulationTab tournament={tournament} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
