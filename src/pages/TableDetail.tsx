import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { TableDetailContent } from '../components/TableDetailContent'
import { BackButton } from '../components/BackButton'

export default function TableDetail() {
  const { tableName } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const backLabel = (location.state as { backLabel?: string } | null)?.backLabel ?? 'Back'

  return (
    <TableDetailContent
      tableName={tableName!}
      breadcrumb={<BackButton label={backLabel} onClick={() => navigate(-1)} />}
      highlightField={searchParams.get('field')}
    />
  )
}
