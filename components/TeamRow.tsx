'use client'

import { Team } from '@/lib/types'
import { countryFlagEmoji } from '@/lib/tournament-utils'

interface TeamRowProps {
  team: Team
  rank: number
}

export function TeamRow({ team, rank }: TeamRowProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-card/50 hover:bg-card/80 transition-colors rounded">
      <div className="flex items-center gap-3 flex-1">
        <span className="w-6 text-center font-semibold text-accent">{rank}</span>
        <span className="text-xl">{countryFlagEmoji(team.flagCode)}</span>
        <span className="font-medium text-foreground">{team.name}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex gap-1 min-w-[60px]">
          <span className="w-5 text-center text-muted-foreground">{team.wins}</span>
          <span className="w-5 text-center text-muted-foreground">{team.draws}</span>
          <span className="w-5 text-center text-muted-foreground">{team.losses}</span>
        </div>
        <div className="text-center min-w-[40px]">
          <span className="text-muted-foreground">{team.goalsFor}</span>
          <span className="text-muted-foreground mx-1">-</span>
          <span className="text-muted-foreground">{team.goalsAgainst}</span>
        </div>
        <span className={`font-bold text-right min-w-[30px] ${team.points >= 7 ? 'text-accent' : 'text-foreground'}`}>
          {team.points}
        </span>
      </div>
    </div>
  )
}
