import { useMemo } from 'react'
import { Check } from 'lucide-react'
import type { StaffRecord } from '../types'
import Lookup from './Lookup'
import { OwnerHoverCard } from './OwnerHoverCard'

type OwnerOption = { key: string; label: string; title: string | null; ownershipCount: number; isNone: boolean }

export function OwnerLookup({
  value, onChange, staff, ownerCounts,
  placeholder = 'Unassigned', noneFirst = false,
  autoOpen, portal,
  onEnterSelect, onTabSelect, onShiftTabSelect,
}: {
  value: string | null
  onChange: (v: string | null) => void
  staff: StaffRecord[]
  ownerCounts: Map<string, number>
  placeholder?: string
  noneFirst?: boolean
  autoOpen?: boolean
  portal?: boolean
  onEnterSelect?: () => void
  onTabSelect?: () => boolean | void
  onShiftTabSelect?: () => boolean | void
}) {
  const staffMap = useMemo(() => new Map(staff.map(s => [s.fullName, s])), [staff])

  const items: OwnerOption[] = useMemo(() => {
    const ranked = staff
      .map(s => ({ key: s.code, label: s.fullName, title: s.title, ownershipCount: ownerCounts.get(s.fullName) ?? 0, isNone: false }))
      .sort((a, b) => b.ownershipCount - a.ownershipCount)
    if (noneFirst) ranked.unshift({ key: '__none__', label: 'None', title: null, ownershipCount: 0, isNone: true })
    return ranked
  }, [staff, ownerCounts, noneFirst])

  const initialItems = useMemo(() => items.filter(o => o.isNone || o.ownershipCount > 0), [items])
  const selected = value ? items.find(o => o.label === value) ?? null : (noneFirst ? items[0] : null)

  return (
    <Lookup<OwnerOption>
      value={selected}
      onChange={o => onChange(o?.isNone ? null : o?.label ?? null)}
      items={items}
      getKey={o => o.key}
      getLabel={o => o.label}
      filterFn={(o, q) => o.label.toLowerCase().includes(q.toLowerCase()) || o.key.toLowerCase().includes(q.toLowerCase())}
      renderLeadIcon={(v, isOpen) =>
        v && !v.isNone && !isOpen ? (
          <div className="w-5 h-5 rounded-full bg-wtg-primary text-white text-[9px] font-bold flex items-center justify-center">
            {v.label.split(' ').map(n => n[0]).join('')}
          </div>
        ) : undefined
      }
      renderItem={(o, _h, isSel) => (
        <>
          {o.isNone ? (
            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-400 text-[9px] font-bold flex items-center justify-center flex-shrink-0">—</div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-wtg-primary text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
              {o.label.split(' ').map(n => n[0]).join('')}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className={`text-sm ${o.isNone ? 'text-gray-400 italic' : 'text-gray-900'}`}>{o.label}</span>
            {o.title && <span className="text-[10px] text-gray-400 ml-1.5">{o.title}</span>}
          </div>
          {o.ownershipCount > 0 && (
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
              {o.ownershipCount}
            </span>
          )}
          {isSel && <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
        </>
      )}
      renderItemTooltip={(o) => {
        if (o.isNone) return null
        const s = staffMap.get(o.label)
        return s ? <OwnerHoverCard staff={s} ownershipCount={o.ownershipCount} /> : null
      }}
      placeholder={placeholder}
      initialItems={initialItems}
      minSearchLength={3}
      autoOpen={autoOpen}
      portal={portal}
      onEnterSelect={onEnterSelect}
      onTabSelect={onTabSelect}
      onShiftTabSelect={onShiftTabSelect}
    />
  )
}
