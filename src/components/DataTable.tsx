import { useState, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type Row,
} from '@tanstack/react-table'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Eye, X } from 'lucide-react'
import { TableActions, type TableActionsProps } from './TableActions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DataTableProps<T extends object> {
  data: T[]
  /** Column definitions — build these with createColumnHelper or plain ColumnDef objects. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[]
  /** Derive a stable string key per row. Defaults to row index. */
  getRowId?: (row: T, index: number) => string
  /** Called when a data row is clicked. Adds cursor-pointer. */
  onRowClick?: (row: T) => void
  /** Additional CSS classes for a row (e.g. highlight a selected item). */
  rowClassName?: (row: T) => string
  /** Renders an expanded sub-row beneath the data row when the row is clicked. */
  renderSubRow?: (row: T) => React.ReactNode
  /**
   * When set (or changed), DataTable will ensure this row ID is expanded.
   * Used to auto-open a newly created row without lifting all expansion state.
   */
  expandRowId?: string | null
  placeholder?: string
  /**
   * Total before any external pre-filtering — shown as "X of N rows".
   * Omit (or pass `data.length`) to show just "X rows".
   */
  totalCount?: number
  /** Extra controls rendered after the search bar (filter chips, lookups, etc.). */
  toolbar?: React.ReactNode
  /** If provided, renders a TableActions export/import button. */
  actions?: Omit<TableActionsProps, 'compact'>
  /** Message shown when the table is empty after all filtering. */
  emptyMessage?: string
  /** Minimum table pixel width (for horizontal scroll on narrow screens). */
  minWidth?: number
  /** Columns hidden by default. Users can re-show them via the Columns menu. */
  defaultColumnVisibility?: VisibilityState
}

export function DataTable<T extends object>({
  data,
  columns,
  getRowId,
  onRowClick,
  rowClassName,
  renderSubRow,
  expandRowId,
  placeholder = 'Search…',
  totalCount,
  toolbar,
  actions,
  emptyMessage = 'No rows match your filters.',
  minWidth,
  defaultColumnVisibility = {},
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultColumnVisibility)
  const [showColMenu, setShowColMenu] = useState(false)
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set())

  // Auto-expand a row whenever the caller signals a new one (e.g. after creation)
  useEffect(() => {
    if (expandRowId != null) {
      setExpandedRowIds(prev => new Set([...prev, expandRowId]))
    }
  }, [expandRowId])

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  function handleRowClick(row: Row<T>) {
    if (renderSubRow) {
      setExpandedRowIds(prev => {
        const next = new Set(prev)
        if (next.has(row.id)) next.delete(row.id)
        else next.add(row.id)
        return next
      })
    }
    onRowClick?.(row.original)
  }

  const hidableColumns = table.getAllLeafColumns().filter(c => c.getCanHide())
  const filteredRows = table.getFilteredRowModel().rows
  const rowCount = filteredRows.length
  const outerCount = totalCount ?? data.length
  const isFiltered = globalFilter !== '' || rowCount < data.length

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Global search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={placeholder}
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-wtg-border rounded-lg focus:outline-none focus:ring-2 focus:ring-wtg-blue/20"
          />
          {globalFilter && (
            <button onClick={() => setGlobalFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Caller-supplied filter controls */}
        {toolbar}

        {/* Column visibility */}
        {hidableColumns.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowColMenu(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-white text-gray-600 border-wtg-border hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Columns
            </button>
            {showColMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-wtg-border rounded-lg shadow-lg p-1.5 z-20">
                  {hidableColumns.map(col => (
                    <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                        className="rounded accent-wtg-navy"
                      />
                      <span className="text-xs text-gray-700">
                        {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Export / import */}
        {actions && <TableActions {...actions} />}

        {/* Row count */}
        <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
          {rowCount === outerCount ? rowCount : `${rowCount} of ${outerCount}`}
          {' '}row{rowCount !== 1 ? 's' : ''}
          {isFiltered && rowCount < outerCount ? ' · filtered' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={minWidth ? { minWidth } : undefined}>
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-wtg-border bg-gray-50/80">
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      className="text-left px-4 py-2.5 table-header select-none"
                      style={header.column.getSize() !== 150 ? { width: header.getSize() } : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-1 ${
                            header.column.getCanSort() ? 'cursor-pointer hover:text-gray-800' : ''
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="flex-shrink-0">
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
              {filteredRows.map(row => {
                const isExpanded = expandedRowIds.has(row.id)
                const extra = rowClassName?.(row.original) ?? ''
                const clickable = !!(onRowClick || renderSubRow)
                return (
                  <>
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className={`border-b border-wtg-border/30 transition-colors
                        ${clickable ? 'cursor-pointer hover:bg-blue-50/20' : ''}
                        ${extra}`}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-3 text-gray-700">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {renderSubRow && isExpanded && (
                      <tr key={`${row.id}-sub`} className="border-b border-wtg-border/30 bg-gray-50/40">
                        <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-0">
                          {renderSubRow(row.original)}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={table.getVisibleLeafColumns().length} className="px-5 py-10 text-center text-sm text-gray-400">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
