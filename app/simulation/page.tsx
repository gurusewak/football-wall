'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Tournament, Tournaments } from '@/lib/types'
import { SimulationPlayer } from '@/components/SimulationPlayer'
import { AnimatedTournamentSimulation } from '@/components/AnimatedTournamentSimulation'
import { motion } from 'framer-motion'

export default function SimulationPage() {
  const [allTournaments, setAllTournaments] = useState<Tournaments | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const tournament = useMemo(() => {
    if (!allTournaments || !selectedYear) return null
    return allTournaments.tournaments.find((t) => t.year === selectedYear) || null
  }, [allTournaments, selectedYear])

  const roundLabels = useMemo(() => {
    if (!tournament) return ['Round of 32', 'Round of 16', 'Quarter Finals', 'Semi Finals', 'Final']
    
    const labels: string[] = []
    tournament.knockoutBracket.forEach((bracket) => {
      const roundMap: Record<string, string> = {
        r32: 'Round of 32',
        r16: 'Round of 16',
        qf: 'Quarter Finals',
        sf: 'Semi Finals',
        final: 'Final',
      }
      labels.push(roundMap[bracket.round] || bracket.round)
    })
    return labels
  }, [tournament])

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

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= roundLabels.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 0.02
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying, roundLabels.length])

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  const handleReset = useCallback(() => {
    setProgress(0)
    setIsPlaying(false)
  }, [])

  const handleStepForward = useCallback(() => {
    setProgress((prev) => Math.min(prev + 1, roundLabels.length - 1))
  }, [roundLabels.length])

  const handleProgressChange = useCallback((newProgress: number) => {
    setProgress(newProgress)
    setIsPlaying(false)
  }, [])

  const handleYearChange = useCallback((newYear: number) => {
    setSelectedYear(newYear)
    setProgress(0)
    setIsPlaying(false)
  }, [])

  if (loading || !tournament) {
    return (
      <div className="min-h-screen bg-background pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div animate={{ opacity: [0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="h-32 bg-card/50 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background pt-8 pb-16">
      {/* Background gradient effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent">
            ⚽ Tournament Simulation
          </h1>
          <p className="text-lg text-muted-foreground">Watch the tournament unfold round by round</p>
          
          {/* Year Selector */}
          {allTournaments && (
            <div className="mt-6 flex justify-center gap-3">
              <label className="text-sm font-medium text-muted-foreground">Select Tournament:</label>
              <select
                value={selectedYear || ''}
                onChange={(e) => handleYearChange(Number(e.target.value))}
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
          )}
        </motion.section>

        {/* Simulation Controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <SimulationPlayer
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onReset={handleReset}
            onStepForward={handleStepForward}
            progress={progress}
            onProgressChange={handleProgressChange}
            roundLabels={roundLabels}
          />
        </motion.div>

        {/* Animated Tournament Simulation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <AnimatedTournamentSimulation
            tournament={tournament}
            progress={progress}
            isPlaying={isPlaying}
          />
        </motion.div>
      </div>
    </main>
  )
}
