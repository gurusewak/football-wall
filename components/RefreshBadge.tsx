'use client'

import { formatDate } from '@/lib/tournament-utils'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

interface RefreshBadgeProps {
  lastUpdated: string
}

export function RefreshBadge({ lastUpdated }: RefreshBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-sm text-muted-foreground bg-card/50 border border-border/40 rounded-lg px-3 py-2"
    >
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
        <RefreshCw className="w-4 h-4" />
      </motion.div>
      <span>Updated: {formatDate(lastUpdated)}</span>
    </motion.div>
  )
}
