import { redirect } from 'next/navigation'
import WorldCupApp from '@/components/WorldCupApp'
import { VALID_YEARS, VALID_TABS, LATEST_YEAR, isValidYear, isValidTab } from '@/lib/worldCupYears'

export default async function YearTabPage({ params }: { params: Promise<{ year: string; tab: string }> }) {
  const { year, tab } = await params
  const parsed = parseInt(year, 10)

  // Unknown year → fall back to the latest World Cup's brackets
  if (!isValidYear(parsed)) {
    redirect(`/${LATEST_YEAR}/brackets`)
  }

  // Unknown tab → fall back to that year's brackets
  if (!isValidTab(tab)) {
    redirect(`/${parsed}/brackets`)
  }

  return <WorldCupApp initialYear={parsed} initialTab={tab} />
}

export function generateStaticParams() {
  return VALID_YEARS.flatMap(year => VALID_TABS.map(tab => ({ year: String(year), tab })))
}
