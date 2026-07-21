import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, KeyRound, Link2, User, Users, Code2, Shield, Clock,
  AlertTriangle, ChevronDown, ChevronUp, Layers, BarChart3, CheckCircle2, Circle, ListChecks,
  Plus, FileText, X, Hash, Calendar, Zap, Eye,
} from 'lucide-react'
import { api } from '../lib/api'
import type { Criticality, DataRule, DomainGroup, Sensitivity, StaffRecord, TableRecord, ColumnRecord } from '../types'
import { useNameDisplay } from '../contexts/NameDisplay'
import { StringLookup } from './Lookup'
import { DomainLookup, SubdomainLookup } from './DomainLookup'
import { OwnerLookup } from './OwnerLookup'
import { EditableCriticalityPill, CriticalityPill, resolveEffectiveCriticality } from './CriticalityPill'
import { EditableSensitivityPill } from './SensitivityPill'
import { ContextMenu, type ContextMenuState } from './ContextMenu'
import { CreateRulePanel, type Severity as RuleSeverity } from './CreateRulePanel'
import type { CreateRuleInput } from '../lib/ruleModels'
import { toSummaryRule } from '../lib/ruleModels'

// ─── Data Rules helpers ───────────────────────────────────────────────────────

const NOW_MS = new Date('2026-03-25T12:00:00Z').getTime()

const STALE_DAYS: Record<DataRule['frequency'], number> = {
  Hourly: 1 / 24, Daily: 1, Weekly: 7, Fortnightly: 14, Monthly: 31,
}

function isStale(rule: DataRule): boolean {
  if (!rule.lastRuntime) return true
  const daysSince = (NOW_MS - new Date(rule.lastRuntime).getTime()) / 86_400_000
  return daysSince > STALE_DAYS[rule.frequency]
}

function formatLastRun(iso: string | null): string {
  if (!iso) return 'Never'
  const diffH = Math.floor((NOW_MS - new Date(iso).getTime()) / 3_600_000)
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return diffD === 1 ? '1 day ago' : `${diffD} days ago`
}

function healthColor(pct: number): string {
  if (pct >= 95) return 'bg-emerald-500'
  if (pct >= 80) return 'bg-amber-400'
  return 'bg-red-500'
}

function healthTextColor(pct: number): string {
  if (pct >= 95) return 'text-emerald-600'
  if (pct >= 80) return 'text-amber-600'
  return 'text-red-600'
}

function thresholdLabel(rule: DataRule): string {
  const { mode, value } = rule.alertThreshold
  if (mode === 'absolute') return value === 0 ? 'Any failure' : `> ${value} records`
  return `< ${value}% healthy`
}

const ruleTypeIcon: Record<DataRule['type'], React.ComponentType<{ className?: string }>> = {
  completeness: CheckCircle2,
  format: Hash,
  consistency: BarChart3,
  timeliness: Calendar,
  range: Zap,
  reference: Link2,
}

// ─── component ────────────────────────────────────────────────────────────────

interface TableDetailContentProps {
  tableName: string
  breadcrumb?: ReactNode
  onTableClick?: (tableName: string) => void
  highlightField?: string | null
}

export function TableDetailContent({ tableName, breadcrumb, onTableClick, highlightField = null }: TableDetailContentProps) {
  const navigate = useNavigate()
  const handleTableClick = (t: string) => {
    if (onTableClick) onTableClick(t)
    else navigate(`/table/${t}`)
  }

  const { nameMode, displayTable, displayColumn } = useNameDisplay()
  const [table, setTable] = useState<TableRecord | null>(null)
  const [columns, setColumns] = useState<ColumnRecord[]>([])
  const [allTables, setAllTables] = useState<TableRecord[]>([])
  const [allDomains, setAllDomains] = useState<DomainGroup[]>([])
  const [teams, setTeams] = useState<string[]>([])
  const [owners, setOwners] = useState<StaffRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAllColumns, setShowAllColumns] = useState(false)

  // Scroll to and highlight a field passed via highlightField prop
  useEffect(() => {
    if (!highlightField || columns.length === 0) return
    setShowAllColumns(true)
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-column="${highlightField}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }, [highlightField, columns.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const [contextMenu, setContextMenu] = useState<(ContextMenuState & { tableName: string; columnName?: string; criticality?: string | null }) | null>(null)
  const [createRuleFor, setCreateRuleFor] = useState<{ table: string; field?: string; severity?: RuleSeverity } | null>(null)
  const [rules, setRules] = useState<DataRule[]>([])
  const [notesFor, setNotesFor] = useState<DataRule | null>(null)
  const [notesText, setNotesText] = useState('')

  useEffect(() => {
    setLoading(true)
    setTable(null)
    setColumns([])
    setShowAllColumns(false)
    Promise.all([
      api.getTable(tableName),
      api.getTables(),
      api.getDomains(),
      api.getTeams(),
      api.getOwners(),
      api.getRules(),
    ]).then(([tableData, tables, domains, teamList, ownerList, allRules]) => {
      setTable(tableData)
      setColumns(tableData.columns)
      setAllTables(tables)
      setAllDomains(domains)
      setTeams(teamList)
      setOwners(ownerList)
      setRules(allRules.filter(rule => rule.table === tableName).map(toSummaryRule))
    }).catch(console.error).finally(() => setLoading(false))
  }, [tableName])

  const ownerCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of allTables) {
      for (const name of [t.primaryOwner, t.secondaryOwner, t.devTeamOwner]) {
        if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
      }
    }
    for (const d of allDomains) {
      for (const name of [d.primaryOwner, d.secondaryOwner]) {
        if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      for (const s of d.subdomains ?? []) {
        for (const name of [s.primaryOwner, s.secondaryOwner]) {
          if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
        }
      }
    }
    return counts
  }, [allTables, allDomains])

  const CRIT_LABEL: Record<string, string> = { H: 'High', M: 'Medium', L: 'Low', Inherit: 'Inherit' }

  const tableCritCounts = useMemo(() => {
    const c: Partial<Record<string, number>> = {}
    for (const t of allTables) {
      const label = t.criticality ? CRIT_LABEL[t.criticality] : undefined
      if (label) c[label] = (c[label] ?? 0) + 1
    }
    return c
  }, [allTables]) // eslint-disable-line react-hooks/exhaustive-deps

  const colCritCounts = useMemo(() => {
    const c: Partial<Record<string, number>> = {}
    for (const col of columns) {
      const label = col.criticality ? CRIT_LABEL[col.criticality] : undefined
      if (label) c[label] = (c[label] ?? 0) + 1
    }
    return c
  }, [columns]) // eslint-disable-line react-hooks/exhaustive-deps

  const domainNames = useMemo(() => allDomains.map(d => d.name).sort(), [allDomains])
  const subdomainNames = useMemo(() => [...new Set(allDomains.flatMap(d => d.subdomains?.map(s => s.name) ?? []))].sort(), [allDomains])

  const FIELD_ORDER = ['criticality', 'domain', 'subdomain', 'owner', 'secondaryOwner', 'devTeam'] as const
  const cardRef = useRef<HTMLDivElement>(null)
  const focusField = (fieldId: string) => {
    const el = cardRef.current?.querySelector<HTMLElement>(`[data-field="${fieldId}"] input`)
    if (el) { el.focus(); el.click() }
  }
  const focusNext = (current: string) => {
    const idx = FIELD_ORDER.indexOf(current as typeof FIELD_ORDER[number])
    if (idx >= 0 && idx < FIELD_ORDER.length - 1) focusField(FIELD_ORDER[idx + 1])
  }

  const updateField = async (patch: Partial<TableRecord>) => {
    if (!tableName) return
    const updated = await api.updateTable(tableName, patch)
    setTable(updated)
  }

  const updateColumnCriticality = (columnName: string, criticality: Criticality) => {
    setColumns(prev => prev.map(c => c.columnName === columnName ? { ...c, criticality } : c))
    void api.updateColumn(table!.tableName, columnName, { criticality })
      .then(updated => setColumns(prev => prev.map(c => c.columnName === columnName ? { ...c, ...updated } : c)))
      .catch(console.error)
  }


  if (loading) return null

  if (!table) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Table not found</p>
        <button onClick={() => navigate('/tables')} className="btn-secondary mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to Table Registry
        </button>
      </div>
    )
  }

  const displayColumns = showAllColumns ? columns : columns.slice(0, 10)
  const panelOpen = !!(createRuleFor || notesFor)

  const openNotesFor = (rule: DataRule) => {
    setCreateRuleFor(null)
    setNotesFor(rule)
    setNotesText(rule.notes)
  }

  const saveNotes = () => {
    if (!notesFor) return
    setRules(rs => rs.map(r => r.id === notesFor.id ? { ...r, notes: notesText } : r))
    void api.updateRule(notesFor.id, { notes: notesText }).catch(console.error)
    setNotesFor(prev => prev ? { ...prev, notes: notesText } : null)
  }

  async function handleCreateRule(rule: CreateRuleInput) {
    try {
      const saved = await api.createRule(rule)
      if (saved.table === tableName) {
        setRules(current => [...current, toSummaryRule(saved)])
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className={`max-w-[1480px] mx-auto space-y-6 transition-all duration-300 ${panelOpen ? 'mr-[520px]' : ''}`}>
      {/* Header */}
      <div>
        {breadcrumb}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              <span className={nameMode === 'database' ? 'font-mono' : ''}>
                {displayTable(table.tableName, table.productName)}
              </span>
              {nameMode === 'database' && table.productName && (
                <span className="ml-2 text-sm font-normal text-gray-400 font-sans">{table.productName}</span>
              )}
              {nameMode === 'product' && table.productName && (
                <span className="ml-2 text-sm font-normal text-gray-400 font-mono">{table.tableName}</span>
              )}
            </h1>
            {table.isStale && (
              <span className="badge bg-red-50 text-red-600 ring-1 ring-inset ring-red-200">
                <AlertTriangle className="w-3 h-3 mr-1" /> Stale
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{table.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <Link
              to={`/table/${table.tableName}/preview`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Data Preview
            </Link>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
            <span>Domain: {table.domain}</span>
            <span>{table.columnCount} columns</span>
            {table.lastConfirmedDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Confirmed: {table.lastConfirmedDate}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Ownership panel */}
        <div className="space-y-4">
          {/* Ownership cards */}
          <div ref={cardRef} className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-wtg-slate" /> Ownership
            </h3>

            {/* Priority */}
            <div data-field="criticality">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Priority</label>
              <div className="mt-1">
                <EditableCriticalityPill
                  value={table.criticality}
                  onSave={v => { updateField({ criticality: v }); focusNext('criticality') }}
                  counts={tableCritCounts}
                />
              </div>
            </div>

            {/* Sensitivity */}
            <div data-field="sensitivity">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Sensitivity</label>
              <div className="mt-1">
                <EditableSensitivityPill
                  value={table.sensitivity}
                  onSave={v => updateField({ sensitivity: v as Sensitivity })}
                  inheritable
                />
              </div>
            </div>

            {/* Domain + Subdomain */}
            <div className="grid grid-cols-2 gap-3">
              <div data-field="domain">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Domain</label>
                <div className="mt-1">
                  <DomainLookup
                    value={table.domain || null}
                    onChange={v => { updateField({ domain: v ?? '' }); focusNext('domain') }}
                    items={domainNames}
                    allDomains={allDomains}
                    placeholder="Unset"
                    clearable={false}
                    onEnterSelect={() => focusNext('domain')}
                  />
                </div>
              </div>
              <div data-field="subdomain">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Subdomain</label>
                <div className="mt-1">
                  <SubdomainLookup
                    value={table.subdomain || null}
                    onChange={v => { updateField({ subdomain: v }); focusNext('subdomain') }}
                    items={subdomainNames}
                    allDomains={allDomains}
                    placeholder="Unset"
                    onEnterSelect={() => focusNext('subdomain')}
                  />
                </div>
              </div>
            </div>

            {/* Owner + Secondary Owner */}
            <div className="grid grid-cols-2 gap-3">
              <div data-field="owner">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Owner</label>
                <div className="mt-1">
                  <OwnerLookup
                    value={table.primaryOwner}
                    onChange={v => updateField({ primaryOwner: v })}
                    staff={owners}
                    ownerCounts={ownerCounts}
                    noneFirst
                    placeholder="Unassigned"
                    onEnterSelect={() => focusNext('owner')}
                  />
                </div>
              </div>
              <div data-field="secondaryOwner">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Secondary Owner</label>
                <div className="mt-1">
                  <OwnerLookup
                    value={table.secondaryOwner}
                    onChange={v => updateField({ secondaryOwner: v })}
                    staff={owners}
                    ownerCounts={ownerCounts}
                    noneFirst
                    placeholder="None"
                    onEnterSelect={() => focusNext('secondaryOwner')}
                  />
                </div>
              </div>
            </div>

            {/* Dev Team */}
            <div data-field="devTeam">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Dev Team</label>
              <div className="mt-1">
                <StringLookup
                  value={table.devTeamOwner || null}
                  onChange={v => updateField({ devTeamOwner: v })}
                  items={teams}
                  placeholder="Unassigned"
                />
              </div>
            </div>
          </div>

          {/* Subtables */}
          {table.subtables.length > 0 && (
            <div className="card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-wtg-slate" />
                Subtables
                <span className="ml-auto text-[11px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {table.subtables.length}
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                This table is logically partitioned by type. Each subtable can have independent ownership and scoped data rules.
              </p>
              <div className="space-y-2">
                {table.subtables.map(sub => (
                  <div key={sub.id} className="rounded-lg border border-wtg-border bg-gray-50/60 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-800">{sub.name}</span>
                      <span className="font-mono text-[10px] bg-wtg-primary/5 text-wtg-primary px-1.5 py-0.5 rounded whitespace-nowrap">
                        {sub.discriminatorColumn} = '{sub.discriminatorValue}'
                      </span>
                    </div>
                    {sub.description && (
                      <p className="text-[11px] text-gray-500 leading-relaxed">{sub.description}</p>
                    )}
                    <div className="flex items-center gap-3 pt-1">
                      {sub.primaryOwner ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-wtg-primary text-white text-[9px] font-bold flex items-center justify-center">
                            {sub.primaryOwner.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <span className="text-[11px] text-gray-700">{sub.primaryOwner}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-300 italic flex items-center gap-1">
                          <User className="w-3 h-3" /> Inherits table owner
                        </span>
                      )}
                      {sub.devTeamOwner && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Code2 className="w-3 h-3" /> {sub.devTeamOwner}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Usage Classification */}
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-wtg-slate" /> Usage Classification
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Internally Relevant', value: table.internallyRelevant ? 'Yes' : 'No', positive: table.internallyRelevant },
                { label: 'Used in Reporting', value: table.usedInReporting ? 'Yes' : 'No', positive: table.usedInReporting },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{row.label}</span>
                  <span className={`font-semibold ${row.positive ? 'text-emerald-600' : 'text-gray-400'}`}>{row.value}</span>
                </div>
              ))}
              {[
                { label: 'Reporting Usage', value: table.reportingUsage },
                { label: 'Importance', value: table.importance },
                { label: 'JL5 Familiarity', value: table.jl5Familiarity },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{row.label}</span>
                  {row.value ? (
                    <span className={`font-semibold ${
                      row.value === 'High' ? 'text-red-600' :
                      row.value === 'Medium' ? 'text-amber-600' : 'text-gray-500'
                    }`}>{row.value}</span>
                  ) : (
                    <span className="text-gray-300 italic">—</span>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-wtg-border/50">
                <span className="text-gray-500">Priority Score</span>
                {table.priorityScore !== null ? (
                  <span className={`font-bold text-sm ${
                    table.priorityScore === 1 ? 'text-red-600' :
                    table.priorityScore === 2 ? 'text-amber-600' :
                    table.priorityScore <= 4 ? 'text-gray-700' : 'text-gray-400'
                  }`}>{table.priorityScore}</span>
                ) : (
                  <span className="text-gray-300 italic">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Completeness checklist */}
          {(() => {
            const checkItems = [
              { label: 'Priority set', done: table.criticality !== null },
              { label: 'Domain set', done: !!table.domain },
              { label: 'Subdomain set', done: !!table.subdomain },
              { label: 'Owner set', done: !!table.primaryOwner },
              { label: 'Dev team set', done: !!table.devTeamOwner },
              { label: 'Column schema imported', done: columns.length > 0 },
            ]
            const extras = [
              { label: 'Secondary owner', done: !!table.secondaryOwner },
            ]
            const pct = Math.round((checkItems.filter(i => i.done).length / checkItems.length) * 100)

            return (
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Completeness</h3>
                  <span className={`text-xs font-bold ${pct === 100 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {checkItems.filter(i => i.done).length}/{checkItems.length}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? 'bg-emerald-500' : 'bg-wtg-secondary'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="space-y-1.5">
                  {checkItems.map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${item.done ? 'text-gray-700' : 'text-gray-400'}`}>{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Extras — don't count toward completion */}
                <div className="pt-3 border-t border-wtg-border/50 space-y-1.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Extras</p>
                  {extras.map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${item.done ? 'text-gray-700' : 'text-gray-400'}`}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Phase 2 placeholders */}
          <div className="card p-5 border-dashed opacity-60">
            <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Phase 2 — Depth
              <span className="badge-unassigned ml-auto">Planned</span>
            </h3>
            <p className="text-xs text-gray-400 mt-2">
              Operational editors, lifecycle ownership, validation process, and use case links.
            </p>
          </div>

          <div className="card p-5 border-dashed opacity-60">
            <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Phase 3 — Intelligence
              <span className="badge-unassigned ml-auto">Future</span>
            </h3>
            <p className="text-xs text-gray-400 mt-2">
              Automated monitoring, agentic remediation, inferred priority, and full governance dashboard.
            </p>
          </div>
        </div>

        {/* Right: Column schema */}
        <div className="col-span-2">
          <div className="card overflow-hidden">
            <div className="px-5 py-3 bg-gray-50/80 border-b border-wtg-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Column Schema
                {columns.length > 0 && <span className="text-gray-400 font-normal ml-2">({columns.length} columns)</span>}
              </h3>
              {columns.length === 0 && (
                <span className="text-xs text-gray-400">Full column data will load from schema import</span>
              )}
            </div>

            {columns.length > 0 ? (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-head-row">
                      <th className="th w-8">#</th>
                      <th className="th">Column</th>
                      <th className="th">Type</th>
                      <th className="th text-center">Nullable</th>
                      <th className="th text-center">PK</th>
                      <th className="th">FK Reference</th>
                      <th className="th">Default</th>
                      <th className="th">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayColumns.map(col => (
                      <tr
                        key={col.columnName}
                        data-column={col.columnName}
                        className={`border-b border-wtg-border/30 hover:bg-blue-50/20 transition-colors ${
                          highlightField === col.columnName ? 'bg-amber-50 ring-1 ring-inset ring-amber-300' : ''
                        }`}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setContextMenu({ x: e.clientX, y: e.clientY, tableName: table.tableName, columnName: col.columnName })
                        }}
                      >
                        <td className="td text-xs text-gray-400">{col.ordinalPosition}</td>
                        <td className="td">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium text-gray-900 ${nameMode === 'database' || !col.productName ? 'font-mono' : ''}`}>
                              {displayColumn(col.columnName, col.productName)}
                            </span>
                            {nameMode === 'product' && col.productName && (
                              <span className="font-mono text-[10px] text-gray-400">{col.columnName}</span>
                            )}
                            {col.isPrimaryKey && <KeyRound className="w-3 h-3 text-amber-500" />}
                            {col.referencedTable && <Link2 className="w-3 h-3 text-blue-400" />}
                          </div>
                        </td>
                        <td className="td font-mono text-xs text-gray-600">
                          {col.dataType}
                          {col.maxLength && col.maxLength > 0 && <span className="text-gray-400">({col.maxLength})</span>}
                          {col.numericPrecision && <span className="text-gray-400">({col.numericPrecision},{col.numericScale})</span>}
                        </td>
                        <td className="td text-center">
                          {col.isNullable ? (
                            <span className="text-gray-400 text-xs">YES</span>
                          ) : (
                            <span className="text-gray-900 text-xs font-medium">NO</span>
                          )}
                        </td>
                        <td className="td text-center">
                          {col.isPrimaryKey && <KeyRound className="w-3.5 h-3.5 text-amber-500 mx-auto" />}
                        </td>
                        <td className="td">
                          {col.referencedTable ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTableClick(col.referencedTable!)
                              }}
                              className="text-xs text-wtg-secondary hover:underline font-mono"
                            >
                              {col.referencedTable}.{col.referencedColumn}
                            </button>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="td font-mono text-xs text-gray-500">
                          {col.columnDefault || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="td" onClick={e => e.stopPropagation()}>
                          <EditableCriticalityPill
                            value={col.criticality ?? 'Inherit'}
                            onSave={(v) => updateColumnCriticality(col.columnName, v)}
                            inheritable
                            inheritedFrom={resolveEffectiveCriticality(table.criticality, null)}
                            counts={colCritCounts}
                            portal
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {columns.length > 10 && (
                  <button
                    onClick={() => setShowAllColumns(!showAllColumns)}
                    className="w-full py-2.5 text-xs text-wtg-secondary font-medium hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-1 border-t border-wtg-border/30"
                  >
                    {showAllColumns ? <><ChevronUp className="w-3.5 h-3.5" /> Show fewer</> : <><ChevronDown className="w-3.5 h-3.5" /> Show all {columns.length} columns</>}
                  </button>
                )}
              </>
            ) : (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Code2 className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">Column schema preview available for sample tables.</p>
                <p className="text-xs text-gray-300 mt-1">
                  Import the full schema CSV to populate all column data.
                </p>
              </div>
            )}
          </div>

          {/* Data Rules */}
          <div className="card overflow-hidden mt-4">
            <div className="px-5 py-3 bg-gray-50/80 border-b border-wtg-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-wtg-slate" /> Data Rules
                {rules.length > 0 && (
                  <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{rules.length}</span>
                )}
              </h3>
              <button
                className="btn-primary text-xs py-1"
                onClick={() => { setNotesFor(null); setCreateRuleFor({ table: table.tableName }) }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Rule
              </button>
            </div>

            {rules.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">No data rules defined for this table.</p>
                <button
                  className="btn-secondary text-xs mt-3"
                  onClick={() => { setNotesFor(null); setCreateRuleFor({ table: table.tableName }) }}
                >
                  <Plus className="w-3.5 h-3.5" /> Create first rule
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-head-row">
                    <th className="th">Rule</th>
                    <th className="th">Owner</th>
                    <th className="th text-center">Health</th>
                    <th className="th">Threshold</th>
                    <th className="th text-center">Schedule</th>
                    <th className="th">Last Run</th>
                    <th className="th">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => {
                    const TypeIcon = ruleTypeIcon[rule.type]
                    const stale = isStale(rule)
                    return (
                      <tr key={rule.id} onClick={() => navigate(`/rules/${rule.id}`)} className="border-b border-wtg-border/30 hover:bg-blue-50/20 cursor-pointer">
                        <td className="td">
                          <div className="flex items-center gap-1.5">
                            <TypeIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-xs font-medium text-gray-900">{rule.name}</span>
                          </div>
                          {rule.field && (
                            <p className="font-mono text-[10px] text-gray-400 mt-0.5 ml-5">{rule.field}</p>
                          )}
                        </td>
                        <td className="td">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-wtg-primary text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                              {rule.owner.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <span className="text-xs text-gray-700 truncate">{rule.owner.split(' ')[0]}</span>
                          </div>
                        </td>
                        <td className="td">
                          {rule.lastHealthPct !== null ? (
                            <div className="flex flex-col items-center gap-1 min-w-[56px]">
                              <span className={`text-xs font-bold ${healthTextColor(rule.lastHealthPct)}`}>
                                {rule.lastHealthPct}%
                              </span>
                              <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${healthColor(rule.lastHealthPct)}`}
                                  style={{ width: `${rule.lastHealthPct}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300 block text-center">—</span>
                          )}
                        </td>
                        <td className="td">
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">{thresholdLabel(rule)}</span>
                        </td>
                        <td className="td text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] font-medium text-gray-600">{rule.frequency}</span>
                            {stale && (
                              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-600">
                                <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="td">
                          <span className="flex items-center gap-1 text-[10px] text-gray-400 whitespace-nowrap">
                            <Clock className="w-3 h-3" /> {formatLastRun(rule.lastRuntime)}
                          </span>
                        </td>
                        <td className="td">
                          <button
                            onClick={e => { e.stopPropagation(); openNotesFor(rule) }}
                            className={`flex items-center gap-1 text-[10px] rounded px-1.5 py-1 max-w-[140px] text-left transition-colors ${
                              rule.notes
                                ? 'text-gray-600 hover:bg-gray-100'
                                : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <FileText className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{rule.notes || 'Add note…'}</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Related tables hint */}
          <div className="card p-5 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Related Tables</h3>
            <div className="space-y-2">
              {allTables
                .filter(t => t.tableName !== table.tableName && t.domain === table.domain)
                .slice(0, 5)
                .map(t => (
                  <div
                    key={t.tableName}
                    onClick={() => handleTableClick(t.tableName)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setContextMenu({ x: e.clientX, y: e.clientY, tableName: t.tableName, criticality: t.criticality })
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-gray-900">{t.tableName}</span>
                      <CriticalityPill value={t.criticality} />
                    </div>
                    <span className="text-xs text-gray-400">{t.columnCount} cols</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          items={[
            contextMenu.columnName
              ? {
                  label: `Create Rule for ${contextMenu.columnName}`,
                  icon: ListChecks,
                  onClick: () => {
                    const sev: RuleSeverity =
                      table?.criticality === 'H' ? 'H'
                      : table?.criticality === 'L' ? 'L'
                      : 'M'
                    setCreateRuleFor({ table: contextMenu.tableName, field: contextMenu.columnName, severity: sev })
                  },
                }
              : {
                  label: 'Create Data Rule',
                  icon: ListChecks,
                  onClick: () => {
                    const sev: RuleSeverity =
                      (contextMenu.criticality ?? table?.criticality) === 'H' ? 'H'
                      : (contextMenu.criticality ?? table?.criticality) === 'L' ? 'L'
                      : 'M'
                    setCreateRuleFor({ table: contextMenu.tableName, severity: sev })
                  },
                },
          ]}
        />
      )}

      {/* Create rule sidebar */}
      {createRuleFor && (
        <div className="fixed top-14 right-0 bottom-0 w-[520px] shadow-xl z-40">
          <CreateRulePanel
            onClose={() => setCreateRuleFor(null)}
            onSave={handleCreateRule}
            initialTable={createRuleFor.table}
            initialField={createRuleFor.field}
            initialSeverity={createRuleFor.severity}
          />
        </div>
      )}

      {/* Notes sidebar */}
      {notesFor && (
        <div className="fixed top-14 right-0 bottom-0 w-[520px] shadow-xl z-40 bg-white border-l border-wtg-border flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-wtg-border">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">{notesFor.name}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Rule notes</p>
            </div>
            <button onClick={() => setNotesFor(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs pb-4 border-b border-wtg-border/50">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Owner</p>
                <p className="text-gray-700">{notesFor.owner}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Schedule</p>
                <p className="text-gray-700">{notesFor.frequency}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Health</p>
                {notesFor.lastHealthPct !== null ? (
                  <p className={`font-bold ${healthTextColor(notesFor.lastHealthPct)}`}>{notesFor.lastHealthPct}%</p>
                ) : (
                  <p className="text-gray-300">—</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Last Run</p>
                <p className="text-gray-700">{formatLastRun(notesFor.lastRuntime)}</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Notes</label>
              <textarea
                rows={12}
                className="w-full border border-wtg-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20 focus:border-wtg-secondary-light resize-none leading-relaxed"
                placeholder="Add notes about this rule — known issues, context, remediation steps…"
                value={notesText}
                onChange={e => setNotesText(e.target.value)}
              />
            </div>
          </div>
          <div className="p-4 border-t border-wtg-border flex items-center justify-end gap-2">
            <button className="btn-secondary text-xs py-1.5" onClick={() => setNotesFor(null)}>Cancel</button>
            <button className="btn-primary text-xs py-1.5" onClick={saveNotes}>Save Notes</button>
          </div>
        </div>
      )}
    </div>
  )
}
