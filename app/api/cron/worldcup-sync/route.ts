import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { fetchWc2026Data } from '@/lib/apiFootball'
import { readOverlayCache, writeOverlayCache, isCacheFresh } from '@/lib/overlayCache'
import { isJsonFreshForToday } from '@/lib/liveOverlay'

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

  // 2. Read raw JSON, check freshness
  let raw: any
  try {
    const filePath = path.join(process.cwd(), 'public/data/wc-2026.json')
    const content = fs.readFileSync(filePath, 'utf8')
    raw = JSON.parse(content)
  } catch {
    return NextResponse.json({ status: 'error', reason: 'failed_to_read_json' })
  }

  if (isJsonFreshForToday(raw, now)) {
    return NextResponse.json({ status: 'skipped', reason: 'json_is_fresh' })
  }

  // 3. Check cache freshness
  const cache = readOverlayCache()
  if (cache && isCacheFresh(cache, now)) {
    return NextResponse.json({
      status: 'skipped',
      reason: 'cache_is_fresh',
      cachedAt: cache.fetchedAt,
    })
  }

  // 4. Call API
  const apiData = await fetchWc2026Data()
  if (apiData) {
    writeOverlayCache(apiData)
    return NextResponse.json({
      status: 'synced',
      matchesAvailable: apiData.fixtures.length,
    })
  }

  // 5. API failed — return error but with 200 so cron doesn't retry aggressively
  return NextResponse.json({ status: 'error', reason: 'api_failed' })
}

export function GET(req: NextRequest) {
  return handleSync(req)
}

export function POST(req: NextRequest) {
  return handleSync(req)
}
