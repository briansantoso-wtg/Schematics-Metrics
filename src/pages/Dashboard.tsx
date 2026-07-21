import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Database, Users, AlertTriangle, CheckCircle2, ArrowRight,
  Shield, Clock, Layers,
} from 'lucide-react'
import { api } from '../lib/api'
import type { OwnershipSummary, DomainGroup, SchemaInfo, TableRecord } from '../types'

function StatCard({ icon: Icon, label, value, subtitle, color, onClick }: {
  icon: React.ElementType; label: string; value: string | number; subtitle?: string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'slate'; onClick?: () => void;
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-gray-50 text-gray-500',
  }
  return (
    <div
      onClick={onClick}
      className={`card p-5 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-200 transition-all' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

function OwnershipBar({ summary }: { summary: OwnershipSummary }) {
  const pctAssigned = Math.round((summary.assignedBoth / summary.totalTables) * 100)
  const pctPartial = Math.round(((summary.assignedPrimary - summary.assignedBoth + summary.assignedDevTeam - summary.assignedBoth) / summary.totalTables) * 100)
  const pctUnassigned = 100 - pctAssigned - pctPartial

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Ownership Coverage (Sample Set)</h3>
        <span className="text-xs text-gray-400">{summary.totalTables} tables tracked</span>
      </div>
      <div className="flex rounded-full h-3 overflow-hidden bg-gray-100">
        <div className="bg-emerald-500 transition-all" style={{ width: `${pctAssigned}%` }} />
        <div className="bg-amber-400 transition-all" style={{ width: `${pctPartial}%` }} />
        <div className="bg-gray-200 transition-all" style={{ width: `${pctUnassigned}%` }} />
      </div>
      <div className="flex items-center gap-5 mt-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Fully assigned ({pctAssigned}%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Partial ({pctPartial}%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-200" /> Unassigned ({pctUnassigned}%)
        </span>
      </div>
    </div>
  )
}

function CriticalityBreakdown({ summary }: { summary: OwnershipSummary }) {
  const total = summary.totalTables
  const items = [
    { label: 'High', count: summary.criticalityH, color: 'bg-red-500', pct: Math.round((summary.criticalityH / total) * 100) },
    { label: 'Medium', count: summary.criticalityM, color: 'bg-amber-400', pct: Math.round((summary.criticalityM / total) * 100) },
    { label: 'Low', count: summary.criticalityL, color: 'bg-emerald-500', pct: Math.round((summary.criticalityL / total) * 100) },
    { label: 'Unset', count: summary.criticalityUnset, color: 'bg-gray-200', pct: Math.round((summary.criticalityUnset / total) * 100) },
  ]

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Criticality Distribution</h3>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-gray-600">{item.label}</span>
              <span className="text-gray-400">{item.count} ({item.pct}%)</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecentActivity() {
  const activities = [
    { action: 'Ownership assigned', target: 'GlbStaff', user: 'Anna Lindqvist', time: '2 hours ago', type: 'assign' as const },
    { action: 'Criticality set to High', target: 'OrgHeader', user: 'Rachel Torres', time: '5 hours ago', type: 'criticality' as const },
    { action: 'Ownership confirmed', target: 'GlbBranch', user: 'Anna Lindqvist', time: '1 day ago', type: 'confirm' as const },
    { action: 'Table registered', target: 'ProcessHeader', user: 'System Import', time: '2 days ago', type: 'register' as const },
    { action: 'Criticality set to High', target: 'GlbSecurity', user: 'David Park', time: '3 days ago', type: 'criticality' as const },
    { action: 'Subtable defined', target: 'GlbGroup', user: 'Mariana Pereira', time: '3 days ago', type: 'assign' as const },
    { action: 'Staleness warning', target: 'GlbSecurity', user: 'System', time: '5 days ago', type: 'warning' as const },
  ]

  const iconMap = {
    assign: <Users className="w-3.5 h-3.5 text-blue-500" />,
    criticality: <Shield className="w-3.5 h-3.5 text-amber-500" />,
    confirm: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    register: <Database className="w-3.5 h-3.5 text-gray-400" />,
    warning: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((a, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              {iconMap[a.type]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-700">
                {a.action} — <span className="font-medium text-gray-900">{a.target}</span>
              </p>
              <p className="text-xs text-gray-400">{a.user} · {a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const emptySummary: OwnershipSummary = {
  totalTables: 0, assignedPrimary: 0, assignedDevTeam: 0,
  assignedBoth: 0, unassigned: 0, stale: 0,
  criticalityH: 0, criticalityM: 0, criticalityL: 0, criticalityUnset: 0,
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<OwnershipSummary>(emptySummary)
  const [schemas, setSchemas] = useState<SchemaInfo[]>([])
  const [domains, setDomains] = useState<DomainGroup[]>([])
  const [tables, setTables] = useState<TableRecord[]>([])

  useEffect(() => {
    Promise.all([
      api.getSummary().then(setSummary),
      api.getSchemas().then(setSchemas),
      api.getDomains().then(setDomains),
      api.getTables().then(setTables),
    ]).catch(console.error)
  }, [])

  const totalEnterprise = schemas.reduce((s, sc) => s + sc.tableCount, 0)
  const highCritUnowned = tables.filter(t => t.criticality === 'H' && !t.primaryOwner).length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero / Welcome */}
      <div className="bg-gradient-to-br from-wtg-primary via-wtg-primary-light to-wtg-primary-mid rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-wtg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full translate-y-1/2" />
        <div className="relative">
          <h1 className="text-2xl font-bold">Data Governance Hub</h1>
          <p className="text-white/60 mt-1.5 text-sm max-w-2xl">
            Ensuring the accuracy and reliability of operational data through better controls,
            governance, visibility, and action. Phase 1 focuses on establishing the data ownership
            foundation across {totalEnterprise.toLocaleString()} operational tables.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <button onClick={() => navigate('/tables')} className="btn-primary">
              <Database className="w-4 h-4" /> Table Registry
            </button>
            <button onClick={() => navigate('/ownership')} className="btn-secondary !bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
              <Users className="w-4 h-4" /> Ownership Registry
            </button>
          </div>
        </div>
      </div>

      {/* Phase roadmap hint */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Implementation Roadmap</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { phase: 'Phase 1', name: 'Foundation', status: 'In Progress', items: ['Table registry', 'Primary & Dev team owners', 'Criticality (H/M/L)', 'Staleness tracking'], pct: 15, active: true },
            { phase: 'Phase 2', name: 'Depth', status: 'Planned', items: ['Operational editors', 'Lifecycle ownership', 'Validation process', 'Use case links'], pct: 0, active: false },
            { phase: 'Phase 3', name: 'Intelligence', status: 'Future', items: ['Automated monitoring', 'Agentic remediation', 'Inferred priority', 'Full governance dashboard'], pct: 0, active: false },
          ].map(p => (
            <div key={p.phase} className={`rounded-xl border p-4 ${p.active ? 'border-wtg-secondary/30 bg-blue-50/30' : 'border-wtg-border bg-gray-50/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${p.active ? 'text-wtg-secondary' : 'text-gray-400'}`}>{p.phase}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  p.active ? 'bg-wtg-secondary/10 text-wtg-secondary' : 'bg-gray-100 text-gray-400'
                }`}>
                  {p.status}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-gray-900">{p.name}</h4>
              <ul className="mt-2 space-y-1">
                {p.items.map(item => (
                  <li key={item} className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span className={`w-1 h-1 rounded-full ${p.active ? 'bg-wtg-secondary' : 'bg-gray-300'}`} />
                    {item}
                  </li>
                ))}
              </ul>
              {p.active && (
                <div className="mt-3">
                  <div className="h-1.5 bg-white rounded-full overflow-hidden">
                    <div className="h-full bg-wtg-secondary rounded-full" style={{ width: `${p.pct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{p.pct}% complete</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Database} label="Enterprise Tables" value={totalEnterprise.toLocaleString()}
          subtitle={`Across ${schemas.length} schema${schemas.length !== 1 ? 's' : ''}`} color="blue" onClick={() => navigate('/tables')}
        />
        <StatCard
          icon={Users} label="Ownership Assigned" value={summary.assignedPrimary}
          subtitle={`of ${summary.totalTables} tracked`} color="green" onClick={() => navigate('/ownership')}
        />
        <StatCard
          icon={AlertTriangle} label="High Crit. Unowned" value={highCritUnowned}
          subtitle="Needs immediate attention" color="red"
        />
        <StatCard
          icon={Clock} label="Stale Assignments" value={summary.stale}
          subtitle="Confirmation overdue" color="amber"
        />
      </div>

      {/* Coverage + Criticality row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <OwnershipBar summary={summary} />

          {/* Domain Quick View */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Domains Overview</h3>
              <button onClick={() => navigate('/domains')} className="text-xs text-wtg-secondary font-medium hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {domains.slice(0, 3).map(dg => (
                <div
                  key={dg.name}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate('/domains')}
                >
                  <div className="w-9 h-9 rounded-lg bg-wtg-primary/5 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-wtg-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{dg.name}</p>
                      <span className="text-xs text-gray-400">{dg.tableCount} tables</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${dg.ownershipCoverage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 w-8 text-right">{dg.ownershipCoverage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <CriticalityBreakdown summary={summary} />
          <RecentActivity />
        </div>
      </div>

    </div>
  )
}
