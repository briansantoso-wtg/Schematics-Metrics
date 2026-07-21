import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_FILE = resolve(__dirname, '../data/rule-results-cache.json')
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface RuleCacheEntry {
  ruleId: string
  columns: string[]
  rows: Record<string, unknown>[]
  sql: string
  cachedAt: string // ISO
}

type CacheStore = Record<string, RuleCacheEntry>

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

export function getRuleCache(ruleId: string): RuleCacheEntry | null {
  return read()[ruleId] ?? null
}

export function setRuleCache(entry: RuleCacheEntry) {
  const store = read()
  store[entry.ruleId] = entry
  write(store)
}

export function isRuleStale(entry: RuleCacheEntry): boolean {
  return Date.now() - new Date(entry.cachedAt).getTime() > TTL_MS
}
