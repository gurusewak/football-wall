'use client'

import { useEffect, useRef, useLayoutEffect, useState, useCallback } from 'react'
import { toPng } from 'html-to-image'
import { motion, AnimatePresence } from 'framer-motion'
import { Tournament } from '@/lib/types'
import { CompactGroupTable } from '@/components/CompactGroupTable'
import { KnockoutPosterBracket } from '@/components/KnockoutPosterBracket'
import { GroupsPanel } from '@/components/GroupsPanel'
import { StatsPanel } from '@/components/StatsPanel'
import { YearSelector } from '@/components/YearSelector'
import { MatchDetailModal } from '@/components/MatchDetailModal'
import { normalizeTournament } from '@/lib/worldCupData'

// ── Types ─────────────────────────────────────────────────────────────────────
interface YearEntry {
  year: number
  host: string
  winner: string | null
  format: number
  file: string
}

type Tab = 'brackets' | 'groups' | 'stats'

// ── Poster layout — full-size, always scrollable ──────────────────────────────
const GROUP_COL_W = 134

function WallChartPoster({ tournament, simKey, onSimulate, onMatchClick }: {
  tournament: Tournament
  simKey: number
  onSimulate: () => void
  onMatchClick: (id: string) => void
}) {
  const is48 = !!tournament.knockoutBracket.find(b => b.round === 'r32')
  const bracketW = is48 ? 1404 : 1088
  const NATURAL_W = GROUP_COL_W + 10 + bracketW + 10 + GROUP_COL_W + 20

  const leftGroups  = tournament.groups.slice(0, Math.ceil(tournament.groups.length / 2))
  const rightGroups = tournament.groups.slice(Math.ceil(tournament.groups.length / 2))

  const chartRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!chartRef.current || exporting) return
    setExporting(true)
    try {
      const dataUrl = await toPng(chartRef.current, {
        pixelRatio: 2,
        backgroundColor: '#070707',
        style: { borderRadius: '0' },
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `wc-${tournament.year ?? 'wall'}-chart.png`
      a.click()
    } finally {
      setExporting(false)
    }
  }

  return (
    // Full-size bracket — always scrollable, never shrunk
    <div
      className="w-full"
      style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      <div style={{ width: NATURAL_W, margin: '0 auto' }}>

        {/* Button row: Simulate left | Export right */}
        <div style={{ paddingLeft: '10px', paddingRight: '10px', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <motion.button
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={onSimulate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded"
            style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
              color: '#c0c0c0', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '11px' }}>▶</span>
            <span>{simKey > 0 ? 'Re-simulate' : 'Simulate'}</span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded"
            style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
              color: exporting ? '#666' : '#c0c0c0', fontSize: '12px', fontWeight: 600,
              letterSpacing: '0.06em', cursor: exporting ? 'default' : 'pointer',
            }}
          >
            <span style={{ fontSize: '11px' }}>↓</span>
            <span>{exporting ? 'Exporting…' : 'Export HD'}</span>
          </motion.button>
        </div>

        <motion.div
          ref={chartRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="relative rounded-xl"
          style={{
            background: 'rgba(7,7,7,0.82)', border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 0 80px rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', padding: '16px 10px',
          }}
        >
          <div className="absolute top-0 left-16 right-16 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
          <div className="flex gap-2 items-start">
            <div className="flex-shrink-0 flex flex-col gap-1.5" style={{ width: GROUP_COL_W }}>
              {leftGroups.map((g, idx) => (
                <CompactGroupTable key={g.group} group={g} side="left" animDelay={idx * 0.04} />
              ))}
            </div>
            <div className="flex-1 overflow-visible">
              <KnockoutPosterBracket knockoutBracket={tournament.knockoutBracket} simKey={simKey} onMatchClick={onMatchClick} />
            </div>
            <div className="flex-shrink-0 flex flex-col gap-1.5" style={{ width: GROUP_COL_W }}>
              {rightGroups.map((g, idx) => (
                <CompactGroupTable key={g.group} group={g} side="right" animDelay={idx * 0.04} />
              ))}
            </div>
          </div>
          <div className="absolute bottom-0 left-16 right-16 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
        </motion.div>
      </div>
    </div>
  )
}

// ── Main app component ────────────────────────────────────────────────────────
export default function WorldCupApp({ initialYear }: { initialYear?: number }) {
  const [yearIndex, setYearIndex]             = useState<YearEntry[] | null>(null)
  const [latestYear, setLatestYear]           = useState<number | null>(null)
  const [selectedYear, setSelectedYear]       = useState<number | null>(initialYear ?? null)
  const [tournament, setTournament]           = useState<Tournament | null>(null)
  const [cache, setCache]                     = useState<Map<number, Tournament>>(new Map())
  const [loading, setLoading]                 = useState(true)
  const [tab, setTab]                         = useState<Tab>('brackets')
  const [simKey, setSimKey]                   = useState(0)
  const [dataSource, setDataSource]           = useState<'json' | 'json+api' | 'db' | null>(null)
  const [apiUpdatedAt, setApiUpdatedAt]       = useState<string | null>(null)
  const [now, setNow]                         = useState<number | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

  useEffect(() => { setNow(Date.now()) }, [])

  // ── Year index fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/worldcup/index').then(r => r.json()),
      fetch('/api/worldcup/world-cups').then(r => r.json()),
    ]).then(([idx, allData]) => {
      const winnerMap = new Map<number, string>()
      for (const t of allData.tournaments ?? []) {
        const winnerId = t.tournamentSummary?.winnerTeamId
        if (winnerId) {
          const team = (t.teams ?? []).find((tm: any) => tm.id === winnerId)
          if (team?.name) winnerMap.set(t.year, team.name)
        }
      }
      const normalized: YearEntry[] = (idx.years ?? []).map((e: any) => ({
        year: e.year,
        host: Array.isArray(e.hostCountries) ? e.hostCountries.join(' / ') : (e.host ?? ''),
        winner: winnerMap.get(e.year) ?? null,
        format: e.format ?? 32,
        file: e.file,
      }))
      setYearIndex(normalized)
      setLatestYear(idx.latestYear)

      if (!initialYear) {
        // No year in URL — load latest and update URL bar without navigation
        setSelectedYear(idx.latestYear)
        window.history.replaceState({}, '', '/' + idx.latestYear)
      }
    }).catch(console.error)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Browser back/forward: sync state from URL ─────────────────────────────
  useEffect(() => {
    const handlePopState = () => {
      const m = window.location.pathname.match(/^\/(\d{4})$/)
      if (m) {
        const y = parseInt(m[1], 10)
        if (y >= 1998 && y <= 2030) {
          setSelectedYear(y)
          setTab('brackets')
          setSimKey(0)
          setSelectedMatchId(null)
        }
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // ── Tournament data fetch ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedYear || !yearIndex) return
    if (!yearIndex.find(e => e.year === selectedYear)) return
    if (cache.has(selectedYear)) {
      // Minimum 350ms spinner so the transition feels intentional, not a flash
      const t = setTimeout(() => {
        setTournament(cache.get(selectedYear)!)
        setLoading(false)
      }, 700)
      return () => clearTimeout(t)
    }
    setLoading(true)

    const fetchPromise = selectedYear === 2026
      ? fetch('/api/worldcup/2026/live')
          .then(r => r.json())
          .then((resp: { tournament: any; meta: { dataSource: 'json' | 'json+api' | 'db'; apiCacheFetchedAt: string | null; matchesUpdated: number; liveMatchCount: number } }) => {
            setDataSource(resp.meta.dataSource)
            setApiUpdatedAt(resp.meta.apiCacheFetchedAt)
            return resp.tournament
          })
          .catch(() => {
            setDataSource('json')
            setApiUpdatedAt(null)
            return fetch(`/api/worldcup/data?year=${selectedYear}`).then(r => r.json())
          })
      : fetch(`/api/worldcup/data?year=${selectedYear}`).then(r => r.json())

    fetchPromise
      .then(data => {
        const normalized = normalizeTournament(data)
        setCache(prev => new Map(prev).set(selectedYear, normalized))
        setTournament(normalized)
        if (normalized.winner) {
          setYearIndex(prev => prev?.map(e =>
            e.year === selectedYear ? { ...e, winner: normalized.winner! } : e
          ) ?? prev)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedYear, yearIndex])

  // ── Year change — show spinner immediately, then load ───────────────────────
  const changeYear = useCallback((y: number) => {
    setLoading(true)      // show spinner right away for every year switch
    setSelectedYear(y)
    setTab('brackets')
    setSimKey(0)
    setSelectedMatchId(null)
    window.history.pushState({}, '', '/' + y)
  }, [])

  const openMatch = useCallback((id: string) => setSelectedMatchId(id), [])

  if (loading || !tournament) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
          <span className="text-[12px] tracking-widest uppercase" style={{ color: '#606060' }}>Loading…</span>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-16">

      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-5 py-2.5"
        style={{ background: 'rgba(5,5,5,0.94)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(14px)' }}
      >
        {/* Logo — always navigates to latest year */}
        <button
          className="flex items-center gap-2 cursor-pointer"
          style={{ background: 'none', border: 'none', padding: 0 }}
          onClick={() => {
            if (latestYear) changeYear(latestYear)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
            <span style={{ fontSize: '12px' }}>⚽</span>
          </div>
          <span className="font-bold tracking-tight" style={{ fontSize: '14px', color: '#d8d8d8', letterSpacing: '-0.01em' }}>
            The Football Wall
          </span>
        </button>

        <div className="flex items-center gap-3">
          {selectedYear === 2026 && dataSource && (
            <span style={{ fontSize: 11, letterSpacing: '0.07em', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: 7, lineHeight: 1, color: dataSource === 'json+api' ? '#666' : '#444' }}>●</span>
              {(() => {
                if (!now) return null
                const ts = apiUpdatedAt ?? tournament?.lastUpdated ?? null
                if (!ts) return 'Updated'
                const mins = Math.round((now - new Date(ts).getTime()) / 60000)
                if (mins < 1) return 'Just updated'
                if (mins < 60) return `${mins}m ago`
                const hrs = Math.round(mins / 60)
                if (hrs < 24) return `${hrs}h ago`
                return `${Math.round(hrs / 24)}d ago`
              })()}
            </span>
          )}
          <YearSelector yearIndex={yearIndex} selectedYear={selectedYear} onChange={changeYear} />
        </div>
      </div>

      {/* ── Title ── */}
      <div className="flex flex-col items-center pt-6 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedYear}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-1"
          >
            <h1
              className="font-bold tracking-tight text-center"
              style={{ fontSize: '22px', letterSpacing: '0.04em', background: 'linear-gradient(180deg, #d0d0d0 0%, #666 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              FOOTBALL WORLD CUP
            </h1>
            <span
              className="font-bold tabular-nums"
              style={{ fontSize: '52px', lineHeight: 1, letterSpacing: '-0.03em', background: 'linear-gradient(180deg, #ffffff 0%, #888 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              {selectedYear}
            </span>
            <p className="text-[12px] tracking-[0.2em] uppercase mt-1" style={{ color: '#666' }}>
              {tournament.host} · {tournament.format ?? 32} Teams{tournament.winner ? ` · Winner: ${tournament.winner}` : ' · In Progress'}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center justify-center gap-2 mb-6 px-4">
        {(['brackets', 'groups', 'stats'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 max-w-[140px] px-4 py-3 rounded text-[13px] font-semibold tracking-wide uppercase transition-all"
            style={{
              background: tab === t ? 'rgba(255,255,255,0.09)' : 'transparent',
              color: tab === t ? '#e8e8e8' : '#666',
              border: `1px solid ${tab === t ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
              letterSpacing: '0.06em',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {tab === 'brackets' && (
          <motion.div key="brackets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <WallChartPoster
              tournament={tournament}
              simKey={simKey}
              onSimulate={() => setSimKey(k => k + 1)}
              onMatchClick={openMatch}
            />
          </motion.div>
        )}
        {tab === 'groups' && (
          <motion.div key="groups" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="max-w-5xl mx-auto px-3 sm:px-6">
            <GroupsPanel tournament={tournament} onMatchClick={openMatch} />
          </motion.div>
        )}
        {tab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="max-w-5xl mx-auto px-3 sm:px-6">
            <StatsPanel tournament={tournament} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Match detail modal ── */}
      <MatchDetailModal
        matchId={selectedMatchId}
        tournament={tournament}
        onClose={() => setSelectedMatchId(null)}
      />

      {/* ── Footer ── */}
      <div className="mt-12 pb-4 flex items-center justify-center gap-4">
        <a
          href="https://thefootballwall.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] tracking-[0.18em] uppercase transition-colors"
          style={{ color: '#555' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#888')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        >
          thefootballwall.com
        </a>
        <span style={{ color: '#606060', fontSize: '11px' }}>·</span>
        <span className="text-[11px] tracking-[0.12em]" style={{ color: '#777' }}>
          © 2026 The Football Wall
        </span>
      </div>
    </main>
  )
}
