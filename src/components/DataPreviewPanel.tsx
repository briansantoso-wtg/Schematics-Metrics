import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
  Database, EyeOff, AlertTriangle, Loader2, Lock,
  Code2, ChevronDown, ChevronUp, RefreshCw, Clock, ChevronsUpDown, X,
} from 'lucide-react'
import { useConnection } from '../contexts/Connection'

interface CachedPreview {
  columns: string[]
  rows: Record<string, unknown>[]
  sql: string
  hiddenCount: number
  blocked: boolean
  reason?: string
  cachedAt: string
  stale: boolean
}

interface DataPreviewPanelProps {
  tableName: string
  showSqlToggle?: boolean
  selectable?: boolean
}

export default function DataPreviewPanel({ tableName, showSqlToggle = true, selectable = false }: DataPreviewPanelProps) {
  const { credentials, isConnected } = useConnection()
  const [data, setData] = useState<CachedPreview | null>(null)
  const [loadingFresh, setLoadingFresh] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSql, setShowSql] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const revalidatingRef = useRef(false)

  useEffect(() => {
    loadPreview()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName])

  useEffect(() => {
    if (!isConnected) return
    if (!data) {
      runFresh()
    } else if (data.stale) {
      revalidateInBackground()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, credentials, tableName])

  async function loadPreview() {
    setError(null)
    setShowSql(false)
    setSorting([])
    setRowSelection({})
    try {
      const res = await fetch(`/api/preview/${encodeURIComponent(tableName)}`)
      if (res.status === 204) { setData(null); return }
      if (res.ok) {
        const cached = await res.json() as CachedPreview
        setData(cached)
        if (cached.stale && isConnected) {
          revalidateInBackground()
        }
      }
    } catch { /* not fatal */ }
  }

  async function revalidateInBackground() {
    if (revalidatingRef.current) return
    revalidatingRef.current = true
    try {
      const res = await fetch(`/api/preview/${encodeURIComponent(tableName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials ? { credentials } : {}),
      })
      if (res.ok) setData(await res.json() as CachedPreview)
    } catch { /* silent */ } finally {
      revalidatingRef.current = false
    }
  }

  async function runFresh() {
    setLoadingFresh(true)
    setError(null)
    try {
      const res = await fetch(`/api/preview/${encodeURIComponent(tableName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials ? { credentials } : {}),
      })
      const result = await res.json() as CachedPreview & { error?: string }
      if (!res.ok) setError(result.error ?? 'Unknown error')
      else setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoadingFresh(false)
    }
  }

  // Build TanStack column defs dynamically from column names
  const columnDefs = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!data?.columns.length) return []
    const dataCols: ColumnDef<Record<string, unknown>>[] = data.columns.map(col => ({
      id: col,
      accessorKey: col,
      header: col,
      cell: ({ getValue }) => {
        const v = getValue()
        if (v === null || v === undefined) return <span className="text-gray-300 italic text-xs">NULL</span>
        return <span className="font-mono text-xs">{String(v)}</span>
      },
    }))
    if (!selectable) return dataCols
    const selectCol: ColumnDef<Record<string, unknown>> = {
      id: '__select__',
      header: ({ table: t }) => (
        <input
          type="checkbox"
          checked={t.getIsAllPageRowsSelected()}
          ref={el => { if (el) el.indeterminate = t.getIsSomeRowsSelected() }}
          onChange={t.getToggleAllPageRowsSelectedHandler()}
          className="rounded border-gray-300 text-wtg-secondary focus:ring-wtg-secondary"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="rounded border-gray-300 text-wtg-secondary focus:ring-wtg-secondary"
        />
      ),
      size: 40,
      enableSorting: false,
    }
    return [selectCol, ...dataCols]
  }, [data?.columns, selectable])

  const table = useReactTable({
    data: data?.rows ?? [],
    columns: columnDefs,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: selectable,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const selectedCount = Object.keys(rowSelection).length

  const lastRun = data?.cachedAt ? new Date(data.cachedAt) : null
  const isRevalidating = revalidatingRef.current

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-500">
          {loadingFresh ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Running query…</span>
            </>
          ) : data && !data.blocked ? (
            <>
              <Database className="w-3.5 h-3.5" />
              <span>
                <span className="font-semibold text-gray-700">{data.rows.length}</span> rows
              </span>
{data.stale && !isRevalidating && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-xs">Stale</span>
              )}
              {isRevalidating && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" /> Refreshing…
                </span>
              )}
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(lastRun)}
            </span>
          )}
          {showSqlToggle && data && !data.blocked && (
            <button
              onClick={() => setShowSql(v => !v)}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              {showSql ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          {isConnected && (
            <button
              onClick={() => runFresh()}
              disabled={loadingFresh}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loadingFresh ? 'animate-spin' : ''}`} />
              Run now
            </button>
          )}
        </div>
      </div>

      {/* Selection toolbar */}
      {selectable && selectedCount > 0 && (
        <div className="flex items-center gap-2 bg-wtg-primary/5 border border-wtg-border rounded-lg px-3 py-1.5">
          <span className="text-xs font-semibold text-gray-700">{selectedCount} row{selectedCount !== 1 ? 's' : ''} selected</span>
          <div className="w-px h-4 bg-gray-300" />
          <button
            onClick={() => {
              const rows = table.getSelectedRowModel().rows.map(r => r.original)
              const header = data?.columns.join('\t') ?? ''
              const body = rows.map(r => data?.columns.map(c => String(r[c] ?? '')).join('\t')).join('\n')
              navigator.clipboard.writeText(header + '\n' + body)
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Copy as TSV
          </button>
          <button onClick={() => setRowSelection({})} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Not connected + no cache */}
      {!isConnected && !data && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            <Link to="/connection" className="font-medium underline underline-offset-2 hover:text-amber-900">Sign in</Link>
            {' '}to load a live preview.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Query failed</p>
            <p className="text-xs text-red-700 font-mono mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Blocked */}
      {data?.blocked && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 flex flex-col items-center gap-2 text-center">
          <EyeOff className="w-6 h-6 text-gray-300" />
          <p className="text-sm text-gray-500">{data.reason}</p>
        </div>
      )}

      {/* SQL */}
      {showSql && data?.sql && (
        <div className="rounded-lg border border-gray-200 bg-gray-950 px-4 py-3 overflow-x-auto">
          <pre className="text-xs text-green-400 font-mono whitespace-pre">{data.sql}</pre>
        </div>
      )}

      {/* Results table */}
      {data && !data.blocked && columnDefs.length > 0 && (
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
                        style={header.column.id !== '__select__' ? { width: header.getSize() } : undefined}
                      >
                        {header.column.id === '__select__' ? (
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
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className={`border-b border-wtg-border/30 transition-colors ${row.getIsSelected() ? 'bg-wtg-secondary/5' : 'hover:bg-blue-50/20'}`}
                    onClick={selectable ? row.getToggleSelectedHandler() : undefined}
                    style={selectable ? { cursor: 'pointer' } : undefined}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className={`px-4 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate ${cell.column.id === '__select__' ? 'w-10' : ''}`}
                        title={cell.column.id !== '__select__' ? String(cell.getValue() ?? '') : undefined}
                        onClick={cell.column.id === '__select__' ? e => e.stopPropagation() : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan={columnDefs.length} className="px-4 py-8 text-center text-gray-400 text-xs">
                      No rows returned
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
