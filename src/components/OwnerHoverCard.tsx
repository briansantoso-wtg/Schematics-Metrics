import type { StaffRecord } from '../types'

export function OwnerHoverCard({ staff, ownershipCount }: { staff: StaffRecord; ownershipCount: number }) {
  const initials = staff.fullName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div className="w-56 bg-white border border-gray-200 rounded-xl shadow-xl ring-1 ring-black/5 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-wtg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm text-gray-900 truncate">{staff.fullName}</div>
          {staff.title && <div className="text-xs text-gray-500 truncate">{staff.title}</div>}
        </div>
      </div>
      {staff.department && (
        <div className="text-xs text-gray-500 mb-3">
          <span className="text-gray-400">Dept: </span>{staff.department}
        </div>
      )}
      <div className="pt-2 border-t border-gray-100 flex justify-between text-xs">
        <span className="text-gray-500">Ownerships</span>
        <span className="font-semibold text-gray-900">{ownershipCount}</span>
      </div>
    </div>
  )
}
