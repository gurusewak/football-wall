import { redirect } from 'next/navigation'
import { LATEST_YEAR } from '@/lib/worldCupYears'

// Catches any unrecognized path (3+ segments; shorter paths are handled by
// the /[year] and /[year]/[tab] routes) and sends it to the latest bracket.
export default function CatchAll() {
  redirect(`/${LATEST_YEAR}/bracket`)
}
