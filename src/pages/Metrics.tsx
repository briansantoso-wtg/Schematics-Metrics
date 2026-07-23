import { useEffect, useMemo, useState } from 'react'
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
import {
  ArrowRight,
  Info,
} from 'lucide-react'

interface MonthlyData {
  Year: number
  Month: number
  YearMonth: string
  StaffMember: string
  IncidentCount: number
  NetResolutionAge: number
}

interface YearlyData {
  Year: number
  StaffMember: string
  Priority: string
  IncidentCount: number
  NetResolutionAge: number
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

interface PriorityMonthlyData {
  Year: number
  Month: number
  YearMonth: string
  Priority: string
  PriorityBand: string
  IncidentCount: number
  NetResolutionAgeHours: number
}

interface PriorityWeeklyData {
  Year: number
  Week: number
  WeekStart: string
  Priority: string
  PriorityBand: string
  IncidentCount: number
  NetResolutionAgeHours: number
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

function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${monthNames[parseInt(month)]} '${year.slice(-2)}`
}

function formatWeekLabel(weekStart: string): string {
  const [year, month, day] = weekStart.split('-')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthName = monthNames[parseInt(month) - 1]
  return `${day}-${monthName}-${year}`
}

function CustomWeekTick(props: any) {
  const { x, y, payload } = props
  if (!payload.value) return null
  const formatted = formatWeekLabel(payload.value)
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={10}
        textAnchor="start"
        fill="#6b7280"
        fontSize={10}
        style={{ transform: 'rotate(90deg)', transformOrigin: '0 0', whiteSpace: 'nowrap' }}
      >
        {formatted}
      </text>
    </g>
  )
}

export default function Metrics() {
  const [monthly, setMonthly] = useState<MonthlyData[]>([])
  const [yearly, setYearly] = useState<YearlyData[]>([])
  const [priorityMonthly, setPriorityMonthly] = useState<PriorityMonthlyData[]>([])
  const [priorityWeekly, setPriorityWeekly] = useState<PriorityWeeklyData[]>([])
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
      setPriorityMonthly(data.priorityMonthly || [])
      setPriorityWeekly(data.priorityWeekly || [])
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
    const sum = currentYearData.reduce((acc, m) => acc + m.NetResolutionAge, 0)
    return (sum / currentYearData.length).toFixed(2)
  }, [currentYearData])

  const staffPerformance = useMemo(() => {
    const grouped = currentYearData.reduce((acc, m) => {
      if (!acc[m.StaffMember]) {
        acc[m.StaffMember] = { name: m.StaffMember, count: 0, netResolutionAge: 0, entries: 0 }
      }
      acc[m.StaffMember].count += m.IncidentCount
      acc[m.StaffMember].netResolutionAge += m.NetResolutionAge
      acc[m.StaffMember].entries += 1
      return acc
    }, {} as Record<string, { name: string; count: number; netResolutionAge: number; entries: number }>)

    return Object.values(grouped).map(s => ({
      name: s.name,
      count: s.count,
      netResolutionAge: parseFloat((s.netResolutionAge / s.entries).toFixed(2)),
    })).sort((a, b) => b.count - a.count)
  }, [currentYearData])

  const monthlyTrend = useMemo(() => {
    const grouped = currentYearData.reduce((acc, m) => {
      const key = `${m.Month}/${m.Year}`
      if (!acc[key]) {
        acc[key] = { month: key, monthNum: m.Month, count: 0, netResolutionAge: 0, entries: 0 }
      }
      acc[key].count += m.IncidentCount
      acc[key].netResolutionAge += m.NetResolutionAge
      acc[key].entries += 1
      return acc
    }, {} as Record<string, { month: string; monthNum: number; count: number; netResolutionAge: number; entries: number }>)

    return Object.values(grouped)
      .sort((a, b) => a.monthNum - b.monthNum)
      .map(item => ({
        month: item.month,
        count: item.count,
        netResolutionAge: parseFloat((item.netResolutionAge / item.entries).toFixed(2)),
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

  const allCriticalitiesMonthly = useMemo(() => {
    const grouped: Record<string, { count: number; totalHours: number }> = {}
    priorityMonthly
      .filter(item => item.Year === selectedYear)
      .forEach(item => {
        if (!grouped[item.YearMonth]) {
          grouped[item.YearMonth] = { count: 0, totalHours: 0 }
        }
        grouped[item.YearMonth].count += item.IncidentCount
        grouped[item.YearMonth].totalHours += item.NetResolutionAgeHours * item.IncidentCount
      })
    return Object.entries(grouped)
      .map(([yearMonth, data]) => ({
        yearMonth,
        volume: data.count,
        hours: parseFloat((data.totalHours / data.count).toFixed(1))
      }))
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
  }, [priorityMonthly, selectedYear])

  const allCriticalitiesWeekly = useMemo(() => {
    if (priorityWeekly.length === 0) return []

    // Group data by week, filtered by selected year
    const grouped: Record<string, { count: number; totalHours: number }> = {}
    priorityWeekly
      .filter(item => item.Year === selectedYear)
      .forEach(item => {
        if (!grouped[item.WeekStart]) {
          grouped[item.WeekStart] = { count: 0, totalHours: 0 }
        }
        grouped[item.WeekStart].count += item.IncidentCount
        if (item.IncidentCount > 0) {
          grouped[item.WeekStart].totalHours += item.NetResolutionAgeHours * item.IncidentCount
        }
      })

    // Create result with all weeks
    return Object.entries(grouped)
      .map(([weekStart, data]) => ({
        weekStart,
        volume: data.count,
        hours: data.count > 0 ? parseFloat((data.totalHours / data.count).toFixed(1)) : 0
      }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  }, [priorityWeekly, selectedYear])

  const priorityBandMonthly = useMemo(() => {
    const bands: Record<string, Array<{ yearMonth: string; volume: number; hours: number }>> = {}
    const grouped: Record<string, Record<string, { count: number; totalHours: number }>> = {}

    priorityMonthly
      .filter(item => item.Year === selectedYear)
      .forEach(item => {
        if (!grouped[item.PriorityBand]) grouped[item.PriorityBand] = {}
        if (!grouped[item.PriorityBand][item.YearMonth]) {
          grouped[item.PriorityBand][item.YearMonth] = { count: 0, totalHours: 0 }
        }
        grouped[item.PriorityBand][item.YearMonth].count += item.IncidentCount
        grouped[item.PriorityBand][item.YearMonth].totalHours += item.NetResolutionAgeHours * item.IncidentCount
      })

    Object.entries(grouped).forEach(([band, months]) => {
      bands[band] = Object.entries(months)
        .map(([yearMonth, data]) => ({
          yearMonth,
          volume: data.count,
          hours: parseFloat((data.totalHours / data.count).toFixed(1))
        }))
        .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
    })
    return bands
  }, [priorityMonthly, selectedYear])

  const priorityBandWeekly = useMemo(() => {
    const bands: Record<string, Array<{ weekStart: string; volume: number; hours: number }>> = {}
    const grouped: Record<string, Record<string, { count: number; totalHours: number }>> = {}

    priorityWeekly
      .filter(item => item.Year === selectedYear)
      .forEach(item => {
        if (!grouped[item.PriorityBand]) grouped[item.PriorityBand] = {}
        if (!grouped[item.PriorityBand][item.WeekStart]) {
          grouped[item.PriorityBand][item.WeekStart] = { count: 0, totalHours: 0 }
        }
        grouped[item.PriorityBand][item.WeekStart].count += item.IncidentCount
        if (item.IncidentCount > 0) {
          grouped[item.PriorityBand][item.WeekStart].totalHours += item.NetResolutionAgeHours * item.IncidentCount
        }
      })

    Object.entries(grouped).forEach(([band, weeks]) => {
      bands[band] = Object.entries(weeks)
        .map(([weekStart, data]) => ({
          weekStart,
          volume: data.count,
          hours: data.count > 0 ? parseFloat((data.totalHours / data.count).toFixed(1)) : 0
        }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    })
    return bands
  }, [priorityWeekly, selectedYear])

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
              <ComposedChart data={monthlyTrend} margin={{ top: 10, right: 60, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 11 }}>
                  <Label value="Incident Count" angle={-90} position="insideLeft" offset={10} style={{ fill: '#6b7280', fontSize: 12 }} />
                </YAxis>
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 11 }}>
                  <Label value="Resolution Time (days)" angle={90} position="insideRight" offset={10} style={{ fill: '#6b7280', fontSize: 12 }} />
                </YAxis>
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Incident Count" label={{ position: 'top', fill: '#6b7280', fontSize: 11 }} />
                <Line yAxisId="right" type="monotone" dataKey="netResolutionAge" stroke="#ef4444" name="Avg Resolution Time (days)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>"Net Resolution Age" = calendar days from incident creation (IM_SystemCreateTimeUtc) to closure (IM_CloseTimeUtc)</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">All Criticalities (CR1-CR9)</h2>
            <p className="text-sm text-gray-500 mt-1">Weekly incident volume and resolution time trend. Each bar = 1 week</p>
          </div>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={allCriticalitiesWeekly} margin={{ top: 10, right: 60, left: 60, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="weekStart" angle={-45} tick={{ fill: '#6b7280', fontSize: 9, textAnchor: 'end', height: 60 }} tickFormatter={(value) => formatWeekLabel(value)} />
                <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 11 }}>
                  <Label value="Volume" angle={-90} position="insideLeft" offset={10} style={{ fill: '#6b7280', fontSize: 12 }} />
                </YAxis>
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 11 }}>
                  <Label value="Hours" angle={90} position="insideRight" offset={10} style={{ fill: '#6b7280', fontSize: 12 }} />
                </YAxis>
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="volume" fill="#d1d5db" name="Incident Volume" label={(props: any) => {
                  if (!props?.payload?.weekStart) return null
                  const { x, y, width, payload } = props
                  return (
                    <text x={x + width / 2} y={y - 10} fill="#374151" textAnchor="middle" fontSize={8} fontWeight="bold">
                      {formatWeekLabel(payload.weekStart)}
                    </text>
                  )
                }} />
                <Line yAxisId="right" type="monotone" dataKey="hours" stroke="#3b82f6" name="Avg Resolution Time (h)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {['CR1-CR2', 'CR3', 'CR4-CR5'].map(band => (
          <div key={band} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{band}</h2>
                <p className="text-sm text-gray-500 mt-1">Weekly incident volume and resolution time trend. Each bar = 1 week</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={priorityBandWeekly[band] || []} margin={{ top: 10, right: 60, left: 60, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="weekStart" angle={-45} tick={{ fill: '#6b7280', fontSize: 9, textAnchor: 'end', height: 60 }} tickFormatter={(value) => formatWeekLabel(value)} />
                  <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 11 }}>
                    <Label value="Volume" angle={-90} position="insideLeft" offset={10} style={{ fill: '#6b7280', fontSize: 12 }} />
                  </YAxis>
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 11 }}>
                    <Label value="Hours" angle={90} position="insideRight" offset={10} style={{ fill: '#6b7280', fontSize: 12 }} />
                  </YAxis>
                  <Tooltip />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar yAxisId="left" dataKey="volume" fill="#d1d5db" name="Incident Volume" label={(props: any) => {
                    if (!props?.payload?.weekStart) return null
                    const { x, y, width, payload } = props
                    return (
                      <text x={x + width / 2} y={y - 10} fill="#374151" textAnchor="middle" fontSize={8} fontWeight="bold">
                        {formatWeekLabel(payload.weekStart)}
                      </text>
                    )
                  }} />
                  <Line yAxisId="right" type="monotone" dataKey="hours" stroke="#3b82f6" name="Avg Resolution Time (h)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
