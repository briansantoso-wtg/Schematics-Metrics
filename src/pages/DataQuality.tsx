import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertTriangle, CheckCircle2, TrendingUp, RefreshCw,
  Clock, BarChart3, Bot, Zap, Shield, Eye, Calendar,
  Hash, Link2, Plus,
} from 'lucide-react'
import type { Criticality, DataRule } from '../types'
import { CriticalityPill } from '../components/CriticalityPill'
import { CreateRulePanel } from '../components/CreateRulePanel'
import { DataTable } from '../components/DataTable'
import { api } from '../lib/api'
import type { CreateRuleInput } from '../lib/ruleModels'
import { toSummaryRule } from '../lib/ruleModels'

const mockIssues: Array<{
  id: number; table: string; field: string; issue: string
  severity: Criticality; detected: string; status: 'open' | 'investigating' | 'acknowledged' | 'resolved'
}> = [
  { id: 1, table: 'GlbStaff', field: 'GS_GB_HomeBranch', issue: 'Null home branch for 23 active staff members', severity: 'H', detected: '2 hours ago', status: 'open' },
  { id: 2, table: 'GlbEmploymentTeam', field: 'GET_GT_Team', issue: '14 staff assigned to deprecated team codes', severity: 'H', detected: '5 hours ago', status: 'open' },
  { id: 3, table: 'OrgHeader', field: 'OH_IsActive', issue: '342 orgs marked active with no activity in 24+ months', severity: 'M', detected: '1 day ago', status: 'investigating' },
  { id: 4, table: 'GlbStaffManager', field: 'GSM_ManagerStaff', issue: '7 circular manager references detected', severity: 'H', detected: '1 day ago', status: 'open' },
  { id: 5, table: 'OrgContact', field: 'OC_Email', issue: '156 contacts with invalid email format', severity: 'Inherit', detected: '2 days ago', status: 'open' },
  { id: 6, table: 'GlbBranch', field: 'GB_Timezone', issue: '3 branches with unrecognised timezone codes', severity: 'L', detected: '3 days ago', status: 'resolved' },
  { id: 7, table: 'OrgRegistration', field: 'OR_ExpiryDate', issue: '28 registrations expired and not renewed', severity: 'Inherit', detected: '3 days ago', status: 'investigating' },
  { id: 8, table: 'GlbDepartment', field: 'GD_IsActive', issue: 'All departments active — no historical tracking in use', severity: 'L', detected: '5 days ago', status: 'acknowledged' },
]

const ruleTypeIcon: Record<DataRule['type'], React.ComponentType<{ className?: string }>> = {
  completeness: CheckCircle2,
  format: Hash,
  consistency: BarChart3,
  timeliness: Calendar,
  range: Zap,
  reference: Link2,
}

const ruleTypeColor: Record<DataRule['type'], string> = {
  completeness: 'text-blue-600 bg-blue-50',
  format: 'text-purple-600 bg-purple-50',
  consistency: 'text-amber-600 bg-amber-50',
  timeliness: 'text-teal-600 bg-teal-50',
  range: 'text-orange-600 bg-orange-50',
  reference: 'text-indigo-600 bg-indigo-50',
}

function formatLastRun(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const now = new Date('2026-03-25T12:00:00Z')
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / 3_600_000)
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return '1 day ago'
  return `${diffD} days ago`
}

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-red-50 text-red-600',
    investigating: 'bg-amber-50 text-amber-600',
    acknowledged: 'bg-blue-50 text-blue-600',
    resolved: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

const ruleStatusStyles: Record<DataRule['status'], string> = {
  active: 'bg-emerald-50 text-emerald-600',
  draft: 'bg-gray-100 text-gray-500',
  disabled: 'bg-red-50 text-red-400',
}

// ─── Column definitions ───────────────────────────────────────────────────────

type Issue = typeof mockIssues[number]

const issueColumns: ColumnDef<Issue>[] = [
  {
    id: 'issue',
    accessorKey: 'issue',
    header: 'Issue',
    cell: ({ getValue }) => <p className="text-sm text-gray-900">{getValue() as string}</p>,
  },
  {
    id: 'tableField',
    header: 'Table.Field',
    accessorFn: row => `${row.table}.${row.field}`,
    cell: ({ getValue }) => <span className="font-mono text-xs text-gray-600">{getValue() as string}</span>,
    size: 170,
  },
  {
    id: 'severity',
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ getValue }) => <CriticalityPill value={getValue() as Criticality} />,
    size: 90,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusChip status={getValue() as string} />,
    size: 120,
  },
  {
    id: 'detected',
    accessorKey: 'detected',
    header: 'Detected',
    cell: ({ getValue }) => (
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <Clock className="w-3 h-3" />{getValue() as string}
      </span>
    ),
    size: 130,
  },
]

const rulesColumns: ColumnDef<DataRule>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Rule',
    cell: ({ row }) => (
      <div>
        <p className="text-sm text-gray-900">{row.original.name}</p>
        <p className="text-[10px] text-gray-400">{row.original.owner}</p>
      </div>
    ),
  },
  {
    id: 'tableField',
    header: 'Table.Field',
    accessorFn: row => `${row.table}${row.field ? `.${row.field}` : ''}`,
    cell: ({ getValue }) => <span className="font-mono text-xs text-gray-600">{getValue() as string}</span>,
    size: 160,
  },
  {
    id: 'type',
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const TypeIcon = ruleTypeIcon[row.original.type]
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${ruleTypeColor[row.original.type]}`}>
          <TypeIcon className="w-3 h-3" />
          {row.original.type.charAt(0).toUpperCase() + row.original.type.slice(1)}
        </span>
      )
    },
    size: 120,
  },
  {
    id: 'severity',
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ getValue }) => <CriticalityPill value={getValue() as Criticality} />,
    size: 90,
  },
  {
    id: 'frequency',
    accessorKey: 'frequency',
    header: 'Schedule',
    cell: ({ getValue }) => (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
        <Calendar className="w-3 h-3" />{getValue() as string}
      </span>
    ),
    size: 110,
  },
  {
    id: 'lastRuntime',
    accessorKey: 'lastRuntime',
    header: 'Last Run',
    cell: ({ getValue }) => (
      <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
        <Clock className="w-3 h-3" />{formatLastRun(getValue() as string | null)}
      </span>
    ),
    size: 110,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const s = getValue() as DataRule['status']
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${ruleStatusStyles[s]}`}>
          {s}
        </span>
      )
    },
    size: 90,
  },
]

export default function DataQuality() {
  const [tab, setTab] = useState<'issues' | 'rules' | 'agentic'>('issues')
  const [rules, setRules] = useState<DataRule[]>([])
  const [showCreateRule, setShowCreateRule] = useState(false)

  useEffect(() => {
    api.getRules().then(next => setRules(next.map(toSummaryRule))).catch(console.error)
  }, [])

  async function handleCreateRule(rule: CreateRuleInput) {
    try {
      const saved = await api.createRule(rule)
      setRules(current => [...current, toSummaryRule(saved)])
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Data Quality</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor data quality across governed tables. Issues are detected through automated rules and manual review.
          </p>
        </div>
        <button className="btn-primary">
          <RefreshCw className="w-4 h-4" /> Run Quality Check
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Open Issues
          </div>
          <p className="text-3xl font-bold text-gray-900">{mockIssues.filter(i => i.status === 'open').length}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Eye className="w-4 h-4 text-amber-500" /> Investigating
          </div>
          <p className="text-3xl font-bold text-gray-900">{mockIssues.filter(i => i.status === 'investigating').length}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Resolved (30d)
          </div>
          <p className="text-3xl font-bold text-gray-900">{mockIssues.filter(i => i.status === 'resolved').length}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Quality Score
          </div>
          <p className="text-3xl font-bold text-gray-900">72%</p>
          <p className="text-[10px] text-gray-400">Based on governed tables</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-wtg-border">
        {[
          { id: 'issues' as const, label: 'Active Issues', icon: AlertTriangle },
          { id: 'rules' as const, label: 'Validation Rules', icon: Shield },
          { id: 'agentic' as const, label: 'Agentic Remediation', icon: Bot },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-wtg-secondary text-wtg-secondary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'issues' && (
        <DataTable
          data={mockIssues}
          columns={issueColumns}
          getRowId={i => String(i.id)}
          placeholder="Search issues, tables…"
          emptyMessage="No issues match your search."
        />
      )}

      {tab === 'rules' && (
        <div className={`flex gap-4 ${showCreateRule ? 'items-start' : ''}`}>
          <div className="flex-1 min-w-0">
            <DataTable
              data={rules}
              columns={rulesColumns}
              getRowId={r => r.id}
              placeholder="Search rules, tables…"
              toolbar={
                <button className="btn-primary text-xs py-1.5 flex-shrink-0" onClick={() => setShowCreateRule(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add Rule
                </button>
              }
              emptyMessage="No rules defined yet."
            />
          </div>
          {showCreateRule && (
            <CreateRulePanel
              onClose={() => setShowCreateRule(false)}
              onSave={handleCreateRule}
            />
          )}
        </div>
      )}

      {tab === 'agentic' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-wtg-primary to-wtg-primary-light rounded-xl p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-wtg-secondary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-wtg-secondary-light" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Agentic Data Remediation</h3>
                <p className="text-white/60 text-sm mt-1 max-w-2xl">
                  Phase 3 will introduce agent-driven identification and resolution of data quality issues.
                  Actions are categorised into three tiers based on the ownership model, editor context level,
                  and field criticality.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              {
                tier: 'Tier 1',
                title: 'Autonomous Action',
                desc: 'Safe to act without review. Low criticality, contextual editors, clear rules.',
                color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                icon: CheckCircle2,
                examples: ['Fix timezone code typos', 'Deactivate expired temp records', 'Normalize formatting'],
              },
              {
                tier: 'Tier 2',
                title: 'Human Confirmation',
                desc: 'Agent proposes, human confirms. Medium criticality or informed editor.',
                color: 'bg-amber-50 border-amber-200 text-amber-700',
                icon: Eye,
                examples: ['Reassign orphaned team members', 'Update stale contact info', 'Resolve duplicate orgs'],
              },
              {
                tier: 'Tier 3',
                title: 'Advisory Warning',
                desc: 'Agent identifies and flags only. High criticality or dependent editors.',
                color: 'bg-red-50 border-red-200 text-red-700',
                icon: AlertTriangle,
                examples: ['Circular manager chains', 'Financial data inconsistencies', 'Security role conflicts'],
              },
            ].map(tier => (
              <div key={tier.tier} className={`card p-5 border ${tier.color.split(' ')[1]}`}>
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${tier.color.split(' ')[2]} mb-2`}>
                  <tier.icon className="w-3.5 h-3.5" /> {tier.tier}
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{tier.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{tier.desc}</p>
                <div className="mt-3 space-y-1.5">
                  {tier.examples.map(ex => (
                    <div key={ex} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-1 h-1 rounded-full bg-gray-300" /> {ex}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
