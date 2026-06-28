import { redirect } from 'next/navigation'
import WorldCupApp from '@/components/WorldCupApp'
import { VALID_YEARS, VALID_TABS, LATEST_YEAR, isValidYear, isValidTab } from '@/lib/worldCupYears'

export default async function YearTabPage({ params }: { params: Promise<{ year: string; tab: string }> }) {
  const { year, tab } = await params
  const parsed = parseInt(year, 10)

  // Unknown year → fall back to the latest World Cup's bracket
  if (!isValidYear(parsed)) {
    redirect(`/${LATEST_YEAR}/bracket`)
  }

  // Unknown tab (includes the old "brackets" slug) → fall back to that year's bracket
  if (!isValidTab(tab)) {
    redirect(`/${parsed}/bracket`)
  }

  return <WorldCupApp initialYear={parsed} initialTab={tab} />
}

export function generateStaticParams() {
  return VALID_YEARS.flatMap(year => VALID_TABS.map(tab => ({ year: String(year), tab })))
}
