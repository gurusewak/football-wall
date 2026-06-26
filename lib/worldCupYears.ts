// Single source of truth for which World Cup years the site serves.
export const VALID_YEARS = [1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026]

// The most recent edition — invalid/unknown routes fall back to its brackets view.
export const LATEST_YEAR = Math.max(...VALID_YEARS)

export const VALID_TABS = ['brackets', 'groups', 'stats'] as const
export type ValidTab = (typeof VALID_TABS)[number]

export function isValidYear(year: number): boolean {
  return !isNaN(year) && VALID_YEARS.includes(year)
}

export function isValidTab(tab: string): tab is ValidTab {
  return (VALID_TABS as readonly string[]).includes(tab)
}
