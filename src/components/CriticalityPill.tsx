import { useRef } from 'react'
import { Pencil } from 'lucide-react'
import type { Criticality } from '../types'
import { HoverShortcut, StringLookup } from './Lookup'
import { EditableCell } from './EditableCell'

type ResolvedCriticality = Exclude<Criticality, 'Inherit'>

const TABLE_OPTIONS = ['High', 'Medium', 'Low', '—'] as const
const COL_OPTIONS = ['High', 'Medium', 'Low', 'Inherit', '—'] as const
const LABEL_TO_KEY: Record<string, Criticality> = { High: 'H', Medium: 'M', Low: 'L', Inherit: 'Inherit', '—': null }
const KEY_TO_LABEL: Record<string, string> = { H: 'High', M: 'Medium', L: 'Low', Inherit: 'Inherit' }

// Resolves the effective (non-Inherit) criticality, following one level of inheritance
export function resolveEffectiveCriticality(
  value: Criticality,
  parentValue: ResolvedCriticality | null | undefined,
): ResolvedCriticality {
  if (!value || value === 'Inherit') return parentValue ?? null
  return value
}

function PillBadge({ value }: { value: ResolvedCriticality }) {
  if (value === 'H') return <span className="badge badge-high">High</span>
  if (value === 'M') return <span className="badge badge-medium">Medium</span>
  if (value === 'L') return <span className="badge badge-low">Low</span>
  return <span className="badge badge-unassigned">—</span>
}

export function CriticalityPill({
  value,
  inheritedFrom,
}: {
  value: Criticality
  inheritedFrom?: ResolvedCriticality | null
}) {
  if (value === 'Inherit') {
    return (
      <span className="flex items-center gap-1 opacity-60" title="Inherited from parent">
        <PillBadge value={inheritedFrom ?? null} />
        <span className="text-[9px] text-gray-400">↑</span>
      </span>
    )
  }
  return <PillBadge value={value} />
}

export function EditableCriticalityPill({
  value,
  onSave,
  inheritable = false,
  inheritedFrom,
  tableCell = false,
  portal = false,
  counts,
  onMoveDown,
  rowId,
  colId,
}: {
  value: Criticality
  onSave: (v: Criticality) => void
  inheritable?: boolean
  inheritedFrom?: ResolvedCriticality | null
  tableCell?: boolean
  portal?: boolean
  /** Count of items at each criticality level — label keys e.g. 'High', 'Medium', 'Low', 'Inherit' */
  counts?: Partial<Record<string, number>>
  onMoveDown?: () => void
  rowId?: string
  colId?: string
}) {
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  const onMoveDownRef = useRef(onMoveDown)
  onMoveDownRef.current = onMoveDown

  const options: readonly string[] = inheritable ? COL_OPTIONS : TABLE_OPTIONS
  const displayValue = (!value || value === 'Inherit') && inheritable ? 'Inherit' : value

  return (
    <EditableCell
      asButton
      tableCell={tableCell}
      rowId={rowId}
      colId={colId}
      renderDisplay={(isHovered) => (
        <>
          <HoverShortcut<string>
            isHovering={isHovered}
            items={[...options]}
            sortItems={false}
            getLabel={s => s}
            onSelect={(label) => {
              onSaveRef.current(LABEL_TO_KEY[label])
              onMoveDownRef.current?.()
            }}
          />
          <CriticalityPill value={displayValue} inheritedFrom={inheritedFrom} />
          <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </>
      )}
      renderEditor={(close) => (
        <StringLookup
          value={displayValue ? KEY_TO_LABEL[displayValue] ?? null : null}
          onChange={(v) => {
            onSave(LABEL_TO_KEY[v ?? '—'])
            close()
          }}
          items={[...options]}
          clearable={false}
          autoOpen
          portal={portal}
          sortItems={false}
          renderItemSuffix={counts ? (label) => {
            const n = counts[label]
            return n !== undefined && n > 0
              ? <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">{n}</span>
              : null
          } : undefined}
          onEnterSelect={onMoveDown}
        />
      )}
    />
  )
}
