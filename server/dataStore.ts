import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { ColumnRecord, DomainGroup, SchemaInfo, StaffRecord, TableRecord, TableType } from '../src/types/index.js'
import type { PersistedRule } from '../src/lib/ruleModels.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../data')
const TABLES_FILE = resolve(DATA_DIR, 'tables.json')
const COLUMNS_FILE = resolve(DATA_DIR, 'columns.json')
const DOMAINS_FILE = resolve(DATA_DIR, 'domains.json')
const RULES_FILE = resolve(DATA_DIR, 'rules.json')
const META_FILE = resolve(DATA_DIR, 'meta.json')

interface MetaFile {
  schemas: SchemaInfo[]
  teams: string[]
  owners: StaffRecord[]
}

interface AppDataFile {
  tables: Array<Omit<TableRecord, 'tableType'> & { tableType?: TableType }>
  columns: ColumnRecord[]
  domains: DomainGroup[]
  rules: PersistedRule[]
  schemas: SchemaInfo[]
  teams: string[]
  owners: StaffRecord[]
}

export interface AppData {
  tables: TableRecord[]
  columns: ColumnRecord[]
  domains: DomainGroup[]
  rules: PersistedRule[]
  schemas: SchemaInfo[]
  teams: string[]
  owners: StaffRecord[]
}

function readJsonFile<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf-8')) as T
}

function stringifyJson(data: unknown) {
  return `${JSON.stringify(data, null, 2)}\n`
}

function writeJsonFile(file: string, data: unknown) {
  const next = stringifyJson(data)
  const current = readFileSync(file, 'utf-8')
  if (current === next) return
  writeFileSync(file, next)
}

function normalizeTable(table: AppDataFile['tables'][number]): TableRecord {
  return {
    ...table,
    tableType: table.tableType ?? null,
  }
}

function normalizeData(data: AppDataFile): AppData {
  const columnCountByTable = new Map<string, number>()
  for (const col of data.columns) {
    columnCountByTable.set(col.tableName, (columnCountByTable.get(col.tableName) ?? 0) + 1)
  }
  return {
    ...data,
    tables: data.tables.map(t => ({
      ...normalizeTable(t),
      columnCount: columnCountByTable.get(t.tableName) ?? 0,
    })),
  }
}

export function readAppData(): AppData {
  const meta = readJsonFile<MetaFile>(META_FILE)

  return normalizeData({
    tables: readJsonFile<AppDataFile['tables']>(TABLES_FILE),
    columns: readJsonFile<ColumnRecord[]>(COLUMNS_FILE),
    domains: readJsonFile<DomainGroup[]>(DOMAINS_FILE),
    rules: readJsonFile<PersistedRule[]>(RULES_FILE),
    schemas: meta.schemas,
    teams: meta.teams,
    owners: meta.owners,
  })
}

export function writeAppData(data: AppData) {
  writeJsonFile(TABLES_FILE, data.tables)
  writeJsonFile(COLUMNS_FILE, data.columns)
  writeJsonFile(DOMAINS_FILE, data.domains)
  writeJsonFile(RULES_FILE, data.rules)
  writeJsonFile(META_FILE, {
    schemas: data.schemas,
    teams: data.teams,
    owners: data.owners,
  } satisfies MetaFile)
}

export function writeTables(tables: AppData['tables']) {
  writeJsonFile(TABLES_FILE, tables)
}

export function writeColumns(columns: AppData['columns']) {
  writeJsonFile(COLUMNS_FILE, columns)
}

export function writeDomains(domains: AppData['domains']) {
  writeJsonFile(DOMAINS_FILE, domains)
}

export function writeRules(rules: AppData['rules']) {
  writeJsonFile(RULES_FILE, rules)
}
