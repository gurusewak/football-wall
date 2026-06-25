import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { fetchWc2026Data } from '@/lib/apiFootball'
import { readOverlayCache, writeOverlayCache, isCacheFresh } from '@/lib/overlayCache'
import { isJsonFreshForToday, mergeApiOverlay } from '@/lib/liveOverlay'

export const dynamic = 'force-dynamic'

export async function GET() {
  const now = new Date()

  // 1. Read raw wc-2026.json
  let raw: any
  try {
    const filePath = path.join(process.cwd(), 'public/data/wc-2026.json')
    const content = fs.readFileSync(filePath, 'utf8')
    raw = JSON.parse(content)
  } catch {
    return NextResponse.json({ error: 'Failed to read tournament data' }, { status: 500 })
  }

  // 2. Check if JSON is fresh for today
  if (isJsonFreshForToday(raw, now)) {
    return NextResponse.json(
      {
        tournament: raw,
        meta: {
          dataSource: 'json',
          apiCacheFetchedAt: null,
          matchesUpdated: 0,
          liveMatchCount: 0,
        },
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  // 3. JSON is stale — try overlay cache first
  const cache = readOverlayCache()
  if (cache && isCacheFresh(cache, now)) {
    const result = mergeApiOverlay(raw, cache)
    return NextResponse.json(
      {
        tournament: result.tournament,
        meta: {
          dataSource: result.dataSource,
          apiCacheFetchedAt: result.apiCacheFetchedAt,
          matchesUpdated: result.matchesUpdated,
          liveMatchCount: result.liveMatchCount,
        },
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  // 4. Cache is stale — call the API
  const apiData = await fetchWc2026Data()
  if (apiData) {
    writeOverlayCache(apiData)
    const result = mergeApiOverlay(raw, apiData)
    return NextResponse.json(
      {
        tournament: result.tournament,
        meta: {
          dataSource: result.dataSource,
          apiCacheFetchedAt: result.apiCacheFetchedAt,
          matchesUpdated: result.matchesUpdated,
          liveMatchCount: result.liveMatchCount,
        },
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  // 5. API failed — graceful fallback to static JSON
  return NextResponse.json(
    {
      tournament: raw,
      meta: {
        dataSource: 'json',
        apiCacheFetchedAt: null,
        matchesUpdated: 0,
        liveMatchCount: 0,
      },
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
