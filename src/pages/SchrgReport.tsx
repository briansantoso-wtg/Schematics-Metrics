import { useMemo, useState } from 'react'

type Row = {
  Year: number
  YearMonth: string
  Month: string
  StaffMember: string
  IncidentCount: number
  AvgDaysToClose: number
  Priority: string
  CR9Closures?: number
  CR1to4Closures?: number
}

type YoYRow = {
  CurrentYear: number
  StaffMember: string
  CurrentAvgDays: number
  CurrentCount: number
  PriorAvgDays?: number
  PriorCount?: number
  ImprovementPercent: number
}

const STAFF_CODES = ['AER', 'BS8', 'KLT', 'RS6']
const REPORT_MODES = ['Yearly', 'Monthly', 'YoY'] as const
const VIEW_MODES = ['Dashboard', 'Table'] as const

const TABLE_COLUMNS = [
  { key: 'Year', label: 'Year' },
  { key: 'YearMonth', label: 'YearMonth' },
  { key: 'Month', label: 'Month' },
  { key: 'StaffMember', label: 'StaffMember' },
  { key: 'Priority', label: 'Priority' },
  { key: 'IncidentCount', label: 'IncidentCount' },
  { key: 'AvgDaysToClose', label: 'AvgDaysToClose' },
  { key: 'CR9Closures', label: 'CR9 Closures' },
  { key: 'CR1to4Closures', label: 'CR1-4 Closures' },
] as const

const MOCK_ROWS: Row[] = [
  { Year: 2026, YearMonth: '2026-07', Month: 'Jul', StaffMember: 'AER', Priority: 'All', IncidentCount: 2, AvgDaysToClose: 2.8245 },
  { Year: 2026, YearMonth: '2026-07', Month: 'Jul', StaffMember: 'BS8', Priority: 'All', IncidentCount: 5, AvgDaysToClose: 2.6183 },
  { Year: 2026, YearMonth: '2026-07', Month: 'Jul', StaffMember: 'RS6', Priority: 'All', IncidentCount: 1, AvgDaysToClose: 0.7327 },
  { Year: 2026, YearMonth: '2026-06', Month: 'Jun', StaffMember: 'AER', Priority: 'All', IncidentCount: 11, AvgDaysToClose: 7.0103 },
  { Year: 2026, YearMonth: '2026-06', Month: 'Jun', StaffMember: 'BS8', Priority: 'All', IncidentCount: 30, AvgDaysToClose: 6.6141 },
  { Year: 2026, YearMonth: '2026-06', Month: 'Jun', StaffMember: 'RS6', Priority: 'All', IncidentCount: 12, AvgDaysToClose: 12.091 },
  { Year: 2026, YearMonth: '2026-05', Month: 'May', StaffMember: 'AER', Priority: 'All', IncidentCount: 8, AvgDaysToClose: 12.6734 },
  { Year: 2026, YearMonth: '2026-05', Month: 'May', StaffMember: 'BS8', Priority: 'All', IncidentCount: 16, AvgDaysToClose: 11.7465 },
  { Year: 2026, YearMonth: '2026-05', Month: 'May', StaffMember: 'RS6', Priority: 'All', IncidentCount: 15, AvgDaysToClose: 8.229 },
  { Year: 2026, YearMonth: '2026-04', Month: 'Apr', StaffMember: 'AER', Priority: 'All', IncidentCount: 17, AvgDaysToClose: 8.7836 },
  { Year: 2026, YearMonth: '2026-04', Month: 'Apr', StaffMember: 'BS8', Priority: 'All', IncidentCount: 24, AvgDaysToClose: 15.3791 },
  { Year: 2026, YearMonth: '2026-04', Month: 'Apr', StaffMember: 'RS6', Priority: 'All', IncidentCount: 24, AvgDaysToClose: 6.8471 },
  { Year: 2026, YearMonth: '2026-03', Month: 'Mar', StaffMember: 'AER', Priority: 'All', IncidentCount: 8, AvgDaysToClose: 8.5853 },
  { Year: 2026, YearMonth: '2026-03', Month: 'Mar', StaffMember: 'BS8', Priority: 'All', IncidentCount: 52, AvgDaysToClose: 9.6195 },
  { Year: 2026, YearMonth: '2026-03', Month: 'Mar', StaffMember: 'RS6', Priority: 'All', IncidentCount: 41, AvgDaysToClose: 14.2017 },
  { Year: 2026, YearMonth: '2026-02', Month: 'Feb', StaffMember: 'AER', Priority: 'All', IncidentCount: 29, AvgDaysToClose: 9.5308 },
  { Year: 2026, YearMonth: '2026-02', Month: 'Feb', StaffMember: 'BS8', Priority: 'All', IncidentCount: 15, AvgDaysToClose: 22.0268 },
  { Year: 2026, YearMonth: '2026-02', Month: 'Feb', StaffMember: 'RS6', Priority: 'All', IncidentCount: 49, AvgDaysToClose: 13.1956 },
  { Year: 2026, YearMonth: '2026-01', Month: 'Jan', StaffMember: 'AER', Priority: 'All', IncidentCount: 14, AvgDaysToClose: 10.7303 },
  { Year: 2026, YearMonth: '2026-01', Month: 'Jan', StaffMember: 'BS8', Priority: 'All', IncidentCount: 58, AvgDaysToClose: 4.9323 },
  { Year: 2026, YearMonth: '2026-01', Month: 'Jan', StaffMember: 'RS6', Priority: 'All', IncidentCount: 38, AvgDaysToClose: 14.2368 },
  { Year: 2025, YearMonth: '2025-12', Month: 'Dec', StaffMember: 'AER', Priority: 'All', IncidentCount: 7, AvgDaysToClose: 10.9299 },
  { Year: 2025, YearMonth: '2025-12', Month: 'Dec', StaffMember: 'BS8', Priority: 'All', IncidentCount: 19, AvgDaysToClose: 19.9494 },
  { Year: 2025, YearMonth: '2025-12', Month: 'Dec', StaffMember: 'RS6', Priority: 'All', IncidentCount: 34, AvgDaysToClose: 28.2995 },
  { Year: 2025, YearMonth: '2025-11', Month: 'Nov', StaffMember: 'AER', Priority: 'All', IncidentCount: 12, AvgDaysToClose: 15.2992 },
  { Year: 2025, YearMonth: '2025-11', Month: 'Nov', StaffMember: 'BS8', Priority: 'All', IncidentCount: 22, AvgDaysToClose: 19.9063 },
  { Year: 2025, YearMonth: '2025-11', Month: 'Nov', StaffMember: 'RS6', Priority: 'All', IncidentCount: 38, AvgDaysToClose: 11.2692 },
  { Year: 2025, YearMonth: '2025-10', Month: 'Oct', StaffMember: 'AER', Priority: 'All', IncidentCount: 19, AvgDaysToClose: 8.5422 },
  { Year: 2025, YearMonth: '2025-10', Month: 'Oct', StaffMember: 'BS8', Priority: 'All', IncidentCount: 32, AvgDaysToClose: 10.7843 },
  { Year: 2025, YearMonth: '2025-10', Month: 'Oct', StaffMember: 'RS6', Priority: 'All', IncidentCount: 38, AvgDaysToClose: 24.4642 },
  { Year: 2025, YearMonth: '2025-09', Month: 'Sep', StaffMember: 'AER', Priority: 'All', IncidentCount: 16, AvgDaysToClose: 15.0499 },
  { Year: 2025, YearMonth: '2025-09', Month: 'Sep', StaffMember: 'BS8', Priority: 'All', IncidentCount: 43, AvgDaysToClose: 12.7247 },
  { Year: 2025, YearMonth: '2025-09', Month: 'Sep', StaffMember: 'RS6', Priority: 'All', IncidentCount: 37, AvgDaysToClose: 12.9886 },
  { Year: 2025, YearMonth: '2025-08', Month: 'Aug', StaffMember: 'AER', Priority: 'All', IncidentCount: 12, AvgDaysToClose: 14.2025 },
  { Year: 2025, YearMonth: '2025-08', Month: 'Aug', StaffMember: 'BS8', Priority: 'All', IncidentCount: 33, AvgDaysToClose: 25.6511 },
  { Year: 2025, YearMonth: '2025-08', Month: 'Aug', StaffMember: 'KLT', Priority: 'All', IncidentCount: 20, AvgDaysToClose: 8.632 },
  { Year: 2025, YearMonth: '2025-08', Month: 'Aug', StaffMember: 'RS6', Priority: 'All', IncidentCount: 21, AvgDaysToClose: 15.2261 },
  { Year: 2025, YearMonth: '2025-07', Month: 'Jul', StaffMember: 'AER', Priority: 'All', IncidentCount: 20, AvgDaysToClose: 39.2312 },
  { Year: 2025, YearMonth: '2025-07', Month: 'Jul', StaffMember: 'BS8', Priority: 'All', IncidentCount: 22, AvgDaysToClose: 15.0076 },
  { Year: 2025, YearMonth: '2025-07', Month: 'Jul', StaffMember: 'KLT', Priority: 'All', IncidentCount: 24, AvgDaysToClose: 26.4551 },
  { Year: 2025, YearMonth: '2025-07', Month: 'Jul', StaffMember: 'RS6', Priority: 'All', IncidentCount: 32, AvgDaysToClose: 14.3235 },
  { Year: 2025, YearMonth: '2025-06', Month: 'Jun', StaffMember: 'AER', Priority: 'All', IncidentCount: 9, AvgDaysToClose: 23.0296 },
  { Year: 2025, YearMonth: '2025-06', Month: 'Jun', StaffMember: 'BS8', Priority: 'All', IncidentCount: 23, AvgDaysToClose: 19.7384 },
  { Year: 2025, YearMonth: '2025-06', Month: 'Jun', StaffMember: 'KLT', Priority: 'All', IncidentCount: 23, AvgDaysToClose: 6.6388 },
  { Year: 2025, YearMonth: '2025-06', Month: 'Jun', StaffMember: 'RS6', Priority: 'All', IncidentCount: 20, AvgDaysToClose: 24.9721 },
  { Year: 2025, YearMonth: '2025-05', Month: 'May', StaffMember: 'AER', Priority: 'All', IncidentCount: 7, AvgDaysToClose: 22.1487 },
  { Year: 2025, YearMonth: '2025-05', Month: 'May', StaffMember: 'BS8', Priority: 'All', IncidentCount: 31, AvgDaysToClose: 24.7018 },
  { Year: 2025, YearMonth: '2025-05', Month: 'May', StaffMember: 'KLT', Priority: 'All', IncidentCount: 18, AvgDaysToClose: 18.9118 },
  { Year: 2025, YearMonth: '2025-05', Month: 'May', StaffMember: 'RS6', Priority: 'All', IncidentCount: 28, AvgDaysToClose: 10.2831 },
  { Year: 2025, YearMonth: '2025-04', Month: 'Apr', StaffMember: 'AER', Priority: 'All', IncidentCount: 11, AvgDaysToClose: 9.4829 },
  { Year: 2025, YearMonth: '2025-04', Month: 'Apr', StaffMember: 'BS8', Priority: 'All', IncidentCount: 22, AvgDaysToClose: 15.3457 },
  { Year: 2025, YearMonth: '2025-04', Month: 'Apr', StaffMember: 'KLT', Priority: 'All', IncidentCount: 10, AvgDaysToClose: 5.23 },
  { Year: 2025, YearMonth: '2025-04', Month: 'Apr', StaffMember: 'RS6', Priority: 'All', IncidentCount: 36, AvgDaysToClose: 16.6168 },
  { Year: 2025, YearMonth: '2025-03', Month: 'Mar', StaffMember: 'AER', Priority: 'All', IncidentCount: 10, AvgDaysToClose: 25.413 },
  { Year: 2025, YearMonth: '2025-03', Month: 'Mar', StaffMember: 'BS8', Priority: 'All', IncidentCount: 28, AvgDaysToClose: 13.2252 },
  { Year: 2025, YearMonth: '2025-03', Month: 'Mar', StaffMember: 'KLT', Priority: 'All', IncidentCount: 19, AvgDaysToClose: 14.6611 },
  { Year: 2025, YearMonth: '2025-03', Month: 'Mar', StaffMember: 'RS6', Priority: 'All', IncidentCount: 32, AvgDaysToClose: 23.6202 },
  { Year: 2025, YearMonth: '2025-02', Month: 'Feb', StaffMember: 'AER', Priority: 'All', IncidentCount: 11, AvgDaysToClose: 5.8746 },
  { Year: 2025, YearMonth: '2025-02', Month: 'Feb', StaffMember: 'BS8', Priority: 'All', IncidentCount: 30, AvgDaysToClose: 26.0582 },
  { Year: 2025, YearMonth: '2025-02', Month: 'Feb', StaffMember: 'KLT', Priority: 'All', IncidentCount: 4, AvgDaysToClose: 18.2809 },
  { Year: 2025, YearMonth: '2025-02', Month: 'Feb', StaffMember: 'RS6', Priority: 'All', IncidentCount: 22, AvgDaysToClose: 16.887 },
  { Year: 2025, YearMonth: '2025-01', Month: 'Jan', StaffMember: 'AER', Priority: 'All', IncidentCount: 14, AvgDaysToClose: 16.192 },
  { Year: 2025, YearMonth: '2025-01', Month: 'Jan', StaffMember: 'BS8', Priority: 'All', IncidentCount: 16, AvgDaysToClose: 42.267 },
  { Year: 2025, YearMonth: '2025-01', Month: 'Jan', StaffMember: 'KLT', Priority: 'All', IncidentCount: 14, AvgDaysToClose: 24.0816 },
  { Year: 2025, YearMonth: '2025-01', Month: 'Jan', StaffMember: 'RS6', Priority: 'All', IncidentCount: 49, AvgDaysToClose: 30.2885 },
  { Year: 2024, YearMonth: '2024-12', Month: 'Dec', StaffMember: 'AER', Priority: 'All', IncidentCount: 11, AvgDaysToClose: 6.4608 },
  { Year: 2024, YearMonth: '2024-12', Month: 'Dec', StaffMember: 'BS8', Priority: 'All', IncidentCount: 5, AvgDaysToClose: 3.7469 },
  { Year: 2024, YearMonth: '2024-12', Month: 'Dec', StaffMember: 'KLT', Priority: 'All', IncidentCount: 16, AvgDaysToClose: 14.4684 },
  { Year: 2024, YearMonth: '2024-12', Month: 'Dec', StaffMember: 'RS6', Priority: 'All', IncidentCount: 29, AvgDaysToClose: 40.0609 },
  { Year: 2024, YearMonth: '2024-11', Month: 'Nov', StaffMember: 'AER', Priority: 'All', IncidentCount: 16, AvgDaysToClose: 54.2671 },
  { Year: 2024, YearMonth: '2024-11', Month: 'Nov', StaffMember: 'BS8', Priority: 'All', IncidentCount: 10, AvgDaysToClose: 95.9266 },
  { Year: 2024, YearMonth: '2024-11', Month: 'Nov', StaffMember: 'KLT', Priority: 'All', IncidentCount: 17, AvgDaysToClose: 18.0328 },
  { Year: 2024, YearMonth: '2024-11', Month: 'Nov', StaffMember: 'RS6', Priority: 'All', IncidentCount: 51, AvgDaysToClose: 21.5139 },
  { Year: 2024, YearMonth: '2024-10', Month: 'Oct', StaffMember: 'AER', Priority: 'All', IncidentCount: 30, AvgDaysToClose: 69.9601 },
  { Year: 2024, YearMonth: '2024-10', Month: 'Oct', StaffMember: 'BS8', Priority: 'All', IncidentCount: 34, AvgDaysToClose: 15.1452 },
  { Year: 2024, YearMonth: '2024-10', Month: 'Oct', StaffMember: 'KLT', Priority: 'All', IncidentCount: 21, AvgDaysToClose: 9.6214 },
  { Year: 2024, YearMonth: '2024-10', Month: 'Oct', StaffMember: 'RS6', Priority: 'All', IncidentCount: 24, AvgDaysToClose: 13.9644 },
  { Year: 2024, YearMonth: '2024-09', Month: 'Sep', StaffMember: 'AER', Priority: 'All', IncidentCount: 9, AvgDaysToClose: 159.6503 },
  { Year: 2024, YearMonth: '2024-09', Month: 'Sep', StaffMember: 'BS8', Priority: 'All', IncidentCount: 21, AvgDaysToClose: 18.5514 },
  { Year: 2024, YearMonth: '2024-09', Month: 'Sep', StaffMember: 'KLT', Priority: 'All', IncidentCount: 23, AvgDaysToClose: 133.9144 },
  { Year: 2024, YearMonth: '2024-09', Month: 'Sep', StaffMember: 'RS6', Priority: 'All', IncidentCount: 47, AvgDaysToClose: 24.0136 },
]

const MOCK_YOY_ROWS: YoYRow[] = [
  { CurrentYear: 2026, StaffMember: 'AER', CurrentAvgDays: 9.312, CurrentCount: 89, PriorAvgDays: 17.7724, PriorCount: 148, ImprovementPercent: 47.6 },
  { CurrentYear: 2026, StaffMember: 'BS8', CurrentAvgDays: 9.4262, CurrentCount: 200, PriorAvgDays: 19.5376, PriorCount: 321, ImprovementPercent: 51.75 },
  { CurrentYear: 2026, StaffMember: 'RS6', CurrentAvgDays: 12.2414, CurrentCount: 180, PriorAvgDays: 19.5757, PriorCount: 387, ImprovementPercent: 37.47 },
  { CurrentYear: 2025, StaffMember: 'AER', CurrentAvgDays: 17.7724, CurrentCount: 148, PriorAvgDays: 67.803, PriorCount: 66, ImprovementPercent: 73.79 },
  { CurrentYear: 2025, StaffMember: 'BS8', CurrentAvgDays: 19.5376, CurrentCount: 321, PriorAvgDays: 26.8931, PriorCount: 70, ImprovementPercent: 27.35 },
  { CurrentYear: 2025, StaffMember: 'KLT', CurrentAvgDays: 15.4681, CurrentCount: 132, PriorAvgDays: 49.6121, PriorCount: 77, ImprovementPercent: 68.82 },
  { CurrentYear: 2025, StaffMember: 'RS6', CurrentAvgDays: 19.5757, CurrentCount: 387, PriorAvgDays: 24.654, PriorCount: 151, ImprovementPercent: 20.6 },
  { CurrentYear: 2024, StaffMember: 'AER', CurrentAvgDays: 67.803, CurrentCount: 66, ImprovementPercent: 0 },
  { CurrentYear: 2024, StaffMember: 'BS8', CurrentAvgDays: 26.8931, CurrentCount: 70, ImprovementPercent: 0 },
  { CurrentYear: 2024, StaffMember: 'KLT', CurrentAvgDays: 49.6121, CurrentCount: 77, ImprovementPercent: 0 },
  { CurrentYear: 2024, StaffMember: 'RS6', CurrentAvgDays: 24.654, CurrentCount: 151, ImprovementPercent: 0 },
]

const MOCK_CLOSURE_DISTRIBUTION: Record<string, { cr9: number, cr1to4: number }> = {
  '2026-07|AER': { cr9: 1, cr1to4: 1 },
  '2026-07|BS8': { cr9: 2, cr1to4: 3 },
  '2026-07|RS6': { cr9: 0, cr1to4: 1 },
  '2026-06|AER': { cr9: 4, cr1to4: 7 },
  '2026-06|BS8': { cr9: 10, cr1to4: 20 },
  '2026-06|RS6': { cr9: 3, cr1to4: 9 },
  '2026-05|AER': { cr9: 3, cr1to4: 5 },
  '2026-05|BS8': { cr9: 5, cr1to4: 11 },
  '2026-05|RS6': { cr9: 2, cr1to4: 13 },
}

function getClosureCounts(row: Row) {
  const key = `${row.YearMonth}|${row.StaffMember}`
  if (MOCK_CLOSURE_DISTRIBUTION[key]) {
    return MOCK_CLOSURE_DISTRIBUTION[key]
  }
  const cr9 = Math.min(row.IncidentCount, Math.max(0, Math.round(row.IncidentCount * 0.3)))
  return { cr9, cr1to4: row.IncidentCount - cr9 }
}

function toCSV(columns: string[], rows: Record<string, unknown>[]) {
  const header = columns.join(',')
  const lines = rows.map(r => columns.map(c => {
    const v = r[c]
    if (v === null || v === undefined) return ''
    const s = String(v).replace(/"/g, '""')
    return '"' + s + '"'
  }).join(','))
  return [header, ...lines].join('\n')
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

export default function SchrgReport() {
  const [staffFilter, setStaffFilter] = useState<string>('')
  const [reportMode, setReportMode] = useState<(typeof REPORT_MODES)[number]>('Yearly')
  const [viewMode, setViewMode] = useState<(typeof VIEW_MODES)[number]>('Dashboard')

  const rows = useMemo(() => MOCK_ROWS, [])
  const yoyRows = useMemo(() => MOCK_YOY_ROWS, [])

  const filteredRows = useMemo(
    () => staffFilter ? rows.filter(r => r.StaffMember === staffFilter) : rows,
    [staffFilter, rows]
  )

  const filteredYoYRows = useMemo(
    () => staffFilter ? yoyRows.filter(row => row.StaffMember === staffFilter) : yoyRows,
    [staffFilter, yoyRows]
  )

  const rowsWithClosureCounts = useMemo(() => filteredRows.map(row => {
    const closure = getClosureCounts(row)
    return {
      ...row,
      CR9Closures: closure.cr9,
      CR1to4Closures: closure.cr1to4,
    }
  }), [filteredRows])

  const totals = useMemo(() => {
    const incidentCount = rowsWithClosureCounts.reduce((sum, row) => sum + row.IncidentCount, 0)
    const avgDays = rowsWithClosureCounts.length > 0
      ? rowsWithClosureCounts.reduce((sum, row) => sum + row.AvgDaysToClose, 0) / rowsWithClosureCounts.length
      : 0
    const priorities = Array.from(new Set(rowsWithClosureCounts.map(r => r.Priority))).sort()
    const cr9Count = rowsWithClosureCounts.reduce((sum, row) => sum + (row.CR9Closures ?? 0), 0)
    const cr1to4Count = rowsWithClosureCounts.reduce((sum, row) => sum + (row.CR1to4Closures ?? 0), 0)
    const staffCounts = STAFF_CODES.map(code => ({ code, count: rowsWithClosureCounts.filter(r => r.StaffMember === code).reduce((sum, row) => sum + row.IncidentCount, 0) }))
    return { incidentCount, avgDays, priorities, cr9Count, cr1to4Count, staffCounts }
  }, [rowsWithClosureCounts])

  const yoySummary = useMemo(() => {
    if (filteredYoYRows.length === 0) {
      return { avgImprovement: 0, latestYear: undefined }
    }

    const avgImprovement = filteredYoYRows.reduce((sum, row) => sum + row.ImprovementPercent, 0) / filteredYoYRows.length
    const latestRow = [...filteredYoYRows].sort((a, b) => b.CurrentYear - a.CurrentYear)[0]
    return { avgImprovement, latestYear: latestRow?.CurrentYear }
  }, [filteredYoYRows])

  function monthOrderKey(month: string) {
    const order = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return order.indexOf(month)
  }

  const reportSummary = useMemo(() => {
    if (reportMode === 'Yearly') {
      const byYear = filteredRows.reduce<Record<number, number>>((acc, row) => {
        acc[row.Year] = (acc[row.Year] ?? 0) + row.IncidentCount
        return acc
      }, {})
      return Object.entries(byYear)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .map(([year, count]) => ({ label: `${year}`, value: count as number }))
    }
    if (reportMode === 'Monthly') {
      const byMonth = filteredRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.Month] = (acc[row.Month] ?? 0) + row.IncidentCount
        return acc
      }, {})
      const sortedMonths = Object.entries(byMonth).sort((a, b) => monthOrderKey(a[0]) - monthOrderKey(b[0]))
      return sortedMonths.map(([month, count], index) => {
        const previousCount = index > 0 ? sortedMonths[index - 1][1] : 0
        const change = previousCount === 0 ? 0 : ((count - previousCount) / previousCount) * 100
        return { label: month, value: count, change }
      })
    }
    // YoY
    const byYear = filteredRows.reduce<Record<number, number>>((acc, row) => {
      acc[row.Year] = (acc[row.Year] ?? 0) + row.IncidentCount
      return acc
    }, {})
    const years = Object.keys(byYear).map(Number).sort()
    return years.map((year) => {
      const previous = byYear[year - 1] ?? 0
      const change = previous === 0 ? 0 : ((byYear[year] - previous) / previous) * 100
      return { label: `${year}`, value: change }
    })
  }, [filteredRows, reportMode])

  type MonthlyPerformanceRow = {
    YearMonth: string
    Month: string
    StaffMember: string
    IncidentCount: number
    AvgDaysToClose: number
    CR9Closures: number
    CR1to4Closures: number
    improvementPercent: number
  }

  const monthlyPerformance = useMemo<MonthlyPerformanceRow[]>(() => {
    const rows = [...rowsWithClosureCounts].sort((a, b) => a.YearMonth.localeCompare(b.YearMonth))
    const groupedByStaff: Record<string, Row[]> = {}
    rows.forEach(row => {
      groupedByStaff[row.StaffMember] = groupedByStaff[row.StaffMember] ?? []
      groupedByStaff[row.StaffMember].push(row)
    })

    return Object.values(groupedByStaff).flatMap(staffRows =>
      staffRows.map((row, index) => {
        const previous = staffRows[index - 1]
        const improvementPercent = previous && previous.IncidentCount > 0
          ? ((previous.IncidentCount - row.IncidentCount) / previous.IncidentCount) * 100
          : 0
        return {
          YearMonth: row.YearMonth,
          Month: row.Month,
          StaffMember: row.StaffMember,
          IncidentCount: row.IncidentCount,
          AvgDaysToClose: row.AvgDaysToClose,
          CR9Closures: row.CR9Closures ?? 0,
          CR1to4Closures: row.CR1to4Closures ?? 0,
          improvementPercent,
        }
      })
    )
  }, [rowsWithClosureCounts])

  const latestMonthlySummary = useMemo(() => {
    const byMonth: Record<string, { YearMonth: string; IncidentCount: number; CR9Closures: number; CR1to4Closures: number }> = {}
    rowsWithClosureCounts.forEach(row => {
      const month = row.YearMonth
      if (!byMonth[month]) {
        byMonth[month] = { YearMonth: row.YearMonth, IncidentCount: 0, CR9Closures: 0, CR1to4Closures: 0 }
      }
      byMonth[month].IncidentCount += row.IncidentCount
      byMonth[month].CR9Closures += row.CR9Closures ?? 0
      byMonth[month].CR1to4Closures += row.CR1to4Closures ?? 0
    })
    const months = Object.values(byMonth).sort((a, b) => a.YearMonth.localeCompare(b.YearMonth))
    if (months.length === 0) return null
    const latest = months[months.length - 1]
    const previous = months[months.length - 2]
    const improvementPercent = previous && previous.IncidentCount > 0
      ? ((latest.IncidentCount - previous.IncidentCount) / previous.IncidentCount) * 100
      : 0
    return {
      YearMonth: latest.YearMonth,
      CR9Closures: latest.CR9Closures,
      CR1to4Closures: latest.CR1to4Closures,
      improvementPercent,
    }
  }, [rowsWithClosureCounts])

  const columns = TABLE_COLUMNS.map(c => c.key)

  const visibleRows = rowsWithClosureCounts

  function downloadCSV() {
    const csv = toCSV(columns, visibleRows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'schrg_report.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-3xl font-bold">SCHRG KPI Dashboard</h2>
        <p className="text-sm text-gray-600 mt-2">Interactive mock dashboard showing current, monthly, and year-over-year SCHRG performance for staff.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr] mb-6">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Total incidents</p>
                <p className="mt-3 text-3xl font-semibold">{totals.incidentCount}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Avg days to close</p>
                <p className="mt-3 text-3xl font-semibold">{totals.avgDays.toFixed(1)}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Priority mix</p>
                <p className="mt-3 text-lg font-semibold">{totals.priorities.join(', ') || 'None'}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Avg YoY improvement</p>
                <p className="mt-3 text-3xl font-semibold">{formatPercent(yoySummary.avgImprovement)}</p>
                <p className="text-xs text-gray-500 mt-1">{yoySummary.latestYear ? `Latest ${yoySummary.latestYear}` : 'No YoY data'}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Latest monthly closures</p>
                <p className="mt-3 text-lg font-semibold">CR9: {latestMonthlySummary?.CR9Closures ?? 0}</p>
                <p className="text-lg font-semibold">CR1-4: {latestMonthlySummary?.CR1to4Closures ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">{latestMonthlySummary?.YearMonth || 'No monthly data'}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Monthly improvement</p>
                <p className="mt-3 text-3xl font-semibold">{formatPercent(latestMonthlySummary?.improvementPercent ?? 0)}</p>
                <p className="text-xs text-gray-500 mt-1">{latestMonthlySummary?.YearMonth || 'No monthly data'}</p>
              </div>
            </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Mode</h3>
                <p className="text-sm text-gray-500">Choose how the report should be displayed.</p>
              </div>
              <div className="flex gap-2">
                {REPORT_MODES.map(mode => (
                  <button
                    key={mode}
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${reportMode === mode ? 'bg-wtg-secondary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => setReportMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {reportSummary.map(entry => (
                <div key={entry.label} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <span className="font-medium">{entry.label}</span>
                  <span className="text-right text-sm font-semibold text-gray-900">
                    {reportMode === 'YoY' ? formatPercent(entry.value) : entry.value}
                  </span>
                </div>
              ))}
            </div>
            {reportMode === 'Monthly' && (
              <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-semibold">Staff monthly closure performance</h3>
                  <p className="text-sm text-gray-500">CR9 and CR1-4 closure volumes with month-over-month improvement per staff.</p>
                </div>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Month</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Staff</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">CR9 Closures</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">CR1-4 Closures</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Total incidents</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Improvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyPerformance.map((row, index) => (
                      <tr key={`${row.YearMonth}-${row.StaffMember}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3">{row.YearMonth}</td>
                        <td className="px-4 py-3">{row.StaffMember}</td>
                        <td className="px-4 py-3">{row.CR9Closures}</td>
                        <td className="px-4 py-3">{row.CR1to4Closures}</td>
                        <td className="px-4 py-3">{row.IncidentCount}</td>
                        <td className="px-4 py-3">{formatPercent(row.improvementPercent)}</td>
                      </tr>
                    ))}
                    {monthlyPerformance.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No monthly performance rows available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </section>

      {reportMode === 'YoY' && (
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">Year-over-year improvement</h3>
              <p className="text-sm text-gray-500">Compare average close time and counts by staff.</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>Staff:</span>
              <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2">
                <option value="">All</option>
                {STAFF_CODES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Year</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Staff</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Current avg days</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Current count</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Prior avg days</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Improvement</th>
                </tr>
              </thead>
              <tbody>
                {filteredYoYRows.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">{row.CurrentYear}</td>
                    <td className="px-4 py-3">{row.StaffMember}</td>
                    <td className="px-4 py-3">{row.CurrentAvgDays.toFixed(1)}</td>
                    <td className="px-4 py-3">{row.CurrentCount}</td>
                    <td className="px-4 py-3">{row.PriorAvgDays?.toFixed(1) ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPercent(row.ImprovementPercent)}</td>
                  </tr>
                ))}
                {filteredYoYRows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No YoY data for this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-6">
          <h3 className="text-base font-semibold">Staff Performance</h3>
          <p className="text-sm text-gray-500 mt-1">View incident volumes and performance metrics by staff member.</p>
        </div>

        <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="space-y-4">
            {totals.staffCounts.map(item => {
              const width = totals.incidentCount === 0 ? 0 : Math.max(8, Math.min(100, (item.count / totals.incidentCount) * 100))
              return (
                <div key={item.code} className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                    <span>{item.code}</span>
                    <span>{item.count} incidents</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200">
                    <div className="h-2 rounded-full bg-wtg-secondary" style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Filter by staff:</span>
          <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="">All</option>
            {STAFF_CODES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </section>

      <section className="mb-6 flex justify-end">
        <button onClick={downloadCSV} className="rounded-full bg-wtg-secondary px-4 py-2 text-sm font-medium text-white">Download CSV</button>
      </section>

      <section>
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {TABLE_COLUMNS.map(column => <th key={column.key} className="px-4 py-3 text-left font-semibold text-gray-700">{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {TABLE_COLUMNS.map(column => (
                      <td key={column.key} className="px-4 py-3 align-top text-gray-800">{String(row[column.key as keyof Row] ?? '')}</td>
                    ))}
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr><td colSpan={TABLE_COLUMNS.length} className="px-4 py-8 text-center text-gray-500">No mock rows match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
