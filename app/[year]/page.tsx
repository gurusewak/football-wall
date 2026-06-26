import { redirect } from 'next/navigation'
import { VALID_YEARS, LATEST_YEAR, isValidYear } from '@/lib/worldCupYears'

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params
  const parsed = parseInt(year, 10)

  // Unknown year → fall back to the latest World Cup's brackets
  if (!isValidYear(parsed)) {
    redirect(`/${LATEST_YEAR}/brackets`)
  }

  // Canonical URL always includes the tab segment
  redirect(`/${parsed}/brackets`)
}

export function generateStaticParams() {
  return VALID_YEARS.map(year => ({ year: String(year) }))
}
