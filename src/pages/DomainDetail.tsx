import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, KeyRound, Link2 } from 'lucide-react'
import { BackButton } from '../components/BackButton'
import { api } from '../lib/api'
import { useNameDisplay } from '../contexts/NameDisplay'
import type { DomainGroup, TableRecord } from '../types'

function CritBadge({ crit }: { crit: string | null }) {
  if (crit === 'H') return <span className="badge-high">High</span>
  if (crit === 'M') return <span className="badge-medium">Medium</span>
  if (crit === 'L') return <span className="badge-low">Low</span>
  return <span className="badge-unassigned">Unset</span>
}

export default function DomainDetail() {
  const { domain } = useParams()
  const navigate = useNavigate()
  const { displayTable } = useNameDisplay()
  const decodedDomain = decodeURIComponent(domain || '')
  const [domainGroup, setDomainGroup] = useState<DomainGroup | null>(null)
  const [tables, setTables] = useState<TableRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getDomains(),
      api.getTables(),
    ]).then(([domains, allTables]) => {
      setDomainGroup(domains.find(d => d.name === decodedDomain) ?? null)
      setTables(allTables.filter(t => t.domain === decodedDomain))
    }).catch(console.error).finally(() => setLoading(false))
  }, [decodedDomain])

  const usedInReporting = tables.filter(t => t.usedInReporting).length

  if (loading) return null

  if (!domainGroup) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Domain not found</p>
        <button onClick={() => navigate('/tables')} className="btn-secondary mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to Tables
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <BackButton label="Back to Tables" onClick={() => navigate('/tables')} />
        <div>
          <h1 className="text-xl font-bold text-gray-900">{domainGroup.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{domainGroup.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>{domainGroup.tableCount} tables</span>
            <span>{usedInReporting} used in reporting</span>
          </div>
        </div>
      </div>

      {/* Info banner when showing subset */}
      {tables.length < domainGroup.tableCount && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          Showing <strong>{tables.length}</strong> of {domainGroup.tableCount} tables in this domain.
          The full table registry will be populated as schema import is completed.
        </div>
      )}

      {/* Table list */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-wtg-border bg-gray-50/80">
              <th className="text-left px-5 py-3 table-header">Table</th>
              <th className="text-left px-5 py-3 table-header">Schema</th>
              <th className="text-center px-5 py-3 table-header">Cols</th>
              <th className="text-center px-5 py-3 table-header">Criticality</th>
              <th className="text-left px-5 py-3 table-header">Primary Owner</th>
              <th className="text-left px-5 py-3 table-header">Dev Team</th>
              <th className="text-center px-5 py-3 table-header w-8"></th>
            </tr>
          </thead>
          <tbody>
            {tables.map(t => (
              <tr
                key={`${t.schema}.${t.tableName}`}
                className="border-b border-wtg-border/50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/table/${t.tableName}`, { state: { backLabel: `Back to ${domainGroup.name}` } })}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 font-mono text-xs">{displayTable(t.tableName, t.productName)}</span>
                    {t.primaryKeyColumns.length > 0 && <KeyRound className="w-3 h-3 text-amber-400" />}
                    {t.foreignKeys.length > 0 && <Link2 className="w-3 h-3 text-blue-400" />}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.description}</p>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-gray-500">{t.schema}</td>
                <td className="px-5 py-3 text-center text-xs text-gray-600">{t.columnCount}</td>
                <td className="px-5 py-3 text-center"><CritBadge crit={t.criticality} /></td>
                <td className="px-5 py-3 text-xs">
                  {t.primaryOwner ? (
                    <span className="text-gray-700">{t.primaryOwner}</span>
                  ) : (
                    <span className="text-gray-300 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs">
                  {t.devTeamOwner ? (
                    <span className="text-gray-700">{t.devTeamOwner}</span>
                  ) : (
                    <span className="text-gray-300 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
