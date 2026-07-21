import { useRef } from 'react'
import { Pencil } from 'lucide-react'
import type { Sensitivity } from '../types'
import { HoverShortcut, StringLookup } from './Lookup'
import { EditableCell } from './EditableCell'

const DOMAIN_OPTIONS = ['Restricted', 'Open', '—'] as const
const INHERIT_OPTIONS = ['Restricted', 'Open', 'Inherit', '—'] as const

const LABEL_TO_KEY: Record<string, Sensitivity> = {
  Restricted: 'Restricted',
  Open: 'Open',
  Inherit: 'inherit',
  '—': null,
}
const KEY_TO_LABEL: Record<string, string> = {
  Restricted: 'Restricted',
  Open: 'Open',
  inherit: 'Inherit',
}

export function SensitivityPill({ value }: { value: Sensitivity }) {
  if (value === 'Restricted') return <span className="badge bg-red-50 text-red-600 ring-1 ring-inset ring-red-200">Restricted</span>
  if (value === 'Open') return <span className="badge bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">Open</span>
  if (value === 'inherit') return <span className="badge badge-unassigned opacity-60">Inherit ↑</span>
  return <span className="badge badge-unassigned">—</span>
}

export function EditableSensitivityPill({
  value,
  onSave,
  inheritable = false,
  tableCell = false,
  portal = false,
  onMoveDown,
  rowId,
  colId,
}: {
  value: Sensitivity
  onSave: (v: Sensitivity) => void
  inheritable?: boolean
  tableCell?: boolean
  portal?: boolean
  onMoveDown?: () => void
  rowId?: string
  colId?: string
}) {
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const options = inheritable ? INHERIT_OPTIONS : DOMAIN_OPTIONS
  const displayValue = value ?? null

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
              onMoveDown?.()
            }}
          />
          <SensitivityPill value={displayValue} />
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
          onEnterSelect={onMoveDown}
        />
      )}
    />
  )
}
