import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Filter, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { api } from '../lib/api'
import { StringLookup } from '../components/Lookup'
import type { OwnershipStatus, TableRecord } from '../types'
import type { ColSpec } from '../lib/exportTable'
import { useNameDisplay } from '../contexts/NameDisplay'
import { DataTable } from '../components/DataTable'

function CritBadge({ crit }: { crit: string | null }) {
  if (crit === 'H') return <span className="badge-high">High</span>
  if (crit === 'M') return <span className="badge-medium">Medium</span>
  if (crit === 'L') return <span className="badge-low">Low</span>
  return <span className="badge-unassigned">Unset</span>
}

function StatusBadge({ table }: { table: TableRecord }) {
  if (table.isStale) return <span className="badge bg-red-50 text-red-600 ring-1 ring-inset ring-red-200"><AlertTriangle className="w-3 h-3 mr-0.5" /> Stale</span>
  if (table.primaryOwner && table.devTeamOwner) return <span className="badge bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200"><CheckCircle2 className="w-3 h-3 mr-0.5" /> Assigned</span>
  if (table.primaryOwner || table.devTeamOwner) return <span className="badge bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200"><Clock className="w-3 h-3 mr-0.5" /> Partial</span>
  return <span className="badge bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200">Unassigned</span>
}

function getStatus(t: TableRecord): OwnershipStatus {
  if (t.isStale) return 'stale'
  if (t.primaryOwner && t.devTeamOwner) return 'assigned'
  if (t.primaryOwner || t.devTeamOwner) return 'partial'
  return 'unassigned'
}

const STATUS_ORDER: Record<OwnershipStatus, number> = { unassigned: 0, stale: 1, partial: 2, assigned: 3 }
const CRIT_ORDER: Record<string, number> = { H: 0, M: 1, L: 2, unset: 3 }

const ownershipExportCols: ColSpec<TableRecord>[] = [
  { kind: 'dual',   label: 'Table',           getDb: t => t.tableName,        getProduct: t => t.productName },
  { kind: 'single', label: 'Domain',          get: t => t.domain },
  { kind: 'single', label: 'Subdomain',       get: t => t.subdomain },
  { kind: 'single', label: 'Criticality',     get: t => t.criticality },
  { kind: 'single', label: 'Status',          get: t => getStatus(t) },
  { kind: 'single', label: 'Primary Owner',   get: t => t.primaryOwner },
  { kind: 'single', label: 'Secondary Owner', get: t => t.secondaryOwner },
  { kind: 'single', label: 'Dev Team',        get: t => t.devTeamOwner },
  { kind: 'single', label: 'Last Confirmed',  get: t => t.lastConfirmedDate },
]

export default function OwnershipRegistry() {
  const navigate = useNavigate()
  const { displayTable } = useNameDisplay()
  const [tables, setTables] = useState<TableRecord[]>([])
  const [statusFilter, setStatusFilter] = useState<OwnershipStatus | 'all'>('all')
  const [critFilter, setCritFilter] = useState<string>('all')
  const [domainFilter, setDomainFilter] = useState<string>('all')

  useEffect(() => {
    api.getTables().then(setTables).catch(console.error)
  }, [])

  const domains = useMemo(() => [...new Set(tables.map(t => t.domain))].sort(), [tables])

  // DataTable handles text search; we only pre-filter by status/crit/domain facets
  const filtered = useMemo(() => tables.filter(t => {
    if (statusFilter !== 'all' && getStatus(t) !== statusFilter) return false
    if (critFilter !== 'all' && (t.criticality || 'unset') !== critFilter) return false
    if (domainFilter !== 'all' && t.domain !== domainFilter) return false
    return true
  }), [tables, statusFilter, critFilter, domainFilter])

  const columns = useMemo<ColumnDef<TableRecord>[]>(() => [
    {
      id: 'tableName',
      accessorKey: 'tableName',
      header: 'Table',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-gray-900">
          {displayTable(row.original.tableName, row.original.productName)}
        </span>
      ),
    },
    {
      id: 'domain',
      accessorKey: 'domain',
      header: 'Domain',
      cell: ({ getValue }) => <span className="text-xs text-gray-500">{getValue() as string}</span>,
    },
    {
      id: 'status',
      accessorFn: row => getStatus(row),
      header: 'Status',
      cell: ({ row }) => <StatusBadge table={row.original} />,
      sortingFn: (a, b) => (STATUS_ORDER[getStatus(a.original)] ?? 9) - (STATUS_ORDER[getStatus(b.original)] ?? 9),
      size: 110,
    },
    {
      id: 'criticality',
      accessorKey: 'criticality',
      header: 'Criticality',
      cell: ({ getValue }) => <CritBadge crit={getValue() as string | null} />,
      sortingFn: (a, b) => (CRIT_ORDER[a.original.criticality ?? 'unset'] ?? 9) - (CRIT_ORDER[b.original.criticality ?? 'unset'] ?? 9),
      size: 100,
    },
    {
      id: 'primaryOwner',
      accessorKey: 'primaryOwner',
      header: 'Primary Owner',
      cell: ({ getValue }) => {
        const owner = getValue() as string | null
        if (!owner) return <span className="text-gray-300 italic text-xs">—</span>
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-wtg-primary text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0">
              {owner.split(' ').map(n => n[0]).join('')}
            </div>
            <span className="text-xs text-gray-700 truncate">{owner}</span>
          </div>
        )
      },
    },
    {
      id: 'devTeamOwner',
      accessorKey: 'devTeamOwner',
      header: 'Dev Team',
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        return v ? <span className="text-xs text-gray-700">{v}</span> : <span className="text-gray-300 italic text-xs">—</span>
      },
    },
    {
      id: 'lastConfirmedDate',
      accessorKey: 'lastConfirmedDate',
      header: 'Confirmed',
      cell: ({ getValue }) => {
        const d = getValue() as string | null
        return d ? <span className="text-xs text-gray-400">{d}</span> : <span className="text-gray-300 text-xs">—</span>
      },
      size: 110,
    },
  ], [displayTable])

  const stats = useMemo(() => {
    const total = tables.length
    const assigned = tables.filter(t => getStatus(t) === 'assigned').length
    const partial = tables.filter(t => getStatus(t) === 'partial').length
    const unassigned = tables.filter(t => getStatus(t) === 'unassigned').length
    const stale = tables.filter(t => getStatus(t) === 'stale').length
    return { total, assigned, partial, unassigned, stale }
  }, [tables])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ownership Registry</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage data ownership assignments across {stats.total} tracked tables.
            Governed by the Productivity Team.
          </p>
        </div>
        {/* Export is in the DataTable toolbar below */}
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Fully Assigned', count: stats.assigned, color: 'bg-emerald-500', filter: 'assigned' as const },
          { label: 'Partial', count: stats.partial, color: 'bg-amber-400', filter: 'partial' as const },
          { label: 'Unassigned', count: stats.unassigned, color: 'bg-gray-300', filter: 'unassigned' as const },
          { label: 'Stale', count: stats.stale, color: 'bg-red-500', filter: 'stale' as const },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setStatusFilter(statusFilter === s.filter ? 'all' : s.filter)}
            className={`card p-4 text-left transition-all ${statusFilter === s.filter ? 'ring-2 ring-wtg-secondary shadow-md' : 'hover:shadow-sm'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              <span className="text-xs font-medium text-gray-500">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.count}</p>
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={t => t.tableName}
        onRowClick={t => navigate(`/table/${t.tableName}`)}
        placeholder="Search tables, owners, teams…"
        totalCount={tables.length}
        toolbar={
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <div className="w-36">
              <StringLookup
                value={critFilter === 'all' ? null : critFilter}
                onChange={v => setCritFilter(v ?? 'all')}
                items={['H', 'M', 'L', 'unset']}
                placeholder="All Criticality"
              />
            </div>
            <div className="w-40">
              <StringLookup
                value={domainFilter === 'all' ? null : domainFilter}
                onChange={v => setDomainFilter(v ?? 'all')}
                items={domains}
                placeholder="All Domains"
              />
            </div>
          </div>
        }
        actions={{
          filename: 'ownership-registry',
          sheets: [{ name: 'Ownership', columns: ownershipExportCols, data: filtered }],
          csvSheet: { columns: ownershipExportCols, data: filtered },
        }}
        emptyMessage="No tables match your filters."
      />
    </div>
  )
}
