import 'server-only'
import { eq } from 'drizzle-orm'
import { sportsData } from './schema'

// Lazily import db to avoid crashing at build time when DATABASE_URL is absent
async function getDb() {
  if (!process.env.DATABASE_URL) return null
  const { db } = await import('./index')
  return db
}

export async function dbGet(name: string): Promise<any | null> {
  const db = await getDb()
  if (!db) return null
  try {
    const rows = await db.select().from(sportsData).where(eq(sportsData.name, name))
    return rows[0]?.data ?? null
  } catch {
    return null
  }
}

export async function dbUpsert(name: string, data: unknown): Promise<boolean> {
  const db = await getDb()
  if (!db) return false
  try {
    const existing = await db.select({ id: sportsData.id }).from(sportsData).where(eq(sportsData.name, name))
    if (existing.length > 0) {
      await db.update(sportsData).set({ data: data as any, updatedAt: new Date() }).where(eq(sportsData.name, name))
    } else {
      await db.insert(sportsData).values({ name, data: data as any })
    }
    return true
  } catch {
    return false
  }
}

export function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL
}
