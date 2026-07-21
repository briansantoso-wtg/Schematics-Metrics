import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Eye, Check } from 'lucide-react'
import { BackButton } from '../components/BackButton'
import { useNameDisplay } from '../contexts/NameDisplay'
import { Lookup } from '../components/Lookup'
import DataPreviewPanel from '../components/DataPreviewPanel'

interface TableOption {
  tableName: string
  productName: string | null
}

export default function DataPreview() {
  const { tableName } = useParams<{ tableName: string }>()
  const navigate = useNavigate()
  const { nameMode } = useNameDisplay()
  const [tables, setTables] = useState<TableOption[]>([])

  useEffect(() => {
    fetch('/api/tables')
      .then(r => r.json())
      .then((data: TableOption[]) => setTables(data))
      .catch(() => {})
  }, [])

  const selectedTable = tables.find(t => t.tableName === tableName)
    ?? (tableName ? { tableName, productName: null } : null)

  function handleTableChange(t: TableOption | null) {
    if (t && t.tableName !== tableName) navigate(`/table/${t.tableName}/preview`)
  }

  // Which name is primary vs secondary depends on current name mode
  const primaryLabel = (t: TableOption) =>
    nameMode === 'product' && t.productName ? t.productName : t.tableName
  const secondaryLabel = (t: TableOption) =>
    nameMode === 'product' ? (t.productName ? t.tableName : null) : t.productName

  return (
    <div className="max-w-full space-y-6">
      {/* Header */}
      <div>
        <BackButton label="Back to Table" to={`/table/${tableName}`} />
        <div className="flex items-center gap-3 flex-wrap">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Eye className="w-5 h-5 text-blue-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Data Preview</h1>
        <span className="text-xl font-light text-gray-300 select-none">›</span>
        <span className="text-sm font-medium text-gray-400">Table:</span>
        <div className="w-80">
          <Lookup<TableOption>
            value={selectedTable}
            onChange={handleTableChange}
            items={tables}
            getKey={t => t.tableName}
            getLabel={primaryLabel}
            filterFn={(t, q) =>
              t.tableName.toLowerCase().includes(q.toLowerCase()) ||
              (t.productName?.toLowerCase().includes(q.toLowerCase()) ?? false)
            }
            renderItem={(t, _isHighlighted, isSelected) => (
              <>
                <span className={`flex-1 text-sm text-gray-900 truncate ${nameMode === 'database' ? 'font-mono' : ''}`}>
                  {primaryLabel(t)}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
              </>
            )}
            getSubtitle={t => secondaryLabel(t)}
            clearable={false}
            portal
          />
        </div>
        </div>
      </div>

      {tableName && <DataPreviewPanel tableName={tableName} selectable />}
    </div>
  )
}
