import { useEffect, useRef } from 'react'

export interface ContextMenuItem {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  separator?: never
}

export interface ContextMenuSeparator {
  separator: true
  label?: never
  icon?: never
  onClick?: never
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator

export interface ContextMenuState {
  x: number
  y: number
}

export function ContextMenu({
  position,
  items,
  onClose,
}: {
  position: ContextMenuState
  items: ContextMenuEntry[]
  onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Adjust position so menu doesn't overflow viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    top: position.y,
    left: position.x,
    zIndex: 9999,
  }

  return (
    <div
      ref={menuRef}
      style={style}
      className="min-w-[180px] bg-white border border-wtg-border rounded-lg shadow-lg py-1 text-sm"
    >
      {items.map((item, i) => {
        if ('separator' in item && item.separator) {
          return <div key={i} className="my-1 border-t border-wtg-border/60" />
        }
        const Icon = (item as ContextMenuItem).icon
        return (
          <button
            key={i}
            onClick={() => { onClose(); (item as ContextMenuItem).onClick() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-gray-700 hover:bg-blue-50/60 hover:text-gray-900 transition-colors"
          >
            {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
            {(item as ContextMenuItem).label}
          </button>
        )
      })}
    </div>
  )
}
