import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Database, CheckCircle2, XCircle, LogOut, Settings } from 'lucide-react'
import { useConnection } from '../contexts/Connection'

export default function ProfileTray() {
  const { credentials, isConnected, setCredentials, setConnected } = useConnection()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const connectedLabel = credentials?.username ?? 'Windows Auth'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-8 h-8 rounded-full bg-wtg-primary text-white text-xs font-bold flex items-center justify-center hover:ring-2 hover:ring-wtg-secondary transition-all"
        aria-label="Profile"
      >
        <Database className="w-4 h-4" />
        {/* Connection status dot */}
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            isConnected ? 'bg-green-400' : 'bg-gray-300'
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* DB status header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-600 truncate">ediprod.db.corporate.cargowise.com</p>
              {isConnected ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <p className="text-xs text-green-700 font-mono truncate">{connectedLabel}</p>
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-0.5">
                  <XCircle className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <p className="text-xs text-gray-400">Not connected</p>
                </div>
              )}
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              to="/connection"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400" />
              {isConnected ? 'Connection Settings' : 'Sign In'}
            </Link>
            {isConnected && (
              <button
                onClick={() => { setCredentials(null); setConnected(false); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
