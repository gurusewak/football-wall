import { notFound, redirect } from 'next/navigation'

const VALID_YEARS = [1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026]

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params
  const parsed = parseInt(year, 10)

  if (isNaN(parsed) || !VALID_YEARS.includes(parsed)) {
    notFound()
  }

  // Canonical URL always includes the tab segment
  redirect(`/${parsed}/brackets`)
}

export function generateStaticParams() {
  return VALID_YEARS.map(year => ({ year: String(year) }))
}
