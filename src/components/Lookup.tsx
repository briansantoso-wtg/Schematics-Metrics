/**
 * Generic Lookup (combobox/autocomplete) + domain-specific implementations.
 *
 * Usage:
 *   import Lookup from './Lookup'                   // generic
 *   import { PersonLookup } from './Lookup'         // person-specific
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, ChevronDown, Check } from 'lucide-react'

// ─── Generic Lookup ────────────────────────────────────────────────────────────

export interface LookupProps<T> {
  value: T | null
  onChange: (item: T | null) => void
  items: T[]
  /** Stable key for React reconciliation and selection comparison */
  getKey: (item: T) => string
  /** Text shown in the input when an item is selected and closed */
  getLabel: (item: T) => string
  /** Return true if the item matches the current query */
  filterFn: (item: T, query: string) => boolean
  /** Render the contents of each dropdown row */
  renderItem: (item: T, isHighlighted: boolean, isSelected: boolean) => React.ReactNode
  /** Render the left icon inside the input (receives current value + open state) */
  renderLeadIcon?: (value: T | null, isOpen: boolean) => React.ReactNode
  placeholder?: string
  clearable?: boolean
  /** Open the dropdown immediately on mount (for inline edit use) */
  autoOpen?: boolean
  /** Render the dropdown via portal to escape overflow-hidden/auto containers */
  portal?: boolean
  /** Sort items alphabetically in the dropdown (default true) */
  sortItems?: boolean
  /** Items shown before the user has typed minSearchLength characters; falls back to items */
  initialItems?: T[]
  /** Minimum query length before searching all items (default: search from first character) */
  minSearchLength?: number
  /** Called after confirming a selection via Enter — use for cell navigation */
  onEnterSelect?: () => void
  /** Called after confirming a selection via Tab — use for cell navigation */
  onTabSelect?: () => boolean | void
  /** Called after confirming a selection via Shift+Tab — use for cell navigation */
  onShiftTabSelect?: () => boolean | void
  /** Render a hover card when the user hovers an item in the dropdown */
  renderItemTooltip?: (item: T) => React.ReactNode
  /** Secondary line shown beneath each item in the dropdown */
  getSubtitle?: (item: T) => string | null
}

export function Lookup<T,>({
  value,
  onChange,
  items,
  getKey,
  getLabel,
  filterFn,
  renderItem,
  renderLeadIcon,
  placeholder = 'Search...',
  clearable = true,
  autoOpen = false,
  portal = false,
  sortItems = true,
  initialItems,
  minSearchLength,
  onEnterSelect,
  onTabSelect,
  onShiftTabSelect,
  renderItemTooltip,
  getSubtitle,
}: LookupProps<T>) {
  const [query, setQuery] = useState('')
  const [userHasTyped, setUserHasTyped] = useState(false)
  const [isOpen, setIsOpen] = useState(() => autoOpen)

  function applySort(list: T[]): T[] {
    return sortItems ? list.slice().sort((a, b) => getLabel(a).localeCompare(getLabel(b))) : list
  }

  function sortedIndex(list: T[], current: T | null): number {
    if (!current) return 0
    const sorted = applySort(list)
    const idx = sorted.findIndex(item => getKey(item) === getKey(current))
    return Math.max(0, idx)
  }

  const [highlighted, setHighlighted] = useState(() => autoOpen ? sortedIndex(items, value) : 0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [portalPos, setPortalPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [hoveredItem, setHoveredItem] = useState<T | null>(null)
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current) }, [])

  const isInvalid = value !== null && !items.some(item => getKey(item) === getKey(value))

  const queryReady = userHasTyped && query.trim().length >= (minSearchLength ?? 1)
  const searchPending = userHasTyped && query.trim().length > 0 && !queryReady
  const baseItems = initialItems ?? items
  const filtered = applySort(queryReady ? items.filter(item => filterFn(item, query)) : baseItems)

  const handleItemMouseEnter = useCallback((item: T, e: React.MouseEvent<HTMLLIElement>) => {
    setHighlighted(filtered.indexOf(item))
    if (!renderItemTooltip) return
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setHoveredItem(item)
    setHoverRect(e.currentTarget.getBoundingClientRect())
  }, [filtered, renderItemTooltip]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleItemMouseLeave = useCallback(() => {
    if (!renderItemTooltip) return
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null)
      setHoverRect(null)
    }, 100)
  }, [renderItemTooltip])

  useEffect(() => { setHighlighted(0) }, [query])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[highlighted] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  // Auto-focus and select-all when opened via autoOpen (pre-fills existing value)
  useEffect(() => {
    if (autoOpen) setTimeout(() => inputRef.current?.select(), 0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Compute portal position when dropdown opens and track scroll/resize
  useEffect(() => {
    if (!portal) return
    if (!isOpen || !containerRef.current) { setPortalPos(null); return }
    const el = containerRef.current
    function update() {
      const rect = el.getBoundingClientRect()
      setPortalPos({ top: rect.bottom + 1, left: rect.left, width: rect.width })
    }
    update()
    // Re-position on any scroll (capture phase catches scrollable ancestors) or resize
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [isOpen, portal])

  useEffect(() => {
    if (!isOpen) return
    function handle(e: MouseEvent) {
      const target = e.target as Node
      if (!containerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setIsOpen(false)
        setQuery('')
        setUserHasTyped(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [isOpen])

  function open() {
    setQuery('')
    setUserHasTyped(false)
    setHighlighted(sortedIndex(items, value))
    setIsOpen(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function close() {
    setIsOpen(false)
    setQuery('')
    setUserHasTyped(false)
    setHoveredItem(null)
    setHoverRect(null)
  }

  function select(item: T) {
    onChange(item)
    close()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) { open(); return }
        setHighlighted(h => Math.min(h + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlighted(h => Math.max(h - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (isOpen) {
          if (filtered[highlighted]) select(filtered[highlighted])
          else close()
          onEnterSelect?.()
        } else {
          open()
        }
        break
      case 'Escape':
        e.preventDefault()
        close()
        inputRef.current?.blur()
        break
      case 'Tab':
        if (isOpen && filtered[highlighted]) select(filtered[highlighted])
        else close()
        if (e.shiftKey) {
          if (onShiftTabSelect) {
            const didMove = onShiftTabSelect()
            if (didMove !== false) e.preventDefault()
          }
        } else if (onTabSelect) {
          const didMove = onTabSelect()
          if (didMove !== false) e.preventDefault()
        }
        break
      default: {
        const digit = e.key >= '1' && e.key <= '9' ? parseInt(e.key) - 1
          : e.key === '0' ? 9 : -1
        if (digit < 0) break
        const idx = e.ctrlKey ? digit + 10 : digit
        if (idx < filtered.length) {
          e.preventDefault()
          select(filtered[idx])
          onEnterSelect?.()
        }
      }
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
    open()
    inputRef.current?.focus()
  }

  const inputValue = isOpen
    ? (userHasTyped ? query : (value ? getLabel(value) : ''))
    : (value ? getLabel(value) : '')
  const defaultLeadIcon = <Search className="w-3.5 h-3.5 text-gray-400" />

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div
        className={`flex items-center gap-2 border rounded-lg transition-all bg-white cursor-text ${
          isOpen
            ? 'border-wtg-secondary ring-2 ring-wtg-secondary/10 shadow-sm'
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => { if (!isOpen) { open(); inputRef.current?.focus() } }}
      >
        <div className="pl-2.5 flex-shrink-0">
          {renderLeadIcon ? renderLeadIcon(value, isOpen) : defaultLeadIcon}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => { setQuery(e.target.value); setUserHasTyped(true) }}
          onFocus={() => { if (!isOpen) open() }}
          onKeyDown={handleKeyDown}
          placeholder={value ? '' : placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`flex-1 py-2 pr-1 text-sm bg-transparent focus:outline-none min-w-0 ${
            isInvalid && !isOpen ? 'text-red-600 font-medium' :
            value && !isOpen ? 'text-gray-900 font-medium' : 'text-gray-700'
          }`}
        />

        {clearable && value && !isOpen && (
          <button
            onMouseDown={handleClear}
            className="p-1.5 mr-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
            tabIndex={-1}
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
        {!value && (
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 mr-2.5 flex-shrink-0 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (!portal || portalPos) && (() => {
        const dropdownContent = (
          <div
            ref={dropdownRef}
            className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden ring-1 ring-black/5"
            style={portal && portalPos
              ? { position: 'fixed', top: portalPos.top, left: portalPos.left, minWidth: Math.max(portalPos.width, 240), width: 'max-content', zIndex: 9999 }
              : undefined
            }
          >
            {searchPending ? (
              <div className="px-4 py-3 text-sm text-gray-400 italic">
                Type {minSearchLength! - query.trim().length} more character{minSearchLength! - query.trim().length !== 1 ? 's' : ''} to search all…
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 italic">
                No results{query ? ` for "${query}"` : ''}
              </div>
            ) : (
              <ul ref={listRef} className="max-h-56 overflow-y-auto py-1">
                {filtered.map((item, i) => {
                  const isHighlighted = i === highlighted
                  const isSelected = value ? getKey(value) === getKey(item) : false
                  return (
                    <li
                      key={getKey(item)}
                      onMouseDown={e => { e.preventDefault(); select(item) }}
                      onMouseEnter={(e) => handleItemMouseEnter(item, e)}
                      onMouseLeave={handleItemMouseLeave}
                      className={`px-3 ${getSubtitle ? 'py-2' : 'py-2.5'} cursor-pointer transition-colors ${
                        isHighlighted ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {i < 10 && (
                          <span className="w-4 h-4 rounded text-[10px] font-mono font-medium text-gray-400 bg-gray-100 flex items-center justify-center flex-shrink-0">
                            {i === 9 ? '0' : String(i + 1)}
                          </span>
                        )}
                        {i >= 10 && i < 20 && (
                          <span className="w-[22px] h-4 rounded text-[10px] font-mono font-medium text-gray-400 bg-gray-100 flex items-center justify-center flex-shrink-0">
                            ^{i === 19 ? '0' : String(i - 9)}
                          </span>
                        )}
                        {renderItem(item, isHighlighted, isSelected)}
                      </div>
                      {getSubtitle && (() => {
                        const sub = getSubtitle(item)
                        return sub ? (
                          <div className="pl-7 text-xs text-gray-400 truncate mt-0.5">{sub}</div>
                        ) : null
                      })()}
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-3 bg-gray-50">
              <span className="text-[10px] text-gray-400">
                <kbd className="font-mono bg-white border border-gray-200 rounded px-1">↑↓</kbd> navigate
              </span>
              <span className="text-[10px] text-gray-400">
                <kbd className="font-mono bg-white border border-gray-200 rounded px-1">↵</kbd> select
              </span>
              <span className="text-[10px] text-gray-400">
                <kbd className="font-mono bg-white border border-gray-200 rounded px-1">1–0</kbd> / <kbd className="font-mono bg-white border border-gray-200 rounded px-1">^1–0</kbd> quick pick
              </span>
              <span className="text-[10px] text-gray-400">
                <kbd className="font-mono bg-white border border-gray-200 rounded px-1">Esc</kbd> close
              </span>
            </div>
          </div>
        )
        return portal
          ? createPortal(dropdownContent, document.body)
          : <div className="absolute z-50 left-0 right-0 mt-1">{dropdownContent}</div>
      })()}

      {hoveredItem !== null && hoverRect !== null && renderItemTooltip && createPortal(
        <div
          style={{
            position: 'fixed',
            top: Math.max(8, Math.min(hoverRect.top, window.innerHeight - 400)),
            ...(hoverRect.right + 8 + 280 < window.innerWidth
              ? { left: hoverRect.right + 8 }
              : { right: window.innerWidth - hoverRect.left + 8 }),
            zIndex: 10001,
            pointerEvents: 'none',
          }}
        >
          {renderItemTooltip(hoveredItem)}
        </div>,
        document.body
      )}
    </div>
  )
}

export default Lookup

// ─── HoverShortcut ─────────────────────────────────────────────────────────────
// Renders nothing. When isHovering=true, listens for digit key presses and calls
// onSelect with the item at that index in the (optionally sorted) list.

export function HoverShortcut<T,>({
  isHovering,
  items,
  sortItems = true,
  getLabel,
  onSelect,
}: {
  isHovering: boolean
  items: T[]
  sortItems?: boolean
  getLabel: (item: T) => string
  onSelect: (item: T) => void
}) {
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const itemsRef = useRef(items)
  itemsRef.current = items
  const getLabelRef = useRef(getLabel)
  getLabelRef.current = getLabel

  useEffect(() => {
    if (!isHovering) return
    function handleKey(e: KeyboardEvent) {
      const digit = e.key >= '1' && e.key <= '9' ? parseInt(e.key) - 1
        : e.key === '0' ? 9 : -1
      if (digit < 0) return
      const idx = e.ctrlKey ? digit + 10 : digit
      const sorted = sortItems
        ? [...itemsRef.current].sort((a, b) => getLabelRef.current(a).localeCompare(getLabelRef.current(b)))
        : [...itemsRef.current]
      if (idx >= sorted.length) return
      e.preventDefault()
      onSelectRef.current(sorted[idx])
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isHovering, sortItems])

  return null
}

// ─── StringLookup ──────────────────────────────────────────────────────────────

interface StringLookupProps {
  value: string | null
  onChange: (value: string | null) => void
  items: string[]
  initialItems?: string[]
  minSearchLength?: number
  placeholder?: string
  clearable?: boolean
  autoOpen?: boolean
  portal?: boolean
  sortItems?: boolean
  /** Extra node rendered after the label and before the check mark */
  renderItemSuffix?: (value: string) => React.ReactNode
  /** Hover card content shown to the side when hovering an item */
  renderItemTooltip?: (value: string) => React.ReactNode
  /** Secondary line shown beneath each item in the dropdown */
  getSubtitle?: (value: string) => string | null
  onEnterSelect?: () => void
  onTabSelect?: () => void
  onShiftTabSelect?: () => void
}

export function StringLookup({
  value,
  onChange,
  items,
  initialItems,
  minSearchLength,
  placeholder = 'Select...',
  clearable = true,
  autoOpen,
  portal,
  sortItems,
  renderItemSuffix,
  renderItemTooltip,
  getSubtitle,
  onEnterSelect,
  onTabSelect,
  onShiftTabSelect,
}: StringLookupProps) {
  return (
    <Lookup
      value={value}
      onChange={onChange}
      items={items}
      initialItems={initialItems}
      minSearchLength={minSearchLength}
      getKey={s => s}
      getLabel={s => s}
      filterFn={(s, q) => s.toLowerCase().includes(q.toLowerCase())}
      renderItem={(s, _isHighlighted, isSelected) => (
        <>
          <span className="flex-1 text-sm text-gray-900">{s}</span>
          {renderItemSuffix?.(s)}
          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
        </>
      )}
      renderItemTooltip={renderItemTooltip}
      getSubtitle={getSubtitle}
      placeholder={placeholder}
      clearable={clearable}
      autoOpen={autoOpen}
      portal={portal}
      sortItems={sortItems}
      onEnterSelect={onEnterSelect}
      onTabSelect={onTabSelect}
      onShiftTabSelect={onShiftTabSelect}
    />
  )
}
