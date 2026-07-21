import { useState, useMemo, useEffect } from 'react'
import {
  X, CheckCircle2, ChevronRight, Info,
  Hash, Calendar, Link2, BarChart3, Zap,
  Clipboard, ClipboardCheck,
} from 'lucide-react'
import { sampleTables, subtableDefinitions, owners as staffRecords } from '../data/mockData'
import { StringLookup } from './Lookup'
import type { CreateRuleInput, RuleSchedule } from '../lib/ruleModels'

// ─── Types ───────────────────────────────────────────────────────────────────

export type RuleType = 'completeness' | 'format' | 'consistency' | 'timeliness' | 'range' | 'reference'
export type Severity = 'H' | 'M' | 'L'

const mockOwners = staffRecords.map(s => s.fullName)
const tableNames = [...new Set(sampleTables.map(t => t.tableName))].sort()

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

const ruleTypeMeta: Record<RuleType, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  completeness: { label: 'Completeness', color: 'bg-blue-50 text-blue-700', icon: CheckCircle2 },
  format:       { label: 'Format',       color: 'bg-purple-50 text-purple-700', icon: Hash },
  consistency:  { label: 'Consistency',  color: 'bg-amber-50 text-amber-700', icon: BarChart3 },
  timeliness:   { label: 'Timeliness',   color: 'bg-teal-50 text-teal-700', icon: Calendar },
  range:        { label: 'Range',        color: 'bg-orange-50 text-orange-700', icon: Zap },
  reference:    { label: 'Reference',    color: 'bg-indigo-50 text-indigo-700', icon: Link2 },
}

const ruleTypeDescriptions: Record<RuleType, string> = {
  completeness: 'Checks that required fields are populated — no nulls or empty values where data is expected.',
  format:       'Validates that values match an expected pattern, code list, or format (e.g. email, timezone, date format).',
  consistency:  'Cross-field or cross-table logic — ensures records are internally consistent (e.g. end date after start date, totals sum correctly).',
  timeliness:   'Data freshness checks — flags records that have not been updated within an expected window.',
  range:        'Validates that numeric or date values fall within acceptable bounds (e.g. percentages between 0–100).',
  reference:    'Ensures foreign key relationships are valid and that referenced records are active.',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateRulePanel({
  onClose,
  onSave,
  initialTable,
  initialField,
  initialSeverity,
}: {
  onClose: () => void
  onSave?: (rule: CreateRuleInput) => void
  initialTable?: string
  initialField?: string
  initialSeverity?: Severity
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [sqlPromptCopied, setSqlPromptCopied] = useState(false)
  const [form, setForm] = useState({
    name: '',
    type: '' as RuleType | '',
    table: initialTable ?? '',
    field: initialField ?? '',
    subtableScope: '',
    severity: initialSeverity ?? 'M' as Severity,
    owner: '',
    schedule: 'Daily',
    description: '',
    expression: '',
    thresholdMode: 'absolute' as 'absolute' | 'percentage',
    alertThreshold: 0,
  })

  const availableFields = form.table ? (fieldsByTable[form.table] ?? []) : []
  const availableSubtables = useMemo(
    () => subtableDefinitions.filter(s => s.parentTableName === form.table),
    [form.table]
  )

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const generatedSql = (() => {
    const table = form.table || '<table>'
    const field = form.field || '<field>'
    const scope = form.subtableScope
      ? `\n  AND ${availableSubtables.find(s => s.id === form.subtableScope)?.discriminatorColumn ?? '<scope_column>'} = '${availableSubtables.find(s => s.id === form.subtableScope)?.discriminatorValue ?? '<scope_value>'}'`
      : ''

    switch (form.type) {
      case 'completeness':
        return `SELECT *\nFROM ${table}\nWHERE ${field} IS NULL${scope}`
      case 'timeliness':
        return `SELECT *\nFROM ${table}\nWHERE ${field} < DATEADD(month, -24, GETDATE())${scope}`
      case 'reference':
        return `SELECT *\nFROM ${table}\nWHERE NOT EXISTS (\n  SELECT 1\n  FROM <reference_table> ref\n  WHERE ref.<reference_field> = ${table}.${field}\n)${scope}`
      case 'format':
        return `SELECT *\nFROM ${table}\nWHERE ${field} NOT LIKE '<pattern>'${scope}`
      case 'range':
        return `SELECT *\nFROM ${table}\nWHERE ${field} NOT BETWEEN <min> AND <max>${scope}`
      case 'consistency':
        return `SELECT *\nFROM ${table}\nWHERE /* add consistency logic */ 1 = 0${scope}`
      default:
        return `SELECT *\nFROM ${table}\nWHERE /* define rule logic */ 1 = 0${scope}`
    }
  })()

  const handleGenerateSql = () => {
    const subtable = availableSubtables.find(s => s.id === form.subtableScope)
    const lines = [
      `Generate a SQL query for a data quality rule with the following details:`,
      ``,
      `Rule name: ${form.name}`,
      `Rule type: ${form.type ? ruleTypeMeta[form.type as RuleType].label : 'Not specified'}`,
      `Target table: ${form.table || 'Not specified'}`,
      form.field ? `Target field: ${form.field}` : null,
      subtable ? `Subtable scope: ${subtable.name} (${subtable.discriminatorColumn} = '${subtable.discriminatorValue}')` : null,
      `Severity: ${form.severity === 'H' ? 'High' : form.severity === 'M' ? 'Medium' : 'Low'}`,
      form.description.trim() ? `\nDescription:\n${form.description.trim()}` : null,
      ``,
      `The query should return rows that represent failures (records that violate the rule).`,
      `Use T-SQL (SQL Server) syntax.`,
      `Once generated, I will paste the SQL back into the rule creation form.`,
    ].filter(l => l !== null).join('\n')

    navigator.clipboard.writeText(lines).then(() => {
      setSqlPromptCopied(true)
      setTimeout(() => setSqlPromptCopied(false), 2500)
    })
  }

  const step1Valid = form.name.trim() && form.type && form.table && form.severity

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="w-[520px] flex-shrink-0 border-l border-wtg-border bg-white flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-wtg-border">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Create Data Rule</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {initialTable ? (
              <span>
                For <span className="font-mono font-medium text-gray-600">{initialTable}</span>
                {initialField ? <> · field <span className="font-mono font-medium text-gray-600">{initialField}</span></> : null}
                {' '}· Step {step} of 3
              </span>
            ) : (
              `Step ${step} of 3`
            )}
          </p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="px-5 pt-4 pb-0">
        <div className="flex items-center gap-2 mb-4">
          {[
            { n: 1, label: 'Target & Type' },
            { n: 2, label: 'Condition' },
            { n: 3, label: 'Ownership & Schedule' },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                step > s.n ? 'bg-emerald-500 text-white' : step === s.n ? 'bg-wtg-secondary text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {step > s.n ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
              </div>
              <span className={`text-xs font-medium ${step === s.n ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
              {i < 2 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">

        {/* ── Step 1: Target & Type ── */}
        {step === 1 && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rule Name <span className="text-red-400">*</span></label>
              <input
                className="w-full border border-wtg-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20 focus:border-wtg-secondary-light"
                placeholder="e.g. Staff home branch must be set"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rule Type <span className="text-red-400">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ruleTypeMeta) as RuleType[]).map(type => {
                  const meta = ruleTypeMeta[type]
                  const Icon = meta.icon
                  return (
                    <button
                      key={type}
                      onClick={() => set('type', type)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        form.type === type
                          ? 'border-wtg-secondary bg-wtg-secondary/5 ring-1 ring-wtg-secondary'
                          : 'border-wtg-border hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs font-semibold text-gray-800">{meta.label}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">{ruleTypeDescriptions[type]}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Table <span className="text-red-400">*</span></label>
                <StringLookup
                  value={form.table || null}
                  onChange={v => { set('table', v || ''); if (!initialField) set('field', ''); set('subtableScope', '') }}
                  items={tableNames}
                  placeholder="Select table…"
                  clearable={false}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Field <span className="text-gray-400 font-normal">(optional)</span></label>
                <StringLookup
                  value={form.field || null}
                  onChange={v => set('field', v || '')}
                  items={availableFields}
                  placeholder={!form.table ? 'Select table first…' : 'Whole table'}
                />
              </div>
            </div>

            {availableSubtables.length > 0 && (() => {
              const subtableItems = availableSubtables.map(s => `${s.name} — ${s.discriminatorColumn} = '${s.discriminatorValue}'`)
              const selectedLabel = availableSubtables.find(s => s.id === form.subtableScope)
                ? `${availableSubtables.find(s => s.id === form.subtableScope)!.name} — ${availableSubtables.find(s => s.id === form.subtableScope)!.discriminatorColumn} = '${availableSubtables.find(s => s.id === form.subtableScope)!.discriminatorValue}'`
                : null
              return (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Subtable Scope <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <StringLookup
                    value={selectedLabel}
                    onChange={(v) => {
                      const match = availableSubtables.find(s => `${s.name} — ${s.discriminatorColumn} = '${s.discriminatorValue}'` === v)
                      set('subtableScope', match?.id ?? '')
                    }}
                    items={subtableItems}
                    placeholder="Whole table (all subtypes)"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Scope this rule to a specific logical partition of {form.table}.</p>
                </div>
              )
            })()}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Severity <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                {(['H', 'M', 'L'] as Severity[]).map(s => (
                  <button
                    key={s}
                    onClick={() => set('severity', s)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                      form.severity === s
                        ? s === 'H' ? 'border-red-400 bg-red-50 text-red-700 ring-1 ring-red-300'
                          : s === 'M' ? 'border-amber-400 bg-amber-50 text-amber-700 ring-1 ring-amber-300'
                          : 'border-green-400 bg-green-50 text-green-700 ring-1 ring-green-300'
                        : 'border-wtg-border text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {s === 'H' ? 'High' : s === 'M' ? 'Medium' : 'Low'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                {form.severity === 'H' && 'Failures will surface as Critical issues. Actively monitored.'}
                {form.severity === 'M' && 'Failures will surface as Warnings. Reviewed periodically.'}
                {form.severity === 'L' && 'Failures surfaced as Info. Reviewed opportunistically.'}
              </p>
            </div>
          </>
        )}

        {/* ── Step 2: Condition ── */}
        {step === 2 && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-600">Description <span className="text-red-400">*</span></label>
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
              <textarea
                rows={3}
                className="w-full border border-wtg-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20 focus:border-wtg-secondary-light resize-none"
                placeholder="What does this rule check, and why does it matter?"
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>

            {/* Visual condition builder */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Condition Builder</label>
              <div className="bg-gray-50 border border-wtg-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  {form.type === 'completeness' && <span>Completeness rules check for null or empty values in the target field.</span>}
                  {form.type === 'format' && <span>Format rules validate values against a pattern or code list.</span>}
                  {form.type === 'consistency' && <span>Consistency rules check cross-field or cross-table logic.</span>}
                  {form.type === 'timeliness' && <span>Timeliness rules check data freshness against a defined window.</span>}
                  {form.type === 'range' && <span>Range rules validate that values fall within defined bounds.</span>}
                  {form.type === 'reference' && <span>Reference rules validate that foreign keys point to valid, active records.</span>}
                  {!form.type && <span>Select a rule type in Step 1 to see condition options.</span>}
                </div>

                {form.type === 'completeness' && (
                  <div className="bg-white border border-wtg-border rounded-lg p-3 text-sm text-gray-700 font-mono text-xs">
                    <span className="text-purple-600">WHERE </span>
                    <span className="text-blue-600">{form.field || '<field>'}</span>
                    <span className="text-gray-500"> IS NULL</span>
                    <br />
                    <span className="text-purple-600">  AND </span>
                    <span className="text-blue-600">IsActive</span>
                    <span className="text-gray-500"> = 1</span>
                  </div>
                )}

                {form.type === 'format' && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">Validation type</p>
                      <div className="flex gap-2">
                        {['Pattern / Regex', 'Code list', 'Reference table'].map(opt => (
                          <button key={opt} className="px-2.5 py-1 rounded border border-wtg-border text-xs text-gray-600 hover:bg-white hover:border-wtg-secondary-light transition-colors">
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      className="w-full border border-wtg-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20 bg-white"
                      placeholder="e.g.  ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                    />
                  </div>
                )}

                {form.type === 'timeliness' && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400">Flag records where the target date field is older than:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={24}
                        className="w-20 border border-wtg-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20"
                      />
                      <div className="flex-1">
                        <StringLookup
                          value="months"
                          onChange={() => {}}
                          items={['months', 'days', 'years']}
                          clearable={false}
                        />
                      </div>
                      <span className="text-sm text-gray-500">ago</span>
                    </div>
                  </div>
                )}

                {form.type === 'range' && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400">Field value must be between:</p>
                    <div className="flex items-center gap-3">
                      <input type="number" placeholder="Min" className="flex-1 border border-wtg-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20" />
                      <span className="text-gray-400 text-sm">and</span>
                      <input type="number" placeholder="Max" className="flex-1 border border-wtg-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20" />
                    </div>
                  </div>
                )}

                {form.type === 'reference' && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400">Target field must match a value in:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <StringLookup
                          value={null}
                          onChange={() => {}}
                          items={tableNames}
                          placeholder="Referenced table…"
                          clearable={false}
                        />
                      </div>
                      <input className="border border-wtg-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none" placeholder="Referenced field" />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded" />
                      Only match active records (IsActive = 1)
                    </label>
                  </div>
                )}

                {form.type === 'consistency' && (
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1.5">SQL expression — records returned are failures</p>
                    <textarea
                      rows={5}
                      className="w-full border border-wtg-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20 bg-white"
                      placeholder={`SELECT Staff\nFROM GlbStaffCostCentre\nGROUP BY Staff\nHAVING SUM(Percentage) != 100`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SQL preview */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-600">SQL Preview</label>
                <button className="text-[10px] text-wtg-secondary hover:text-wtg-secondary-light">Edit manually</button>
              </div>
              <div className="bg-wtg-primary rounded-lg p-4 font-mono text-xs text-green-300 leading-relaxed">
                <span className="text-blue-300">-- Auto-generated from condition builder</span>
                <br />
                <span className="text-purple-300">SELECT </span>COUNT(*) <span className="text-purple-300">AS fail_count</span>
                <br />
                <span className="text-purple-300">FROM </span>{form.table || '<table>'}
                <br />
                <span className="text-purple-300">WHERE </span>
                {form.type === 'completeness' && <>{form.field || '<field>'} <span className="text-purple-300">IS NULL</span></>}
                {form.type === 'timeliness' && <>{form.field || '<date_field>'} <span className="text-purple-300">{'<'}</span> DATEADD(month, -24, GETDATE())</>}
                {form.type === 'reference' && <>NOT EXISTS (SELECT 1 FROM ... WHERE ...)</>}
                {(form.type === 'format' || form.type === 'range') && <>{form.field || '<field>'} <span className="text-purple-300">NOT</span> LIKE '<span className="text-yellow-300">...</span>'</>}
                {form.type === 'consistency' && <span className="text-gray-400 italic">{'/* custom expression */'}</span>}
                {!form.type && <span className="text-gray-500">{'/* select a rule type to generate */'}</span>}
              </div>
            </div>
          </>
        )}

        {/* ── Step 3: Ownership & Schedule ── */}
        {step === 3 && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>The rule owner is notified when failures exceed the alert threshold. They are responsible for triaging and resolving issues.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rule Owner <span className="text-red-400">*</span></label>
              <StringLookup
                value={form.owner || null}
                onChange={v => set('owner', v || '')}
                items={mockOwners}
                placeholder="Select owner…"
                clearable={false}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Evaluation Schedule <span className="text-red-400">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'Daily', desc: 'Runs once per day' },
                  { val: 'Weekly', desc: 'Runs every Monday' },
                  { val: 'Fortnightly', desc: 'Runs every two weeks' },
                  { val: 'Monthly', desc: 'Runs on the 1st of each month' },
                ].map(s => (
                  <button
                    key={s.val}
                    onClick={() => set('schedule', s.val)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      form.schedule === s.val
                        ? 'border-wtg-secondary bg-wtg-secondary/5 ring-1 ring-wtg-secondary'
                        : 'border-wtg-border hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-800">{s.val}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Alert Threshold</label>
              <div className="flex gap-2 mb-2">
                {(['absolute', 'percentage'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => set('thresholdMode', mode)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      form.thresholdMode === mode
                        ? 'border-wtg-secondary bg-wtg-secondary/5 text-wtg-secondary ring-1 ring-wtg-secondary'
                        : 'border-wtg-border text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {mode === 'absolute' ? 'Absolute' : 'Percentage'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {form.thresholdMode === 'absolute' ? (
                  <>
                    <span className="text-sm text-gray-500">Alert when more than</span>
                    <input
                      type="number"
                      min={0}
                      value={form.alertThreshold}
                      onChange={e => set('alertThreshold', e.target.value)}
                      className="w-20 border border-wtg-border rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20"
                    />
                    <span className="text-sm text-gray-500">records fail</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-500">Alert when fewer than</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.alertThreshold}
                      onChange={e => set('alertThreshold', e.target.value)}
                      className="w-20 border border-wtg-border rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20"
                    />
                    <span className="text-sm text-gray-500">% of records are healthy</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                {form.thresholdMode === 'absolute'
                  ? 'Set to 0 to alert on any failure.'
                  : 'e.g. 95 means alert if more than 5% of records fail.'}
              </p>
            </div>

            {/* Summary */}
            <div className="card p-4 space-y-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Rule Summary</p>
              {[
                { label: 'Name', val: form.name || '—' },
                { label: 'Type', val: form.type ? ruleTypeMeta[form.type].label : '—' },
                { label: 'Table', val: form.table || '—' },
                { label: 'Field', val: form.field || 'Whole table' },
                { label: 'Scope', val: form.subtableScope ? (form.subtableScope.split('::')[1] ?? form.subtableScope) : 'Whole table' },
                { label: 'Severity', val: form.severity === 'H' ? 'High' : form.severity === 'M' ? 'Medium' : 'Low' },
                { label: 'Schedule', val: form.schedule },
                {
                  label: 'Alert Threshold',
                  val: form.thresholdMode === 'absolute'
                    ? form.alertThreshold === 0 ? 'Any failure' : `> ${form.alertThreshold} records`
                    : `< ${form.alertThreshold}% healthy`,
                },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{row.label}</span>
                  <span className="font-medium text-gray-700 font-mono">{row.val}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-wtg-border flex items-center gap-2">
        {step > 1 && (
          <button className="btn-secondary text-xs py-1.5" onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}>
            Back
          </button>
        )}
        <div className="flex-1" />
        {step < 3 ? (
          <button
            className={`btn-primary text-xs py-1.5 ${step === 1 && !step1Valid ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => { if (step === 1 && !step1Valid) return; setStep(s => (s + 1) as 1 | 2 | 3) }}
          >
            Continue <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <>
            <button
              className="btn-secondary text-xs py-1.5"
              onClick={() => {
                if (onSave) {
                  onSave({
                    name: form.name || 'Untitled rule',
                    type: (form.type || 'completeness') as CreateRuleInput['type'],
                    table: form.table,
                    field: form.field || null,
                    subtableScope: form.subtableScope || null,
                    description: form.description.trim(),
                    severity: form.severity,
                    owner: form.owner,
                    schedule: form.schedule as RuleSchedule,
                    status: 'draft',
                    alertThreshold: { mode: form.thresholdMode, value: Number(form.alertThreshold) },
                    sqlExpression: generatedSql,
                  })
                }
                onClose()
              }}
            >
              Save as Draft
            </button>
            <button
              className="btn-primary text-xs py-1.5"
              onClick={() => {
                if (onSave) {
                  onSave({
                    name: form.name,
                    type: form.type as CreateRuleInput['type'],
                    table: form.table,
                    field: form.field || null,
                    subtableScope: form.subtableScope || null,
                    description: form.description.trim(),
                    severity: form.severity,
                    owner: form.owner,
                    schedule: form.schedule as RuleSchedule,
                    status: 'active',
                    alertThreshold: { mode: form.thresholdMode, value: Number(form.alertThreshold) },
                    sqlExpression: generatedSql,
                  })
                }
                onClose()
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Create & Activate
            </button>
          </>
        )}
      </div>
    </div>
  )
}
