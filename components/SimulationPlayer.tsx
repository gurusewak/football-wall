'use client'

import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, ChevronRight } from 'lucide-react'

interface SimulationPlayerProps {
  isPlaying: boolean
  onPlayPause: () => void
  onReset: () => void
  onStepForward: () => void
  progress: number
  onProgressChange: (progress: number) => void
  roundLabels: string[]
}

export function SimulationPlayer({
  isPlaying,
  onPlayPause,
  onReset,
  onStepForward,
  progress,
  onProgressChange,
  roundLabels,
}: SimulationPlayerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/40 rounded-lg p-4 backdrop-blur"
    >
      <div className="flex flex-col gap-4">
        {/* Controls */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onPlayPause}
            className="p-2 rounded-lg bg-primary/20 hover:bg-primary/40 text-primary transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStepForward}
            disabled={isPlaying}
            className="p-2 rounded-lg bg-primary/20 hover:bg-primary/40 text-primary transition-colors disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReset}
            className="p-2 rounded-lg bg-destructive/20 hover:bg-destructive/40 text-destructive transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </motion.button>

          <div className="flex-1 mx-2">
            <div className="text-sm text-muted-foreground mb-2">
              {roundLabels[Math.floor(progress)]}
            </div>
            <input
              type="range"
              min="0"
              max={roundLabels.length - 1}
              value={Math.floor(progress)}
              onChange={(e) => onProgressChange(parseInt(e.target.value))}
              className="w-full h-2 bg-card/50 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        {/* Timeline dots */}
        <div className="flex justify-between px-2 gap-1">
          {roundLabels.map((label, idx) => (
            <motion.div
              key={idx}
              className={`flex-1 h-1 rounded-full transition-all ${
                idx <= Math.floor(progress)
                  ? 'bg-gradient-to-r from-primary to-accent'
                  : 'bg-card/30 hover:bg-card/50'
              }`}
              whileHover={{ scale: 1.1 }}
              onClick={() => onProgressChange(idx)}
              role="button"
              tabIndex={0}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
