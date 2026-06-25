'use client'

import { useEffect, useState, useMemo } from 'react'
import { Tournament, Tournaments } from '@/lib/types'
import { GroupCard } from '@/components/GroupCard'
import { WallChartBracket } from '@/components/WallChartBracket'
import { RefreshBadge } from '@/components/RefreshBadge'
import { motion } from 'framer-motion'

export default function Page() {
  const [allTournaments, setAllTournaments] = useState<Tournaments | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'bracket' | 'groups' | 'stats'>('bracket')

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const response = await fetch('/data/world-cups.json')
        const data = await response.json()
        setAllTournaments(data)
        setSelectedYear(data.latestYear)
      } catch (error) {
        console.error('Error loading tournament data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTournaments()
  }, [])

  const tournament = useMemo(() => {
    if (!allTournaments || !selectedYear) return null
    return allTournaments.tournaments.find((t) => t.year === selectedYear) || null
  }, [allTournaments, selectedYear])

  const tournamentStats = useMemo(() => {
    if (!tournament) return null
    return {
      topScorers: [...tournament.players].sort((a, b) => b.goals - a.goals).slice(0, 5),
      mostAssists: [...tournament.players].sort((a, b) => b.assists - a.assists).slice(0, 5),
      mostYellowCards: [...tournament.players].sort((a, b) => b.yellowCards - a.yellowCards).slice(0, 5),
      mostRedCards: [...tournament.players].sort((a, b) => b.redCards - a.redCards).slice(0, 5),
      playerOfMatch: [...tournament.players].sort((a, b) => b.playerOfMatch - a.playerOfMatch).slice(0, 3),
    }
  }, [tournament])

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div animate={{ opacity: [0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="h-32 bg-card/50 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!allTournaments || !tournament) {
    return (
      <div className="min-h-screen bg-background pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>Failed to load tournament data</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background pt-8 pb-16">
      {/* Background gradient effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Hero Section */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent">⚽ {tournament.name}</h1>

          {/* World Cup Selector */}
          <div className="flex justify-center gap-3">
            <label className="text-sm font-medium text-muted-foreground">Select Year:</label>
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 rounded-lg bg-card/50 border border-accent/40 text-foreground hover:border-accent/60 transition-colors cursor-pointer"
            >
              {allTournaments.tournaments
                .sort((a, b) => b.year - a.year)
                .map((t) => (
                  <option key={t.year} value={t.year}>
                    {t.year} ({t.format} teams)
                  </option>
                ))}
            </select>
          </div>
        </motion.section>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex justify-center gap-2 flex-wrap">
          {(['bracket', 'groups', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === tab
                  ? 'bg-accent text-background shadow-lg shadow-accent/50'
                  : 'bg-card/40 text-foreground hover:bg-card/60 border border-border/40'
              }`}
            >
              {tab === 'bracket' ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12 6-12 7z" />
                  </svg>
                  Bracket
                </>
              ) : tab === 'groups' ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  Groups
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19h6m-3-3v3m3-9h.01M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Stats
                </>
              )}
            </button>
          ))}
        </motion.div>

        {/* Bracket Tab */}
        {activeTab === 'bracket' && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="bg-card/30 border border-border/40 rounded-lg p-6 backdrop-blur">
              <WallChartBracket tournament={tournament} />
            </div>
          </motion.section>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <h2 className="text-3xl font-bold mb-6 text-accent">Group Stage</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {tournament.groups.map((group, idx) => (
                <GroupCard key={group.group} group={group} index={idx} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && tournamentStats && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Top Scorers */}
            <div className="bg-card/40 border border-border/40 rounded-lg p-4 backdrop-blur space-y-3">
              <h3 className="font-bold text-accent flex items-center gap-2">
                <span>⚽</span> Top Scorers
              </h3>
              {tournamentStats.topScorers.map((player, idx) => (
                <div key={player.id} className="flex justify-between text-sm">
                  <span className="truncate">{player.name}</span>
                  <span className="font-bold text-accent">{player.goals}</span>
                </div>
              ))}
            </div>

            {/* Most Assists */}
            <div className="bg-card/40 border border-border/40 rounded-lg p-4 backdrop-blur space-y-3">
              <h3 className="font-bold text-accent flex items-center gap-2">
                <span>🎯</span> Most Assists
              </h3>
              {tournamentStats.mostAssists.map((player, idx) => (
                <div key={player.id} className="flex justify-between text-sm">
                  <span className="truncate">{player.name}</span>
                  <span className="font-bold text-accent">{player.assists}</span>
                </div>
              ))}
            </div>

            {/* Yellow Cards */}
            <div className="bg-card/40 border border-border/40 rounded-lg p-4 backdrop-blur space-y-3">
              <h3 className="font-bold text-accent flex items-center gap-2">
                <span>🟨</span> Yellow Cards
              </h3>
              {tournamentStats.mostYellowCards.map((player, idx) => (
                <div key={player.id} className="flex justify-between text-sm">
                  <span className="truncate">{player.name}</span>
                  <span className="font-bold text-accent">{player.yellowCards}</span>
                </div>
              ))}
            </div>

            {/* Red Cards */}
            <div className="bg-card/40 border border-border/40 rounded-lg p-4 backdrop-blur space-y-3">
              <h3 className="font-bold text-accent flex items-center gap-2">
                <span>🟥</span> Red Cards
              </h3>
              {tournamentStats.mostRedCards.map((player, idx) => (
                <div key={player.id} className="flex justify-between text-sm">
                  <span className="truncate">{player.name}</span>
                  <span className="font-bold text-accent">{player.redCards}</span>
                </div>
              ))}
            </div>

            {/* Player of Match */}
            <div className="bg-card/40 border border-border/40 rounded-lg p-4 backdrop-blur space-y-3">
              <h3 className="font-bold text-accent flex items-center gap-2">
                <span>👑</span> Player of Match
              </h3>
              {tournamentStats.playerOfMatch.map((player, idx) => (
                <div key={player.id} className="flex justify-between text-sm">
                  <span className="truncate">{player.name}</span>
                  <span className="font-bold text-accent">{player.playerOfMatch}</span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

      </div>

      {/* Updated Badge - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-50">
        <RefreshBadge lastUpdated={tournament.lastUpdated} />
      </div>
    </main>
  )
}
