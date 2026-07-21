import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Table2 } from 'lucide-react'
import { api } from '../lib/api'
import { useNameDisplay } from '../contexts/NameDisplay'
import type { TableRecord } from '../types'

export default function TableSearch() {
  const navigate = useNavigate()
  const { nameMode } = useNameDisplay()
  const [query, setQuery] = useState('')
  const [tables, setTables] = useState<TableRecord[] | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const loadTables = useCallback(async () => {
    if (tables !== null) return
    try {
      const data = await api.getTables()
      setTables(data)
    } catch {
      setTables([])
    }
  }, [tables])

  const results = (() => {
    if (!tables || !query.trim()) return []
    const q = query.toLowerCase()
    return tables
      .filter(t =>
        t.tableName.toLowerCase().includes(q) ||
        (t.productName && t.productName.toLowerCase().includes(q)) ||
        t.schema.toLowerCase().includes(q)
      )
      .slice(0, 10)
  })()

  function handleFocus() {
    loadTables()
    setIsOpen(true)
  }

  function handleSelect(table: TableRecord) {
    navigate(`/table/${encodeURIComponent(table.tableName)}`)
    setQuery('')
    setIsOpen(false)
    setFocusedIndex(-1)
    inputRef.current?.blur()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && results[focusedIndex]) {
        handleSelect(results[focusedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setFocusedIndex(-1)
      inputRef.current?.blur()
    }
  }

  // Reset focused index when results change
  useEffect(() => {
    setFocusedIndex(-1)
  }, [query])

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const showDropdown = isOpen && query.trim().length > 0

  return (
    <div ref={containerRef} className="relative">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setIsOpen(true) }}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="Search tables..."
        className="pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-wtg-border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-wtg-secondary/20 focus:border-wtg-secondary-light"
      />
      {showDropdown && (
        <div className="absolute top-full mt-1.5 right-0 w-96 bg-white border border-wtg-border rounded-xl shadow-lg overflow-hidden z-50">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">No tables found</div>
          ) : (
            <ul>
              {results.map((table, i) => {
                const primaryName = nameMode === 'product' && table.productName ? table.productName : table.tableName
                const secondaryName = nameMode === 'product' && table.productName ? table.tableName : table.productName
                return (
                  <li key={table.tableName}>
                    <button
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        i === focusedIndex ? 'bg-wtg-secondary/10' : 'hover:bg-gray-50'
                      }`}
                      onMouseDown={e => { e.preventDefault(); handleSelect(table) }}
                      onMouseEnter={() => setFocusedIndex(i)}
                    >
                      <Table2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{primaryName}</div>
                        {secondaryName && (
                          <div className="text-xs text-gray-400 truncate">{secondaryName}</div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{table.schema}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
