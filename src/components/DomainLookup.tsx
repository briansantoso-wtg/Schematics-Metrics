import { useMemo } from 'react'
import { Check } from 'lucide-react'
import type { DomainGroup } from '../types'
import Lookup from './Lookup'
import { DomainHoverCard } from './DomainHoverCard'

interface BaseLookupProps {
  value: string | null
  onChange: (v: string | null) => void
  items: string[]
  placeholder?: string
  clearable?: boolean
  autoOpen?: boolean
  portal?: boolean
  initialItems?: string[]
  minSearchLength?: number
  onEnterSelect?: () => void
  onTabSelect?: () => boolean | void
  onShiftTabSelect?: () => boolean | void
}

const ITEM_BADGE = 'text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0'

export function DomainLookup({
  value, onChange, items, allDomains,
  placeholder, clearable, autoOpen, portal, initialItems, minSearchLength,
  onEnterSelect, onTabSelect, onShiftTabSelect,
}: BaseLookupProps & { allDomains: DomainGroup[] }) {
  const domainMap = useMemo(() => new Map(allDomains.map(d => [d.name, d])), [allDomains])

  return (
    <Lookup<string>
      value={value}
      onChange={onChange}
      items={items}
      getKey={s => s}
      getLabel={s => s}
      filterFn={(s, q) => s.toLowerCase().includes(q.toLowerCase())}
      renderItem={(name, _h, isSel) => {
        const domain = domainMap.get(name)
        return (
          <>
            <span className="flex-1 text-sm text-gray-900">{name}</span>
            {domain && domain.tableCount > 0 && (
              <span className={ITEM_BADGE}>{domain.tableCount}</span>
            )}
            {isSel && <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
          </>
        )
      }}
      renderItemTooltip={(name) => {
        const domain = domainMap.get(name)
        return domain ? <DomainHoverCard domain={domain} /> : null
      }}
      placeholder={placeholder}
      clearable={clearable}
      autoOpen={autoOpen}
      portal={portal}
      initialItems={initialItems}
      minSearchLength={minSearchLength}
      onEnterSelect={onEnterSelect}
      onTabSelect={onTabSelect}
      onShiftTabSelect={onShiftTabSelect}
    />
  )
}

export function SubdomainLookup({
  value, onChange, items, allDomains,
  placeholder, clearable, autoOpen, portal, initialItems, minSearchLength,
  onEnterSelect, onTabSelect, onShiftTabSelect,
}: BaseLookupProps & { allDomains: DomainGroup[] }) {
  const subMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of allDomains) {
      for (const s of d.subdomains ?? []) m.set(s.name, s.tableCount)
    }
    return m
  }, [allDomains])

  return (
    <Lookup<string>
      value={value}
      onChange={onChange}
      items={items}
      getKey={s => s}
      getLabel={s => s}
      filterFn={(s, q) => s.toLowerCase().includes(q.toLowerCase())}
      renderItem={(name, _h, isSel) => {
        const count = subMap.get(name)
        return (
          <>
            <span className="flex-1 text-sm text-gray-900">{name}</span>
            {count !== undefined && count > 0 && <span className={ITEM_BADGE}>{count}</span>}
            {isSel && <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
          </>
        )
      }}
      placeholder={placeholder}
      clearable={clearable}
      autoOpen={autoOpen}
      portal={portal}
      initialItems={initialItems}
      minSearchLength={minSearchLength}
      onEnterSelect={onEnterSelect}
      onTabSelect={onTabSelect}
      onShiftTabSelect={onShiftTabSelect}
    />
  )
}
