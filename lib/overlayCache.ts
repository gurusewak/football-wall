import 'server-only'
import fs from 'fs'
import { ApiFetchedData } from './apiFootball'

const CACHE_FILE_PATH = '/tmp/wc-api-overlay-2026.json'
const API_REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000  // 2 hours

export function readOverlayCache(): ApiFetchedData | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf8')
    return JSON.parse(raw) as ApiFetchedData
  } catch {
    return null
  }
}

export function writeOverlayCache(data: ApiFetchedData): void {
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(data), 'utf8')
  } catch {
    // swallow errors
  }
}

export function isCacheFresh(cache: ApiFetchedData, now: Date): boolean {
  if (!cache?.fetchedAt) return false
  return now.getTime() - new Date(cache.fetchedAt).getTime() < API_REFRESH_INTERVAL_MS
}
