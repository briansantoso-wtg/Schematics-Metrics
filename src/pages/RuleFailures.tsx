import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table'
import {
  AlertTriangle, CheckCircle2, Clock, Search,
  UserPlus, X, RefreshCw, Loader2, Lock, ChevronUp, ChevronDown,
  ChevronsUpDown, Code2,
} from 'lucide-react'
import { TableActions } from '../components/TableActions'
import { BackButton } from '../components/BackButton'
import type { PersistedRule as DataRule } from '../lib/ruleModels'
import { useConnection } from '../contexts/Connection'
import { api } from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type FailureStatus = 'new' | 'acknowledged' | 'assigned' | 'resolved'

interface RuleResult {
  ruleId: string
  columns: string[]
  rows: Record<string, unknown>[]
  sql: string
  cachedAt: string
  stale: boolean
}

// ─── Status config ─────────────────────────────────────────────────────────────

const statusConfig: Record<FailureStatus, { label: string; color: string }> = {
  new:          { label: 'New',          color: 'bg-red-50 text-red-600 ring-red-200' },
  acknowledged: { label: 'Acknowledged', color: 'bg-blue-50 text-blue-600 ring-blue-200' },
  assigned:     { label: 'Assigned',     color: 'bg-purple-50 text-purple-600 ring-purple-200' },
  resolved:     { label: 'Resolved',     color: 'bg-emerald-50 text-emerald-600 ring-emerald-200' },
}

function StatusChip({ status }: { status: FailureStatus }) {
  const cfg = statusConfig[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function SeverityDot({ severity }: { severity: 'H' | 'M' | 'L' }) {
  const color = severity === 'H' ? 'bg-red-500' : severity === 'M' ? 'bg-amber-400' : 'bg-green-500'
  const label = severity === 'H' ? 'High' : severity === 'M' ? 'Medium' : 'Low'
  return (
    <span className="flex items-center gap-1.5 text-sm text-gray-600">
      <span className={`w-2 h-2 rounded-full ${color}`} />{label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RuleFailures() {
  const { ruleId } = useParams<{ ruleId: string }>()
  const navigate = useNavigate()
  const { credentials, isConnected } = useConnection()

  const [rule, setRule] = useState<DataRule | null>(null)

  // Live query state
  const [result, setResult] = useState<RuleResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSql, setShowSql] = useState(false)
  const revalidatingRef = useRef(false)

  // Workflow state — tracks status per row index
  const [statuses, setStatuses] = useState<Record<string, FailureStatus>>({})

  // Table UI state
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<FailureStatus | 'all'>('all')

  useEffect(() => {
    if (!ruleId) return
    api.getRule(ruleId).then(setRule).catch(() => setRule(null))
    loadCached()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleId])

  useEffect(() => {
    if (!isConnected || !rule) return
    if (!result) runQuery()
    else if (result.stale) revalidateInBackground()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, credentials, ruleId])

  async function loadCached() {
    setError(null)
    try {
      const res = await fetch(`/api/rule-result/${ruleId}`)
      if (res.status === 204) { setResult(null); return }
      if (res.ok) {
        const data = await res.json() as RuleResult
        setResult(data)
        setStatuses({})
        if (data.stale && isConnected) revalidateInBackground()
      }
    } catch { /* not fatal */ }
  }

  async function runQuery() {
    if (!rule) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/rule-result/${ruleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: rule.sqlExpression, ...(credentials ? { credentials } : {}) }),
      })
      const data = await res.json() as RuleResult & { error?: string }
      if (!res.ok) setError(data.error ?? 'Unknown error')
      else { setResult(data); setStatuses({}) }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  async function revalidateInBackground() {
    if (revalidatingRef.current || !rule) return
    revalidatingRef.current = true
    try {
      const res = await fetch(`/api/rule-result/${ruleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: rule.sqlExpression, ...(credentials ? { credentials } : {}) }),
      })
      if (res.ok) { setResult(await res.json() as RuleResult); setStatuses({}) }
    } catch { /* silent */ } finally {
      revalidatingRef.current = false
    }
  }

  type EnrichedRow = { __rowKey: string; __status: FailureStatus; [key: string]: unknown }

  // Build row data: result rows enriched with row-index key and workflow status
  const rows = useMemo((): EnrichedRow[] => {
    if (!result) return []
    return result.rows.map((row, i) => ({
      __rowKey: String(i),
      __status: (statuses[String(i)] ?? 'new') as FailureStatus,
      ...row,
    }))
  }, [result, statuses])

  // Filter by status chip + global search
  const filteredRows = useMemo(() => rows.filter(row => {
    if (statusFilter !== 'all' && row.__status !== statusFilter) return false
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      return result?.columns.some(col => String(row[col] ?? '').toLowerCase().includes(q)) ?? false
    }
    return true
  }), [rows, statusFilter, globalFilter, result?.columns])

  // Build TanStack column defs
  const columnDefs = useMemo<ColumnDef<EnrichedRow>[]>(() => {
    if (!result?.columns.length) return []
    const checkCol: ColumnDef<EnrichedRow> = {
      id: '__select__',
      header: ({ table: t }) => (
        <input type="checkbox"
          checked={t.getIsAllPageRowsSelected()}
          ref={el => { if (el) el.indeterminate = t.getIsSomeRowsSelected() }}
          onChange={t.getToggleAllPageRowsSelectedHandler()}
          className="rounded border-gray-300 text-wtg-secondary focus:ring-wtg-secondary"
        />
      ),
      cell: ({ row }) => (
        <input type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="rounded border-gray-300 text-wtg-secondary focus:ring-wtg-secondary"
          onClick={e => e.stopPropagation()}
        />
      ),
      size: 40,
      enableSorting: false,
    }
    const dataCols: ColumnDef<EnrichedRow>[] = result.columns.map(col => ({
      id: col,
      accessorKey: col,
      header: col,
      cell: ({ getValue }) => {
        const v = getValue()
        if (v === null || v === undefined) return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-500 ring-1 ring-inset ring-red-200">
            <AlertTriangle className="w-2.5 h-2.5" /> null
          </span>
        )
        return <span className="font-mono text-xs text-gray-700">{String(v)}</span>
      },
    }))
    const statusCol: ColumnDef<EnrichedRow> = {
      id: '__status__',
      header: 'Status',
      accessorFn: row => row.__status,
      cell: ({ row }) => <StatusChip status={row.original.__status} />,
      enableSorting: false,
    }
    const timeCol: ColumnDef<EnrichedRow> = {
      id: '__time__',
      header: 'Detected',
      cell: () => result?.cachedAt ? (
        <span className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(new Date(result.cachedAt))}
        </span>
      ) : null,
      enableSorting: false,
    }
    return [checkCol, ...dataCols, statusCol, timeCol]
  }, [result])

  const table = useReactTable({
    data: filteredRows,
    columns: columnDefs,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: row => row.__rowKey,
  })

  const selectedKeys = Object.keys(rowSelection).filter(k => rowSelection[k])

  function bulkSetStatus(status: FailureStatus) {
    setStatuses(prev => {
      const next = { ...prev }
      selectedKeys.forEach(k => { next[k] = status })
      return next
    })
    setRowSelection({})
  }

  // Status counts
  const counts = useMemo(() => ({
    new:          rows.filter(r => r.__status === 'new').length,
    acknowledged: rows.filter(r => r.__status === 'acknowledged').length,
    assigned:     rows.filter(r => r.__status === 'assigned').length,
    resolved:     rows.filter(r => r.__status === 'resolved').length,
  }), [rows])

  const failCount = result?.rows.length ?? rule?.failCount ?? 0
  const lastRun = result?.cachedAt ? new Date(result.cachedAt) : null
  const isRevalidating = revalidatingRef.current

  if (!rule) {
    return (
      <div className="max-w-7xl mx-auto">
        <BackButton label="Back to Data Rules" onClick={() => navigate('/rules')} />
        <div className="card p-12 text-center text-gray-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Rule not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Back nav */}
      <BackButton label="Back to Rule" onClick={() => navigate(`/rules/${ruleId}`)} />

      {/* Rule context bar */}
      <div className="card p-5 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {rule.table}{rule.field ? `.${rule.field}` : ''}
            </span>
            <SeverityDot severity={rule.severity} />
          </div>
          <h1 className="text-lg font-bold text-gray-900">{rule.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rule.description}</p>
        </div>
        <div className="flex items-center gap-5 flex-shrink-0">
          {rule.passRate !== null && (
            <div className="text-right">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Pass Rate</p>
              <p className={`text-2xl font-bold ${rule.passRate >= 95 ? 'text-emerald-600' : rule.passRate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                {rule.passRate}%
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Failing</p>
            <p className="text-2xl font-bold text-red-600">{loading ? '—' : failCount}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Last Run</p>
            {lastRun ? (
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatRelativeTime(lastRun)}
                {result?.stale && !isRevalidating && <span className="ml-1 text-xs text-gray-400">(stale)</span>}
                {isRevalidating && <Loader2 className="w-3 h-3 animate-spin ml-1 text-gray-400" />}
              </p>
            ) : (
              <p className="text-sm text-gray-400">Never run</p>
            )}
          </div>
          <button
            onClick={() => runQuery()}
            disabled={loading || !isConnected}
            className="btn-secondary text-xs py-1.5 disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {loading ? 'Running…' : 'Run Now'}
          </button>
        </div>
      </div>

      {/* Not connected + no cache */}
      {!isConnected && !result && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            <Link to="/connection" className="font-semibold underline underline-offset-2 hover:text-amber-900">Sign in</Link>
            {' '}to run this query and see failing records.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Query failed</p>
            <p className="text-xs text-red-700 font-mono mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* SQL toggle */}
      {result && (
        <div>
          <button
            onClick={() => setShowSql(v => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" />
            {showSql ? 'Hide' : 'Show'} query
            {showSql ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showSql && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-950 px-4 py-3 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre">{result.sql}</pre>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-500 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Running rule query…</span>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Status summary tiles */}
          <div className="grid grid-cols-4 gap-3">
            {(Object.entries(counts) as [FailureStatus, number][]).map(([status, count]) => {
              const cfg = statusConfig[status]
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                  className={`card p-4 text-left transition-all hover:shadow-md ${statusFilter === status ? 'ring-2 ring-wtg-secondary' : ''}`}
                >
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{cfg.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${status === 'new' ? 'bg-red-400' : status === 'acknowledged' ? 'bg-blue-400' : status === 'assigned' ? 'bg-purple-400' : 'bg-emerald-400'}`}
                      style={{ width: rows.length > 0 ? `${(count / rows.length) * 100}%` : '0%' }}
                    />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search records…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-wtg-border rounded-lg focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20 focus:border-wtg-secondary-light"
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
              />
            </div>
            {statusFilter !== 'all' && (
              <button onClick={() => setStatusFilter('all')} className="flex items-center gap-1.5 px-3 py-2 text-xs border border-wtg-border rounded-lg text-gray-500 hover:bg-gray-50">
                <X className="w-3.5 h-3.5" /> Clear filter
              </button>
            )}
            <div className="flex-1" />
            {selectedKeys.length > 0 ? (
              <div className="flex items-center gap-2 bg-wtg-primary/5 border border-wtg-border rounded-lg px-3 py-1.5">
                <span className="text-xs font-semibold text-gray-700">{selectedKeys.length} selected</span>
                <div className="w-px h-4 bg-gray-300" />
                <button onClick={() => bulkSetStatus('acknowledged')} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Acknowledge</button>
                <button onClick={() => bulkSetStatus('assigned')} className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"><UserPlus className="w-3 h-3" />Assign</button>
                <button onClick={() => bulkSetStatus('resolved')} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Resolve</button>
                <button onClick={() => setRowSelection({})} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <TableActions
                filename={`rule-failures-${ruleId}`}
                sheets={[{
                  name: 'Failures',
                  columns: [
                    { kind: 'single', label: 'Status', get: (r: EnrichedRow) => r.__status },
                    ...(result?.columns ?? []).map(col => ({
                      kind: 'single' as const,
                      label: col,
                      get: (r: EnrichedRow) => String(r[col] ?? ''),
                    })),
                  ],
                  data: filteredRows,
                }]}
              />
            )}
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id} className="border-b border-wtg-border bg-gray-50/80">
                      {hg.headers.map(header => (
                        <th
                          key={header.id}
                          className={`text-left px-4 py-2.5 table-header select-none ${header.column.id === '__select__' ? 'w-10' : ''}`}
                        >
                          {header.column.id === '__select__' || header.column.id === '__status__' || header.column.id === '__time__' ? (
                            flexRender(header.column.columnDef.header, header.getContext())
                          ) : (
                            <div
                              className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer hover:text-gray-800' : ''}`}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && (
                                <span>
                                  {header.column.getIsSorted() === 'asc'
                                    ? <ChevronUp className="w-3 h-3 text-wtg-blue" />
                                    : header.column.getIsSorted() === 'desc'
                                      ? <ChevronDown className="w-3 h-3 text-wtg-blue" />
                                      : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
                                </span>
                              )}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 && (
                    <tr>
                      <td colSpan={columnDefs.length} className="px-5 py-12 text-center text-sm text-gray-400">
                        {globalFilter || statusFilter !== 'all' ? 'No records match your filters.' : 'No failing records — rule is passing.'}
                      </td>
                    </tr>
                  )}
                  {table.getRowModel().rows.map(row => (
                    <tr
                      key={row.id}
                      className={`border-b border-wtg-border/30 transition-colors cursor-pointer ${
                        row.getIsSelected() ? 'bg-wtg-secondary/5' : 'hover:bg-gray-50/60'
                      }`}
                      onClick={row.getToggleSelectedHandler()}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className={`px-4 py-3 ${cell.column.id === '__select__' ? 'w-10' : 'whitespace-nowrap max-w-xs truncate'}`}
                          title={cell.column.id.startsWith('__') ? undefined : String(cell.getValue() ?? '')}
                          onClick={cell.column.id === '__select__' ? e => e.stopPropagation() : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-wtg-border bg-gray-50/50 flex items-center justify-between text-xs text-gray-400">
              <span>
                {table.getRowModel().rows.length} of {rows.length} records
                {statusFilter !== 'all' && ` · filtered to ${statusConfig[statusFilter].label}`}
              </span>
              {result.stale && (
                <span className="text-amber-500">Results may be stale — run now to refresh</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}
