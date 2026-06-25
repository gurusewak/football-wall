#!/usr/bin/env node
/**
 * Seed all World Cup tournament data into Neon PostgreSQL.
 * Run once after setting up DATABASE_URL in .env.local.
 *
 * Usage: node scripts/seed-db.mjs
 *        node scripts/seed-db.mjs --year 2026   (seed only one year)
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'public', 'data')

// Read DATABASE_URL from .env.local
function readEnvLocal() {
  const envPath = join(ROOT, '.env.local')
  if (!existsSync(envPath)) return {}
  const env = {}
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 0) continue
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
  return env
}

const env = readEnvLocal()
const DATABASE_URL = env.DATABASE_URL || process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set. Add it to .env.local')
  process.exit(1)
}

// Dynamically import pg (ESM compatible)
const { default: pg } = await import('pg')
const pool = new pg.Pool({ connectionString: DATABASE_URL })

async function upsert(client, name, data) {
  await client.query(`
    INSERT INTO sports_data (name, data, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    ON CONFLICT (name) DO UPDATE SET data = $2, updated_at = NOW()
  `, [name, JSON.stringify(data)])
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS sports_data (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT sports_data_name_unique UNIQUE (name)
    )
  `)
  await client.query(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id SERIAL PRIMARY KEY,
      tournament_year INTEGER NOT NULL,
      synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      matches_updated INTEGER NOT NULL DEFAULT 0,
      live_match_count INTEGER NOT NULL DEFAULT 0,
      data_source TEXT NOT NULL DEFAULT 'json',
      status TEXT NOT NULL DEFAULT 'ok',
      error_message TEXT
    )
  `)
  console.log('  Tables ready.')
}

const args = process.argv.slice(2)
const yearArg = args.indexOf('--year')
const singleYear = yearArg >= 0 ? parseInt(args[yearArg + 1]) : null

const client = await pool.connect()
try {
  await ensureTable(client)

  const keys = singleYear
    ? [`wc-${singleYear}`]
    : ['wc-index', 'world-cups', 'wc-1998', 'wc-2002', 'wc-2006', 'wc-2010', 'wc-2014', 'wc-2018', 'wc-2022', 'wc-2026']

  for (const key of keys) {
    let filename
    if (key === 'wc-index') filename = 'wc-index.json'
    else if (key === 'world-cups') filename = 'world-cups.json'
    else filename = `${key}.json`

    const filePath = join(DATA_DIR, filename)
    if (!existsSync(filePath)) {
      console.log(`  SKIP ${key} (file not found)`)
      continue
    }

    let data
    try {
      data = JSON.parse(readFileSync(filePath, 'utf8'))
    } catch (e) {
      console.log(`  ERROR reading ${key}: ${e.message}`)
      continue
    }

    await upsert(client, key, data)
    const size = JSON.stringify(data).length
    console.log(`  ✅ Seeded ${key} (${Math.round(size / 1024)} KB)`)
  }

  console.log('\nAll done. DB seeded successfully.')
} finally {
  client.release()
  await pool.end()
}
