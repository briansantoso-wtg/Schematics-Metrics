import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { TableRecord, LMH } from '../src/types/index.js'
import type { PersistedRule } from '../src/lib/ruleModels.js'
import { createPersistedRule } from '../src/lib/ruleModels.js'
import { readAppData, writeTables, writeColumns, writeDomains, writeRules } from './dataStore.js'
import { testConnection, queryPreview, queryRaw, type DbCredentials } from './db.js'
import { getCache, setCache, isStale, type PreviewCacheEntry } from './previewCache.js'
import { getRuleCache, setRuleCache, isRuleStale } from './ruleCache.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

const useMockData = process.env.USE_MOCK_DATA === '1'
let mockData = readAppData()

function readData() {
  if (useMockData) return mockData
  return readAppData()
}

function writeTableData(tables: ReturnType<typeof readAppData>['tables']) {
  if (useMockData) {
    mockData.tables = tables
    return
  }
  writeTables(tables)
}

function writeRuleData(rules: ReturnType<typeof readAppData>['rules']) {
  if (useMockData) {
    mockData.rules = rules
    return
  }
  writeRules(rules)
}

// ─── Platform ──────────────────────────────────────────────────────────────────

app.get('/api/platform', (_req, res) => {
  const isWindows = process.platform === 'win32'
  res.json({
    platform: process.platform,
    isWindows,
    // Expose SQL defaults for non-Windows platforms (pre-fills the login form)
    ...(isWindows ? {} : {
      defaultUsername: process.env.DB_DEFAULT_USERNAME ?? '',
      defaultPassword: process.env.DB_DEFAULT_PASSWORD ?? '',
    }),
  })
})

app.get('/api/tables', (_req, res) => {
  const { tables } = readData()
  res.json(tables)
})

app.get('/api/tables/:tableName', (req, res) => {
  const { tables, columns } = readData()
  const table = tables.find(t => t.tableName === req.params.tableName)
  if (!table) { res.status(404).json({ error: 'Not found' }); return }
  res.json({ ...table, columns: columns.filter(c => c.tableName === req.params.tableName) })
})

app.patch('/api/tables/:tableName', (req, res) => {
  const data = readData()
  const idx = data.tables.findIndex(t => t.tableName === req.params.tableName)
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return }
  const allowed: (keyof TableRecord)[] = [
    'domain', 'subdomain', 'tableType',
    'primaryOwner', 'secondaryOwner', 'devTeamOwner',
    'criticality', 'description', 'isStale', 'lastConfirmedDate', 'sensitivity',
  ]
  for (const key of allowed) {
    if (key in req.body) (data.tables[idx] as unknown as Record<string, unknown>)[key] = req.body[key]
  }
  writeTableData(data.tables)
  res.json(data.tables[idx])
})

type SubdomainOwnerEntry = {
  primaryOwner: string | null
  secondaryOwner: string | null
  priority?: string | null
  sensitiveData?: 'Restricted' | 'Open' | 'inherit' | null
}

function enrichDomain(d: ReturnType<typeof readData>['domains'][number], tables: ReturnType<typeof readData>['tables']) {
  const dt = tables.filter(t => t.domain === d.name)
  const covered = dt.filter(t => t.primaryOwner && t.devTeamOwner).length
  const ownershipCoverage = dt.length > 0 ? Math.round((covered / dt.length) * 100) : 0
  const subdomainNamesFromTables = dt.map(t => t.subdomain).filter((s): s is string => !!s)
  const subdomainOwners = (d as unknown as Record<string, unknown>).subdomainOwners as Record<string, SubdomainOwnerEntry | null> ?? {}
  const subdomainNamesFromOwners = Object.entries(subdomainOwners).filter(([, v]) => v != null).map(([k]) => k)
  const subdomainNames = [...new Set([...subdomainNamesFromTables, ...subdomainNamesFromOwners])]
  const subdomains = subdomainNames.map(name => ({
    name,
    domainName: d.name,
    primaryOwner: subdomainOwners[name]?.primaryOwner ?? null,
    secondaryOwner: subdomainOwners[name]?.secondaryOwner ?? null,
    priority: (subdomainOwners[name]?.priority ?? null) as string | null,
    sensitiveData: subdomainOwners[name]?.sensitiveData ?? 'inherit',
    tableCount: dt.filter(t => t.subdomain === name).length,
  }))
  return { ...d, ownershipCoverage, subdomains, primaryOwner: d.primaryOwner ?? null, secondaryOwner: d.secondaryOwner ?? null }
}

app.get('/api/domains', (_req, res) => {
  const { domains, tables } = readData()
  res.json(domains.map(d => enrichDomain(d, tables)))
})

app.post('/api/domains', (req, res) => {
  const data = readData()
  const body = req.body as { name: string; description?: string; primaryOwner?: string | null; secondaryOwner?: string | null; priority?: LMH; sensitiveData?: 'Restricted' | 'Open' | null }
  const { name, description } = body
  if (!name || data.domains.find(d => d.name === name)) {
    res.status(400).json({ error: 'Domain name required and must be unique' }); return
  }
  const newDomain = {
    name,
    description: description ?? '',
    tableCount: 0,
    columnCount: 0,
    ownershipCoverage: 0,
    criticalityBreakdown: { H: 0, M: 0, L: 0, unset: 0 },
    primaryOwner: body.primaryOwner ?? null,
    secondaryOwner: body.secondaryOwner ?? null,
    priority: body.priority ?? null,
    sensitiveData: body.sensitiveData ?? null,
    subdomainOwners: {},
  }
  data.domains.push(newDomain)
  writeDomains(data.domains)
  res.json(enrichDomain(newDomain, data.tables))
})

app.patch('/api/domains/:name', (req, res) => {
  const data = readData()
  const idx = data.domains.findIndex(d => d.name === req.params.name)
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return }
  const d = data.domains[idx] as unknown as Record<string, unknown>
  const body = req.body as Record<string, unknown>
  if ('description' in body) d.description = body.description
  if ('primaryOwner' in body) d.primaryOwner = body.primaryOwner
  if ('secondaryOwner' in body) d.secondaryOwner = body.secondaryOwner
  if ('priority' in body) d.priority = body.priority
  if ('sensitiveData' in body) d.sensitiveData = body.sensitiveData
  if ('newName' in body && typeof body.newName === 'string') {
    const newName = body.newName as string
    // Rename all tables in this domain
    data.tables.forEach(t => { if (t.domain === req.params.name) t.domain = newName })
    writeTables(data.tables)
    d.name = newName
  }
  if ('subdomainOwners' in body && typeof body.subdomainOwners === 'object') {
    const existing = (d.subdomainOwners as Record<string, unknown>) ?? {}
    const merged = { ...existing }
    for (const [k, v] of Object.entries(body.subdomainOwners as Record<string, unknown>)) {
      if (v === null) delete merged[k]
      else merged[k] = v
    }
    d.subdomainOwners = merged
  }
  writeDomains(data.domains)
  res.json(enrichDomain(data.domains[idx], data.tables))
})

app.delete('/api/domains/:name', (req, res) => {
  const data = readData()
  const idx = data.domains.findIndex(d => d.name === req.params.name)
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return }
  data.domains.splice(idx, 1)
  // Reassign tables to Unclassified
  data.tables.forEach(t => { if (t.domain === req.params.name) { t.domain = 'Unclassified'; t.subdomain = null } })
  writeTables(data.tables)
  writeDomains(data.domains)
  res.json({ ok: true })
})

app.patch('/api/columns/:tableName/:columnName', (req, res) => {
  const data = readData()
  const col = data.columns.find(
    c => c.tableName === req.params.tableName && c.columnName === req.params.columnName
  )
  if (!col) { res.status(404).json({ error: 'Not found' }); return }
  if ('criticality' in req.body) col.criticality = req.body.criticality
  if ('sensitivity' in req.body) col.sensitivity = req.body.sensitivity
  if (useMockData) {
    mockData.columns = data.columns
  } else {
    writeColumns(data.columns)
  }
  res.json(col)
})

app.get('/api/schemas', (_req, res) => {
  res.json(readData().schemas)
})

app.get('/api/teams', (_req, res) => {
  res.json(readData().teams)
})

app.get('/api/owners', (_req, res) => {
  res.json(readData().owners)
})

app.get('/api/summary', (_req, res) => {
  const { tables } = readData()
  res.json({
    totalTables: tables.length,
    assignedPrimary: tables.filter(t => t.primaryOwner).length,
    assignedDevTeam: tables.filter(t => t.devTeamOwner).length,
    assignedBoth: tables.filter(t => t.primaryOwner && t.devTeamOwner).length,
    unassigned: tables.filter(t => !t.primaryOwner && !t.devTeamOwner).length,
    stale: tables.filter(t => t.isStale).length,
    criticalityH: tables.filter(t => t.criticality === 'H').length,
    criticalityM: tables.filter(t => t.criticality === 'M').length,
    criticalityL: tables.filter(t => t.criticality === 'L').length,
    criticalityUnset: tables.filter(t => !t.criticality).length,
  })
})

// ─── SCHRG Metrics ─────────────────────────────────────────────────────────────

function parseCSV(content: string): Record<string, unknown>[] {
  const lines = content.trim().split('\n')
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    const row: Record<string, unknown> = {}
    headers.forEach((header, i) => {
      const value = values[i]
      row[header] = isNaN(Number(value)) ? value : Number(value)
    })
    return row
  })
}

app.get('/api/schrg', (_req, res) => {
  try {
    const publicDir = path.join(__dirname, '../public')

    const monthlyPath = path.join(publicDir, 'schrg_monthly.csv')
    const yearlyPath = path.join(publicDir, 'schrg_yearly.csv')
    const yoyPath = path.join(publicDir, 'schrg_yoy.csv')

    const monthly = parseCSV(fs.readFileSync(monthlyPath, 'utf-8'))
    const yearly = parseCSV(fs.readFileSync(yearlyPath, 'utf-8'))
    const yoy = parseCSV(fs.readFileSync(yoyPath, 'utf-8'))

    res.json({ monthly, yearly, yoy })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// Validate SCHRG data against database
app.post('/api/schrg/validate', async (req, res) => {
  const { credentials } = req.body as { credentials?: DbCredentials }
  try {
    const queries = {
      yearly: `
        DECLARE @Mode NVARCHAR(10) = 'Yearly';
        DECLARE @StartDate DATETIME = '2024-09-01';
        DECLARE @StaffList NVARCHAR(200) = 'AER,BS8,KLT,RS6';
        DECLARE @ExcludePriorities NVARCHAR(200) = 'CR6,FTR';
        ;WITH Staffs AS (
            SELECT value AS StaffCode FROM STRING_SPLIT(@StaffList, ',')
        ), ExcludedPriorities AS (
            SELECT value AS Priority FROM STRING_SPLIT(@ExcludePriorities, ',')
        )
        SELECT
            YEAR(IM.IM_SystemCreateTimeUtc) AS Year,
            WF.P9_GS_NKAssignedStaffMember AS StaffMember,
            IM.IM_Priority AS Priority,
            COUNT(DISTINCT IM.IM_ID) AS IncidentCount,
            ROUND(AVG(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_SystemUpdateTimeUtc) / 86400.0), 4) AS AvgDaysToClose,
            ROUND(MIN(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_SystemUpdateTimeUtc) / 86400.0), 4) AS MinDays,
            ROUND(MAX(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_SystemUpdateTimeUtc) / 86400.0), 4) AS MaxDays
        FROM IncidentMain IM
        INNER JOIN (
            SELECT P9_ParentID, P9_GS_NKAssignedStaffMember, ROW_NUMBER() OVER (PARTITION BY P9_ParentID ORDER BY P9_PK DESC) AS rn
            FROM WorkflowTask
            WHERE P9_ParentTableCode = 'IM' AND P9_GS_NKAssignedStaffMember IN (SELECT StaffCode FROM Staffs)
        ) WF ON IM.IM_ID = WF.P9_ParentID AND WF.rn = 1
        WHERE IM.IM_Status = 'CLS'
            AND IM.IM_SystemCreateTimeUtc >= @StartDate
            AND IM.IM_Priority NOT IN (SELECT Priority FROM ExcludedPriorities)
        GROUP BY YEAR(IM.IM_SystemCreateTimeUtc), WF.P9_GS_NKAssignedStaffMember, IM.IM_Priority
        ORDER BY Year DESC, StaffMember, Priority;
      `,
      monthly: `
        DECLARE @Mode NVARCHAR(10) = 'Monthly';
        DECLARE @StartDate DATETIME = '2024-09-01';
        DECLARE @StaffList NVARCHAR(200) = 'AER,BS8,KLT,RS6';
        DECLARE @ExcludePriorities NVARCHAR(200) = 'CR6,FTR';
        ;WITH Staffs AS (
            SELECT value AS StaffCode FROM STRING_SPLIT(@StaffList, ',')
        ), ExcludedPriorities AS (
            SELECT value AS Priority FROM STRING_SPLIT(@ExcludePriorities, ',')
        )
        SELECT
            YEAR(IM.IM_SystemCreateTimeUtc) AS Year,
            MONTH(IM.IM_SystemCreateTimeUtc) AS Month,
            FORMAT(IM.IM_SystemCreateTimeUtc, 'yyyy-MM') AS YearMonth,
            WF.P9_GS_NKAssignedStaffMember AS StaffMember,
            COUNT(DISTINCT IM.IM_ID) AS IncidentCount,
            ROUND(AVG(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_SystemUpdateTimeUtc) / 86400.0), 4) AS AvgDaysToClose
        FROM IncidentMain IM
        INNER JOIN (
            SELECT P9_ParentID, P9_GS_NKAssignedStaffMember, ROW_NUMBER() OVER (PARTITION BY P9_ParentID ORDER BY P9_PK DESC) AS rn
            FROM WorkflowTask
            WHERE P9_ParentTableCode = 'IM' AND P9_GS_NKAssignedStaffMember IN (SELECT StaffCode FROM Staffs)
        ) WF ON IM.IM_ID = WF.P9_ParentID AND WF.rn = 1
        WHERE IM.IM_Status = 'CLS'
            AND IM.IM_SystemCreateTimeUtc >= @StartDate
            AND IM.IM_Priority NOT IN (SELECT Priority FROM ExcludedPriorities)
        GROUP BY YEAR(IM.IM_SystemCreateTimeUtc), MONTH(IM.IM_SystemCreateTimeUtc), FORMAT(IM.IM_SystemCreateTimeUtc, 'yyyy-MM'), WF.P9_GS_NKAssignedStaffMember
        ORDER BY Year DESC, Month DESC, StaffMember;
      `,
      yoy: `
        DECLARE @Mode NVARCHAR(10) = 'YoY';
        DECLARE @StartDate DATETIME = '2024-09-01';
        DECLARE @StaffList NVARCHAR(200) = 'AER,BS8,KLT,RS6';
        DECLARE @ExcludePriorities NVARCHAR(200) = 'CR6,FTR';
        ;WITH Staffs AS (
            SELECT value AS StaffCode FROM STRING_SPLIT(@StaffList, ',')
        ), ExcludedPriorities AS (
            SELECT value AS Priority FROM STRING_SPLIT(@ExcludePriorities, ',')
        ), YearlyStats AS (
            SELECT
                YEAR(IM.IM_SystemCreateTimeUtc) AS Year,
                WF.P9_GS_NKAssignedStaffMember AS StaffMember,
                ROUND(AVG(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_SystemUpdateTimeUtc) / 86400.0), 4) AS AvgDays,
                COUNT(DISTINCT IM.IM_ID) AS IncidentCount
            FROM IncidentMain IM
            INNER JOIN (
                SELECT P9_ParentID, P9_GS_NKAssignedStaffMember, ROW_NUMBER() OVER (PARTITION BY P9_ParentID ORDER BY P9_PK DESC) AS rn
                FROM WorkflowTask
                WHERE P9_ParentTableCode = 'IM' AND P9_GS_NKAssignedStaffMember IN (SELECT StaffCode FROM Staffs)
            ) WF ON IM.IM_ID = WF.P9_ParentID AND WF.rn = 1
            WHERE IM.IM_Status = 'CLS'
                AND IM.IM_SystemCreateTimeUtc >= @StartDate
                AND IM.IM_Priority NOT IN (SELECT Priority FROM ExcludedPriorities)
            GROUP BY YEAR(IM.IM_SystemCreateTimeUtc), WF.P9_GS_NKAssignedStaffMember
        )
        SELECT
            Curr.Year AS CurrentYear,
            Curr.StaffMember,
            Curr.AvgDays AS CurrentAvgDays,
            Curr.IncidentCount AS CurrentCount,
            Prv.AvgDays AS PriorAvgDays,
            Prv.IncidentCount AS PriorCount,
            ROUND(((Prv.AvgDays - Curr.AvgDays) / NULLIF(Prv.AvgDays, 0) * 100), 2) AS ImprovementPercent
        FROM YearlyStats Curr
        LEFT JOIN YearlyStats Prv ON Curr.StaffMember = Prv.StaffMember AND Curr.Year = Prv.Year + 1
        ORDER BY CurrentYear DESC, StaffMember;
      `,
    }

    const [dbYearly, dbMonthly, dbYoy] = await Promise.all([
      queryRaw(queries.yearly, credentials ?? undefined),
      queryRaw(queries.monthly, credentials ?? undefined),
      queryRaw(queries.yoy, credentials ?? undefined),
    ])

    // Load CSV data
    const publicDir = path.join(__dirname, '../public')
    const csvYearly = parseCSV(fs.readFileSync(path.join(publicDir, 'schrg_yearly.csv'), 'utf-8'))
    const csvMonthly = parseCSV(fs.readFileSync(path.join(publicDir, 'schrg_monthly.csv'), 'utf-8'))
    const csvYoy = parseCSV(fs.readFileSync(path.join(publicDir, 'schrg_yoy.csv'), 'utf-8'))

    res.json({
      dbYearly,
      dbMonthly,
      dbYoy,
      csvYearly,
      csvMonthly,
      csvYoy,
      comparison: {
        yearlyMatch: JSON.stringify(dbYearly) === JSON.stringify(csvYearly),
        monthlyMatch: JSON.stringify(dbMonthly) === JSON.stringify(csvMonthly),
        yoyMatch: JSON.stringify(dbYoy) === JSON.stringify(csvYoy),
      },
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// ─── Rules ─────────────────────────────────────────────────────────────────────

app.get('/api/rules', (_req, res) => {
  res.json(readData().rules)
})

app.get('/api/rules/:ruleId', (req, res) => {
  const rule = readData().rules.find(r => r.id === req.params.ruleId)
  if (!rule) { res.status(404).json({ error: 'Not found' }); return }
  res.json(rule)
})

app.post('/api/rules', (req, res) => {
  const data = readData()
  const body = req.body as PersistedRule | Parameters<typeof createPersistedRule>[0]
  const nextRule = 'id' in body ? body : createPersistedRule(body)
  if (data.rules.some(rule => rule.id === nextRule.id)) {
    res.status(409).json({ error: 'Rule id already exists' })
    return
  }
  data.rules.push(nextRule)
  writeRuleData(data.rules)
  res.status(201).json(nextRule)
})

app.patch('/api/rules/:ruleId', (req, res) => {
  const data = readData()
  const idx = data.rules.findIndex(rule => rule.id === req.params.ruleId)
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return }

  const allowed: Array<keyof PersistedRule> = [
    'name', 'type', 'table', 'field', 'subtableScope', 'description', 'severity',
    'status', 'owner', 'schedule', 'lastRun', 'passRate', 'failCount',
    'sqlExpression', 'alertThreshold', 'lastHealthPct', 'notes',
  ]

  const updated = { ...data.rules[idx] }
  for (const key of allowed) {
    if (key in req.body) {
      ;(updated as Record<string, unknown>)[key] = req.body[key]
    }
  }

  data.rules[idx] = updated
  writeRuleData(data.rules)
  res.json(updated)
})

app.delete('/api/rules/:ruleId', (req, res) => {
  const data = readData()
  const idx = data.rules.findIndex(rule => rule.id === req.params.ruleId)
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return }
  data.rules.splice(idx, 1)
  writeRuleData(data.rules)
  res.json({ ok: true })
})

// ─── Database connection test ──────────────────────────────────────────────────

app.post('/api/db/test', async (req, res) => {
  const { credentials } = req.body as { credentials?: DbCredentials }
  const result = await testConnection(credentials ?? undefined)
  res.json(result)
})

// ─── Data preview ──────────────────────────────────────────────────────────────

function resolveColumnSensitivity(
  colSensitivity: string | null | undefined,
  tableSensitivity: string | null | undefined,
): string {
  const col = colSensitivity ?? 'inherit'
  if (col !== 'inherit') return col
  const tbl = tableSensitivity ?? 'inherit'
  if (tbl !== 'inherit') return tbl
  return 'Restricted'
}

function buildPreviewEntry(tableName: string): { entry: Omit<PreviewCacheEntry, 'cachedAt' | 'rows'> & { colNames: string[] }; error?: never } | { error: string } {
  const { tables, columns } = readData()
  const table = tables.find(t => t.tableName === tableName)
  if (!table) return { error: 'Table not found in registry' }

  const tableCols = columns.filter(c => c.tableName === tableName)
  const openCols = tableCols.filter(c =>
    resolveColumnSensitivity(c.sensitivity, table.sensitivity) === 'Open'
  )

  if (openCols.length === 0) {
    return {
      entry: {
        tableName,
        columns: [],
        colNames: [],
        sql: '',
        hiddenCount: tableCols.length,
        blocked: true,
        reason: 'No Open columns — table or all columns are Sensitive/Restricted.',
      },
    }
  }

  const colNames = openCols.map(c => c.columnName)
  const sql = `SELECT TOP 100 ${colNames.map(c => `[${c}]`).join(', ')}\nFROM [${table.schema}].[${tableName}]`
  return {
    entry: {
      tableName,
      columns: colNames,
      colNames,
      sql,
      hiddenCount: tableCols.length - openCols.length,
      blocked: false,
    },
  }
}

async function runAndCache(tableName: string, credentials?: DbCredentials): Promise<PreviewCacheEntry> {
  const built = buildPreviewEntry(tableName)
  if ('error' in built) throw new Error(built.error)
  const { entry } = built

  let rows: Record<string, unknown>[] = []
  if (!entry.blocked) {
    rows = await queryPreview(tableName.split('.')[0] ?? '', tableName, entry.colNames, credentials)
  }

  const cached: PreviewCacheEntry = {
    tableName: entry.tableName,
    columns: entry.columns,
    rows,
    sql: entry.sql,
    hiddenCount: entry.hiddenCount,
    blocked: entry.blocked,
    reason: entry.reason,
    cachedAt: new Date().toISOString(),
  }
  setCache(cached)
  return cached
}

// GET — returns cached result (stale flag tells the client to revalidate)
app.get('/api/preview/:tableName', (req, res) => {
  const cached = getCache(req.params.tableName)
  if (!cached) { res.status(204).end(); return }
  res.json({ ...cached, stale: isStale(cached) })
})

// POST — runs a fresh query, stores in cache, returns result
app.post('/api/preview/:tableName', async (req, res) => {
  const { tableName } = req.params
  const { credentials } = req.body as { credentials?: DbCredentials }

  try {
    const entry = await runAndCache(tableName, credentials ?? undefined)
    res.json({ ...entry, stale: false })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// ─── Rule execution ────────────────────────────────────────────────────────────

// GET — return cached result, with stale flag
app.get('/api/rule-result/:ruleId', (req, res) => {
  const cached = getRuleCache(req.params.ruleId)
  if (!cached) { res.status(204).end(); return }
  res.json({ ...cached, stale: isRuleStale(cached) })
})

// POST — run the provided SQL, cache and return result
app.post('/api/rule-result/:ruleId', async (req, res) => {
  const { ruleId } = req.params
  const { sql, credentials } = req.body as { sql: string; credentials?: DbCredentials }

  if (!sql) { res.status(400).json({ error: 'sql is required' }); return }

  try {
    const rows = await queryRaw(sql, credentials ?? undefined)
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []

    const entry = { ruleId, columns, rows, sql, cachedAt: new Date().toISOString() }
    setRuleCache(entry)
    res.json({ ...entry, stale: false })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// Serve React frontend
const distPath = path.join(__dirname, '../dist')
app.use(express.static(distPath))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(3001, () => console.log('API server → http://localhost:3001'))
