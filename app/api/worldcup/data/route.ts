import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { dbGet, dbUpsert } from '@/lib/db/helpers'

export const dynamic = 'force-dynamic'

const DATA_DIR = path.join(process.cwd(), 'public/data')

function readJsonFile(filePath: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

// GET /api/worldcup/data?year=2022
// Returns raw tournament JSON for the given year.
// Reads from DB first; if missing, reads from local JSON, seeds DB, returns data.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')

  // If no year, return list of all available years from DB or index file
  if (!year) {
    const dbIndex = await dbGet('wc-index')
    if (dbIndex) {
      return NextResponse.json(dbIndex, { headers: { 'Cache-Control': 'public, max-age=60' } })
    }
    const jsonIndex = readJsonFile(path.join(DATA_DIR, 'wc-index.json'))
    return jsonIndex
      ? NextResponse.json(jsonIndex)
      : NextResponse.json({ error: 'index not found' }, { status: 404 })
  }

  const key = `wc-${year}`

  // Try DB first
  const dbData = await dbGet(key)
  if (dbData) {
    return NextResponse.json(dbData, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  }

  // Fallback: read from local JSON file
  const jsonPath = path.join(DATA_DIR, `wc-${year}.json`)
  const jsonData = readJsonFile(jsonPath)
  if (!jsonData) {
    return NextResponse.json({ error: `No data for year ${year}` }, { status: 404 })
  }

  // Seed DB in the background (don't await — don't block response)
  dbUpsert(key, jsonData).catch(() => {})

  return NextResponse.json(jsonData, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}

// POST /api/worldcup/data?year=2026  — used by cron to update 2026 data in DB
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') ?? '2026'

  // Verify CRON_SECRET if set
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('Authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const key = `wc-${year}`
  const ok = await dbUpsert(key, body)
  return NextResponse.json({ status: ok ? 'ok' : 'db_unavailable', key })
}
