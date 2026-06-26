export async function register() {
  // Only run in Node.js runtime, only in local dev
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NODE_ENV !== 'development') return

  try {
    const [
      { fetchWc2026Data },
      { mergeApiOverlay, isJsonFreshForToday, isTournamentOver },
      { dbGet, dbUpsert },
      { default: fs },
      { default: path },
    ] = await Promise.all([
      import('@/lib/apiFootball'),
      import('@/lib/liveOverlay'),
      import('@/lib/db/helpers'),
      import('fs'),
      import('path'),
    ])

    const now = new Date()

    // Read base data: DB first, JSON fallback
    let raw: any = await dbGet('wc-2026')
    if (!raw) {
      const filePath = path.join(process.cwd(), 'public/data/wc-2026.json')
      raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }

    if (isTournamentOver(raw, now)) {
      console.log('  ↳ [dev-sync] Tournament complete — API pulls stopped')
      return
    }

    if (isJsonFreshForToday(raw, now)) {
      console.log('  ↳ [dev-sync] 2026 data is already fresh, skipping')
      return
    }

    console.log('  ↳ [dev-sync] Syncing 2026 data from API-Football...')
    const apiData = await fetchWc2026Data()
    if (!apiData) {
      console.log('  ↳ [dev-sync] API-Football unavailable, using existing DB data')
      return
    }

    const result = mergeApiOverlay(raw, apiData)
    const enriched = { ...result.tournament, lastUpdated: now.toISOString() }
    await dbUpsert('wc-2026', enriched)
    console.log(`  ↳ [dev-sync] Synced — ${result.matchesUpdated} matches updated, ${result.liveMatchCount} live`)
  } catch (e) {
    console.error('  ↳ [dev-sync] Error:', (e as Error).message)
  }
}
