import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface BackButtonProps {
  label: string
  onClick?: () => void
  to?: string
}

export function BackButton({ label, onClick, to }: BackButtonProps) {
  const className = "flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-3 transition-colors"

  if (to) {
    return (
      <Link to={to} className={className}>
        <ArrowLeft className="w-3.5 h-3.5" /> {label}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={className}>
      <ArrowLeft className="w-3.5 h-3.5" /> {label}
    </button>
  )
}
