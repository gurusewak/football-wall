// Shared team-name normalization so API-Football names line up with the names
// in our JSON/DB. Used by both the merge layer (liveOverlay) and the
// priority-mismatch detection (apiFootball) — keep them on the same function.

// Keys are the post-normalization form (lowercased, accent-stripped, punctuation
// collapsed to spaces). Maps an API/alt spelling to our canonical JSON name.
const NAME_ALIASES: Record<string, string> = {
  'united states': 'usa',
  'korea republic': 'south korea',
  'ir iran': 'iran',
  'turkiye': 'turkey',           // API-Football: "Türkiye"
  'czechia': 'czech republic',   // API-Football: "Czechia"
  'congo dr': 'dr congo',        // API-Football: "Congo DR"
  'cape verde islands': 'cape verde', // API-Football: "Cape Verde Islands"
  'cote d ivoire': 'ivory coast',
}

export function normalizeTeamName(name: string): string {
  const lower = name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip diacritics: Türkiye -> Turkiye, Curaçao -> Curacao
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')                       // punctuation -> space
    .replace(/\s+/g, ' ')
    .trim()
  return NAME_ALIASES[lower] ?? lower
}
