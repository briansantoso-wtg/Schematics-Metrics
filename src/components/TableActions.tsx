/**
 * TableActions — generic import/export toolbar fragment.
 *
 * Drop into any page that has tabular data. Pass column specs; the component
 * owns the file-input plumbing, toast feedback, and download triggering.
 *
 * Two visual modes:
 *   compact={false}  (default)  — text buttons "Import | CSV | Excel"
 *   compact={true}              — icon-only buttons for tight toolbars
 */

import { useRef, useState } from 'react'
import { Download, Upload, X } from 'lucide-react'
import { exportMultiSheetXLSX, exportCSV, importSheet } from '../lib/exportTable'
import type { SheetExportSpec, ColSpec, ImportColSpec } from '../lib/exportTable'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any

export interface ImportConfig {
  /** Name of the sheet to read from the uploaded file. */
  sheetName: string
  columns: ImportColSpec<AnyRow>[]
  /**
   * Called with the successfully parsed rows.
   * The component shows the result toast automatically — no need to do it here.
   */
  onImport: (rows: AnyRow[]) => void
}

export interface TableActionsProps {
  /** Base filename for downloads, no extension (e.g. "table-registry"). */
  filename: string
  /** One or more sheets for the XLSX workbook. */
  sheets: SheetExportSpec[]
  /**
   * Single sheet for CSV export.
   * Omit to hide the CSV button (XLSX only).
   */
  csvSheet?: { columns: ColSpec<AnyRow>[]; data: AnyRow[] }
  /**
   * Import configuration.
   * Omit to hide the Import button (export-only mode).
   */
  importConfig?: ImportConfig
  /**
   * Render icon-only buttons for use inside tight toolbars (e.g. sidebars).
   * Default: false
   */
  compact?: boolean
}

// ─── Internal toast ───────────────────────────────────────────────────────────

interface ToastState {
  title: string
  body: string
  warnings?: string[]
  variant: 'success' | 'error'
}

function ToastBubble({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  const borderCls = toast.variant === 'error' ? 'border-red-200' : 'border-gray-200'
  const titleCls  = toast.variant === 'error' ? 'text-red-600'  : 'text-gray-900'
  return (
    <div className={`fixed bottom-6 right-6 z-50 bg-white border ${borderCls} rounded-2xl shadow-xl p-4 w-80`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${titleCls}`}>{toast.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{toast.body}</p>
          {toast.warnings && toast.warnings.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {toast.warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-600">{w}</p>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 flex-shrink-0 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TableActions({
  filename,
  sheets,
  csvSheet,
  importConfig,
  compact = false,
}: TableActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  function handleExportXLSX() {
    exportMultiSheetXLSX(filename, sheets)
  }

  function handleExportCSV() {
    if (!csvSheet) return
    exportCSV(filename, csvSheet.columns, csvSheet.data)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !importConfig) return
    e.target.value = ''

    try {
      const { rows, warnings } = await importSheet(file, importConfig.sheetName, importConfig.columns)
      importConfig.onImport(rows)
      setToast({
        title: 'Import complete',
        body: `${rows.length} row${rows.length !== 1 ? 's' : ''} imported`,
        warnings,
        variant: 'success',
      })
    } catch (err) {
      setToast({
        title: 'Import failed',
        body: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      })
    }
  }

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".xlsx,.xls"
      className="hidden"
      onChange={handleFileChange}
    />
  )

  // ── Compact mode: icon buttons ──

  if (compact) {
    return (
      <>
        {hiddenInput}
        {importConfig && (
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import from spreadsheet"
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={handleExportXLSX}
          title="Export to spreadsheet"
          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        {toast && <ToastBubble toast={toast} onClose={() => setToast(null)} />}
      </>
    )
  }

  // ── Normal mode: text buttons ──

  return (
    <>
      {hiddenInput}
      <div className="flex items-stretch gap-2">
        {importConfig && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
        )}
        <div className="flex items-stretch rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          {csvSheet && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors border-r border-gray-200"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          )}
          <button
            onClick={handleExportXLSX}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
        </div>
      </div>
      {toast && <ToastBubble toast={toast} onClose={() => setToast(null)} />}
    </>
  )
}
