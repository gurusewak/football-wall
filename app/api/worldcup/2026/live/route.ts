import 'server-only'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { dbGet, dbUpsert } from '@/lib/db/helpers'

export const dynamic = 'force-dynamic'

// Serves the latest 2026 data from DB (kept current by the hourly cron).
// Never calls API-Football directly — all API calls go through /api/cron/worldcup-sync.
export async function GET() {
  // 1. DB first (cron keeps this up to date)
  const dbData = await dbGet('wc-2026')
  if (dbData) {
    return NextResponse.json(
      { tournament: dbData, source: 'db', meta: { apiCacheFetchedAt: dbData.lastUpdated ?? null } },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  // 2. Fallback: JSON file (first deploy before cron has run)
  try {
    const filePath = path.join(process.cwd(), 'public/data/wc-2026.json')
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    // Seed DB in background so next request hits DB
    dbUpsert('wc-2026', raw).catch(() => {})
    return NextResponse.json(
      { tournament: raw, source: 'json', meta: { apiCacheFetchedAt: null } },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return NextResponse.json({ error: 'Failed to read tournament data' }, { status: 500 })
  }
}
