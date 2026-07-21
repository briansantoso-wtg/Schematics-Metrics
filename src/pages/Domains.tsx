import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Globe, ChevronDown, ChevronRight, Plus, MoreHorizontal,
  Table2, Trash2, Pencil, Users,
  AlertTriangle, Database, ArrowRight, GitBranch,
  Settings, DollarSign, Headphones, Share2, Code2, Activity, Contact, Cpu,
} from 'lucide-react'
import { api } from '../lib/api'
import type { DomainGroup, LMH, Sensitivity, StaffRecord, TableRecord, SubdomainInfo } from '../types'
import { OwnerLookup } from '../components/OwnerLookup'
import { CriticalityPill } from '../components/CriticalityPill'
import { EditableSensitivityPill } from '../components/SensitivityPill'
import { useNameDisplay } from '../contexts/NameDisplay'
import { TableDetailContent } from '../components/TableDetailContent'
import { useBreadcrumb } from '../contexts/Breadcrumb'

// ─── helpers ──────────────────────────────────────────────────────────────────

function getDomainIcon(name: string): React.ElementType {
  const n = name.toLowerCase()
  if (n.includes('workflow') || n.includes('process') || n.includes('pave')) return Activity
  if (n.includes('hr') || n.includes('human resource')) return Users
  if (n.includes('customer service') || n.includes('support')) return Headphones
  if (n.includes('customer')) return Contact
  if (n.includes('shared') || n.includes('common')) return Share2
  if (n.includes('product') || n.includes('development')) return Code2
  if (n.includes('finance') || n.includes('billing') || n.includes('payment')) return DollarSign
  if (n.includes('config') || n.includes('setting')) return Settings
  if (n.includes('infra') || n.includes('platform') || n.includes('system')) return Cpu
  return Globe
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function OwnerChip({ name }: { name: string | null }) {
  if (!name) return <span className="text-xs text-gray-400 italic">Unassigned</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-5 h-5 rounded-full bg-wtg-primary text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
        {initials(name)}
      </span>
      <span className="text-sm text-gray-700">{name}</span>
    </span>
  )
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string
  color: 'blue' | 'green' | 'amber' | 'red'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-xl ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
        </div>
      </div>
    </div>
  )
}

// ─── inline rename input ───────────────────────────────────────────────────────

function InlineEdit({ value, onSave, onCancel, className = '' }: {
  value: string; onSave: (v: string) => void; onCancel: () => void; className?: string
}) {
  const [val, setVal] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  return (
    <input
      ref={ref}
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') onSave(val.trim())
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => onSave(val.trim())}
      className={`border border-wtg-secondary rounded px-2 py-0.5 text-sm outline-none focus:ring-2 focus:ring-wtg-secondary/20 ${className}`}
    />
  )
}

// ─── types for selection ──────────────────────────────────────────────────────

type Selection =
  | { kind: 'none' }
  | { kind: 'domain'; name: string }
  | { kind: 'subdomain'; domainName: string; subdomainName: string }
  | { kind: 'table'; tableName: string; domainName: string; subdomainName: string | null }

// ─── main page ────────────────────────────────────────────────────────────────

export default function Domains() {
  const { nameMode } = useNameDisplay()
  const { setExtra, setCrumbActions } = useBreadcrumb()

  const [domains, setDomains] = useState<DomainGroup[]>([])
  const [tables, setTables] = useState<TableRecord[]>([])
  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>([])
  const [selection, setSelection] = useState<Selection>({ kind: 'none' })
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())
  const [expandedSubdomains, setExpandedSubdomains] = useState<Set<string>>(new Set())
  const [menuOpen, setMenuOpen] = useState<string | null>(null) // "domain:name" or "sub:domain:sub"
  const [renamingNode, setRenamingNode] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [createPanel, setCreatePanel] = useState<{ kind: 'domain' } | { kind: 'subdomain'; domainName: string } | null>(null)
  const [hoveredUnsortedTable, setHoveredUnsortedTable] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ tableName: string; x: number; y: number } | null>(null)

  // drag state
  const draggedTable = useRef<string | null>(null)
  const draggedSubdomain = useRef<{ domainName: string; subdomainName: string } | null>(null)
  const [dragOverNode, setDragOverNode] = useState<string | null>(null) // "domain:name" | "sub:domain:sub"

  const loadAll = useCallback(() => {
    Promise.all([
      api.getDomains(),
      api.getTables(),
      api.getOwners(),
    ]).then(([d, t, o]) => {
      setDomains(d)
      setTables(t)
      setStaffRecords(o)
    }).catch(console.error)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = () => setMenuOpen(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [menuOpen])

  // ── escape to deselect
  useEffect(() => {
    if (selection.kind === 'none') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelection({ kind: 'none' })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selection.kind])

  // ── sync selection into header breadcrumb
  useEffect(() => {
    if (selection.kind === 'domain') {
      setCrumbActions({ '/domains': () => setSelection({ kind: 'none' }) })
      setExtra([{ label: selection.name }])
    } else if (selection.kind === 'subdomain') {
      setCrumbActions({ '/domains': () => setSelection({ kind: 'none' }) })
      setExtra([
        { label: selection.domainName, onClick: () => setSelection({ kind: 'domain', name: selection.domainName }) },
        { label: selection.subdomainName },
      ])
    } else if (selection.kind === 'table') {
      setCrumbActions({ '/domains': () => setSelection({ kind: 'none' }) })
      const crumbs: { label: string; onClick?: () => void }[] = [
        { label: selection.domainName, onClick: () => setSelection({ kind: 'domain', name: selection.domainName }) },
      ]
      if (selection.subdomainName) {
        crumbs.push({ label: selection.subdomainName, onClick: () => setSelection({ kind: 'subdomain', domainName: selection.domainName, subdomainName: selection.subdomainName! }) })
      }
      crumbs.push({ label: selection.tableName })
      setExtra(crumbs)
    } else {
      setExtra([])
      setCrumbActions({})
    }
  }, [selection]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── clear breadcrumb context on unmount
  useEffect(() => {
    return () => { setExtra([]); setCrumbActions({}) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── number key to assign hovered unsorted table to a domain
  useEffect(() => {
    if (!hoveredUnsortedTable) return
    const handler = async (e: KeyboardEvent) => {
      const n = parseInt(e.key)
      if (isNaN(n) || n < 1 || n > 9) return
      const domain = domains[n - 1]
      if (!domain) return
      const updated = await api.updateTable(hoveredUnsortedTable, { domain: domain.name, subdomain: null })
      setTables(prev => prev.map(r => r.tableName === hoveredUnsortedTable ? updated : r))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hoveredUnsortedTable, domains])

  // ── close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [contextMenu])

  // ── computed
  const ownerCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of tables) {
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
  }, [tables, domains])

  const selectedDomain = selection.kind !== 'none'
    ? domains.find(d => d.name === (selection.kind === 'domain' ? selection.name : selection.domainName))
    : null

  const selectedSubdomain = selection.kind === 'subdomain'
    ? selectedDomain?.subdomains?.find(s => s.name === selection.subdomainName)
    : null

  const domainTables = (domainName: string) => tables.filter(t => t.domain === domainName)
  const subdomainTables = (domainName: string, sub: string) =>
    tables.filter(t => t.domain === domainName && t.subdomain === sub)
  const rootTables = (domainName: string) =>
    tables.filter(t => t.domain === domainName && !t.subdomain)

  // ── domain actions
  async function createDomain(name: string, primaryOwner: string | null, secondaryOwner: string | null, priority: LMH, sensitiveData: 'Restricted' | 'Open' | null) {
    const created = await api.createDomain({ name, primaryOwner, secondaryOwner, priority, sensitiveData })
    setDomains(prev => [...prev, created])
    setCreatePanel(null)
    setSelection({ kind: 'domain', name: created.name })
    setExpandedDomains(prev => new Set([...prev, created.name]))
  }

  async function renameDomain(oldName: string, newName: string) {
    if (!newName || newName === oldName) { setRenamingNode(null); return }
    const updated = await api.updateDomain(oldName, { newName })
    setDomains(prev => prev.map(d => d.name === oldName ? updated : d))
    setTables(prev => prev.map(t => t.domain === oldName ? { ...t, domain: newName } : t))
    if (selection.kind === 'domain' && selection.name === oldName) setSelection({ kind: 'domain', name: newName })
    setRenamingNode(null)
  }

  async function deleteDomain(name: string) {
    await api.deleteDomain(name)
    setDomains(prev => prev.filter(d => d.name !== name))
    setTables(prev => prev.map(t => t.domain === name ? { ...t, domain: 'Unclassified', subdomain: null } : t))
    if (selection.kind === 'domain' && selection.name === name) setSelection({ kind: 'none' })
    setDeleteConfirm(null)
  }

  async function updateDomainField(name: string, patch: Parameters<typeof api.updateDomain>[1]) {
    const updated = await api.updateDomain(name, patch)
    setDomains(prev => prev.map(d => d.name === name ? updated : d))
  }

  // ── subdomain actions
  async function renameSubdomain(domainName: string, oldSub: string, newSub: string) {
    if (!newSub || newSub === oldSub) { setRenamingNode(null); return }
    // Move all tables from old subdomain name to new name
    const affected = tables.filter(t => t.domain === domainName && t.subdomain === oldSub)
    await Promise.all(affected.map(t => api.updateTable(t.tableName, { subdomain: newSub })))
    // Update subdomain owner key
    const domain = domains.find(d => d.name === domainName)
    const oldOwners = domain?.subdomains?.find(s => s.name === oldSub)
    if (oldOwners) {
      await api.updateDomain(domainName, {
        subdomainOwners: {
          [newSub]: { primaryOwner: oldOwners.primaryOwner, secondaryOwner: oldOwners.secondaryOwner },
          [oldSub]: { primaryOwner: null, secondaryOwner: null },
        }
      })
    }
    setTables(prev => prev.map(t =>
      t.domain === domainName && t.subdomain === oldSub ? { ...t, subdomain: newSub } : t
    ))
    loadAll()
    if (selection.kind === 'subdomain' && selection.subdomainName === oldSub) {
      setSelection({ kind: 'subdomain', domainName, subdomainName: newSub })
    }
    setRenamingNode(null)
  }

  async function deleteSubdomain(domainName: string, subName: string) {
    const affected = tables.filter(t => t.domain === domainName && t.subdomain === subName)
    await Promise.all(affected.map(t => api.updateTable(t.tableName, { subdomain: null })))
    await api.updateDomain(domainName, { subdomainOwners: { [subName]: null } })
    setTables(prev => prev.map(t =>
      t.domain === domainName && t.subdomain === subName ? { ...t, subdomain: null } : t
    ))
    if (selection.kind === 'subdomain' && selection.subdomainName === subName) {
      setSelection({ kind: 'domain', name: domainName })
    }
    setDeleteConfirm(null)
    loadAll()
  }

  async function updateSubdomainOwner(domainName: string, subName: string, patch: { primaryOwner?: string | null; secondaryOwner?: string | null; sensitiveData?: Sensitivity }) {
    const domain = domains.find(d => d.name === domainName)
    const existing = domain?.subdomains?.find(s => s.name === subName)
    const merged = { primaryOwner: existing?.primaryOwner ?? null, secondaryOwner: existing?.secondaryOwner ?? null, sensitiveData: existing?.sensitiveData ?? 'inherit', ...patch }
    await api.updateDomain(domainName, { subdomainOwners: { [subName]: merged } })
    loadAll()
  }

  // ── inheritance
  async function inheritOwnership(domainName: string, subName?: string) {
    const domain = domains.find(d => d.name === domainName)
    const owner = subName
      ? domain?.subdomains?.find(s => s.name === subName)?.primaryOwner
      : domain?.primaryOwner
    const secOwner = subName
      ? domain?.subdomains?.find(s => s.name === subName)?.secondaryOwner
      : domain?.secondaryOwner

    // At domain level: also push owners to any unassigned subdomains
    if (!subName && domain) {
      const subsToUpdate = (domain.subdomains ?? []).filter(s =>
        (!s.primaryOwner && owner) || (!s.secondaryOwner && secOwner)
      )
      await Promise.all(subsToUpdate.map(s =>
        api.updateDomain(domainName, {
          subdomainOwners: {
            [s.name]: {
              primaryOwner: s.primaryOwner ?? owner ?? null,
              secondaryOwner: s.secondaryOwner ?? secOwner ?? null,
            },
          },
        })
      ))
      if (subsToUpdate.length) loadAll()
    }

    const scope = subName
      ? tables.filter(t => t.domain === domainName && t.subdomain === subName)
      : tables.filter(t => t.domain === domainName)

    const toUpdate = scope.filter(t =>
      (!t.primaryOwner && owner) || (!t.secondaryOwner && secOwner)
    )
    if (!toUpdate.length) return

    const patches = toUpdate.map(t => {
      const patch: Parameters<typeof api.updateTable>[1] = {}
      if (!t.primaryOwner && owner) patch.primaryOwner = owner
      if (!t.secondaryOwner && secOwner) patch.secondaryOwner = secOwner
      return api.updateTable(t.tableName, patch).then(updated => {
        setTables(prev => prev.map(r => r.tableName === updated.tableName ? updated : r))
      })
    })
    await Promise.all(patches)
  }

  // ── drag & drop
  function handleTableDragStart(tableName: string) {
    draggedTable.current = tableName
  }

  async function handleDropOnDomain(domainName: string) {
    const tName = draggedTable.current
    draggedTable.current = null
    setDragOverNode(null)
    if (!tName) return
    const t = tables.find(r => r.tableName === tName)
    if (!t || t.domain === domainName) return
    const updated = await api.updateTable(tName, { domain: domainName, subdomain: null })
    setTables(prev => prev.map(r => r.tableName === tName ? updated : r))
  }

  async function handleDropOnSubdomain(domainName: string, subName: string) {
    const tName = draggedTable.current
    draggedTable.current = null
    setDragOverNode(null)
    if (!tName) return
    const t = tables.find(r => r.tableName === tName)
    if (!t || (t.domain === domainName && t.subdomain === subName)) return
    const updated = await api.updateTable(tName, { domain: domainName, subdomain: subName })
    setTables(prev => prev.map(r => r.tableName === tName ? updated : r))
  }

  function handleSubdomainDragStart(domainName: string, subdomainName: string) {
    draggedSubdomain.current = { domainName, subdomainName }
    draggedTable.current = null
  }

  async function handleDropSubdomainOnDomain(targetDomainName: string) {
    const src = draggedSubdomain.current
    draggedSubdomain.current = null
    setDragOverNode(null)
    if (!src || src.domainName === targetDomainName) return

    // Move all tables in this subdomain to the target domain
    const affected = tables.filter(t => t.domain === src.domainName && t.subdomain === src.subdomainName)
    await Promise.all(affected.map(t => api.updateTable(t.tableName, { domain: targetDomainName, subdomain: src.subdomainName })))

    // Move subdomainOwner entry: remove from source, add to target
    const srcDomain = domains.find(d => d.name === src.domainName)
    const subOwners = srcDomain?.subdomains?.find(s => s.name === src.subdomainName)
    const ownerPayload = { primaryOwner: subOwners?.primaryOwner ?? null, secondaryOwner: subOwners?.secondaryOwner ?? null }
    await Promise.all([
      api.updateDomain(src.domainName, { subdomainOwners: { [src.subdomainName]: null } }),
      api.updateDomain(targetDomainName, { subdomainOwners: { [src.subdomainName]: ownerPayload } }),
    ])

    setExpandedDomains(prev => new Set([...prev, targetDomainName]))
    setExpandedSubdomains(prev => new Set([...prev, `${targetDomainName}:${src.subdomainName}`]))
    if (selection.kind === 'subdomain' && selection.domainName === src.domainName && selection.subdomainName === src.subdomainName) {
      setSelection({ kind: 'subdomain', domainName: targetDomainName, subdomainName: src.subdomainName })
    }
    loadAll()
  }

  function tableName(t: TableRecord) {
    return nameMode === 'product' && t.productName ? t.productName : t.tableName
  }

  // ─── tree sidebar ─────────────────────────────────────────────────────────

  function TreeDomainNode({ domain, index }: { domain: DomainGroup; index: number }) {
    const isExpanded = expandedDomains.has(domain.name)
    const isSelected = selection.kind === 'domain' && selection.name === domain.name
    const isRenaming = renamingNode === `domain:${domain.name}`
    const nodeKey = `domain:${domain.name}`
    const isDragOver = dragOverNode === nodeKey
    const subs = domain.subdomains ?? []
    const roots = rootTables(domain.name)
    const dt = domainTables(domain.name)

    return (
      <div>
        {/* Domain row */}
        <div
          className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer select-none transition-colors ${
            isSelected ? 'bg-wtg-secondary/10 text-wtg-secondary' : 'hover:bg-gray-100'
          } ${isDragOver ? 'ring-2 ring-wtg-secondary bg-blue-50/40' : ''}`}
          onClick={() => {
            setSelection({ kind: 'domain', name: domain.name })
            setExpandedDomains(prev => {
              const next = new Set(prev)
              next.has(domain.name) ? next.delete(domain.name) : next.add(domain.name)
              return next
            })
          }}
          onDragOver={e => { e.preventDefault(); setDragOverNode(nodeKey) }}
          onDragLeave={() => setDragOverNode(null)}
          onDrop={() => draggedSubdomain.current ? handleDropSubdomainOnDomain(domain.name) : handleDropOnDomain(domain.name)}
        >
          <span className="text-gray-400 w-4 flex-shrink-0" onClick={e => {
            e.stopPropagation()
            setExpandedDomains(prev => { const n = new Set(prev); n.has(domain.name) ? n.delete(domain.name) : n.add(domain.name); return n })
          }}>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
          {(() => { const Icon = getDomainIcon(domain.name); return <Icon className="w-3.5 h-3.5 flex-shrink-0 text-wtg-primary/60" /> })()}
          {index <= 9 && (
            <span className="text-[9px] font-mono text-gray-400 flex-shrink-0 tabular-nums">[{index}]</span>
          )}
          {isRenaming ? (
            <InlineEdit
              value={domain.name}
              onSave={v => renameDomain(domain.name, v)}
              onCancel={() => setRenamingNode(null)}
              className="flex-1 min-w-0"
            />
          ) : (
            <span className="flex-1 min-w-0 text-sm font-medium truncate">{domain.name}</span>
          )}
          <span className="text-[10px] text-gray-400 flex-shrink-0">{dt.length}</span>
          <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-0.5 rounded hover:bg-gray-200"
              onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === nodeKey ? null : nodeKey) }}
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
            </button>
            {menuOpen === nodeKey && (
              <div className="absolute right-0 top-6 z-50 bg-white border border-wtg-border rounded-lg shadow-lg py-1 w-36" onClick={e => e.stopPropagation()}>
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => { setRenamingNode(`domain:${domain.name}`); setMenuOpen(null) }}>
                  <Pencil className="w-3 h-3" /> Rename
                </button>
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  onClick={() => { setDeleteConfirm(`domain:${domain.name}`); setMenuOpen(null) }}>
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {isExpanded && (
          <div className="ml-4 border-l border-gray-100 pl-2 space-y-0.5 mt-0.5">
            {/* Subdomains */}
            {subs.map((sub, si) => (
              <TreeSubdomainNode key={sub.name} domain={domain} sub={sub} index={si + 1} />
            ))}
            {/* Root tables (no subdomain) */}
            {roots.map(t => (
              <TreeTableNode key={t.tableName} table={t} />
            ))}
            {/* Add subdomain button */}
            <button
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-wtg-secondary px-1 py-1 rounded hover:bg-gray-50 w-full"
              onClick={e => { e.stopPropagation(); setCreatePanel({ kind: 'subdomain', domainName: domain.name }) }}
            >
              <Plus className="w-3 h-3" /> Add subdomain
            </button>
          </div>
        )}
      </div>
    )
  }

  function TreeSubdomainNode({ domain, sub, index }: { domain: DomainGroup; sub: SubdomainInfo; index: number }) {
    const subKey = `${domain.name}:${sub.name}`
    const isExpanded = expandedSubdomains.has(subKey)
    const isSelected = selection.kind === 'subdomain' && selection.domainName === domain.name && selection.subdomainName === sub.name
    const isRenaming = renamingNode === `sub:${subKey}`
    const nodeKey = `sub:${subKey}`
    const isDragOver = dragOverNode === nodeKey
    const st = subdomainTables(domain.name, sub.name)

    return (
      <div>
        <div
          draggable
          className={`group flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer select-none transition-colors ${
            isSelected ? 'bg-wtg-secondary/10 text-wtg-secondary' : 'hover:bg-gray-100'
          } ${isDragOver ? 'ring-2 ring-wtg-secondary bg-blue-50/40' : ''}`}
          onClick={() => {
            setSelection({ kind: 'subdomain', domainName: domain.name, subdomainName: sub.name })
            setExpandedSubdomains(prev => { const n = new Set(prev); n.has(subKey) ? n.delete(subKey) : n.add(subKey); return n })
          }}
          onDragStart={e => { e.stopPropagation(); handleSubdomainDragStart(domain.name, sub.name) }}
          onDragEnd={() => { draggedSubdomain.current = null; setDragOverNode(null) }}
          onDragOver={e => { e.preventDefault(); setDragOverNode(nodeKey) }}
          onDragLeave={() => setDragOverNode(null)}
          onDrop={() => handleDropOnSubdomain(domain.name, sub.name)}
        >
          <span className="text-gray-400 w-4 flex-shrink-0" onClick={e => {
            e.stopPropagation()
            setExpandedSubdomains(prev => { const n = new Set(prev); n.has(subKey) ? n.delete(subKey) : n.add(subKey); return n })
          }}>
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
          {index <= 9 && (
            <span className="text-[9px] font-mono text-gray-400 flex-shrink-0 tabular-nums">[{index}]</span>
          )}
          {isRenaming ? (
            <InlineEdit
              value={sub.name}
              onSave={v => renameSubdomain(domain.name, sub.name, v)}
              onCancel={() => setRenamingNode(null)}
              className="flex-1 min-w-0"
            />
          ) : (
            <span className="flex-1 min-w-0 text-xs font-medium truncate text-gray-700">{sub.name}</span>
          )}
          <span className="text-[10px] text-gray-400 flex-shrink-0">{st.length}</span>
          <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-0.5 rounded hover:bg-gray-200"
              onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === nodeKey ? null : nodeKey) }}
            >
              <MoreHorizontal className="w-3 h-3 text-gray-500" />
            </button>
            {menuOpen === nodeKey && (
              <div className="absolute right-0 top-6 z-50 bg-white border border-wtg-border rounded-lg shadow-lg py-1 w-36" onClick={e => e.stopPropagation()}>
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => { setRenamingNode(`sub:${subKey}`); setMenuOpen(null) }}>
                  <Pencil className="w-3 h-3" /> Rename
                </button>
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  onClick={() => { setDeleteConfirm(`sub:${subKey}`); setMenuOpen(null) }}>
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
        {isExpanded && (
          <div className="ml-4 border-l border-gray-100 pl-2 space-y-0.5 mt-0.5">
            {st.map(t => <TreeTableNode key={t.tableName} table={t} />)}
          </div>
        )}
      </div>
    )
  }

  function TreeTableNode({ table, onMouseEnter, onMouseLeave, onContextMenu }: {
    table: TableRecord
    onMouseEnter?: () => void
    onMouseLeave?: () => void
    onContextMenu?: (e: React.MouseEvent) => void
  }) {
    const isSelected = selection.kind === 'table' && selection.tableName === table.tableName
    return (
      <div
        draggable
        onDragStart={() => handleTableDragStart(table.tableName)}
        onClick={() => setSelection({ kind: 'table', tableName: table.tableName, domainName: table.domain, subdomainName: table.subdomain ?? null })}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onContextMenu={onContextMenu}
        className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer select-none group transition-colors ${
          isSelected ? 'bg-wtg-secondary/10 text-wtg-secondary' : 'hover:bg-gray-100'
        }`}
      >
        <Table2 className="w-3 h-3 text-gray-300 flex-shrink-0" />
        <span className="text-xs text-gray-600 truncate flex-1">{tableName(table)}</span>
        {table.criticality && (
          <span className={`text-[9px] font-bold px-1 rounded flex-shrink-0 ${
            table.criticality === 'H' ? 'bg-red-100 text-red-600' :
            table.criticality === 'M' ? 'bg-amber-100 text-amber-600' :
            'bg-emerald-100 text-emerald-600'
          }`}>{table.criticality}</span>
        )}
      </div>
    )
  }

  async function createSubdomain(domainName: string, name: string, primaryOwner: string | null, secondaryOwner: string | null, priority: LMH, sensitiveData: Sensitivity) {
    await api.updateDomain(domainName, { subdomainOwners: { [name]: { primaryOwner, secondaryOwner, priority, sensitiveData } } })
    setCreatePanel(null)
    setExpandedDomains(prev => new Set([...prev, domainName]))
    setSelection({ kind: 'subdomain', domainName, subdomainName: name })
    loadAll()
  }

  // ─── create domain/subdomain modal ────────────────────────────────────────

  function CreateNodeModal() {
    const panel = createPanel
    if (!panel) return null
    const isSubdomain = panel.kind === 'subdomain'
    const domainName = isSubdomain ? (panel as { kind: 'subdomain'; domainName: string }).domainName : ''

    const [name, setName] = useState('')
    const [primaryOwner, setPrimaryOwner] = useState<string | null>(null)
    const [secondaryOwner, setSecondaryOwner] = useState<string | null>(null)
    const [priority, setPriority] = useState<LMH>(null)
    const [sensitiveData, setSensitiveData] = useState<Sensitivity>(isSubdomain ? 'inherit' : 'Restricted')

    async function handleSubmit() {
      const trimmed = name.trim()
      if (!trimmed) return
      if (isSubdomain) {
        await createSubdomain(domainName, trimmed, primaryOwner, secondaryOwner, priority, sensitiveData)
      } else {
        await createDomain(trimmed, primaryOwner, secondaryOwner, priority, sensitiveData as 'Restricted' | 'Open' | null)
      }
    }

    function PriorityBtn({ val, label }: { val: LMH; label: string }) {
      const active = priority === val
      return (
        <button
          type="button"
          onClick={() => setPriority(active ? null : val)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            active ? 'bg-wtg-secondary text-white border-wtg-secondary' : 'bg-white text-gray-600 border-wtg-border hover:border-wtg-secondary/50'
          }`}
        >{label}</button>
      )
    }

    function SensitiveBtn({ val, label }: { val: Sensitivity; label: string }) {
      const active = sensitiveData === val
      return (
        <button
          type="button"
          onClick={() => setSensitiveData(val)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            active ? 'bg-wtg-secondary text-white border-wtg-secondary' : 'bg-white text-gray-600 border-wtg-border hover:border-wtg-secondary/50'
          }`}
        >{label}</button>
      )
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setCreatePanel(null)}>
        <div className="bg-white rounded-2xl shadow-xl p-8 w-[560px] space-y-5" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSubdomain ? 'bg-gray-100' : 'bg-wtg-primary/8 bg-wtg-primary/5'}`}>
              {isSubdomain ? <GitBranch className="w-5 h-5 text-gray-500" /> : <Globe className="w-5 h-5 text-wtg-primary" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{isSubdomain ? `New subdomain in ${domainName}` : 'New domain'}</h3>
              <p className="text-xs text-gray-400">{isSubdomain ? 'Creates a logical grouping within the domain' : 'Creates a top-level data domain'}</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') setCreatePanel(null) }}
              placeholder={isSubdomain ? 'Subdomain name...' : 'Domain name...'}
              className="w-full text-sm border border-wtg-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-wtg-secondary/20 focus:border-wtg-secondary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Primary Owner <span className="text-gray-400 font-normal">(50%)</span></label>
              <OwnerLookup value={primaryOwner} onChange={setPrimaryOwner} staff={staffRecords} ownerCounts={ownerCounts} placeholder="Unassigned" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Secondary Owner <span className="text-gray-400 font-normal">(50%)</span></label>
              <OwnerLookup value={secondaryOwner} onChange={setSecondaryOwner} staff={staffRecords} ownerCounts={ownerCounts} placeholder="Unassigned" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Priority</label>
            <div className="flex gap-2">
              <PriorityBtn val="High" label="High" />
              <PriorityBtn val="Medium" label="Medium" />
              <PriorityBtn val="Low" label="Low" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Sensitivity</label>
            <div className="flex gap-2">
              <SensitiveBtn val="Restricted" label="Restricted" />
              <SensitiveBtn val="Open" label="Open" />
              {isSubdomain && <SensitiveBtn val="inherit" label="Inherit" />}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button className="btn-secondary" onClick={() => setCreatePanel(null)}>Cancel</button>
            <button
              className="px-4 py-2 rounded-lg bg-wtg-secondary text-white text-sm font-medium hover:bg-wtg-secondary-dark transition-colors disabled:opacity-40"
              disabled={!name.trim()}
              onClick={handleSubmit}
            >
              Create {isSubdomain ? 'subdomain' : 'domain'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── overview panel ───────────────────────────────────────────────────────

  function OverviewPanel() {
    const totalOwned = tables.filter(t => t.primaryOwner).length
    const pctOwned = tables.length > 0 ? Math.round((totalOwned / tables.length) * 100) : 0
    const highUnowned = tables.filter(t => t.criticality === 'H' && !t.primaryOwner).length

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={Globe} label="Domains" value={domains.length} color="blue" />
          <StatCard icon={Database} label="Tables" value={tables.length} sub="across all domains" color="blue" />
          <StatCard icon={Users} label="Ownership" value={`${pctOwned}%`} sub={`${totalOwned} of ${tables.length} assigned`} color="green" />
          <StatCard icon={AlertTriangle} label="High Crit. Unowned" value={highUnowned} sub="Needs attention" color="red" />
        </div>

        {/* Domain cards grid */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">All Domains</h2>
          <div className="grid grid-cols-2 gap-4">
            {domains.map((d, i) => {
              const dt = domainTables(d.name)
              const assignedCount = dt.filter(t => t.primaryOwner).length
              const pct = dt.length > 0 ? Math.round((assignedCount / dt.length) * 100) : 0
              return (
                <div
                  key={d.name}
                  className="card p-5 cursor-pointer hover:shadow-md hover:border-wtg-secondary/30 transition-all"
                  onClick={() => { setSelection({ kind: 'domain', name: d.name }); setExpandedDomains(prev => new Set([...prev, d.name])) }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-wtg-primary/5 flex items-center justify-center flex-shrink-0">
                        {(() => { const Icon = getDomainIcon(d.name); return <Icon className="w-4 h-4 text-wtg-primary" /> })()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {i < 9 && <span className="font-mono text-gray-400 mr-1">[{i + 1}]</span>}
                          {d.name}
                        </p>
                        <p className="text-xs text-gray-400">{dt.length} tables · {(d.subdomains ?? []).length} subdomains</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 mt-1" />
                  </div>
                  {d.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{d.description}</p>
                  )}
                  {/* Criticality breakdown */}
                  <div className="flex gap-1 mb-3">
                    {d.criticalityBreakdown.H > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">{d.criticalityBreakdown.H}H</span>
                    )}
                    {d.criticalityBreakdown.M > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-medium">{d.criticalityBreakdown.M}M</span>
                    )}
                    {d.criticalityBreakdown.L > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 font-medium">{d.criticalityBreakdown.L}L</span>
                    )}
                  </div>
                  {/* Ownership bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
                  </div>
                  {/* Owner */}
                  <div className="mt-2">
                    <OwnerChip name={d.primaryOwner} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ─── domain editor panel ──────────────────────────────────────────────────

  function DomainEditorPanel({ domain }: { domain: DomainGroup }) {
    const [desc, setDesc] = useState(domain.description)
    const [descDirty, setDescDirty] = useState(false)
    const dt = domainTables(domain.name)
    const subs = domain.subdomains ?? []

    async function saveDesc() {
      if (!descDirty) return
      await updateDomainField(domain.name, { description: desc })
      setDescDirty(false)
    }

    const inheritableCount = dt.filter(t =>
      (!t.primaryOwner && !!domain.primaryOwner) || (!t.secondaryOwner && !!domain.secondaryOwner)
    ).length + (domain.subdomains ?? []).filter(s =>
      (!s.primaryOwner && !!domain.primaryOwner) || (!s.secondaryOwner && !!domain.secondaryOwner)
    ).length

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-wtg-primary/8 bg-wtg-primary/5 flex items-center justify-center">
              <Globe className="w-5 h-5 text-wtg-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{domain.name}</h2>
              <p className="text-xs text-gray-400">{dt.length} tables · {subs.length} subdomains</p>
            </div>
          </div>
          <button
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 transition-colors"
            onClick={() => setDeleteConfirm(`domain:${domain.name}`)}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete domain
          </button>
        </div>

        {/* Metadata card */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Domain details</h3>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
            <textarea
              value={desc}
              onChange={e => { setDesc(e.target.value); setDescDirty(true) }}
              onBlur={saveDesc}
              rows={2}
              className="w-full text-sm border border-wtg-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20 focus:border-wtg-secondary"
              placeholder="Describe this domain..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Primary Owner</label>
              <OwnerLookup
                value={domain.primaryOwner}
                onChange={v => updateDomainField(domain.name, { primaryOwner: v })}
                staff={staffRecords}
                ownerCounts={ownerCounts}
                placeholder="Unassigned"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Secondary Owner</label>
              <OwnerLookup
                value={domain.secondaryOwner}
                onChange={v => updateDomainField(domain.name, { secondaryOwner: v })}
                staff={staffRecords}
                ownerCounts={ownerCounts}
                placeholder="Unassigned"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Sensitivity</label>
            <EditableSensitivityPill
              value={domain.sensitiveData}
              onSave={v => updateDomainField(domain.name, { sensitiveData: v as 'Restricted' | 'Open' | null })}
              inheritable={false}
            />
          </div>

          {(domain.primaryOwner || domain.secondaryOwner) && inheritableCount > 0 && (
            <button
              className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2 hover:bg-emerald-100 transition-colors"
              onClick={() => inheritOwnership(domain.name)}
            >
              <Users className="w-3.5 h-3.5" />
              Inherit ownership to {inheritableCount} unassigned table{inheritableCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Subdomains summary */}
        {subs.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Subdomains</h3>
            <div className="space-y-2">
              {subs.map(sub => (
                <div
                  key={sub.name}
                  className="flex items-center gap-3 p-3 rounded-lg border border-wtg-border hover:border-wtg-secondary/30 hover:bg-blue-50/20 cursor-pointer transition-colors"
                  onClick={() => setSelection({ kind: 'subdomain', domainName: domain.name, subdomainName: sub.name })}
                >
                  <GitBranch className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{sub.name}</p>
                    <p className="text-xs text-gray-400">{sub.tableCount} tables</p>
                  </div>
                  <OwnerChip name={sub.primaryOwner} />
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tables list */}
        <DomainTablesCard domainName={domain.name} subs={subs} />
      </div>
    )
  }

  // ─── subdomain editor panel ───────────────────────────────────────────────

  function SubdomainEditorPanel({ domain, sub }: { domain: DomainGroup; sub: SubdomainInfo }) {
    const st = subdomainTables(domain.name, sub.name)
    const inheritableCount = st.filter(t =>
      (!t.primaryOwner && !!sub.primaryOwner) || (!t.secondaryOwner && !!sub.secondaryOwner)
    ).length

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{domain.name}</p>
              <h2 className="text-lg font-bold text-gray-900">{sub.name}</h2>
              <p className="text-xs text-gray-400">{st.length} tables</p>
            </div>
          </div>
          <button
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 transition-colors"
            onClick={() => setDeleteConfirm(`sub:${domain.name}:${sub.name}`)}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete subdomain
          </button>
        </div>

        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Subdomain details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Primary Owner</label>
              <OwnerLookup
                value={sub.primaryOwner}
                onChange={v => updateSubdomainOwner(domain.name, sub.name, { primaryOwner: v })}
                staff={staffRecords}
                ownerCounts={ownerCounts}
                placeholder="Unassigned"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Secondary Owner</label>
              <OwnerLookup
                value={sub.secondaryOwner}
                onChange={v => updateSubdomainOwner(domain.name, sub.name, { secondaryOwner: v })}
                staff={staffRecords}
                ownerCounts={ownerCounts}
                placeholder="Unassigned"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Sensitivity</label>
            <EditableSensitivityPill
              value={sub.sensitiveData}
              onSave={v => updateSubdomainOwner(domain.name, sub.name, { sensitiveData: v as Sensitivity })}
              inheritable={true}
            />
          </div>

          {(sub.primaryOwner || sub.secondaryOwner) && inheritableCount > 0 && (
            <button
              className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2 hover:bg-emerald-100 transition-colors"
              onClick={() => inheritOwnership(domain.name, sub.name)}
            >
              <Users className="w-3.5 h-3.5" />
              Inherit ownership to {inheritableCount} unassigned table{inheritableCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Tables */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-wtg-border bg-gray-50/80 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Tables in {sub.name}</h3>
            <span className="text-xs text-gray-400">{st.length} tables</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wtg-border">
                <th className="th">Table</th>
                <th className="th">Criticality</th>
                <th className="th">Primary Owner</th>
                <th className="th">Dev Team</th>
              </tr>
            </thead>
            <tbody>
              {st.map(t => (
                <tr
                  key={t.tableName}
                  draggable
                  onDragStart={() => handleTableDragStart(t.tableName)}
                  className="border-b border-wtg-border/30 hover:bg-blue-50/20 cursor-grab active:cursor-grabbing"
                >
                  <td className="td">
                    <button className="text-left hover:underline text-wtg-secondary font-medium" onClick={() => setSelection({ kind: 'table', tableName: t.tableName, domainName: t.domain, subdomainName: t.subdomain ?? null })}>
                      {tableName(t)}
                    </button>
                  </td>
                  <td className="td"><CriticalityPill value={t.criticality} /></td>
                  <td className="td"><OwnerChip name={t.primaryOwner} /></td>
                  <td className="td"><span className="text-xs text-gray-500">{t.devTeamOwner ?? '—'}</span></td>
                </tr>
              ))}
              {st.length === 0 && (
                <tr><td colSpan={4} className="td text-center text-gray-400 py-6">No tables — drag tables here from the tree</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ─── shared tables card for domain view ───────────────────────────────────

  function DomainTablesCard({ domainName, subs }: { domainName: string; subs: SubdomainInfo[] }) {
    const dt = domainTables(domainName)
    const subNames = subs.map(s => s.name)
    const [subFilter, setSubFilter] = useState<string | null>(null)

    const visible = subFilter
      ? dt.filter(t => t.subdomain === subFilter)
      : dt

    return (
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-wtg-border bg-gray-50/80 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Tables</h3>
          <div className="flex items-center gap-2">
            {subNames.length > 0 && (
              <select
                value={subFilter ?? ''}
                onChange={e => setSubFilter(e.target.value || null)}
                className="text-xs border border-wtg-border rounded px-2 py-1 bg-white"
              >
                <option value="">All subdomains</option>
                {subNames.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="__root__">No subdomain</option>
              </select>
            )}
            <span className="text-xs text-gray-400">{visible.length} tables</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-wtg-border">
              <th className="th">Table</th>
              <th className="th">Subdomain</th>
              <th className="th">Criticality</th>
              <th className="th">Primary Owner</th>
              <th className="th">Dev Team</th>
            </tr>
          </thead>
          <tbody>
            {(subFilter === '__root__' ? dt.filter(t => !t.subdomain) : visible).map(t => (
              <tr
                key={t.tableName}
                draggable
                onDragStart={() => handleTableDragStart(t.tableName)}
                className="border-b border-wtg-border/30 hover:bg-blue-50/20 cursor-grab active:cursor-grabbing"
              >
                <td className="td">
                  <button className="text-left hover:underline text-wtg-secondary font-medium" onClick={() => setSelection({ kind: 'table', tableName: t.tableName, domainName: t.domain, subdomainName: t.subdomain ?? null })}>
                    {tableName(t)}
                  </button>
                </td>
                <td className="td">
                  <span className="text-xs text-gray-500">{t.subdomain ?? <span className="italic text-gray-300">—</span>}</span>
                </td>
                <td className="td"><CriticalityPill value={t.criticality} /></td>
                <td className="td"><OwnerChip name={t.primaryOwner} /></td>
                <td className="td"><span className="text-xs text-gray-500">{t.devTeamOwner ?? '—'}</span></td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={5} className="td text-center text-gray-400 py-6">No tables</td></tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  // ─── delete confirmation modal ────────────────────────────────────────────

  function DeleteConfirmModal() {
    if (!deleteConfirm) return null
    const parts = deleteConfirm.split(':')
    const isDomain = parts[0] === 'domain'
    const warning = isDomain
      ? `All tables in this domain will be moved to "Unclassified".`
      : `All tables will be moved to the "${parts[1]}" domain root.`

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDeleteConfirm(null)}>
        <div className="bg-white rounded-2xl shadow-xl p-6 w-96" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Delete {isDomain ? 'domain' : 'subdomain'}</h3>
          </div>
          <p className="text-sm text-gray-600 mb-1">Are you sure you want to delete the <strong>{isDomain ? parts[1] : parts[2]}</strong> {isDomain ? 'domain' : 'subdomain'}?</p>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">{warning}</p>
          <div className="flex gap-2 justify-end">
            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              onClick={() => {
                if (isDomain) deleteDomain(parts[1])
                else deleteSubdomain(parts[1], parts[2])
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full -m-6 overflow-hidden">
      {/* Domain tree sidebar */}
      <aside className="w-72 bg-white border-r border-wtg-border flex flex-col flex-shrink-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-wtg-border flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Domains</h2>
          <button
            className="flex items-center gap-1 text-xs text-wtg-secondary hover:text-wtg-secondary-dark font-medium"
            onClick={() => { setCreatePanel({ kind: 'domain' }); setSelection({ kind: 'none' }) }}
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {/* All domains link */}
          <button
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              selection.kind === 'none' ? 'bg-wtg-secondary/10 text-wtg-secondary font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setSelection({ kind: 'none' })}
          >
            <Globe className="w-3.5 h-3.5" /> All Domains
          </button>

          <div className="h-px bg-gray-100 my-1" />

          {domains.map((d, i) => (
            <TreeDomainNode key={d.name} domain={d} index={i + 1} />
          ))}

          {/* Unsorted tables */}
          {(() => {
            const domainNames = new Set(domains.map(d => d.name))
            const unsorted = tables.filter(t => !domainNames.has(t.domain))
            if (unsorted.length === 0) return null
            const nodeKey = 'domain:__unsorted__'
            const isDragOver = dragOverNode === nodeKey
            return (
              <div className="mt-2">
                <div className="h-px bg-gray-100 mb-2" />
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-2 mb-1">Unsorted ({unsorted.length})</p>
                <div
                  className={`rounded-lg transition-colors ${isDragOver ? 'ring-2 ring-wtg-secondary bg-blue-50/40' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOverNode(nodeKey) }}
                  onDragLeave={() => setDragOverNode(null)}
                  onDrop={() => { setDragOverNode(null) }}
                >
                  {unsorted.map(t => (
                    <TreeTableNode
                      key={t.tableName}
                      table={t}
                      onMouseEnter={() => setHoveredUnsortedTable(t.tableName)}
                      onMouseLeave={() => setHoveredUnsortedTable(null)}
                      onContextMenu={e => { e.preventDefault(); setContextMenu({ tableName: t.tableName, x: e.clientX, y: e.clientY }) }}
                    />
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </aside>

      {/* Main content */}
      {selection.kind === 'none' && <OverviewPanel />}
      {selection.kind === 'domain' && selectedDomain && (
        <DomainEditorPanel domain={selectedDomain} />
      )}
      {selection.kind === 'subdomain' && selectedDomain && selectedSubdomain && (
        <SubdomainEditorPanel domain={selectedDomain} sub={selectedSubdomain} />
      )}
      {selection.kind === 'table' && (
        <div className="flex-1 overflow-y-auto p-6">
          <TableDetailContent
            tableName={selection.tableName}
            onTableClick={(clickedTable) => {
              const found = tables.find(t => t.tableName === clickedTable)
              setSelection({ kind: 'table', tableName: clickedTable, domainName: found?.domain ?? '', subdomainName: found?.subdomain ?? null })
            }}
          />
        </div>
      )}

      <DeleteConfirmModal />
      <CreateNodeModal />

      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-wtg-border rounded-lg shadow-lg py-1 w-52"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Assign to Domain</p>
          {domains.map((d, i) => (
            <button
              key={d.name}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
              onClick={async () => {
                const updated = await api.updateTable(contextMenu.tableName, { domain: d.name, subdomain: null })
                setTables(prev => prev.map(r => r.tableName === contextMenu.tableName ? updated : r))
                setContextMenu(null)
              }}
            >
              {i < 9 && (
                <span className="w-4 h-4 rounded bg-gray-100 text-gray-500 text-[9px] font-mono flex items-center justify-center flex-shrink-0">{i + 1}</span>
              )}
              <span className="truncate">{d.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
