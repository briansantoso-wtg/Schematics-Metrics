import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface WorkItem {
  WKI_PK: string
  WKI_WorkItemNumber: string
  ProductCode: string
  AreaCode: string
  ModuleCode: string
  ChangeTypeCode: string
  ChangeTypeDescription: string
  WKI_Summary: string
  WKI_Status: string
  WKI_Priority: string
  WKI_SystemCreateTimeUtc: string
  WKI_SystemLastEditTimeUtc: string
  WKI_SystemCreateUser: string
}

export default function WorkItems() {
  const [query1, setQuery1] = useState<WorkItem[]>([])
  const [query2, setQuery2] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const fetchData = async () => {
    try {
      const response = await fetch('/api/work-items')
      const data = await response.json()
      setQuery1(data.query1 || [])
      setQuery2(data.query2 || [])
      setLastUpdated(data.lastUpdated || new Date().toISOString())
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch work items data:', err)
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
    query1.forEach(item => allYears.add(new Date(item.WKI_SystemCreateTimeUtc).getFullYear()))
    query2.forEach(item => allYears.add(new Date(item.WKI_SystemCreateTimeUtc).getFullYear()))
    return Array.from(allYears).sort((a, b) => b - a)
  }, [query1, query2])

  const filteredQuery1 = useMemo(() => {
    return query1.filter(item => new Date(item.WKI_SystemCreateTimeUtc).getFullYear() === selectedYear)
  }, [query1, selectedYear])

  const filteredQuery2 = useMemo(() => {
    return query2.filter(item => new Date(item.WKI_SystemCreateTimeUtc).getFullYear() === selectedYear)
  }, [query2, selectedYear])

  if (loading) {
    return <div className="max-w-7xl mx-auto p-6">Loading work items data…</div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex-1">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">WORK ITEMS</p>
          <h1 className="text-3xl font-bold text-gray-900">PRO / PRO / SSC Work Items</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">
            Work Items filtered by Product=PRO, ProductArea=PRO, Module=SSC, split by ChangeType
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

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Query 1: ChangeType = TMC */}
        <div className="card p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">ChangeType = TMC</h2>
            <p className="text-sm text-gray-500 mt-1">Count: {filteredQuery1.length}</p>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredQuery1.length === 0 ? (
              <p className="text-gray-500 text-sm">No items found</p>
            ) : (
              filteredQuery1.map(item => (
                <div key={item.WKI_PK} className="border border-gray-200 rounded p-3 bg-gray-50 hover:bg-gray-100 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{item.WKI_WorkItemNumber}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.WKI_Summary}</p>
                      <div className="flex gap-2 mt-2 text-xs text-gray-500">
                        <span className="bg-white px-2 py-1 rounded">Status: {item.WKI_Status}</span>
                        <span className="bg-white px-2 py-1 rounded">Priority: {item.WKI_Priority}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Created: {new Date(item.WKI_SystemCreateTimeUtc).toLocaleDateString()} by {item.WKI_SystemCreateUser}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Query 2: ChangeType != TMC */}
        <div className="card p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">ChangeType ≠ TMC</h2>
            <p className="text-sm text-gray-500 mt-1">Count: {filteredQuery2.length}</p>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredQuery2.length === 0 ? (
              <p className="text-gray-500 text-sm">No items found</p>
            ) : (
              filteredQuery2.map(item => (
                <div key={item.WKI_PK} className="border border-gray-200 rounded p-3 bg-gray-50 hover:bg-gray-100 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{item.WKI_WorkItemNumber}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.WKI_Summary}</p>
                      <div className="flex gap-2 mt-2 text-xs text-gray-500">
                        <span className="bg-white px-2 py-1 rounded">Status: {item.WKI_Status}</span>
                        <span className="bg-white px-2 py-1 rounded">Priority: {item.WKI_Priority}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Created: {new Date(item.WKI_SystemCreateTimeUtc).toLocaleDateString()} by {item.WKI_SystemCreateUser}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 xl:grid-cols-4">
        <div className="card p-4 bg-blue-50 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Query 1 Items</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{filteredQuery1.length}</p>
          <p className="text-xs text-gray-500 mt-1">ChangeType = TMC</p>
        </div>
        <div className="card p-4 bg-emerald-50 border-l-4 border-emerald-500">
          <p className="text-sm text-gray-600">Query 2 Items</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{filteredQuery2.length}</p>
          <p className="text-xs text-gray-500 mt-1">ChangeType ≠ TMC</p>
        </div>
        <div className="card p-4 bg-amber-50 border-l-4 border-amber-500">
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{filteredQuery1.length + filteredQuery2.length}</p>
          <p className="text-xs text-gray-500 mt-1">Combined</p>
        </div>
        <div className="card p-4 bg-purple-50 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600">TMC Percentage</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {filteredQuery1.length + filteredQuery2.length === 0 ? '0' : ((filteredQuery1.length / (filteredQuery1.length + filteredQuery2.length)) * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">of total</p>
        </div>
      </div>
    </div>
  )
}
