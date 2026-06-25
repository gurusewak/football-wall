import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { fetchWc2026Data } from '@/lib/apiFootball'
import { readOverlayCache, writeOverlayCache, isCacheFresh } from '@/lib/overlayCache'
import { isJsonFreshForToday, mergeApiOverlay } from '@/lib/liveOverlay'
import { dbUpsert, dbGet } from '@/lib/db/helpers'

export const dynamic = 'force-dynamic'

async function handleSync(req: NextRequest) {
  const now = new Date()

  // 1. Verify Authorization header if CRON_SECRET is set
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // 2. Read base JSON (from DB if available, otherwise from file)
  let raw: any
  try {
    const dbData = await dbGet('wc-2026')
    if (dbData) {
      raw = dbData
    } else {
      const filePath = path.join(process.cwd(), 'public/data/wc-2026.json')
      raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
  } catch {
    return NextResponse.json({ status: 'error', reason: 'failed_to_read_data' })
  }

  // 3. Check if JSON is already fresh (all today's matches have results)
  if (isJsonFreshForToday(raw, now)) {
    return NextResponse.json({ status: 'skipped', reason: 'data_is_fresh' })
  }

  // 4. Check /tmp overlay cache freshness
  const cache = readOverlayCache()
  if (cache && isCacheFresh(cache, now)) {
    return NextResponse.json({
      status: 'skipped',
      reason: 'cache_is_fresh',
      cachedAt: cache.fetchedAt,
    })
  }

  // 5. Fetch live data from API-FOOTBALL
  const apiData = await fetchWc2026Data()
  if (!apiData) {
    return NextResponse.json({ status: 'error', reason: 'api_failed' })
  }

  // 6. Write to /tmp overlay cache (for fast same-container reads)
  writeOverlayCache(apiData)

  // 7. Merge API data into the base JSON
  const mergeResult = mergeApiOverlay(raw, apiData)
  const enriched = mergeResult.tournament

  // 8. Persist merged data to DB (so it survives across Vercel deployments)
  if (mergeResult.matchesUpdated > 0) {
    await dbUpsert('wc-2026', enriched)
  }

  return NextResponse.json({
    status: 'synced',
    matchesAvailable: apiData.fixtures.length,
    matchesUpdated: mergeResult.matchesUpdated,
    liveMatchCount: mergeResult.liveMatchCount,
    persistedToDb: mergeResult.matchesUpdated > 0,
  })
}

export function GET(req: NextRequest) {
  return handleSync(req)
}

export function POST(req: NextRequest) {
  return handleSync(req)
}
