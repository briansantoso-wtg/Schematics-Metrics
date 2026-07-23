import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import {
  TrendingDown,
  Users,
  AlertCircle,
  Clock,
  ArrowRight,
  Info,
} from 'lucide-react'

interface MonthlyData {
  Year: number
  Month: number
  YearMonth: string
  StaffMember: string
  IncidentCount: number
  AvgDaysToClose: number
}

interface YearlyData {
  Year: number
  StaffMember: string
  Priority: string
  IncidentCount: number
  AvgDaysToClose: number
  MinDays: number
  MaxDays: number
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

function StatCard({ icon: Icon, label, value, subtitle, color, href }: {
  icon: React.ElementType
  label: string
  value: string | number
  subtitle?: string
  color: 'blue' | 'green' | 'amber' | 'red' | 'slate'
  href?: string
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-gray-50 text-gray-500',
  }

  const card = (
    <div className="card p-5 h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )

  return href ? <Link to={href}>{card}</Link> : card
}

const staffColors: Record<string, string> = {
  'AER': '#3b82f6',
  'BS8': '#ef4444',
  'KLT': '#8b5cf6',
  'RS6': '#10b981',
}

const priorityColors: Record<string, string> = {
  'CR2': '#dc2626',
  'CR3': '#f59e0b',
  'CR4': '#eab308',
  'CR5': '#84cc16',
  'CR7': '#22c55e',
  'CR8': '#10b981',
  'CR9': '#06b6d4',
}

export default function Metrics() {
  const [monthly, setMonthly] = useState<MonthlyData[]>([])
  const [yearly, setYearly] = useState<YearlyData[]>([])
  const [yoy, setYoy] = useState<YoYData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState(2026)

  const fetchData = async () => {
    try {
      const response = await fetch('/api/schrg')
      const data = await response.json()
      setMonthly(data.monthly || [])
      setYearly(data.yearly || [])
      setYoy(data.yoy || [])
      setLastUpdated(data.lastUpdated || new Date().toISOString())
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch SCHRG data:', err)
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

  const totalIncidents = useMemo(() => {
    return currentYearData.reduce((sum, m) => sum + m.IncidentCount, 0)
  }, [currentYearData])

  const avgResolutionTime = useMemo(() => {
    if (currentYearData.length === 0) return 0
    const sum = currentYearData.reduce((acc, m) => acc + m.AvgDaysToClose, 0)
    return (sum / currentYearData.length).toFixed(2)
  }, [currentYearData])

  const staffPerformance = useMemo(() => {
    const grouped = currentYearData.reduce((acc, m) => {
      if (!acc[m.StaffMember]) {
        acc[m.StaffMember] = { name: m.StaffMember, count: 0, avgDays: 0, entries: 0 }
      }
      acc[m.StaffMember].count += m.IncidentCount
      acc[m.StaffMember].avgDays += m.AvgDaysToClose
      acc[m.StaffMember].entries += 1
      return acc
    }, {} as Record<string, { name: string; count: number; avgDays: number; entries: number }>)

    return Object.values(grouped).map(s => ({
      name: s.name,
      count: s.count,
      avgDays: parseFloat((s.avgDays / s.entries).toFixed(2)),
    })).sort((a, b) => b.count - a.count)
  }, [currentYearData])

  const monthlyTrend = useMemo(() => {
    const grouped = currentYearData.reduce((acc, m) => {
      const key = `${m.Month}/${m.Year}`
      if (!acc[key]) {
        acc[key] = { month: key, monthNum: m.Month, count: 0, avgDays: 0, entries: 0 }
      }
      acc[key].count += m.IncidentCount
      acc[key].avgDays += m.AvgDaysToClose
      acc[key].entries += 1
      return acc
    }, {} as Record<string, { month: string; monthNum: number; count: number; avgDays: number; entries: number }>)

    return Object.values(grouped)
      .sort((a, b) => a.monthNum - b.monthNum)
      .map(item => ({
        month: item.month,
        count: item.count,
        avgDays: parseFloat((item.avgDays / item.entries).toFixed(2)),
      }))
  }, [currentYearData])

  const priorityBreakdown = useMemo(() => {
    const selectedYearlyData = yearly.filter(y => y.Year === selectedYear)
    const grouped = selectedYearlyData.reduce((acc, y) => {
      if (!acc[y.Priority]) {
        acc[y.Priority] = 0
      }
      acc[y.Priority] += y.IncidentCount
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped)
      .map(([priority, count]) => ({ name: priority, value: count }))
      .sort((a, b) => b.value - a.value)
  }, [yearly, selectedYear])

  const improvementData = useMemo(() => {
    return yoy
      .filter(y => y.ImprovementPercent !== undefined && y.ImprovementPercent !== null)
      .sort((a, b) => (b.ImprovementPercent || 0) - (a.ImprovementPercent || 0))
  }, [yoy])

  if (loading) {
    return <div className="max-w-7xl mx-auto p-6">Loading SCHRG metrics…</div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">SCHRG</p>
          <h1 className="text-3xl font-bold text-gray-900">Incident Metrics</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Service incident resolution KPIs by staff member, priority, and resolution time trends.
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
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-wtg-secondary hover:text-wtg-secondary-dark">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Monthly incident trends</h2>
              <p className="text-sm text-gray-500 mt-1">Incident volume and average resolution time by month.</p>
            </div>
          </div>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyTrend} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Incident Count" />
                <Line yAxisId="right" type="monotone" dataKey="avgDays" stroke="#ef4444" name="Avg Days to Close" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>"Avg Days to Close" = calendar days from incident creation (IM_SystemCreateTimeUtc) to closure (IM_CloseTimeUtc)</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Priority breakdown</h2>
              <p className="text-sm text-gray-500 mt-1">Incident distribution by criticality level.</p>
            </div>
          </div>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  label
                >
                  {priorityBreakdown.map(item => (
                    <Cell key={`cell-${item.name}`} fill={priorityColors[item.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Priority-based resolution times</h2>
            <p className="text-sm text-gray-500 mt-1">Average days to close by priority level.</p>
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Year {selectedYear}
          </div>
        </div>
        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={yearly
                .filter(y => y.Year === selectedYear)
                .reduce((acc, y) => {
                  const existing = acc.find(a => a.priority === y.Priority)
                  if (existing) {
                    existing.avgDays = ((existing.avgDays * existing.count) + (y.AvgDaysToClose * y.IncidentCount)) / (existing.count + y.IncidentCount)
                    existing.count += y.IncidentCount
                  } else {
                    acc.push({ priority: y.Priority, avgDays: y.AvgDaysToClose, count: y.IncidentCount })
                  }
                  return acc
                }, [] as Array<{ priority: string; avgDays: number; count: number }>)
                .sort((a, b) => a.priority.localeCompare(b.priority))
              }
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="priority" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgDays" fill="#10b981" name="Avg Days to Close" radius={[8, 8, 0, 0]}>
                {priorityBreakdown.map(item => (
                  <Cell key={`cell-${item.name}`} fill={priorityColors[item.name] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
