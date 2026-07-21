import { useState, useMemo, useRef, useEffect, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useReactTable,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
} from '@tanstack/react-table'
import type {
  SortingState,
  ColumnFiltersState,
  GroupingState,
  ExpandedState,
  VisibilityState,
  ColumnOrderState,
  Table,
} from '@tanstack/react-table'
import {
  Search, ChevronUp, ChevronDown, ChevronRight,
  ChevronsUpDown, Eye, Filter, X, Pencil, Layers,
  ExternalLink, Calendar, ListChecks, BookOpen,
} from 'lucide-react'
import { ContextMenu, type ContextMenuState } from '../components/ContextMenu'
import { CreateRulePanel, type Severity as RuleSeverity } from '../components/CreateRulePanel'
import { api } from '../lib/api'
import type { DomainGroup, StaffRecord, TableRecord, TableType } from '../types'
import { useNameDisplay } from '../contexts/NameDisplay'
import { TableActions } from '../components/TableActions'
import type { ColSpec, ImportColSpec } from '../lib/exportTable'
import { HoverShortcut, StringLookup } from '../components/Lookup'
import { EditableCell } from '../components/EditableCell'
import { EditableCriticalityPill } from '../components/CriticalityPill'
import { DomainLookup } from '../components/DomainLookup'
import { OwnerLookup } from '../components/OwnerLookup'

// ─── Editable cell primitives ─────────────────────────────────────────────────

// Ordered list of lookup-based editable column IDs, used for Tab navigation
const LOOKUP_COLS = ['domain', 'primaryOwner', 'devTeamOwner', 'secondaryOwner'] as const

function navDown(rowId: string, colId: string) {
  const cells = Array.from(document.querySelectorAll<HTMLElement>(`[data-cell-col="${colId}"]`))
  const idx = cells.findIndex(el => el.getAttribute('data-cell-row') === rowId)
  cells[idx + 1]?.click()
}

function navRight(rowId: string, colId: string) {
  const colIdx = LOOKUP_COLS.indexOf(colId as typeof LOOKUP_COLS[number])
  const nextColId = LOOKUP_COLS[colIdx + 1]
  if (nextColId) {
    const nextCell = document.querySelector<HTMLElement>(`[data-cell-row="${rowId}"][data-cell-col="${nextColId}"]`)
    nextCell?.click()
    return !!nextCell
  }
  // Last column — wrap to first column of next row
  const colCells = Array.from(document.querySelectorAll<HTMLElement>(`[data-cell-col="${colId}"]`))
  const rowIdx = colCells.findIndex(el => el.getAttribute('data-cell-row') === rowId)
  const firstCells = Array.from(document.querySelectorAll<HTMLElement>(`[data-cell-col="${LOOKUP_COLS[0]}"]`))
  const nextRowFirstCell = firstCells[rowIdx + 1]
  nextRowFirstCell?.click()
  return !!nextRowFirstCell
}

function navLeft(rowId: string, colId: string) {
  const colIdx = LOOKUP_COLS.indexOf(colId as typeof LOOKUP_COLS[number])
  const prevColId = LOOKUP_COLS[colIdx - 1]
  if (prevColId) {
    const prevCell = document.querySelector<HTMLElement>(`[data-cell-row="${rowId}"][data-cell-col="${prevColId}"]`)
    prevCell?.click()
    return !!prevCell
  }
  // First column — wrap to last column of previous row
  const colCells = Array.from(document.querySelectorAll<HTMLElement>(`[data-cell-col="${colId}"]`))
  const rowIdx = colCells.findIndex(el => el.getAttribute('data-cell-row') === rowId)
  const lastCells = Array.from(document.querySelectorAll<HTMLElement>(`[data-cell-col="${LOOKUP_COLS[LOOKUP_COLS.length - 1]}"]`))
  const prevRowLastCell = lastCells[rowIdx - 1]
  prevRowLastCell?.click()
  return !!prevRowLastCell
}

// Cell selection helpers — key format is "colId:rowId" to enable colId prefix lookups
function cellKey(rowId: string, colId: string) { return `${colId}:${rowId}` }
function parseCellKey(key: string) {
  const sep = key.indexOf(':')
  return { colId: key.slice(0, sep), rowId: key.slice(sep + 1) }
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return !!target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [role="textbox"]')
}

function EditableLookupCell({
  value, items, onSave, onHoverSave, clearable = true, placeholder = '—',
  rowId, colId, onMoveDown, onMoveRight, onMoveLeft, isSelected, onSelect, isDraggingRef,
  editMode = true, onOpen, forceOpen, onContextMenu,
}: {
  value: string | null
  items: string[]
  onSave: (v: string | null) => void
  onHoverSave?: (v: string | null) => void
  clearable?: boolean
  placeholder?: string
  rowId: string
  colId: string
  onMoveDown?: () => void
  onMoveRight?: () => void
  onMoveLeft?: () => void
  isSelected?: boolean
  onSelect?: (e: React.MouseEvent) => void
  isDraggingRef?: { current: boolean }
  editMode?: boolean
  onOpen?: () => void
  forceOpen?: boolean
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  return (
    <EditableCell
      rowId={rowId} colId={colId}
      isSelected={isSelected} onSelect={onSelect} isDraggingRef={isDraggingRef}
      editMode={editMode} onOpen={onOpen} forceOpen={forceOpen} onContextMenu={onContextMenu}
      renderDisplay={(isHovered) => (
        <>
          {editMode && (
            <HoverShortcut<string>
              isHovering={isHovered}
              items={items}
              getLabel={s => s}
              onSelect={onHoverSave ?? onSave}
            />
          )}
          <div className="flex items-center gap-1.5 py-0.5 min-h-[22px]">
            <span className={value ? 'text-gray-700 text-xs' : 'text-gray-300 italic text-xs'}>
              {value ?? placeholder}
            </span>
            {editMode
              ? <Pencil className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />
              : <ExternalLink className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />
            }
          </div>
        </>
      )}
      renderEditor={(close) => (
        <StringLookup
          value={value}
          onChange={(v) => { onSave(v); close() }}
          items={items}
          clearable={clearable}
          autoOpen portal
          onEnterSelect={onMoveDown}
          onTabSelect={onMoveRight}
          onShiftTabSelect={onMoveLeft}
        />
      )}
    />
  )
}

function EditablePersonCell({
  value, staff, ownerCounts, onSave, onHoverSave, placeholder = 'Unassigned',
  rowId, colId, onMoveDown, onMoveRight, onMoveLeft, isSelected, onSelect, isDraggingRef,
  editMode = true, onOpen, forceOpen, onContextMenu,
}: {
  value: string | null
  staff: StaffRecord[]
  ownerCounts: Map<string, number>
  onSave: (v: string | null) => void
  onHoverSave?: (v: string | null) => void
  placeholder?: string
  rowId: string
  colId: string
  onMoveDown?: () => void
  onMoveRight?: () => void
  onMoveLeft?: () => void
  isSelected?: boolean
  onSelect?: (e: React.MouseEvent) => void
  isDraggingRef?: { current: boolean }
  editMode?: boolean
  onOpen?: () => void
  forceOpen?: boolean
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  const names = useMemo(() => staff.map(s => s.fullName), [staff])
  return (
    <EditableCell
      rowId={rowId} colId={colId}
      isSelected={isSelected} onSelect={onSelect} isDraggingRef={isDraggingRef}
      editMode={editMode} onOpen={onOpen} forceOpen={forceOpen} onContextMenu={onContextMenu}
      renderDisplay={(isHovered) => (
        <>
          {editMode && (
            <HoverShortcut<string>
              isHovering={isHovered}
              items={names}
              getLabel={s => s}
              onSelect={onHoverSave ?? onSave}
            />
          )}
          <div className="flex items-center gap-1.5 py-0.5 min-h-[22px]">
            {value ? (
              <>
                <div className="w-4 h-4 rounded-full bg-wtg-primary text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                  {value.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="text-gray-700 text-xs">{value}</span>
              </>
            ) : (
              <span className="text-gray-300 italic text-xs">{placeholder}</span>
            )}
            {editMode
              ? <Pencil className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />
              : <ExternalLink className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />
            }
          </div>
        </>
      )}
      renderEditor={(close) => (
        <OwnerLookup
          value={value}
          onChange={(v) => { onSave(v); close() }}
          staff={staff}
          ownerCounts={ownerCounts}
          autoOpen
          portal
          onEnterSelect={onMoveDown}
          onTabSelect={onMoveRight}
          onShiftTabSelect={onMoveLeft}
        />
      )}
    />
  )
}

function EditableDomainCell({
  value, items, allDomains, onSave, onHoverSave, clearable = false,
  rowId, colId, onMoveDown, onMoveRight, onMoveLeft, isSelected, onSelect, isDraggingRef,
  editMode = true, onOpen, forceOpen, onContextMenu,
}: {
  value: string | null
  items: string[]
  allDomains: DomainGroup[]
  onSave: (v: string | null) => void
  onHoverSave?: (v: string | null) => void
  clearable?: boolean
  rowId: string
  colId: string
  onMoveDown?: () => void
  onMoveRight?: () => void
  onMoveLeft?: () => void
  isSelected?: boolean
  onSelect?: (e: React.MouseEvent) => void
  isDraggingRef?: { current: boolean }
  editMode?: boolean
  onOpen?: () => void
  forceOpen?: boolean
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  return (
    <EditableCell
      rowId={rowId} colId={colId}
      isSelected={isSelected} onSelect={onSelect} isDraggingRef={isDraggingRef}
      editMode={editMode} onOpen={onOpen} forceOpen={forceOpen} onContextMenu={onContextMenu}
      renderDisplay={(isHovered) => (
        <>
          {editMode && (
            <HoverShortcut<string>
              isHovering={isHovered}
              items={items}
              getLabel={s => s}
              onSelect={onHoverSave ?? onSave}
            />
          )}
          <div className="flex items-center gap-1.5 py-0.5 min-h-[22px]">
            <span className={value ? 'text-gray-700 text-xs' : 'text-gray-300 italic text-xs'}>
              {value ?? '—'}
            </span>
            {editMode
              ? <Pencil className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />
              : <ExternalLink className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />
            }
          </div>
        </>
      )}
      renderEditor={(close) => (
        <DomainLookup
          value={value}
          onChange={(v) => { onSave(v); close() }}
          items={items}
          allDomains={allDomains}
          clearable={clearable}
          autoOpen
          portal
          onEnterSelect={onMoveDown}
          onTabSelect={onMoveRight}
          onShiftTabSelect={onMoveLeft}
        />
      )}
    />
  )
}



function EditableEnumCell({
  value, options, onSave, placeholder = '—',
}: {
  value: string | null
  options: string[]
  onSave: (v: string | null) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div
      className="group cursor-pointer rounded-sm"
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
    >
      {editing ? (
        <div
          className="-mx-4 -my-2"
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEditing(false)
          }}
        >
          <StringLookup
            value={value}
            onChange={(v) => { onSave(v); setEditing(false) }}
            items={options}
            clearable={false}
            autoOpen
            portal
          />
        </div>
      ) : (
        <div className="flex items-center gap-1.5 py-0.5 min-h-[22px]">
          <span className={value ? 'text-gray-700 text-xs' : 'text-gray-300 italic text-xs'}>
            {value ?? placeholder}
          </span>
          <Pencil className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />
        </div>
      )}
    </div>
  )
}

// ─── Health score calculation ─────────────────────────────────────────────────

const PHASE_1_FNS: Array<(r: TableRecord) => boolean> = [
  r => r.criticality !== null,
  r => !!r.domain,
  r => !!r.subdomain,
  r => !!r.primaryOwner,
  r => !!r.devTeamOwner,
  r => r.columnCount > 0,
]

function computePhase1a(row: TableRecord) {
  const total = PHASE_1_FNS.length
  const score = PHASE_1_FNS.filter(fn => fn(row)).length
  return { score, total }
}

function computePhase1b(row: TableRecord) {
  const items = [!!row.secondaryOwner]
  return { score: items.filter(Boolean).length, total: items.length }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhaseCircle({ pct, complete, total }: { pct: number; complete: number; total: number }) {
  const r = 30
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct / 100)
  const stroke = pct === 100 ? '#10b981' : pct > 0 ? '#f59e0b' : '#d1d5db'
  const textColor = pct === 100 ? 'text-emerald-600' : pct > 0 ? 'text-amber-600' : 'text-gray-300'
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[72px] h-[72px] flex items-center justify-center">
        <svg className="-rotate-90 w-full h-full" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={stroke} strokeWidth="7"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold tabular-nums ${textColor}`}>{pct}%</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 tabular-nums text-center leading-tight">
        {complete}/{total}<br />fully complete
      </p>
    </div>
  )
}

function MetricRow({ label, count, total, todo }: { label: string; count: number; total: number; todo?: boolean }) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-wtg-border/40 last:border-0">
      <span className={`text-[11px] ${todo ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[11px] tabular-nums font-semibold ${
          todo ? 'text-gray-300' : pct === 100 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-500'
        }`}>
          {count}/{total}
        </span>
        {!todo && (
          <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
            <div
              className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-400' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── HealthStats component ────────────────────────────────────────────────────

function HealthStats({ rows, collapsed, onToggle }: {
  rows: TableRecord[]
  collapsed: boolean
  onToggle: () => void
}) {
  const stats = useMemo(() => {
    const total = rows.length
    if (total === 0) return null
    const itemCounts = PHASE_1_FNS.map(fn => rows.filter(fn).length)
    const fullyComplete1 = rows.filter(r => computePhase1a(r).score === PHASE_1_FNS.length).length
    const avg1Pct = Math.round(
      rows.reduce((acc, r) => acc + computePhase1a(r).score / PHASE_1_FNS.length, 0) / total * 100
    )
    return { total, itemCounts, fullyComplete1, avg1Pct }
  }, [rows])

  const phase1Metrics = stats ? [
    { label: 'Prioritised', count: stats.itemCounts[0] },
    { label: 'Assigned Domain', count: stats.itemCounts[1] },
    { label: 'Assigned SubDomain', count: stats.itemCounts[2] },
    { label: 'Owner Nominated', count: stats.itemCounts[3] },
    { label: 'Development Team Identified', count: stats.itemCounts[4] },
    { label: 'Column Details Imported', count: stats.itemCounts[5] },
  ] : []

  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/80 hover:bg-gray-100/60 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">Table Registry Health</span>
          {stats && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              stats.avg1Pct === 100 ? 'bg-emerald-100 text-emerald-700' :
              stats.avg1Pct >= 70 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-600'
            }`}>
              {stats.avg1Pct}%
            </span>
          )}
          <span className="text-xs text-gray-400">
            EdiProd · {stats?.total ?? 0} tables
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
      </button>

      {!collapsed && stats && (
        <div className="border-t border-wtg-border">
          {/* Phases 1–3 in 3 columns */}
          <div className="grid grid-cols-3 divide-x divide-wtg-border/50">
            {/* Phase 1 — Foundation */}
            <div className="flex flex-col">
              <div className="px-5 pt-4 pb-1 text-center">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Phase 1</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">Foundation</p>
              </div>
              <div className="px-5 py-4 flex flex-col items-center gap-4">
                <PhaseCircle pct={stats.avg1Pct} complete={stats.fullyComplete1} total={stats.total} />
                <div className="w-full">
                  {phase1Metrics.map(m => (
                    <MetricRow key={m.label} label={m.label} count={m.count} total={stats.total} />
                  ))}
                </div>
              </div>
            </div>

            {/* Phase 2 — Define Data Rules */}
            <div className="flex flex-col">
              <div className="px-5 pt-4 pb-1 text-center">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Phase 2</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">Define Data Rules</p>
              </div>
              <div className="px-5 py-4 flex flex-col items-center gap-4">
                <PhaseCircle pct={0} complete={0} total={stats.total} />
                <div className="w-full">
                  <MetricRow label="Total Data Rules Defined" count={0} total={stats.total} />
                  <MetricRow label="Data Rules Freshly Run" count={0} total={0} todo />
                  <MetricRow label="Operational Editors Defined" count={0} total={stats.total} todo />
                  <MetricRow label="Security Rights Defined" count={0} total={stats.total} todo />
                  <p className="text-[10px] text-gray-300 italic mt-2">
                    Metrics 2–4 will populate once rule runtime, editor and security fields are implemented.
                  </p>
                </div>
              </div>
            </div>

            {/* Phase 3 — Improve Data Quality */}
            <div className="flex flex-col">
              <div className="px-5 pt-4 pb-1 text-center">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Phase 3</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">Improve Data Quality</p>
              </div>
              <div className="px-5 py-4 flex flex-col items-center gap-4">
                <PhaseCircle pct={0} complete={0} total={stats.total} />
                <div className="w-full">
                  <MetricRow label="Data Issues with Planned Action" count={0} total={stats.total} todo />
                  <MetricRow label="Data Issues with Planned Root Cause Fix" count={0} total={stats.total} todo />
                  <p className="text-[10px] text-gray-300 italic mt-2">
                    Will populate once data issue tracking is implemented.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 4 — placeholder */}
          <div className="px-5 py-3 flex items-center gap-3 opacity-40 border-t border-wtg-border/50">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-500">Phase 4 — Solve Root Causes and Expand Beyond EdiProd</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Planned — metrics to be defined</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GROUP_OPTIONS = [
  { id: '', label: 'None' },
  { id: 'domain', label: 'Domain' },
  { id: 'subdomain', label: 'Subdomain' },
  { id: 'criticality', label: 'Criticality' },
  { id: 'devTeamOwner', label: 'Dev Team' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TableRegistry() {
  const navigate = useNavigate()
  const { displayTable } = useNameDisplay()

  const [data, setData] = useState<TableRecord[]>([])
  const [domains, setDomains] = useState<DomainGroup[]>([])
  const [owners, setOwners] = useState<StaffRecord[]>([])
  const [teams, setTeams] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [grouping, setGrouping] = useState<GroupingState>([])
  const [expanded, setExpanded] = useState<ExpandedState>(true)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    secondaryOwner: false,
    usedInReporting: false,
  })
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showColMenu, setShowColMenu] = useState(false)

  const [editMode, setEditMode] = useState(false)
  const [pendingEdit, setPendingEdit] = useState<{ rowId: string; colId: string } | null>(null)

  // Context menu + create-rule sidebar
  const [contextMenu, setContextMenu] = useState<(ContextMenuState & {
    tableName: string
    criticality: string | null
    rowId: string
    cellType: 'row' | 'domain' | 'subdomain' | 'primaryOwner' | 'devTeamOwner' | 'secondaryOwner'
    cellValue: string | null
    domain: string | null
  }) | null>(null)
  const [createRuleFor, setCreateRuleFor] = useState<{ table: string; severity?: RuleSeverity } | null>(null)
  const [healthStatsCollapsed, setHealthStatsCollapsed] = useState(false)

  const dragColId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [pasteError, setPasteError] = useState<string | null>(null)
  const selectionAnchorRef = useRef<string | null>(null)
  const selectionEndRef = useRef<string | null>(null)
  const selectedCellsRef = useRef(selectedCells)
  selectedCellsRef.current = selectedCells

  // Stable refs so useMemo column defs can use them without stale-closure issues
  const tableRef = useRef<Table<TableRecord> | null>(null)
  const dragStartRef = useRef<{ rowId: string; colId: string; x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const handleCellSelectRef = useRef<(e: React.MouseEvent, rowId: string, colId: string) => void>(() => {})
  const applyBulkRef = useRef<(value: string | null, sourceRowId: string, colId: string) => void>(() => {})

  const domainNames = useMemo(() => domains.map(domain => domain.name), [domains])
  const subdomainNames = useMemo(() => [...new Set(domains.flatMap(d => (d.subdomains ?? []).map(s => s.name)))].sort(), [domains])

  const tableCritCounts = useMemo(() => {
    const LABEL: Record<string, string> = { H: 'High', M: 'Medium', L: 'Low' }
    const c: Partial<Record<string, number>> = {}
    for (const t of data) {
      const label = t.criticality ? LABEL[t.criticality] : undefined
      if (label) c[label] = (c[label] ?? 0) + 1
    }
    return c
  }, [data])

  const ownerCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of data) {
      for (const name of [t.primaryOwner, t.secondaryOwner]) {
        if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
      }
    }
    for (const d of domains) {
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
  }, [data, domains])

  async function loadRegistryData() {
    const [tables, nextDomains, nextOwners, nextTeams] = await Promise.all([
      api.getTables(),
      api.getDomains(),
      api.getOwners(),
      api.getTeams(),
    ])
    setData(tables)
    setDomains(nextDomains)
    setOwners(nextOwners)
    setTeams(nextTeams)
    setLoadError(null)
  }

  useEffect(() => {
    let cancelled = false

    void Promise.all([
      api.getTables(),
      api.getDomains(),
      api.getOwners(),
      api.getTeams(),
    ]).then(([tables, nextDomains, nextOwners, nextTeams]) => {
      if (cancelled) return
      setData(tables)
      setDomains(nextDomains)
      setOwners(nextOwners)
      setTeams(nextTeams)
      setLoadError(null)
    }).catch((error: unknown) => {
      if (cancelled) return
      setLoadError(error instanceof Error ? error.message : 'Failed to load registry data')
    })

    return () => { cancelled = true }
  }, [])

  // Clear pendingEdit after one render cycle so forceOpen fires exactly once
  useEffect(() => {
    if (!pendingEdit) return
    const id = setTimeout(() => setPendingEdit(null), 50)
    return () => clearTimeout(id)
  }, [pendingEdit])

  // Clear multi-select when switching to read mode
  useEffect(() => {
    if (!editMode) {
      setSelectedCells(new Set())
      selectionAnchorRef.current = null
      selectionEndRef.current = null
    }
  }, [editMode])

  function updateRow(tableName: string, updates: Partial<TableRecord>) {
    setData(d => d.map(r => r.tableName === tableName ? { ...r, ...updates } : r))
    void api.updateTable(tableName, updates)
      .then((updated) => {
        setData(d => d.map(r => r.tableName === tableName ? { ...r, ...updated } : r))
      })
      .catch(() => {
        void loadRegistryData()
      })
  }
  const updateRowRef = useRef(updateRow)
  updateRowRef.current = updateRow

  const columnHelper = createColumnHelper<TableRecord>()

  const columns = useMemo(() => [
    columnHelper.accessor('domain', {
      id: 'domain',
      header: 'Domain',
      cell: ({ row, getValue, column }) => (
        <EditableDomainCell
          value={getValue()}
          items={domainNames}
          allDomains={domains}
          onSave={(v) => {
            const val = v ?? row.original.domain
            updateRow(row.original.tableName, { domain: val })
            applyBulkRef.current(val, row.id, column.id)
          }}
          onHoverSave={(v) => {
            const val = v ?? row.original.domain
            updateRow(row.original.tableName, { domain: val })
          }}
          rowId={row.id}
          colId={column.id}
          onMoveDown={() => navDown(row.id, column.id)}
          onMoveRight={() => navRight(row.id, column.id)}
          onMoveLeft={() => navLeft(row.id, column.id)}
          isSelected={editMode && selectedCellsRef.current.has(cellKey(row.id, column.id))}
          onSelect={editMode ? (e) => handleCellSelectRef.current(e, row.id, column.id) : undefined}
          isDraggingRef={isDraggingRef}
          editMode={editMode}
          onOpen={() => { const v = getValue(); if (v) navigate('/schema/' + v) }}
          forceOpen={pendingEdit?.rowId === row.id && pendingEdit?.colId === column.id}
          onContextMenu={(e) => {
            e.preventDefault(); e.stopPropagation()
            setContextMenu({ x: e.clientX, y: e.clientY, tableName: row.original.tableName, criticality: row.original.criticality, rowId: row.id, cellType: 'domain', cellValue: getValue() ?? null, domain: row.original.domain })
          }}
        />
      ),
      filterFn: 'includesString',
      size: 160,
    }),
    columnHelper.accessor('subdomain', {
      id: 'subdomain',
      header: 'Subdomain',
      cell: ({ row, getValue, column }) => (
        <EditableLookupCell
          value={getValue()}
          items={subdomainNames}
          onSave={(v) => {
            updateRow(row.original.tableName, { subdomain: v })
            applyBulkRef.current(v, row.id, column.id)
          }}
          onHoverSave={(v) => updateRow(row.original.tableName, { subdomain: v })}
          rowId={row.id}
          colId={column.id}
          onMoveDown={() => navDown(row.id, column.id)}
          onMoveRight={() => navRight(row.id, column.id)}
          onMoveLeft={() => navLeft(row.id, column.id)}
          isSelected={editMode && selectedCellsRef.current.has(cellKey(row.id, column.id))}
          onSelect={editMode ? (e) => handleCellSelectRef.current(e, row.id, column.id) : undefined}
          isDraggingRef={isDraggingRef}
          editMode={editMode}
          onOpen={() => { const domain = row.original.domain; if (domain) navigate('/schema/' + domain) }}
          forceOpen={pendingEdit?.rowId === row.id && pendingEdit?.colId === column.id}
          onContextMenu={(e) => {
            e.preventDefault(); e.stopPropagation()
            setContextMenu({ x: e.clientX, y: e.clientY, tableName: row.original.tableName, criticality: row.original.criticality, rowId: row.id, cellType: 'subdomain', cellValue: getValue() ?? null, domain: row.original.domain })
          }}
        />
      ),
      filterFn: 'includesString',
      size: 140,
    }),
    columnHelper.accessor('tableName', {
      id: 'tableName',
      header: 'Table',
      cell: ({ row, getValue }) => (
        <button
          onClick={() => navigate(`/table/${getValue()}`)}
          className="font-mono text-xs font-semibold text-wtg-blue hover:underline text-left"
        >
          {displayTable(getValue(), row.original.productName)}
        </button>
      ),
      enableGrouping: false,
      size: 200,
    }),
    columnHelper.accessor('tableType', {
      id: 'tableType',
      header: 'Type',
      cell: ({ row, getValue }) => (
        <EditableEnumCell
          value={getValue()}
          options={['Platform', 'Configuration', 'Master Data', 'Experience']}
          onSave={(v) => updateRow(row.original.tableName, { tableType: v as TableType })}
          placeholder="—"
        />
      ),
      filterFn: 'includesString',
      size: 140,
    }),
    columnHelper.accessor('criticality', {
      id: 'criticality',
      header: 'Criticality',
      cell: ({ row, getValue }) => (
        <EditableCriticalityPill
          value={getValue()}
          onSave={(v) => updateRow(row.original.tableName, { criticality: v })}
          counts={tableCritCounts}
          tableCell
          portal
          rowId={row.id}
          colId="criticality"
          onMoveDown={() => navDown(row.id, 'criticality')}
        />
      ),
      filterFn: 'equals',
      size: 100,
    }),
    columnHelper.accessor('primaryOwner', {
      id: 'primaryOwner',
      header: 'Primary Owner',
      cell: ({ row, getValue, column }) => (
        <EditablePersonCell
          value={getValue()}
          staff={owners}
          ownerCounts={ownerCounts}
          onSave={(v) => {
            updateRow(row.original.tableName, { primaryOwner: v })
            applyBulkRef.current(v, row.id, column.id)
          }}
          onHoverSave={(v) => updateRow(row.original.tableName, { primaryOwner: v })}
          rowId={row.id}
          colId={column.id}
          onMoveDown={() => navDown(row.id, column.id)}
          onMoveRight={() => navRight(row.id, column.id)}
          onMoveLeft={() => navLeft(row.id, column.id)}
          isSelected={editMode && selectedCellsRef.current.has(cellKey(row.id, column.id))}
          onSelect={editMode ? (e) => handleCellSelectRef.current(e, row.id, column.id) : undefined}
          isDraggingRef={isDraggingRef}
          editMode={editMode}
          onOpen={() => navigate('/ownership')}
          forceOpen={pendingEdit?.rowId === row.id && pendingEdit?.colId === column.id}
          onContextMenu={(e) => {
            e.preventDefault(); e.stopPropagation()
            setContextMenu({ x: e.clientX, y: e.clientY, tableName: row.original.tableName, criticality: row.original.criticality, rowId: row.id, cellType: 'primaryOwner', cellValue: getValue() ?? null, domain: row.original.domain })
          }}
        />
      ),
      filterFn: 'includesString',
      size: 150,
    }),
    columnHelper.accessor('devTeamOwner', {
      id: 'devTeamOwner',
      header: 'Dev Team',
      cell: ({ row, getValue, column }) => (
        <EditableLookupCell
          value={getValue()}
          items={teams}
          onSave={(v) => {
            updateRow(row.original.tableName, { devTeamOwner: v })
            applyBulkRef.current(v, row.id, column.id)
          }}
          onHoverSave={(v) => updateRow(row.original.tableName, { devTeamOwner: v })}
          placeholder="Unassigned"
          rowId={row.id}
          colId={column.id}
          onMoveDown={() => navDown(row.id, column.id)}
          onMoveRight={() => navRight(row.id, column.id)}
          onMoveLeft={() => navLeft(row.id, column.id)}
          isSelected={editMode && selectedCellsRef.current.has(cellKey(row.id, column.id))}
          onSelect={editMode ? (e) => handleCellSelectRef.current(e, row.id, column.id) : undefined}
          isDraggingRef={isDraggingRef}
          editMode={editMode}
          onOpen={() => navigate('/ownership')}
          forceOpen={pendingEdit?.rowId === row.id && pendingEdit?.colId === column.id}
          onContextMenu={(e) => {
            e.preventDefault(); e.stopPropagation()
            setContextMenu({ x: e.clientX, y: e.clientY, tableName: row.original.tableName, criticality: row.original.criticality, rowId: row.id, cellType: 'devTeamOwner', cellValue: getValue() ?? null, domain: row.original.domain })
          }}
        />
      ),
      filterFn: 'includesString',
      size: 150,
    }),
    columnHelper.accessor('secondaryOwner', {
      id: 'secondaryOwner',
      header: 'Secondary Owner',
      cell: ({ row, getValue, column }) => (
        <EditablePersonCell
          value={getValue()}
          staff={owners}
          ownerCounts={ownerCounts}
          onSave={(v) => {
            updateRow(row.original.tableName, { secondaryOwner: v })
            applyBulkRef.current(v, row.id, column.id)
          }}
          onHoverSave={(v) => updateRow(row.original.tableName, { secondaryOwner: v })}
          rowId={row.id}
          colId={column.id}
          onMoveDown={() => navDown(row.id, column.id)}
          onMoveRight={() => navRight(row.id, column.id)}
          onMoveLeft={() => navLeft(row.id, column.id)}
          isSelected={editMode && selectedCellsRef.current.has(cellKey(row.id, column.id))}
          onSelect={editMode ? (e) => handleCellSelectRef.current(e, row.id, column.id) : undefined}
          isDraggingRef={isDraggingRef}
          editMode={editMode}
          onOpen={() => navigate('/ownership')}
          forceOpen={pendingEdit?.rowId === row.id && pendingEdit?.colId === column.id}
          onContextMenu={(e) => {
            e.preventDefault(); e.stopPropagation()
            setContextMenu({ x: e.clientX, y: e.clientY, tableName: row.original.tableName, criticality: row.original.criticality, rowId: row.id, cellType: 'secondaryOwner', cellValue: getValue() ?? null, domain: row.original.domain })
          }}
        />
      ),
      filterFn: 'includesString',
      size: 150,
    }),
    columnHelper.accessor('usedInReporting', {
      id: 'usedInReporting',
      header: 'Reporting',
      cell: ({ getValue }) => getValue()
        ? <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Yes</span>
        : <span className="text-[11px] text-gray-300">—</span>,
      filterFn: 'equals',
      size: 80,
      enableSorting: true,
    }),
    columnHelper.accessor(
      (row) => {
        const a = computePhase1a(row)
        const b = computePhase1b(row)
        return (a.score / a.total) * 0.9 + (b.score / b.total) * 0.1
      },
      {
        id: 'health',
        header: 'Ph.1 Health',
        cell: ({ row }) => {
          const a = computePhase1a(row.original)
          const b = computePhase1b(row.original)
          const pctA = Math.round(a.score / a.total * 100)
          return (
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-bold tabular-nums ${
                pctA === 100 ? 'text-emerald-600' :
                pctA >= 70 ? 'text-amber-600' :
                'text-red-500'
              }`}>
                {a.score}/{a.total}
              </span>
              <div className="h-1 w-10 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    pctA === 100 ? 'bg-emerald-400' :
                    pctA >= 70 ? 'bg-amber-400' :
                    'bg-red-400'
                  }`}
                  style={{ width: `${pctA}%` }}
                />
              </div>
              {b.score === b.total && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Phase 1b complete" />
              )}
            </div>
          )
        },
        enableSorting: true,
        enableGrouping: false,
        size: 100,
      }
    ),
    columnHelper.display({
      id: 'open',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
          {expandedRowId === row.original.tableName
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      ),
      size: 36,
      enableSorting: false,
      enableColumnFilter: false,
    }),
  ], [navigate, displayTable, expandedRowId, domainNames, owners, teams, editMode, pendingEdit])  // eslint-disable-line react-hooks/exhaustive-deps

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, grouping, expanded, columnVisibility, columnOrder },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    autoResetExpanded: false,
    groupedColumnMode: false,
  })

  // Keep tableRef current so handlers below don't capture a stale table
  tableRef.current = table

  // ─── Multi-select logic ──────────────────────────────────────────────────────

  function handleCellSelect(e: React.MouseEvent, rowId: string, colId: string) {
    const key = cellKey(rowId, colId)
    if (e.ctrlKey || e.metaKey) {
      setSelectedCells(prev => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key); else next.add(key)
        return next
      })
      selectionAnchorRef.current = key
      selectionEndRef.current = key
    } else if (e.shiftKey && selectionAnchorRef.current) {
      const anchor = parseCellKey(selectionAnchorRef.current)
      if (anchor.colId === colId) {
        const cells = Array.from(document.querySelectorAll<HTMLElement>(`[data-cell-col="${colId}"]`))
        const aIdx = cells.findIndex(el => el.getAttribute('data-cell-row') === anchor.rowId)
        const tIdx = cells.findIndex(el => el.getAttribute('data-cell-row') === rowId)
        if (aIdx !== -1 && tIdx !== -1) {
          const [from, to] = aIdx < tIdx ? [aIdx, tIdx] : [tIdx, aIdx]
          const keys = new Set<string>()
          for (let i = from; i <= to; i++) {
            const r = cells[i].getAttribute('data-cell-row')
            if (r) keys.add(cellKey(r, colId))
          }
          setSelectedCells(keys)
          selectionEndRef.current = key
        }
      }
    } else if (!selectedCellsRef.current.has(key)) {
      // Plain click on an unselected cell: reset selection to just this one
      setSelectedCells(new Set([key]))
      selectionAnchorRef.current = key
      selectionEndRef.current = key
    }
    // Plain click on an already-selected cell: keep multi-selection so edit applies to all
  }
  handleCellSelectRef.current = handleCellSelect

  // Apply a bulk-edited value to all other selected cells in the same column
  function applyBulk(value: string | null, sourceRowId: string, colId: string) {
    const fieldMap: Partial<Record<string, keyof TableRecord>> = {
      domain: 'domain', primaryOwner: 'primaryOwner',
      secondaryOwner: 'secondaryOwner', devTeamOwner: 'devTeamOwner',
    }
    const field = fieldMap[colId]
    if (!field) return
    const others = Array.from(selectedCellsRef.current).filter(k => {
      const p = parseCellKey(k)
      return p.colId === colId && p.rowId !== sourceRowId
    })
    others.forEach(k => {
      try {
        const row = tableRef.current?.getRow(parseCellKey(k).rowId)
        if (row?.original) updateRowRef.current(row.original.tableName, { [field]: value } as Partial<TableRecord>)
      } catch { /* row may not exist */ }
    })
  }
  applyBulkRef.current = applyBulk

  // Keyboard: Ctrl+C copy · Ctrl+V paste (validates column type) · Esc clear · Shift+↑↓ extend
  useEffect(() => {
    const fieldMap: Partial<Record<string, keyof TableRecord>> = {
      domain: 'domain', primaryOwner: 'primaryOwner',
      secondaryOwner: 'secondaryOwner', devTeamOwner: 'devTeamOwner',
    }
    function handleKey(e: KeyboardEvent) {
      const selected = selectedCellsRef.current
      if (selected.size === 0) return
      if (isEditableTarget(e.target)) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        const values = Array.from(selected).map(k => {
          const { rowId, colId } = parseCellKey(k)
          const field = fieldMap[colId]
          try {
            const row = tableRef.current?.getRow(rowId)
            return field && row?.original ? (row.original[field] as string | null) ?? '' : ''
          } catch { return '' }
        })
        navigator.clipboard.writeText(values.join('\n')).catch(() => {})
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        const colIds = new Set(Array.from(selected).map(k => parseCellKey(k).colId))
        if (colIds.size > 1) {
          setPasteError('Cannot paste: selected cells span different column types')
          setTimeout(() => setPasteError(null), 3000)
          return
        }
        const colId = Array.from(colIds)[0]
        const field = fieldMap[colId]
        if (!field) return
        navigator.clipboard.readText().then(text => {
          const lines = text.split('\n').map(l => l.trim())
          Array.from(selected).forEach((k, i) => {
            const { rowId } = parseCellKey(k)
            const value = lines[i] ?? lines[0]
            try {
              const row = tableRef.current?.getRow(rowId)
              if (row?.original) updateRowRef.current(row.original.tableName, { [field]: value || null } as Partial<TableRecord>)
            } catch { /* skip */ }
          })
        }).catch(() => {
          setPasteError('Cannot read clipboard')
          setTimeout(() => setPasteError(null), 3000)
        })
        return
      }

      if (e.key === 'Escape') {
        setSelectedCells(new Set())
        selectionAnchorRef.current = null
        selectionEndRef.current = null
        return
      }

      if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const end = selectionEndRef.current
        const anchor = selectionAnchorRef.current
        if (!end || !anchor) return
        const { colId, rowId } = parseCellKey(end)
        const { colId: anchorCol, rowId: anchorRow } = parseCellKey(anchor)
        if (anchorCol !== colId) return
        e.preventDefault()
        const cells = Array.from(document.querySelectorAll<HTMLElement>(`[data-cell-col="${colId}"]`))
        const endIdx = cells.findIndex(el => el.getAttribute('data-cell-row') === rowId)
        const newEndIdx = e.key === 'ArrowDown'
          ? Math.min(endIdx + 1, cells.length - 1)
          : Math.max(endIdx - 1, 0)
        if (newEndIdx === endIdx) return
        const newEndRow = cells[newEndIdx].getAttribute('data-cell-row')
        if (!newEndRow) return
        selectionEndRef.current = cellKey(newEndRow, colId)
        const aIdx = cells.findIndex(el => el.getAttribute('data-cell-row') === anchorRow)
        const [from, to] = aIdx < newEndIdx ? [aIdx, newEndIdx] : [newEndIdx, aIdx]
        const keys = new Set<string>()
        for (let i = from; i <= to; i++) {
          const r = cells[i].getAttribute('data-cell-row')
          if (r) keys.add(cellKey(r, colId))
        }
        setSelectedCells(keys)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Drag selection: mousedown → track start, mousemove → extend (same column), mouseup → end
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-cell-row][data-cell-col]')
      if (!cell) {
        // Clicked outside any editable cell — clear selection
        setSelectedCells(new Set())
        selectionAnchorRef.current = null
        selectionEndRef.current = null
        return
      }
      dragStartRef.current = {
        rowId: cell.getAttribute('data-cell-row')!,
        colId: cell.getAttribute('data-cell-col')!,
        x: e.clientX,
        y: e.clientY,
      }
      isDraggingRef.current = false
    }

    function onMouseMove(e: MouseEvent) {
      if (!dragStartRef.current || !(e.buttons & 1)) return
      const { x, y, rowId: startRow, colId } = dragStartRef.current
      if (Math.hypot(e.clientX - x, e.clientY - y) < 5) return
      isDraggingRef.current = true
      const hovered = document.elementsFromPoint(e.clientX, e.clientY)
        .find(el => el.matches('[data-cell-row][data-cell-col]')) as HTMLElement | undefined
      if (!hovered) return
      const hoverRow = hovered.getAttribute('data-cell-row')
      const hoverCol = hovered.getAttribute('data-cell-col')
      if (!hoverRow || hoverCol !== colId) return
      const cells = Array.from(document.querySelectorAll<HTMLElement>(`[data-cell-col="${colId}"]`))
      const sIdx = cells.findIndex(el => el.getAttribute('data-cell-row') === startRow)
      const hIdx = cells.findIndex(el => el.getAttribute('data-cell-row') === hoverRow)
      if (sIdx === -1 || hIdx === -1) return
      const [from, to] = sIdx < hIdx ? [sIdx, hIdx] : [hIdx, sIdx]
      const keys = new Set<string>()
      for (let i = from; i <= to; i++) {
        const r = cells[i].getAttribute('data-cell-row')
        if (r) keys.add(cellKey(r, colId))
      }
      setSelectedCells(keys)
      selectionAnchorRef.current = cellKey(startRow, colId)
      selectionEndRef.current = cellKey(hoverRow, colId)
    }

    function onMouseUp() {
      dragStartRef.current = null
      // Defer so the cell's onClick can still read isDraggingRef before we reset it
      setTimeout(() => { isDraggingRef.current = false }, 0)
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const exportColumns: ColSpec<typeof data[number]>[] = [
    { kind: 'dual',   label: 'Table',        getDb: t => t.tableName,              getProduct: t => t.productName },
    { kind: 'single', label: 'Domain',        get: t => t.domain },
    { kind: 'single', label: 'Subdomain',     get: t => t.subdomain },
    { kind: 'single', label: 'Type',          get: t => t.tableType },
    { kind: 'single', label: 'Criticality',   get: t => t.criticality },
    { kind: 'single', label: 'Primary Owner',   get: t => t.primaryOwner },
    { kind: 'single', label: 'Secondary Owner', get: t => t.secondaryOwner },
    { kind: 'single', label: 'Dev Team',        get: t => t.devTeamOwner },
    { kind: 'single', label: 'Reporting',     get: t => t.usedInReporting ? 'Yes' : 'No' },
  ]

  // Import: match rows by DB table name, update only the editable governance fields.
  const importColumns: ImportColSpec<Partial<typeof data[number]>>[] = [
    { header: 'Table - DB',    required: true, parse: (v, r) => { r.tableName    = v } },
    { header: 'Domain',                        parse: (v, r) => { if (v) r.domain = v } },
    { header: 'Subdomain',                     parse: (v, r) => { r.subdomain    = v || null } },
    { header: 'Type',                          parse: (v, r) => { if (['Platform','Configuration','Master Data','Experience'].includes(v)) r.tableType = v as typeof data[number]['tableType'] } },
    { header: 'Criticality',                   parse: (v, r) => { if (['H','M','L','N'].includes(v)) r.criticality = v as typeof data[number]['criticality'] } },
    { header: 'Primary Owner',                 parse: (v, r) => { r.primaryOwner   = v || null } },
    { header: 'Secondary Owner',               parse: (v, r) => { r.secondaryOwner = v || null } },
    { header: 'Dev Team',                      parse: (v, r) => { r.devTeamOwner   = v || null } },
  ]

  function handleImport(rows: Partial<typeof data[number]>[]) {
    setData(prev => prev.map(existing => {
      const update = rows.find(r => r.tableName === existing.tableName)
      return update ? { ...existing, ...update } : existing
    }))
    for (const row of rows) {
      if (!row.tableName) continue
      const { tableName, ...updates } = row
      void api.updateTable(tableName, updates)
    }
  }

  const filteredLeafRows = table.getFilteredRowModel().flatRows
    .filter(r => !r.getIsGrouped())
    .map(r => r.original)
  const leafRowCount = filteredLeafRows.length

  return (
    <div className={`space-y-4 transition-all duration-300 ${createRuleFor ? 'mr-[520px]' : ''}`}>
      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Table Registry</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {leafRowCount} of {data.length} tables
            {(globalFilter || columnFilters.length > 0) ? ' · filtered' : ''}
          </p>
        </div>
        <TableActions
          filename="table-registry"
          sheets={[{ name: 'Tables', columns: exportColumns, data }]}
          csvSheet={{ columns: exportColumns, data }}
          importConfig={{ sheetName: 'Tables', columns: importColumns, onImport: handleImport }}
        />
      </div>

      {/* Health Stats */}
      <HealthStats
        rows={filteredLeafRows}
        collapsed={healthStatsCollapsed}
        onToggle={() => setHealthStatsCollapsed(v => !v)}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tables, owners, domains..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-wtg-border rounded-lg focus:outline-none focus:ring-2 focus:ring-wtg-blue/20"
          />
          {globalFilter && (
            <button onClick={() => setGlobalFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Group by */}
        <div className="flex items-center gap-1 text-xs">
          <Layers className="w-3.5 h-3.5 text-gray-400 mr-0.5" />
          <span className="text-gray-500 mr-1">Group:</span>
          {GROUP_OPTIONS.map(g => (
            <button
              key={g.id}
              onClick={() => {
                const isActive = g.id ? grouping[0] === g.id : grouping.length === 0
                if (isActive && g.id) {
                  setGrouping([])
                } else {
                  setGrouping(g.id ? [g.id] : [])
                  setExpanded(true)
                }
              }}
              className={`px-2 py-1 rounded transition-colors ${
                (g.id === '' && grouping.length === 0) || grouping[0] === g.id
                  ? 'bg-wtg-secondary text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Column filters toggle */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            showFilters
              ? 'bg-wtg-secondary text-white border-wtg-secondary'
              : 'bg-white text-gray-600 border-wtg-border hover:bg-gray-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {columnFilters.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-wtg-accent text-white text-[10px] font-bold flex items-center justify-center">
              {columnFilters.length}
            </span>
          )}
        </button>

        {/* Read / Edit mode toggle */}
        <div className="flex items-center rounded-lg border border-wtg-border overflow-hidden text-xs font-medium flex-shrink-0">
          <button
            onClick={() => setEditMode(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-colors ${
              !editMode ? 'bg-wtg-secondary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Read
          </button>
          <button
            onClick={() => setEditMode(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 border-l border-wtg-border transition-colors ${
              editMode ? 'bg-wtg-secondary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>

        {/* Column visibility */}
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
                {table.getAllLeafColumns()
                  .filter(c => c.id !== 'open')
                  .map(col => (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                    >
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

        {/* Clear filters */}
        {(columnFilters.length > 0 || globalFilter) && (
          <button
            onClick={() => { setColumnFilters([]); setGlobalFilter('') }}
            className="flex items-center gap-1 text-xs text-wtg-blue hover:underline"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}

        {/* Multi-select indicator */}
        {selectedCells.size > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-wtg-secondary/10 border border-wtg-secondary/30 rounded-lg text-xs text-wtg-secondary font-medium ml-auto">
            <span>{selectedCells.size} cell{selectedCells.size !== 1 ? 's' : ''} selected</span>
            <button
              onClick={() => { setSelectedCells(new Set()); selectionAnchorRef.current = null; selectionEndRef.current = null }}
              className="hover:bg-wtg-secondary/20 rounded p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        {pasteError && (
          <span className="text-xs text-red-500 font-medium">{pasteError}</span>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 900 }}>
            {/* Header */}
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-wtg-border bg-gray-50/80">
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      draggable={header.column.id !== 'open'}
                      onDragStart={() => { dragColId.current = header.column.id }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverId(header.column.id) }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={() => {
                        const from = dragColId.current
                        const to = header.column.id
                        setDragOverId(null)
                        dragColId.current = null
                        if (!from || from === to) return
                        const current = table.getState().columnOrder.length
                          ? [...table.getState().columnOrder]
                          : table.getAllLeafColumns().map(c => c.id)
                        const fromIdx = current.indexOf(from)
                        const toIdx = current.indexOf(to)
                        if (fromIdx === -1 || toIdx === -1) return
                        const next = [...current]
                        next.splice(fromIdx, 1)
                        next.splice(toIdx, 0, from)
                        setColumnOrder(next)
                      }}
                      className={`text-left px-4 py-2.5 table-header select-none transition-colors ${
                        dragOverId === header.column.id ? 'bg-wtg-secondary/10' : ''
                      }`}
                      style={{ width: header.getSize(), cursor: header.column.id !== 'open' ? 'grab' : undefined }}
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

              {/* Filter row */}
              {showFilters && (
                <tr className="border-b border-wtg-border bg-blue-50/20">
                  {table.getHeaderGroups()[0].headers.map(header => (
                    <th key={header.id} className="px-3 py-1.5">
                      {header.column.getCanFilter() ? (
                        <input
                          value={(header.column.getFilterValue() as string) ?? ''}
                          onChange={(e) => header.column.setFilterValue(e.target.value || undefined)}
                          placeholder="Filter…"
                          className="w-full text-xs px-2 py-1 border border-wtg-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-wtg-blue/30"
                        />
                      ) : null}
                    </th>
                  ))}
                </tr>
              )}
            </thead>

            {/* Body */}
            <tbody>
              {table.getRowModel().rows.map(row => (
                <Fragment key={row.id}>
                  <tr
                    className={`group/row border-b border-wtg-border/30 transition-colors cursor-pointer ${
                      row.getIsGrouped()
                        ? 'bg-gray-50/70 hover:bg-gray-100/60'
                        : expandedRowId === row.original?.tableName
                          ? 'bg-blue-50/30'
                          : 'hover:bg-blue-50/20'
                    }`}
                    onClick={() => {
                      if (row.getIsGrouped()) {
                        row.getToggleExpandedHandler()()
                      } else {
                        setExpandedRowId(prev =>
                          prev === row.original.tableName ? null : row.original.tableName
                        )
                      }
                    }}
                    onContextMenu={!row.getIsGrouped() ? (e) => {
                      e.preventDefault()
                      setContextMenu({ x: e.clientX, y: e.clientY, tableName: row.original.tableName, criticality: row.original.criticality, rowId: row.id, cellType: 'row', cellValue: null, domain: row.original.domain })
                    } : undefined}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="px-4 py-2"
                      >
                        {cell.getIsGrouped() ? (
                          <div className="flex items-center gap-2">
                            {row.getIsExpanded()
                              ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                              : <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                            <span className="text-sm font-semibold text-gray-900">
                              {String(cell.getValue() ?? '—')}
                            </span>
                            <span className="text-xs text-gray-400 font-normal">
                              {row.subRows.length} tables
                            </span>
                          </div>
                        ) : cell.getIsPlaceholder() ? null : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Expanded detail row */}
                  {!row.getIsGrouped() && expandedRowId === row.original.tableName && (
                    <tr className="bg-wtg-surface border-b border-wtg-border/40">
                      <td colSpan={row.getVisibleCells().length} className="px-8 py-5">
                        <div className="grid grid-cols-3 gap-8">

                          {/* Left: identity + description */}
                          <div className="col-span-2 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-mono text-sm font-bold text-gray-900">{row.original.tableName}</p>
                                {row.original.productName && (
                                  <p className="text-xs text-gray-400 mt-0.5">{row.original.productName}</p>
                                )}
                                <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{row.original.schema}.{row.original.tableName}</p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/table/${row.original.tableName}`) }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-wtg-blue border border-wtg-blue/30 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Open detail
                              </button>
                            </div>
                            {row.original.description && (
                              <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description</p>
                                <p className="text-sm text-gray-700 leading-relaxed">{row.original.description}</p>
                              </div>
                            )}
                          </div>

                          {/* Right: ownership + meta */}
                          <div className="space-y-5">
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Ownership</p>
                              <div className="space-y-2">
                                <div className="flex gap-3">
                                  <span className="text-xs text-gray-400 w-24 flex-shrink-0">Domain</span>
                                  <span className="text-xs text-gray-700">{row.original.domain}</span>
                                </div>
                                {row.original.subdomain && (
                                  <div className="flex gap-3">
                                    <span className="text-xs text-gray-400 w-24 flex-shrink-0">Subdomain</span>
                                    <span className="text-xs text-gray-700">{row.original.subdomain}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-400 w-24 flex-shrink-0">Primary owner</span>
                                  {row.original.primaryOwner ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full bg-wtg-primary text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                                        {row.original.primaryOwner.split(' ').map(n => n[0]).join('')}
                                      </div>
                                      <span className="text-xs text-gray-700">{row.original.primaryOwner}</span>
                                    </div>
                                  ) : <span className="text-xs text-gray-300 italic">Unassigned</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-400 w-24 flex-shrink-0">Secondary owner</span>
                                  {row.original.secondaryOwner ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full bg-wtg-secondary text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                                        {row.original.secondaryOwner.split(' ').map(n => n[0]).join('')}
                                      </div>
                                      <span className="text-xs text-gray-700">{row.original.secondaryOwner}</span>
                                    </div>
                                  ) : <span className="text-xs text-gray-300 italic">Unassigned</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-400 w-24 flex-shrink-0">Dev team</span>
                                  {row.original.devTeamOwner
                                    ? <span className="text-xs text-gray-700">{row.original.devTeamOwner}</span>
                                    : <span className="text-xs text-gray-300 italic">Unassigned</span>}
                                </div>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-wtg-border space-y-1.5">
                              {row.original.lastConfirmedDate && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <Calendar className="w-3 h-3" />
                                  Confirmed {row.original.lastConfirmedDate}
                                </div>
                              )}
                              {row.original.usedInReporting && (
                                <span className="inline-block text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  Used in reporting
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}

              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-gray-400">
                    No tables match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (() => {
        const { cellType, cellValue, tableName, rowId, domain, criticality } = contextMenu
        const items: import('../components/ContextMenu').ContextMenuEntry[] = []

        // Navigation action
        if (cellType === 'domain' && cellValue) {
          items.push({ label: 'Open Domain', icon: ExternalLink, onClick: () => navigate('/schema/' + cellValue) })
        } else if (cellType === 'subdomain' && domain) {
          items.push({ label: 'Open Domain', icon: ExternalLink, onClick: () => navigate('/schema/' + domain) })
        } else if (cellType === 'primaryOwner' || cellType === 'secondaryOwner' || cellType === 'devTeamOwner') {
          items.push({ label: 'Open Ownership Registry', icon: ExternalLink, onClick: () => navigate('/ownership') })
        }

        // Edit action (read mode only, for cell right-clicks)
        if (!editMode && cellType !== 'row') {
          if (items.length > 0) items.push({ separator: true })
          const label = cellType === 'domain' ? 'Edit Domain'
            : cellType === 'subdomain' ? 'Edit Subdomain'
            : cellType === 'primaryOwner' ? 'Edit Primary Owner'
            : cellType === 'devTeamOwner' ? 'Edit Dev Team'
            : 'Edit Secondary Owner'
          items.push({ label, icon: Pencil, onClick: () => setPendingEdit({ rowId, colId: cellType }) })
        }

        if (items.length > 0) items.push({ separator: true })
        items.push({ label: 'Open Table', icon: ExternalLink, onClick: () => navigate('/table/' + tableName) })
        items.push({ separator: true })
        items.push({
          label: 'Create Data Rule',
          icon: ListChecks,
          onClick: () => {
            const sev: RuleSeverity = criticality === 'H' ? 'H' : criticality === 'L' ? 'L' : 'M'
            setCreateRuleFor({ table: tableName, severity: sev })
          },
        })

        return <ContextMenu position={contextMenu} onClose={() => setContextMenu(null)} items={items} />
      })()}

      {/* Create rule sidebar */}
      {createRuleFor && (
        <div className="fixed top-14 right-0 bottom-0 w-[520px] shadow-xl z-40">
          <CreateRulePanel
            onClose={() => setCreateRuleFor(null)}
            initialTable={createRuleFor.table}
            initialSeverity={createRuleFor.severity}
          />
        </div>
      )}
    </div>
  )
}
