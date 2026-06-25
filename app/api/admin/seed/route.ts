import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { dbGet, dbUpsert } from '@/lib/db/helpers'

const DATA_DIR = path.join(process.cwd(), 'public/data')
const YEARS = [1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026]

// POST /api/admin/seed  — seeds all world cup JSON files into DB
// Protected by CRON_SECRET (same env var used by the cron job)
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('Authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const results: Record<string, string> = {}

  // Seed wc-index
  try {
    const existing = await dbGet('wc-index')
    if (!existing) {
      const raw = fs.readFileSync(path.join(DATA_DIR, 'wc-index.json'), 'utf8')
      await dbUpsert('wc-index', JSON.parse(raw))
      results['wc-index'] = 'seeded'
    } else {
      results['wc-index'] = 'already_present'
    }
  } catch {
    results['wc-index'] = 'error'
  }

  // Seed world-cups metadata
  try {
    const existing = await dbGet('world-cups')
    if (!existing) {
      const raw = fs.readFileSync(path.join(DATA_DIR, 'world-cups.json'), 'utf8')
      await dbUpsert('world-cups', JSON.parse(raw))
      results['world-cups'] = 'seeded'
    } else {
      results['world-cups'] = 'already_present'
    }
  } catch {
    results['world-cups'] = 'error'
  }

  // Seed each year (force=true re-seeds even if present)
  const force = req.nextUrl.searchParams.get('force') === 'true'
  for (const year of YEARS) {
    const key = `wc-${year}`
    try {
      const existing = await dbGet(key)
      if (existing && !force) {
        results[key] = 'already_present'
        continue
      }
      const filePath = path.join(DATA_DIR, `${key}.json`)
      if (!fs.existsSync(filePath)) {
        results[key] = 'file_not_found'
        continue
      }
      const raw = fs.readFileSync(filePath, 'utf8')
      await dbUpsert(key, JSON.parse(raw))
      results[key] = force && existing ? 'refreshed' : 'seeded'
    } catch {
      results[key] = 'error'
    }
  }

  return NextResponse.json({ status: 'done', results })
}

// GET for quick status check — shows what's in DB vs not
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('Authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const status: Record<string, boolean> = {}
  const keys = ['wc-index', 'world-cups', ...YEARS.map(y => `wc-${y}`)]
  await Promise.all(keys.map(async k => {
    const d = await dbGet(k)
    status[k] = d !== null
  }))
  return NextResponse.json({ status })
}
