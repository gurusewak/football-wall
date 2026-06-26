import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { fetchWc2026Data } from '@/lib/apiFootball'
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

  // 3. Skip only if all today's matches are already complete with scores
  if (isJsonFreshForToday(raw, now)) {
    return NextResponse.json({ status: 'skipped', reason: 'data_is_fresh' })
  }

  // 4. Fetch live data from API-FOOTBALL
  // Pass existing matches so the API layer can detect goal-count mismatches and
  // back-fill event detail for completed matches outside the 3-day window
  const apiData = await fetchWc2026Data(raw.matches ?? [])
  if (!apiData) {
    return NextResponse.json({ status: 'error', reason: 'api_failed' })
  }

  // 5. Merge API data into the base JSON (scores, events, stats, standings)
  const mergeResult = mergeApiOverlay(raw, apiData)
  const enriched = { ...mergeResult.tournament, lastUpdated: now.toISOString() }

  // 6. Always persist to DB so page loads always get the latest data
  await dbUpsert('wc-2026', enriched)

  return NextResponse.json({
    status: 'synced',
    matchesAvailable: apiData.fixtures.length,
    matchesUpdated: mergeResult.matchesUpdated,
    liveMatchCount: mergeResult.liveMatchCount,
    persistedToDb: true,
  })
}

export function GET(req: NextRequest) {
  return handleSync(req)
}

export function POST(req: NextRequest) {
  return handleSync(req)
}
