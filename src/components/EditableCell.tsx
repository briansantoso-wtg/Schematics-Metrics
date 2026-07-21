/**
 * Shared wrapper for editable table cells.
 *
 * Handles: editing state, hover-key shortcuts, selection ring,
 * drag suppression, and the -mx-4 -my-2 edit wrapper.
 *
 * Sub-components (EditableLookupCell, EditablePersonCell,
 * EditableCriticalityPill) each use this and supply only their
 * display/editor renderers and their own shortcut mapping.
 */

import { useState, useEffect } from 'react'

export interface EditableCellProps {
  // ── Table cell context ────────────────────────────────────────────
  rowId?: string
  colId?: string
  isSelected?: boolean
  onSelect?: (e: React.MouseEvent) => void
  isDraggingRef?: { current: boolean }

  /**
   * When true the edit-mode wrapper gets -mx-4 -my-2 so the control
   * expands flush with the table cell padding. Defaults to true.
   */
  tableCell?: boolean

  /**
   * Render the outer element as a <button> instead of a <div>.
   * Use this when the display content is itself interactive (e.g. a pill)
   * and no multi-select / drag behaviour is needed.
   */
  asButton?: boolean

  /** When false, clicking calls onOpen instead of opening the editor. Defaults to true. */
  editMode?: boolean
  /** Called on click when editMode is false. */
  onOpen?: () => void
  /** When true, programmatically opens the editor (used by context-menu "Edit" in read mode). */
  forceOpen?: boolean
  /** Context menu handler on the display element. */
  onContextMenu?: (e: React.MouseEvent) => void

  renderDisplay: (isHovered: boolean) => React.ReactNode
  /** Receives a close() callback to dismiss the editor. */
  renderEditor: (close: () => void) => React.ReactNode
}

export function EditableCell({
  rowId,
  colId,
  isSelected = false,
  onSelect,
  isDraggingRef,
  tableCell = true,
  asButton = false,
  editMode = true,
  onOpen,
  forceOpen,
  onContextMenu,
  renderDisplay,
  renderEditor,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (forceOpen) setEditing(true)
  }, [forceOpen])

  const hoverProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  }

  if (editing) {
    return (
      <div
        className={tableCell ? '-mx-4 -my-2' : undefined}
        data-cell-row={rowId}
        data-cell-col={colId}
        onClick={e => e.stopPropagation()}
        onBlur={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEditing(false)
        }}
      >
        {renderEditor(() => setEditing(false))}
      </div>
    )
  }

  if (asButton) {
    return (
      <button
        {...hoverProps}
        className="group inline-flex items-center gap-1.5 cursor-pointer"
        data-cell-row={rowId}
        data-cell-col={colId}
        onClick={e => { e.stopPropagation(); setEditing(true) }}
      >
        {renderDisplay(isHovered)}
      </button>
    )
  }

  return (
    <div
      {...hoverProps}
      className={`group relative cursor-pointer rounded-sm ${isSelected ? 'ring-2 ring-wtg-secondary/60 bg-blue-50/50' : ''}`}
      data-cell-row={rowId}
      data-cell-col={colId}
      onContextMenu={onContextMenu}
      onClick={e => {
        if (isDraggingRef?.current) return
        e.stopPropagation()
        if (!editMode) { onOpen?.(); return }
        if (e.ctrlKey || e.metaKey || e.shiftKey) { onSelect?.(e); return }
        onSelect?.(e)
        setEditing(true)
      }}
    >
      {renderDisplay(isHovered)}
    </div>
  )
}
