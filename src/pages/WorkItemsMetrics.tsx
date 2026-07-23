import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Bar,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis,
  Label,
} from 'recharts'

interface MetricsData {
  WeekStart: string
  Throughput: number
  AvgLeadTimeDays: number
  AvgLeadTimeHours: number
  MinLeadTimeDays: number
  MaxLeadTimeDays: number
  OpenItems: number
}

interface SummaryData {
  TotalItems: number
  CompletedItems: number
  OpenItems: number
  AvgLeadTimeDays: number
  MinLeadTimeDays: number
  MaxLeadTimeDays: number
}

function formatWeekLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = String(date.getDate()).padStart(2, '0')
  const month = monthNames[date.getMonth()]
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export default function WorkItemsMetrics() {
  const [metrics, setMetrics] = useState<MetricsData[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const fetchData = async () => {
    try {
      const response = await fetch('/api/work-items-metrics')
      const data = await response.json()
      setMetrics(data.metrics || [])
      setSummary(data.summary || null)
      setLastUpdated(data.lastUpdated || new Date().toISOString())
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch work items metrics data:', err)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const availableYears = useMemo(() => {
    const allYears = new Set<number>()
    metrics.forEach(item => allYears.add(new Date(item.WeekStart).getFullYear()))
    return Array.from(allYears).sort((a, b) => b - a)
  }, [metrics])

  const filteredMetrics = useMemo(() => {
    return metrics
      .filter(item => new Date(item.WeekStart).getFullYear() === selectedYear)
      .sort((a, b) => new Date(a.WeekStart).getTime() - new Date(b.WeekStart).getTime())
      .map(item => ({
        ...item,
        formattedDate: formatWeekLabel(item.WeekStart)
      }))
  }, [metrics, selectedYear])

  if (loading) {
    return <div className="max-w-7xl mx-auto p-6">Loading work items metrics…</div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/work-items" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex-1">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">WORK ITEMS - TMC</p>
          <h1 className="text-3xl font-bold text-gray-900">Lead Time & Throughput</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Weekly throughput and lead time (creation to last edit) for PRO/PRO/SSC/TMC work items
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-2">
              Last updated: {new Date(lastUpdated).toLocaleString()} (auto-refreshes every 5 minutes)
            </p>
          )}
        </div>
        {availableYears.length > 0 && (
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 bg-white hover:border-gray-400"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid gap-4 xl:grid-cols-5">
          <div className="card p-4 bg-blue-50 border-l-4 border-blue-500">
            <p className="text-xs text-gray-600 uppercase">Total TMC Items</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{summary.TotalItems}</p>
          </div>
          <div className="card p-4 bg-emerald-50 border-l-4 border-emerald-500">
            <p className="text-xs text-gray-600 uppercase">Completed</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{summary.CompletedItems}</p>
          </div>
          <div className="card p-4 bg-amber-50 border-l-4 border-amber-500">
            <p className="text-xs text-gray-600 uppercase">Open</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{summary.OpenItems}</p>
          </div>
          <div className="card p-4 bg-purple-50 border-l-4 border-purple-500">
            <p className="text-xs text-gray-600 uppercase">Avg Lead Time</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{summary.AvgLeadTimeDays}</p>
            <p className="text-xs text-gray-400">days</p>
          </div>
          <div className="card p-4 bg-pink-50 border-l-4 border-pink-500">
            <p className="text-xs text-gray-600 uppercase">Lead Time Range</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{summary.MinLeadTimeDays} - {summary.MaxLeadTimeDays}</p>
            <p className="text-xs text-gray-400">days</p>
          </div>
        </div>
      )}

      {/* Weekly Chart */}
      <div className="card p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Weekly Trend</h2>
          <p className="text-sm text-gray-500 mt-1">Throughput (bars) and Lead Time (line) by week</p>
        </div>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredMetrics} margin={{ top: 10, right: 60, left: 60, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="formattedDate" angle={-45} tick={{ fill: '#6b7280', fontSize: 9, textAnchor: 'end', height: 60 }} />
              <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 11 }}>
                <Label value="Items Completed" angle={-90} position="insideLeft" offset={10} style={{ fill: '#6b7280', fontSize: 12 }} />
              </YAxis>
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 11 }}>
                <Label value="Lead Time (days)" angle={90} position="insideRight" offset={10} style={{ fill: '#6b7280', fontSize: 12 }} />
              </YAxis>
              <Tooltip />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar yAxisId="left" dataKey="Throughput" fill="#3b82f6" name="Items Completed" />
              <Line yAxisId="right" type="monotone" dataKey="AvgLeadTimeDays" stroke="#f59e0b" name="Avg Lead Time (days)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
