import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_FILE = resolve(__dirname, '../data/preview-cache.json')
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface PreviewCacheEntry {
  tableName: string
  columns: string[]
  rows: Record<string, unknown>[]
  sql: string
  hiddenCount: number
  blocked: boolean
  reason?: string
  cachedAt: string // ISO
}

type CacheStore = Record<string, PreviewCacheEntry>

function read(): CacheStore {
  if (!existsSync(CACHE_FILE)) return {}
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as CacheStore
  } catch {
    return {}
  }
}

function write(store: CacheStore) {
  writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2))
}

export function getCache(tableName: string): PreviewCacheEntry | null {
  return read()[tableName] ?? null
}

export function setCache(entry: PreviewCacheEntry) {
  const store = read()
  store[entry.tableName] = entry
  write(store)
}

export function isStale(entry: PreviewCacheEntry): boolean {
  return Date.now() - new Date(entry.cachedAt).getTime() > TTL_MS
}
