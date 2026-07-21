import type { DomainGroup } from '../types'

export function DomainHoverCard({ domain }: { domain: DomainGroup }) {
  return (
    <div className="w-64 bg-white border border-gray-200 rounded-xl shadow-xl ring-1 ring-black/5 p-4 space-y-3">
      <div>
        <div className="font-semibold text-sm text-gray-900">{domain.name}</div>
        {domain.primaryOwner && (
          <div className="text-xs text-gray-500 mt-0.5">
            <span className="text-gray-400">Owner: </span>{domain.primaryOwner}
          </div>
        )}
        {domain.secondaryOwner && (
          <div className="text-xs text-gray-500">
            <span className="text-gray-400">Secondary: </span>{domain.secondaryOwner}
          </div>
        )}
      </div>

      {(domain.subdomains?.length ?? 0) > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Subdomains ({domain.subdomains!.length})
          </div>
          <div className="space-y-1">
            {domain.subdomains!.slice(0, 8).map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 truncate max-w-[160px]">{s.name}</span>
                <span className="text-gray-400 flex-shrink-0 ml-2">{s.tableCount} tables</span>
              </div>
            ))}
            {domain.subdomains!.length > 8 && (
              <div className="text-xs text-gray-400 italic">
                +{domain.subdomains!.length - 8} more
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-gray-100 flex justify-between text-xs">
        <span className="text-gray-500">Total tables</span>
        <span className="font-semibold text-gray-900">{domain.tableCount}</span>
      </div>
    </div>
  )
}
