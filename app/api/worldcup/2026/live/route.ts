import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { fetchWc2026Data } from '@/lib/apiFootball'
import { readOverlayCache, writeOverlayCache, isCacheFresh } from '@/lib/overlayCache'
import { isJsonFreshForToday, mergeApiOverlay } from '@/lib/liveOverlay'
import { dbGet, dbUpsert } from '@/lib/db/helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const now = new Date()

  // 1. Read base 2026 data — DB first, then JSON file
  let raw: any
  const dbData = await dbGet('wc-2026')
  if (dbData) {
    raw = dbData
  } else {
    try {
      const filePath = path.join(process.cwd(), 'public/data/wc-2026.json')
      raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      // Seed DB in background
      dbUpsert('wc-2026', raw).catch(() => {})
    } catch {
      return NextResponse.json({ error: 'Failed to read tournament data' }, { status: 500 })
    }
  }

  // 2. Check if data is fresh for today (all today's matches already have scores)
  if (isJsonFreshForToday(raw, now)) {
    return NextResponse.json(
      { tournament: raw, meta: { dataSource: 'json', apiCacheFetchedAt: null, matchesUpdated: 0, liveMatchCount: 0 } },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  // 3. Stale — try /tmp overlay cache first (fast, same container)
  const cache = readOverlayCache()
  if (cache && isCacheFresh(cache, now)) {
    const result = mergeApiOverlay(raw, cache)
    return NextResponse.json(
      { tournament: result.tournament, meta: { dataSource: result.dataSource, apiCacheFetchedAt: result.apiCacheFetchedAt, matchesUpdated: result.matchesUpdated, liveMatchCount: result.liveMatchCount } },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  // 4. Cache stale — call the live API
  const apiData = await fetchWc2026Data()
  if (apiData) {
    writeOverlayCache(apiData)
    const result = mergeApiOverlay(raw, apiData)

    // Persist merged result to DB if anything changed
    if (result.matchesUpdated > 0) {
      dbUpsert('wc-2026', result.tournament).catch(() => {})
    }

    return NextResponse.json(
      { tournament: result.tournament, meta: { dataSource: result.dataSource, apiCacheFetchedAt: result.apiCacheFetchedAt, matchesUpdated: result.matchesUpdated, liveMatchCount: result.liveMatchCount } },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  // 5. API failed — graceful fallback
  return NextResponse.json(
    { tournament: raw, meta: { dataSource: 'json', apiCacheFetchedAt: null, matchesUpdated: 0, liveMatchCount: 0 } },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
