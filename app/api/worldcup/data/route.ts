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
// Returns { data: <tournament>, source: 'db' | 'json' }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')

  if (!year) {
    const dbIndex = await dbGet('wc-index')
    if (dbIndex) {
      return NextResponse.json(
        { data: dbIndex, source: 'db' },
        { headers: { 'Cache-Control': 'public, max-age=60' } }
      )
    }
    const jsonIndex = readJsonFile(path.join(DATA_DIR, 'wc-index.json'))
    return jsonIndex
      ? NextResponse.json({ data: jsonIndex, source: 'json' })
      : NextResponse.json({ error: 'index not found' }, { status: 404 })
  }

  const key = `wc-${year}`

  const dbData = await dbGet(key)
  if (dbData) {
    return NextResponse.json(
      { data: dbData, source: 'db' },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  }

  const jsonPath = path.join(DATA_DIR, `wc-${year}.json`)
  const jsonData = readJsonFile(jsonPath)
  if (!jsonData) {
    return NextResponse.json({ error: `No data for year ${year}` }, { status: 404 })
  }

  dbUpsert(key, jsonData).catch(() => {})

  return NextResponse.json(
    { data: jsonData, source: 'json' },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  )
}

// POST /api/worldcup/data?year=2026  — used by cron to update 2026 data in DB
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') ?? '2026'

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
