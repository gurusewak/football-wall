import { notFound, redirect } from 'next/navigation'
import WorldCupApp from '@/components/WorldCupApp'

const VALID_YEARS = [1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026]
const VALID_TABS = ['brackets', 'groups', 'stats'] as const

export default async function YearTabPage({ params }: { params: Promise<{ year: string; tab: string }> }) {
  const { year, tab } = await params
  const parsed = parseInt(year, 10)

  if (isNaN(parsed) || !VALID_YEARS.includes(parsed)) {
    notFound()
  }

  // Any unknown tab falls back to the brackets view for that year
  if (!VALID_TABS.includes(tab as (typeof VALID_TABS)[number])) {
    redirect(`/${parsed}/brackets`)
  }

  return <WorldCupApp initialYear={parsed} initialTab={tab as (typeof VALID_TABS)[number]} />
}

export function generateStaticParams() {
  return VALID_YEARS.flatMap(year => VALID_TABS.map(tab => ({ year: String(year), tab })))
}
