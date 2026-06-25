import { db } from '@/lib/db'
import { sportsData } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

// GET all sports data or specific data by name
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')

    if (name) {
      const result = await db.select().from(sportsData).where(eq(sportsData.name, name))
      return NextResponse.json(result[0] || null)
    }

    const result = await db.select().from(sportsData)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[v0] GET /api/sports-data error:', error)
    return NextResponse.json({ error: 'Failed to fetch sports data' }, { status: 500 })
  }
}

// POST to create or update sports data
export async function POST(request: NextRequest) {
  try {
    const { name, data } = await request.json()

    if (!name || !data) {
      return NextResponse.json({ error: 'name and data are required' }, { status: 400 })
    }

    // Check if data exists
    const existing = await db.select().from(sportsData).where(eq(sportsData.name, name))

    if (existing.length > 0) {
      // Update existing
      const updated = await db
        .update(sportsData)
        .set({
          data: data,
          updatedAt: new Date(),
        })
        .where(eq(sportsData.name, name))
        .returning()

      return NextResponse.json(updated[0], { status: 200 })
    } else {
      // Insert new
      const inserted = await db
        .insert(sportsData)
        .values({
          name,
          data,
        })
        .returning()

      return NextResponse.json(inserted[0], { status: 201 })
    }
  } catch (error) {
    console.error('[v0] POST /api/sports-data error:', error)
    return NextResponse.json({ error: 'Failed to save sports data' }, { status: 500 })
  }
}
