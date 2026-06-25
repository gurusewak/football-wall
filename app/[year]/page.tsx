import { notFound } from 'next/navigation'
import WorldCupApp from '@/components/WorldCupApp'

const VALID_YEARS = [1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026]

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params
  const parsed = parseInt(year, 10)

  if (isNaN(parsed) || !VALID_YEARS.includes(parsed)) {
    notFound()
  }

  return <WorldCupApp initialYear={parsed} />
}

export function generateStaticParams() {
  return VALID_YEARS.map(year => ({ year: String(year) }))
}
