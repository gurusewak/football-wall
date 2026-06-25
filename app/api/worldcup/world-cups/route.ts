import 'server-only'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { dbGet, dbUpsert } from '@/lib/db/helpers'

export const dynamic = 'force-dynamic'
const DATA_DIR = path.join(process.cwd(), 'public/data')

export async function GET() {
  const dbData = await dbGet('world-cups')
  if (dbData) {
    return NextResponse.json(dbData, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  }
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'world-cups.json'), 'utf8')
    const data = JSON.parse(raw)
    dbUpsert('world-cups', data).catch(() => {})
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'world-cups not found' }, { status: 404 })
  }
}
