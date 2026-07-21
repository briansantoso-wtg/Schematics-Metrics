import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Shield, Plus, CheckCircle2, AlertTriangle, Clock,
  X, Play, Pause, Zap, BarChart3,
  Hash, Calendar, Link2, ChevronRight, Layers,
} from 'lucide-react'
import type { PersistedRule as DataRule, RuleType, RuleSeverity as Severity, RuleStatus, RuleSchedule } from '../lib/ruleModels'

import type { ColSpec, ImportColSpec } from '../lib/exportTable'
import { CreateRulePanel } from '../components/CreateRulePanel'
import { DataTable } from '../components/DataTable'
import { api } from '../lib/api'
import type { CreateRuleInput } from '../lib/ruleModels'

// ─── Sub-components ────────────────────────────────────────────────────────────

const ruleTypeMeta: Record<RuleType, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  completeness: { label: 'Completeness', color: 'bg-blue-50 text-blue-700', icon: CheckCircle2 },
  format:       { label: 'Format',       color: 'bg-purple-50 text-purple-700', icon: Hash },
  consistency:  { label: 'Consistency',  color: 'bg-amber-50 text-amber-700', icon: BarChart3 },
  timeliness:   { label: 'Timeliness',   color: 'bg-teal-50 text-teal-700', icon: Calendar },
  range:        { label: 'Range',        color: 'bg-orange-50 text-orange-700', icon: Zap },
  reference:    { label: 'Reference',    color: 'bg-indigo-50 text-indigo-700', icon: Link2 },
}

function RuleTypeBadge({ type }: { type: RuleType }) {
  const meta = ruleTypeMeta[type]
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.color}`}>
      <Icon className="w-3 h-3" />{meta.label}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: Severity }) {
  if (severity === 'H') return <span className="badge-high text-[11px] px-2 py-0.5 rounded-full font-semibold">High</span>
  if (severity === 'M') return <span className="badge-medium text-[11px] px-2 py-0.5 rounded-full font-semibold">Med</span>
  return <span className="badge-low text-[11px] px-2 py-0.5 rounded-full font-semibold">Low</span>
}

function StatusChip({ status }: { status: RuleStatus }) {
  if (status === 'active') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Active
    </span>
  )
  if (status === 'paused') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Paused
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />Draft
    </span>
  )
}

function SubtableScopeBadge({ subtableScope }: { subtableScope: string | null }) {
  if (!subtableScope) return <span className="text-[10px] text-gray-400 italic">Whole table</span>
  const label = subtableScope.split('::')[1] ?? subtableScope
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200">
      <Layers className="w-2.5 h-2.5" />{label}
    </span>
  )
}

function PassRateBar({ rate }: { rate: number }) {
  const color = rate >= 95 ? 'bg-emerald-500' : rate >= 80 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${rate >= 95 ? 'text-emerald-600' : rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
        {rate}%
      </span>
    </div>
  )
}

// ─── Rule Detail Panel ────────────────────────────────────────────────────────

function RuleDetailPanel({ rule, onClose }: { rule: DataRule; onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="w-[480px] flex-shrink-0 border-l border-wtg-border bg-white flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-wtg-border">
        <h3 className="text-sm font-semibold text-gray-900">Rule Detail</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="text-base font-bold text-gray-900 leading-snug">{rule.name}</h2>
            <StatusChip status={rule.status} />
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{rule.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Type', value: <RuleTypeBadge type={rule.type} /> },
            { label: 'Severity', value: <SeverityBadge severity={rule.severity} /> },
            { label: 'Table', value: <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{rule.table}</span> },
            { label: 'Field', value: rule.field
              ? <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{rule.field}</span>
              : <span className="text-xs text-gray-400 italic">Whole table</span>
            },
            { label: 'Scope', value: <SubtableScopeBadge subtableScope={rule.subtableScope} /> },
            { label: 'Owner', value: <span className="text-sm text-gray-700">{rule.owner}</span> },
            { label: 'Schedule', value: <span className="text-sm text-gray-700">{rule.schedule}</span> },
          ].map(row => (
            <div key={row.label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{row.label}</p>
              <div>{row.value}</div>
            </div>
          ))}
        </div>

        {rule.passRate !== null && (
          <div className="card p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Last Run Results</p>
            <div className="mb-3">
              <PassRateBar rate={rule.passRate} />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{rule.failCount} failing records</span>
              <span className="flex items-center gap-1 text-gray-400"><Clock className="w-3 h-3" />{rule.lastRun}</span>
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Rule Expression</p>
          <div className="bg-wtg-primary rounded-lg p-4 font-mono text-xs text-green-300 leading-relaxed">
            {rule.type === 'completeness' && rule.field && `SELECT COUNT(*)\nFROM ${rule.table}\nWHERE ${rule.field} IS NULL\n  AND IsActive = 1`}
            {rule.type === 'completeness' && !rule.field && `SELECT COUNT(*)\nFROM ${rule.table}\nWHERE IsActive = 1\n  AND member_count = 0\n-- Whole-table rule: no specific field`}
            {rule.type === 'format' && rule.field === 'OC_Email' && `SELECT COUNT(*)\nFROM ${rule.table}\nWHERE ${rule.field} NOT LIKE\n  '%_@_%.__%'`}
            {rule.type === 'format' && rule.field === 'GB_Timezone' && `SELECT COUNT(*)\nFROM ${rule.table}\nWHERE ${rule.field} NOT IN\n  (SELECT TimezoneCode FROM StmTimezone)`}
            {rule.type === 'consistency' && rule.table === 'GlbStaffManager' && `-- Cycle detection via CTE\nWITH RECURSIVE chain AS (\n  SELECT Staff, ManagerStaff\n  FROM GlbStaffManager\n  ...\n)`}
            {rule.type === 'consistency' && rule.table === 'GlbStaffCostCentre' && `SELECT Staff\nFROM GlbStaffCostCentre\nGROUP BY Staff\nHAVING SUM(Percentage) != 100`}
            {rule.type === 'timeliness' && rule.field === 'OH_IsActive' && `SELECT COUNT(*)\nFROM OrgHeader\nWHERE IsActive = 1\n  AND LastActivityDate <\n    DATEADD(month, -24, GETDATE())`}
            {rule.type === 'timeliness' && rule.field === 'OR_ExpiryDate' && `SELECT COUNT(*)\nFROM OrgRegistration\nWHERE IsActive = 1\n  AND ExpiryDate < GETDATE()`}
            {rule.type === 'reference' && `SELECT COUNT(*)\nFROM ${rule.table} et\nLEFT JOIN GlbTeam gt\n  ON et.${rule.field} = gt.TeamID\nWHERE gt.IsActive = 0\n  OR gt.TeamID IS NULL`}
          </div>
        </div>

        {rule.failCount > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Failing Records
            </p>
            <button
              onClick={() => { onClose(); navigate(`/rules/${rule.id}/failures`) }}
              className="w-full bg-red-50 border border-red-200 rounded-lg p-4 text-left hover:bg-red-100 hover:border-red-300 transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-semibold">{rule.failCount} records failing</span>
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 group-hover:gap-2 transition-all">
                  View records <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-red-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400 rounded-full"
                    style={{ width: `${100 - (rule.passRate ?? 100)}%` }}
                  />
                </div>
                <span className="text-xs text-red-500 font-medium tabular-nums">{100 - (rule.passRate ?? 100)}% fail rate</span>
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-wtg-border flex items-center gap-2">
        <button className="btn-primary text-xs py-1.5">
          <Play className="w-3.5 h-3.5" /> Run Now
        </button>
        <button className="btn-secondary text-xs py-1.5">
          Edit Rule
        </button>
        {rule.status === 'active'
          ? <button className="btn-secondary text-xs py-1.5 ml-auto"><Pause className="w-3.5 h-3.5" /> Pause</button>
          : <button className="btn-secondary text-xs py-1.5 ml-auto"><Play className="w-3.5 h-3.5" /> Activate</button>
        }
      </div>
    </div>
  )
}

// ─── Export / import column specs ────────────────────────────────────────────

const RULES_EXPORT_COLS: ColSpec<DataRule>[] = [
  { kind: 'single', label: 'ID',          get: r => r.id },
  { kind: 'single', label: 'Name',        get: r => r.name },
  { kind: 'single', label: 'Type',        get: r => r.type },
  { kind: 'single', label: 'Table',       get: r => r.table },
  { kind: 'single', label: 'Field',       get: r => r.field },
  { kind: 'single', label: 'Severity',    get: r => r.severity },
  { kind: 'single', label: 'Status',      get: r => r.status },
  { kind: 'single', label: 'Owner',       get: r => r.owner },
  { kind: 'single', label: 'Schedule',    get: r => r.schedule },
  { kind: 'single', label: 'Pass Rate',   get: r => r.passRate?.toString() },
  { kind: 'single', label: 'Fail Count',  get: r => r.failCount.toString() },
  { kind: 'single', label: 'Description', get: r => r.description },
]

const RULES_IMPORT_COLS: ImportColSpec<Partial<DataRule>>[] = [
  { header: 'ID',          required: true, parse: (v, r) => { r.id       = v } },
  { header: 'Name',        required: true, parse: (v, r) => { r.name     = v } },
  { header: 'Type',        required: true, parse: (v, r) => { r.type     = v as RuleType } },
  { header: 'Table',       required: true, parse: (v, r) => { r.table    = v } },
  { header: 'Field',                       parse: (v, r) => { r.field    = v || null } },
  { header: 'Severity',                    parse: (v, r) => { r.severity = (v as Severity) || 'M' } },
  { header: 'Status',                      parse: (v, r) => { r.status   = (v as RuleStatus) || 'draft' } },
  { header: 'Owner',                       parse: (v, r) => { r.owner    = v } },
  { header: 'Schedule',                    parse: (v, r) => { r.schedule = (v as RuleSchedule) || 'Daily' } },
  { header: 'Description',                 parse: (v, r) => { r.description = v } },
]

// ─── Column definitions ───────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = { H: 0, M: 1, L: 2 }

const rulesColumns: ColumnDef<DataRule>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Rule',
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium text-gray-900">{row.original.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{row.original.owner}</p>
      </div>
    ),
  },
  {
    id: 'type',
    accessorKey: 'type',
    header: 'Type',
    cell: ({ getValue }) => <RuleTypeBadge type={getValue() as RuleType} />,
    size: 130,
  },
  {
    id: 'target',
    accessorKey: 'table',
    header: 'Target',
    cell: ({ row }) => (
      <div>
        <p className="font-mono text-xs text-gray-700">{row.original.table}</p>
        {row.original.field && <p className="font-mono text-[10px] text-gray-400 mt-0.5">.{row.original.field}</p>}
        <div className="mt-1"><SubtableScopeBadge subtableScope={row.original.subtableScope} /></div>
      </div>
    ),
  },
  {
    id: 'severity',
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ getValue }) => <SeverityBadge severity={getValue() as Severity} />,
    sortingFn: (a, b) => (SEVERITY_ORDER[a.original.severity] ?? 9) - (SEVERITY_ORDER[b.original.severity] ?? 9),
    size: 90,
  },
  {
    id: 'passRate',
    accessorKey: 'passRate',
    header: 'Pass Rate',
    cell: ({ getValue }) => {
      const rate = getValue() as number | null
      return rate !== null
        ? <PassRateBar rate={rate} />
        : <span className="text-xs text-gray-300 italic">Not run yet</span>
    },
    size: 130,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <div>
        <StatusChip status={row.original.status} />
        {row.original.lastRun && (
          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />{row.original.lastRun}
          </p>
        )}
      </div>
    ),
    size: 100,
  },
  {
    id: 'failCount',
    accessorKey: 'failCount',
    header: 'Failures',
    cell: ({ getValue }) => {
      const count = getValue() as number
      if (count === 0) return <span className="text-gray-300 text-xs">—</span>
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
          <AlertTriangle className="w-3 h-3" />{count}
        </span>
      )
    },
    size: 80,
  },
]

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DataRules() {
  const navigate = useNavigate()
  const [data, setData] = useState<DataRule[]>([])
  const [selectedRule, setSelectedRule] = useState<DataRule | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [filterType, setFilterType] = useState<RuleType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<RuleStatus | 'all'>('all')

  useEffect(() => {
    api.getRules().then(rules => setData(rules)).catch(console.error)
  }, [])

  // DataTable handles search internally; we only pre-filter by type/status
  const filtered = useMemo(() => data.filter(r => {
    const matchType = filterType === 'all' || r.type === filterType
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    return matchType && matchStatus
  }), [data, filterType, filterStatus])

  const activeCount  = data.filter(r => r.status === 'active').length
  const failingCount = data.filter(r => r.failCount > 0 && r.status === 'active').length
  const avgPassRate  = Math.round(
    data.filter(r => r.passRate !== null).reduce((acc, r) => acc + (r.passRate ?? 0), 0) /
    data.filter(r => r.passRate !== null).length
  )

  function handleImport(rows: Partial<DataRule>[]) {
    setData(prev => {
      const map = new Map(prev.map(r => [r.id, r]))
      for (const row of rows) {
        if (!row.id) continue
        const existing = map.get(row.id)
        map.set(row.id, existing
          ? { ...existing, ...row }
          : { subtableScope: null, lastRun: null, passRate: null, failCount: 0, ...row } as DataRule
        )
      }
      return [...map.values()]
    })
  }

  async function handleCreateRule(created: CreateRuleInput) {
    try {
      const next = await api.createRule(created)
      setData(prev => [...prev, next])
    } catch (error) {
      console.error(error)
    }
  }

  const openPanel = (rule: DataRule) => navigate(`/rules/${rule.id}`)
  const openCreate = () => {
    setSelectedRule(null)
    setShowCreate(true)
  }
  const closePanel = () => {
    setSelectedRule(null)
    setShowCreate(false)
  }

  return (
    <div className={`transition-all duration-300 ${showCreate ? 'mr-[520px]' : selectedRule ? 'mr-[480px]' : ''}`}>
      <div className="max-w-7xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Data Rules</h1>
              <p className="text-sm text-gray-500 mt-1">
                Define and manage the validation rules that determine data quality across governed tables.
              </p>
            </div>
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Create Rule
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Rules', value: data.length, sub: `${activeCount} active`, icon: Shield, color: 'text-wtg-secondary' },
              { label: 'Rules with Failures', value: failingCount, sub: 'need attention', icon: AlertTriangle, color: 'text-red-500' },
              { label: 'Avg Pass Rate', value: `${avgPassRate}%`, sub: 'across active rules', icon: CheckCircle2, color: 'text-emerald-500' },
              { label: 'Rule Types', value: Object.keys(ruleTypeMeta).length, sub: 'categories defined', icon: BarChart3, color: 'text-purple-500' },
            ].map(stat => (
              <div key={stat.label} className="card p-5">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />{stat.label}
                </div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Rule type breakdown */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">Rules by type</p>
            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(ruleTypeMeta) as RuleType[]).map(type => {
                const count = data.filter(r => r.type === type).length
                const meta = ruleTypeMeta[type]
                const Icon = meta.icon
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(filterType === type ? 'all' : type)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      filterType === type
                        ? `${meta.color} border-current`
                        : 'border-wtg-border text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="w-3 h-3" />{meta.label}
                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filterType === type ? '' : 'bg-gray-100'}`}>{count}</span>
                  </button>
                )
              })}
              {filterType !== 'all' && (
                <button onClick={() => setFilterType('all')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear filter
                </button>
              )}
            </div>
          </div>

          <DataTable
            data={filtered}
            columns={rulesColumns}
            getRowId={r => r.id}
            onRowClick={openPanel}
            placeholder="Search rules, tables, owners…"
            totalCount={data.length}
            toolbar={
              <div className="flex items-center gap-1 border border-wtg-border rounded-lg overflow-hidden flex-shrink-0">
                {(['all', 'active', 'paused', 'draft'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      filterStatus === s ? 'bg-wtg-primary text-white' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            }
            actions={{
              filename: 'data-rules',
              sheets: [{ name: 'Rules', columns: RULES_EXPORT_COLS, data: filtered }],
              csvSheet: { columns: RULES_EXPORT_COLS, data: filtered },
              importConfig: { sheetName: 'Rules', columns: RULES_IMPORT_COLS, onImport: handleImport },
            }}
            emptyMessage="No rules match your filters."
          />
      </div>

      {/* Fixed side panels */}
      {selectedRule && (
        <div className="fixed top-14 right-0 bottom-0 w-[480px] shadow-xl z-40">
          <RuleDetailPanel rule={selectedRule} onClose={closePanel} />
        </div>
      )}
      {showCreate && (
        <div className="fixed top-14 right-0 bottom-0 w-[520px] shadow-xl z-40">
          <CreateRulePanel onClose={closePanel} onSave={handleCreateRule} />
        </div>
      )}
    </div>
  )
}
