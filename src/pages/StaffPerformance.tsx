import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'
import { ArrowRight, Info } from 'lucide-react'

interface MonthlyData {
  Year: number
  Month: number
  YearMonth: string
  StaffMember: string
  IncidentCount: number
  AvgDaysToClose: number
}

interface YoYData {
  CurrentYear: number
  StaffMember: string
  CurrentAvgDays: number
  CurrentCount: number
  PriorAvgDays?: number
  PriorCount?: number
  ImprovementPercent?: number
}

const staffColors: Record<string, string> = {
  'AER': '#3b82f6',
  'BS8': '#ef4444',
  'KLT': '#8b5cf6',
  'RS6': '#10b981',
}

export default function StaffPerformance() {
  const [monthly, setMonthly] = useState<MonthlyData[]>([])
  const [yoy, setYoy] = useState<YoYData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState(2026)

  const fetchData = async () => {
    try {
      const response = await fetch('/api/schrg')
      const data = await response.json()
      setMonthly(data.monthly || [])
      setYoy(data.yoy || [])
      setLastUpdated(data.lastUpdated || new Date().toISOString())
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch staff performance data:', err)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const availableYears = useMemo(() => {
    const years = [...new Set(monthly.map(m => m.Year))].sort((a, b) => b - a)
    return years
  }, [monthly])

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears])

  const currentYearData = useMemo(() => {
    return monthly.filter(m => m.Year === selectedYear)
  }, [monthly, selectedYear])

  const staffPerformance = useMemo(() => {
    const grouped = currentYearData.reduce((acc, m) => {
      if (!acc[m.StaffMember]) {
        acc[m.StaffMember] = { name: m.StaffMember, count: 0, netResolutionAge: 0, entries: 0 }
      }
      acc[m.StaffMember].count += m.IncidentCount
      acc[m.StaffMember].netResolutionAge += m.AvgDaysToClose
      acc[m.StaffMember].entries += 1
      return acc
    }, {} as Record<string, { name: string; count: number; netResolutionAge: number; entries: number }>)

    return Object.values(grouped).map(s => ({
      name: s.name,
      count: s.count,
      netResolutionAge: parseFloat((s.netResolutionAge / s.entries).toFixed(2)),
    })).sort((a, b) => b.count - a.count)
  }, [currentYearData])

  const improvementData = useMemo(() => {
    return yoy
      .filter(y => y.ImprovementPercent !== undefined && y.ImprovementPercent !== null)
      .sort((a, b) => (b.ImprovementPercent || 0) - (a.ImprovementPercent || 0))
  }, [yoy])

  const monthlyPerformance = useMemo(() => {
    const staffData: Record<string, MonthlyData[]> = {}
    currentYearData.forEach(m => {
      if (!staffData[m.StaffMember]) staffData[m.StaffMember] = []
      staffData[m.StaffMember].push(m)
    })

    return Object.entries(staffData).map(([staff, data]) => ({
      staff,
      data: data.sort((a, b) => a.Month - b.Month),
    }))
  }, [currentYearData])

  if (loading) {
    return <div className="max-w-7xl mx-auto p-6">Loading staff performance data…</div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">SCHRG</p>
          <h1 className="text-3xl font-bold text-gray-900">Staff Performance</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Detailed performance metrics by staff member, including incident handling and resolution time trends.
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-2">
              Last updated: {new Date(lastUpdated).toLocaleString()} (auto-refreshes every 5 minutes)
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
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
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Incident volume & resolution</h2>
              <p className="text-sm text-gray-500 mt-1">Incident count and average days to close by staff.</p>
            </div>
          </div>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={staffPerformance} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#8b5cf6" name="Incident Count">
                  {staffPerformance.map(s => (
                    <Cell key={s.name} fill={staffColors[s.name] || '#6b7280'} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="netResolutionAge" stroke="#f59e0b" name="Net Resolution Age" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>"Net Resolution Age" = calendar days from incident creation (IM_SystemCreateTimeUtc) to closure (IM_CloseTimeUtc)</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Year-over-year improvement</h2>
              <p className="text-sm text-gray-500 mt-1">Resolution time improvement percentage by staff.</p>
            </div>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {improvementData.map((item) => (
              <div key={`${item.CurrentYear}-${item.StaffMember}`} className="space-y-2 pb-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{item.StaffMember} ({item.CurrentYear})</span>
                  <span className="font-semibold text-emerald-600">{item.ImprovementPercent}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (item.ImprovementPercent || 0))}%` }} />
                </div>
                <div className="text-xs text-gray-400">
                  {item.PriorAvgDays?.toFixed(1) || '—'}d → {item.CurrentAvgDays.toFixed(1)}d
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {monthlyPerformance.map(({ staff, data }) => (
          <div key={staff} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{staff} — Monthly trend</h3>
                <p className="text-sm text-gray-500 mt-1">Month-by-month incident count and resolution time.</p>
              </div>
            </div>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="Month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="IncidentCount" fill={staffColors[staff] || '#6b7280'} name="Incidents" />
                  <Line yAxisId="right" type="monotone" dataKey="AvgDaysToClose" stroke="#f59e0b" name="Avg Days" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
