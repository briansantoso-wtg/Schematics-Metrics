/**
 * Generic table export/import utility.
 *
 * ColSpec (export):
 *   single — one header, one value per row
 *   dual   — column has both a DB name and a product name (e.g. table/column names).
 *            Always exports as two columns: "<label> - DB" and "<label> - Product",
 *            regardless of which UI mode is active.
 *
 * ImportColSpec (import):
 *   Maps a spreadsheet column header to a field on the target type.
 *   Columns marked required: true will skip the row (with a warning) if blank.
 *
 * SheetExportSpec:
 *   Describes one sheet in a multi-tab workbook.
 */

import * as XLSX from 'xlsx'

// ─── Export types ─────────────────────────────────────────────────────────────

export type ColSpec<T> =
  | { kind: 'single'; label: string; get: (row: T) => string | null | undefined }
  | { kind: 'dual';   label: string; getDb: (row: T) => string | null | undefined; getProduct: (row: T) => string | null | undefined }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SheetExportSpec<T = any> = {
  name: string
  columns: ColSpec<T>[]
  data: T[]
}

// ─── Import types ─────────────────────────────────────────────────────────────

export type ImportColSpec<T> = {
  /** Exact column header to look for in the spreadsheet. */
  header: string
  /** If true, rows with a blank value here are skipped with a warning. */
  required?: boolean
  /** Receives the (trimmed) cell value and writes it to the partial target. */
  parse: (value: string, target: Partial<T>) => void
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function s(v: string | null | undefined): string {
  return v ?? ''
}

function buildAoA<T>(columns: ColSpec<T>[], data: T[]): string[][] {
  const headers: string[] = []
  for (const col of columns) {
    if (col.kind === 'dual') {
      headers.push(`${col.label} - DB`, `${col.label} - Product`)
    } else {
      headers.push(col.label)
    }
  }

  const rows = data.map(row =>
    columns.flatMap(col =>
      col.kind === 'dual'
        ? [s(col.getDb(row)), s(col.getProduct(row))]
        : [s(col.get(row))]
    )
  )

  return [headers, ...rows]
}

function makeWorksheet<T>(columns: ColSpec<T>[], data: T[]): XLSX.WorkSheet {
  const aoa = buildAoA(columns, data)
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Bold the header row
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws[addr]) ws[addr].s = { font: { bold: true } }
  }

  // Auto-width: at least 10, max 60, based on longest cell in each column
  ws['!cols'] = aoa[0].map((_, ci) => {
    const max = Math.min(60, Math.max(10, ...aoa.map(row => (row[ci] ?? '').length + 2)))
    return { wch: max }
  })

  return ws
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Export functions ─────────────────────────────────────────────────────────

export function exportCSV<T>(filename: string, columns: ColSpec<T>[], data: T[]) {
  const aoa = buildAoA(columns, data)
  const csv = aoa
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`)
}

/** Single-sheet XLSX export. Kept for back-compat with TableRegistry. */
export function exportXLSX<T>(filename: string, columns: ColSpec<T>[], data: T[]) {
  exportMultiSheetXLSX(filename, [{ name: 'Export', columns, data }])
}

/** Multi-sheet XLSX export. Each entry in `sheets` becomes one tab. */
export function exportMultiSheetXLSX(filename: string, sheets: SheetExportSpec[]) {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(wb, makeWorksheet(sheet.columns, sheet.data), sheet.name)
  }
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${filename}.xlsx`,
  )
}

// ─── Import function ──────────────────────────────────────────────────────────

/**
 * Parse one named sheet from an XLSX/XLS file into typed rows.
 *
 * Usage:
 *   const { rows, warnings } = await importSheet<Person>(file, 'Staff', [
 *     { header: 'GS_StaffCode', required: true,  parse: (v, r) => { r.GS_Code = v } },
 *     { header: 'GS_FullName',  required: true,  parse: (v, r) => { r.GS_FullName = v } },
 *     { header: 'GS_Title',                      parse: (v, r) => { r.GS_Title = v } },
 *   ])
 */
export function importSheet<T>(
  file: File,
  sheetName: string,
  cols: ImportColSpec<T>[],
): Promise<{ rows: T[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target!.result, { type: 'binary' })
        const ws = wb.Sheets[sheetName]
        if (!ws) {
          const available = wb.SheetNames.join(', ')
          reject(new Error(`Sheet "${sheetName}" not found. Available: ${available}`))
          return
        }

        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        const rows: T[] = []
        const warnings: string[] = []

        for (let i = 0; i < rawRows.length; i++) {
          const raw = rawRows[i]
          const target: Partial<T> = {}
          let skip = false

          for (const col of cols) {
            const value = String(raw[col.header] ?? '').trim()
            if (col.required && !value) {
              warnings.push(`Row ${i + 2}: skipped — missing required column "${col.header}"`)
              skip = true
              break
            }
            col.parse(value, target)
          }

          if (!skip) rows.push(target as T)
        }

        resolve({ rows, warnings })
      } catch (err) {
        reject(err)
      }
    }
    reader.readAsBinaryString(file)
  })
}
