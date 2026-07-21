import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircle2, AlertTriangle, Clock, Play, Pause, Trash2,
  ChevronRight, Hash, Calendar, Link2, BarChart3, Zap,
  Layers, Table2, Pencil, X, Save, Clipboard, ClipboardCheck, Eye,
} from 'lucide-react'
import { sampleTables, subtableDefinitions, owners as staffRecords } from '../data/mockData'
import { StringLookup } from '../components/Lookup'
import { BackButton } from '../components/BackButton'
import type { PersistedRule as DataRule, RuleType, RuleSeverity as Severity, RuleStatus, RuleSchedule } from '../lib/ruleModels'
import { api } from '../lib/api'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const tableNames = [...new Set(sampleTables.map(t => t.tableName))].sort()
const mockOwners = staffRecords.map(s => s.fullName)

const fieldsByTable: Record<string, string[]> = {
  GlbStaff: ['GS_GB_HomeBranch', 'GS_IsActive', 'GS_StartDate', 'GS_EndDate', 'GS_FirstName', 'GS_Surname'],
  GlbGroup: ['GG_GroupType', 'GG_IsActive', 'GG_Name', 'GG_ReleaseBuild'],
  GlbBranch: ['GB_BranchCode', 'GB_Timezone', 'GB_IsActive', 'GB_Country'],
  GlbDepartment: ['GD_IsActive', 'GD_Name', 'GD_DeptCode'],
  GlbSecurity: ['GS_RoleCode', 'GS_IsActive', 'GS_Description'],
  OrgHeader: ['OH_IsActive', 'OH_OrgName', 'OH_CreatedDate', 'OH_LastActivityDate'],
  OrgContact: ['OC_Email', 'OC_Phone', 'OC_IsActive', 'OC_FirstName', 'OC_LastName'],
  ProcessHeader: ['PH_Status', 'PH_IsActive', 'PH_CreatedDate', 'PH_TemplateId'],
  WorkProject: ['WP_Status', 'WP_IsActive', 'WP_Name', 'WP_StartDate'],
  WorkItem: ['WI_Status', 'WI_IsActive', 'WI_AssignedTo', 'WI_DueDate'],
  IncidentMain: ['IM_Status', 'IM_Severity', 'IM_CreatedDate', 'IM_ResolvedDate'],
}

// ─── Display helpers ──────────────────────────────────────────────────────────

const ruleTypeMeta: Record<RuleType, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  completeness: { label: 'Completeness', color: 'bg-blue-50 text-blue-700',    icon: CheckCircle2 },
  format:       { label: 'Format',       color: 'bg-purple-50 text-purple-700', icon: Hash },
  consistency:  { label: 'Consistency',  color: 'bg-amber-50 text-amber-700',  icon: BarChart3 },
  timeliness:   { label: 'Timeliness',   color: 'bg-teal-50 text-teal-700',    icon: Calendar },
  range:        { label: 'Range',        color: 'bg-orange-50 text-orange-700', icon: Zap },
  reference:    { label: 'Reference',    color: 'bg-indigo-50 text-indigo-700', icon: Link2 },
}

function RuleTypeBadge({ type }: { type: RuleType }) {
  const meta = ruleTypeMeta[type]
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.color}`}>
      <Icon className="w-3 h-3" />{meta.label}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: Severity }) {
  if (severity === 'H') return <span className="badge-high text-xs px-2.5 py-1 rounded-full font-semibold">High</span>
  if (severity === 'M') return <span className="badge-medium text-xs px-2.5 py-1 rounded-full font-semibold">Medium</span>
  return <span className="badge-low text-xs px-2.5 py-1 rounded-full font-semibold">Low</span>
}

function StatusChip({ status }: { status: RuleStatus }) {
  if (status === 'active') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Active
    </span>
  )
  if (status === 'paused') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
      <span className="w-2 h-2 rounded-full bg-amber-400" />Paused
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
      <span className="w-2 h-2 rounded-full bg-gray-300" />Draft
    </span>
  )
}

function PassRateBar({ rate }: { rate: number }) {
  const color = rate >= 95 ? 'bg-emerald-500' : rate >= 80 ? 'bg-amber-400' : 'bg-red-500'
  const textColor = rate >= 95 ? 'text-emerald-600' : rate >= 80 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`text-sm font-bold tabular-nums w-12 text-right ${textColor}`}>{rate}%</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RuleDetail() {
  const { ruleId } = useParams<{ ruleId: string }>()
  const navigate = useNavigate()

  const [editing, setEditing] = useState(false)
  const [original, setOriginal] = useState<DataRule | null>(null)
  const [form, setForm] = useState<DataRule | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [sqlPromptCopied, setSqlPromptCopied] = useState(false)

  useEffect(() => {
    if (!ruleId) return
    api.getRule(ruleId)
      .then(rule => {
        setOriginal(rule)
        setForm(rule)
      })
      .catch(() => {
        setOriginal(null)
        setForm(null)
      })
  }, [ruleId])

  if (!form || !original) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-gray-400 text-sm">Rule not found.</p>
        <Link to="/rules" className="text-wtg-secondary text-sm mt-2 inline-block hover:underline">← Back to Data Rules</Link>
      </div>
    )
  }

  const set = <K extends keyof DataRule>(key: K, val: DataRule[K]) =>
    setForm(f => f ? { ...f, [key]: val } : f)

  const isDirty = JSON.stringify(form) !== JSON.stringify(original)

  const availableFields = form.table ? (fieldsByTable[form.table] ?? []) : []
  const availableSubtables = subtableDefinitions.filter(s => s.parentTableName === form.table)
  const selectedSubtableLabel = (() => {
    const s = availableSubtables.find(st => st.id === form.subtableScope)
    return s ? `${s.name} — ${s.discriminatorColumn} = '${s.discriminatorValue}'` : null
  })()

  function handleDiscard() {
    setForm(original)
    setEditing(false)
  }

  async function handleSave() {
    if (!form) return
    try {
      const updated = await api.updateRule(form.id, {
        name: form.name,
        type: form.type,
        table: form.table,
        field: form.field,
        subtableScope: form.subtableScope,
        description: form.description,
        severity: form.severity,
        status: form.status,
        owner: form.owner,
        schedule: form.schedule as import('../lib/ruleModels').RuleSchedule,
        lastRun: form.lastRun,
        passRate: form.passRate,
        failCount: form.failCount,
        sqlExpression: form.sqlExpression,
      })
      setOriginal(updated)
      setForm(updated)
      setEditing(false)
    } catch (error) {
      console.error(error)
    }
  }

  function handleGenerateSql() {
    if (!form) return
    const subtable = subtableDefinitions.find(s => s.id === form.subtableScope)
    const lines = [
      `Generate a SQL query for a data quality rule with the following details:`,
      ``,
      `Rule name: ${form.name}`,
      `Rule type: ${ruleTypeMeta[form.type].label}`,
      `Target table: ${form.table}`,
      form.field ? `Target field: ${form.field}` : null,
      subtable ? `Subtable scope: ${subtable.name} (${subtable.discriminatorColumn} = '${subtable.discriminatorValue}')` : null,
      `Severity: ${form.severity === 'H' ? 'High' : form.severity === 'M' ? 'Medium' : 'Low'}`,
      form.description.trim() ? `\nDescription:\n${form.description.trim()}` : null,
      ``,
      `The query should return rows that represent failures (records that violate the rule).`,
      `Use T-SQL (SQL Server) syntax.`,
      `Once generated, I will paste the SQL back into the rule expression.`,
    ].filter(l => l !== null).join('\n')

    navigator.clipboard.writeText(lines).then(() => {
      setSqlPromptCopied(true)
      setTimeout(() => setSqlPromptCopied(false), 2500)
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Back + header */}
      <div>
        <BackButton label="Back to Data Rules" onClick={() => navigate('/rules')} />

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                className="w-full text-xl font-bold text-gray-900 border-b-2 border-wtg-secondary bg-transparent focus:outline-none pb-0.5"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{form.name}</h1>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StatusChip status={form.status} />
              <span className="text-gray-300">·</span>
              <RuleTypeBadge type={form.type} />
              <span className="text-gray-300">·</span>
              <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{form.table}</span>
              {form.field && <span className="font-mono text-xs text-gray-400">.{form.field}</span>}
              {form.subtableScope && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200">
                  <Layers className="w-2.5 h-2.5" />{form.subtableScope.split('::')[1] ?? form.subtableScope}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!editing ? (
              <>
                <button onClick={() => setEditing(true)} className="btn-secondary text-xs py-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button className="btn-primary text-xs py-1.5">
                  <Play className="w-3.5 h-3.5" /> Run Now
                </button>
                <button
                  onClick={async () => {
                    const nextStatus = form.status === 'active' ? 'paused' : 'active'
                    set('status', nextStatus)
                    try {
                      const updated = await api.updateRule(form.id, { status: nextStatus })
                      setOriginal(updated)
                      setForm(updated)
                    } catch (error) {
                      console.error(error)
                    }
                  }}
                  className="btn-secondary text-xs py-1.5"
                >
                  {form.status === 'active'
                    ? <><Pause className="w-3.5 h-3.5" /> Pause</>
                    : <><Play className="w-3.5 h-3.5" /> Activate</>
                  }
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(v => !v)}
                  className="p-2 rounded-lg border border-wtg-border text-gray-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Delete confirm banner */}
      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Delete this rule?</p>
            <p className="text-xs text-red-600 mt-0.5">This will permanently remove the rule and all run history. This cannot be undone.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary text-xs py-1.5">Cancel</button>
            <button
              onClick={async () => {
                try {
                  await api.deleteRule(form.id)
                  navigate('/rules')
                } catch (error) {
                  console.error(error)
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
            >
              Delete Rule
            </button>
          </div>
        </div>
      )}

      {/* Main layout: 2-col */}
      <div className="grid grid-cols-3 gap-6">

        {/* ── Left column: configuration ── */}
        <div className="space-y-5">
          <div className="card p-5 space-y-5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Configuration</p>

            {/* Type */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Type</p>
              {editing ? (
                <div className="space-y-1.5">
                  {(Object.keys(ruleTypeMeta) as RuleType[]).map(type => {
                    const meta = ruleTypeMeta[type]
                    const Icon = meta.icon
                    return (
                      <button
                        key={type}
                        onClick={() => set('type', type)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                          form.type === type
                            ? 'border-wtg-secondary bg-wtg-secondary/5 text-gray-800 ring-1 ring-wtg-secondary'
                            : 'border-wtg-border text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-3 h-3 flex-shrink-0" />{meta.label}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <RuleTypeBadge type={form.type} />
              )}
            </div>

            {/* Severity */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Severity</p>
              {editing ? (
                <div className="flex gap-2">
                  {(['H', 'M', 'L'] as Severity[]).map(s => (
                    <button
                      key={s}
                      onClick={() => set('severity', s)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        form.severity === s
                          ? s === 'H' ? 'border-red-400 bg-red-50 text-red-700 ring-1 ring-red-300'
                            : s === 'M' ? 'border-amber-400 bg-amber-50 text-amber-700 ring-1 ring-amber-300'
                            : 'border-green-400 bg-green-50 text-green-700 ring-1 ring-green-300'
                          : 'border-wtg-border text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {s === 'H' ? 'High' : s === 'M' ? 'Med' : 'Low'}
                    </button>
                  ))}
                </div>
              ) : (
                <SeverityBadge severity={form.severity} />
              )}
            </div>

            <div className="border-t border-wtg-border" />

            {/* Table */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Target Table</p>
              {editing ? (
                <StringLookup
                  value={form.table || null}
                  onChange={v => { set('table', v || ''); set('field', null); set('subtableScope', null) }}
                  items={tableNames}
                  placeholder="Select table…"
                  clearable={false}
                />
              ) : (
                <Link
                  to={`/table/${form.table}`}
                  className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Table2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-wtg-secondary flex-shrink-0" />
                    <span className="font-mono text-xs text-gray-700 group-hover:text-wtg-secondary">{form.table}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-wtg-secondary flex-shrink-0" />
                </Link>
              )}
            </div>

            {/* Field */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Target Field</p>
              {editing ? (
                <StringLookup
                  value={form.field || null}
                  onChange={v => set('field', v || null)}
                  items={availableFields}
                  placeholder="Whole table"
                />
              ) : form.field ? (
                <Link
                  to={`/table/${form.table}?field=${form.field}`}
                  className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-gray-400 group-hover:text-wtg-secondary flex-shrink-0" />
                    <span className="font-mono text-xs text-gray-700 group-hover:text-wtg-secondary">{form.field}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-wtg-secondary flex-shrink-0" />
                </Link>
              ) : (
                <span className="text-xs text-gray-400 italic">Whole table</span>
              )}
            </div>

            {/* Data Preview */}
            {!editing && (
              <Link
                to={`/table/${form.table}/preview`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors text-blue-700 text-xs font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                Data Preview
              </Link>
            )}

            {/* Subtable scope (only shown if table has subtables or already has scope set) */}
            {(availableSubtables.length > 0 || form.subtableScope) && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Subtable Scope</p>
                {editing ? (
                  <StringLookup
                    value={selectedSubtableLabel}
                    onChange={v => {
                      const match = availableSubtables.find(s => `${s.name} — ${s.discriminatorColumn} = '${s.discriminatorValue}'` === v)
                      set('subtableScope', match?.id ?? null)
                    }}
                    items={availableSubtables.map(s => `${s.name} — ${s.discriminatorColumn} = '${s.discriminatorValue}'`)}
                    placeholder="Whole table"
                  />
                ) : form.subtableScope ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200">
                    <Layers className="w-3 h-3" />{form.subtableScope.split('::')[1] ?? form.subtableScope}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 italic">Whole table</span>
                )}
              </div>
            )}

            <div className="border-t border-wtg-border" />

            {/* Owner */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Owner</p>
              {editing ? (
                <StringLookup
                  value={form.owner || null}
                  onChange={v => set('owner', v || '')}
                  items={mockOwners}
                  placeholder="Select owner…"
                  clearable={false}
                />
              ) : form.owner ? (
                <Link
                  to="/ownership"
                  className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-wtg-primary text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                      {form.owner.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-xs text-gray-700 group-hover:text-wtg-secondary">{form.owner}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-wtg-secondary flex-shrink-0" />
                </Link>
              ) : (
                <p className="text-sm text-gray-400 italic">Unassigned</p>
              )}
            </div>

            {/* Schedule */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Evaluation Schedule</p>
              {editing ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Hourly', 'Daily', 'Weekly', 'Fortnightly', 'Monthly'] as RuleSchedule[]).map(s => (
                    <button
                      key={s}
                      onClick={() => set('schedule', s)}
                      className={`py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        form.schedule === s
                          ? 'border-wtg-secondary bg-wtg-secondary/5 text-gray-800 ring-1 ring-wtg-secondary'
                          : 'border-wtg-border text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-700">{form.schedule}</p>
              )}
            </div>
          </div>

        </div>

        {/* ── Right column: description + SQL + health ── */}
        <div className="col-span-2 space-y-5">

          {/* Description */}
          <div className="card p-5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</p>
            {editing ? (
              <textarea
                rows={4}
                className="w-full border border-wtg-border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20 focus:border-wtg-secondary-light resize-none"
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed">{form.description}</p>
            )}
          </div>

          {/* SQL Expression */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">SQL Expression</p>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400">Records returned = failures</span>
                <button
                  type="button"
                  onClick={handleGenerateSql}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-wtg-border text-[11px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  {sqlPromptCopied
                    ? <><ClipboardCheck className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600">Prompt copied!</span></>
                    : <><Clipboard className="w-3 h-3" />Generate SQL</>
                  }
                </button>
              </div>
            </div>
            <textarea
              rows={10}
              spellCheck={false}
              readOnly={!editing}
              className="w-full bg-wtg-primary rounded-lg p-4 font-mono text-xs text-green-300 leading-relaxed focus:outline-none resize-none"
              style={{ caretColor: '#86efac' }}
              value={form.sqlExpression}
              onChange={e => set('sqlExpression', e.target.value)}
            />
          </div>

          {/* Run results */}
          <div className="card p-5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Last Run Results</p>
            {form.passRate !== null ? (
              <>
                <div className="mb-4">
                  <PassRateBar rate={form.passRate} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{form.passRate}%</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Pass rate</p>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${form.failCount > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                    <p className={`text-2xl font-bold ${form.failCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {form.failCount}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Failing records</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-sm font-semibold text-gray-600 mt-1">{form.lastRun}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Last run</p>
                  </div>
                </div>

                {form.failCount > 0 && (
                  <button
                    onClick={() => navigate(`/rules/${form.id}/failures`)}
                    className="w-full mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-left hover:bg-red-100 hover:border-red-300 transition-colors group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-semibold">{form.failCount} failing records need attention</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-600 group-hover:gap-2 transition-all">
                      View records <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">This rule has not run yet.</p>
                <p className="text-xs mt-1">Activate the rule to begin evaluation.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky save footer (edit mode only) */}
      {editing && (
        <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-wtg-border px-6 py-3 flex items-center gap-3 shadow-lg z-20">
          <div className="flex items-center gap-2 flex-1">
            {isDirty
              ? <><span className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-xs text-gray-500 font-medium">Unsaved changes</span></>
              : <><span className="w-2 h-2 rounded-full bg-gray-300" /><span className="text-xs text-gray-400">No changes</span></>
            }
          </div>
          <button onClick={handleDiscard} className="btn-secondary text-xs py-1.5">
            <X className="w-3.5 h-3.5" /> Discard
          </button>
          <button onClick={handleSave} className="btn-primary text-xs py-1.5">
            <Save className="w-3.5 h-3.5" /> Save Changes
          </button>
        </div>
      )}
      {editing && <div className="h-16" />}
    </div>
  )
}
