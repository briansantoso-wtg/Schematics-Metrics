import { useState, useEffect } from 'react'
import { Database, CheckCircle2, AlertTriangle, Loader2, Eye, EyeOff, LogOut, Monitor } from 'lucide-react'
import { useConnection } from '../contexts/Connection'

interface PlatformInfo {
  platform: string
  isWindows: boolean
  defaultUsername?: string
  defaultPassword?: string
}

export default function ConnectionSettings() {
  const { credentials, isConnected, setCredentials, setConnected } = useConnection()

  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)

  useEffect(() => {
    fetch('/api/platform')
      .then(r => r.json() as Promise<PlatformInfo>)
      .then(info => {
        setPlatformInfo(info)
        if (!info.isWindows) {
          setUsername(info.defaultUsername ?? '')
          setPassword(info.defaultPassword ?? '')
        }
      })
      .catch(() => setPlatformInfo({ platform: 'unknown', isWindows: false }))
  }, [])

  async function handleConnect(e?: React.FormEvent) {
    e?.preventDefault()
    setTesting(true)
    setTestResult(null)
    try {
      const body = platformInfo?.isWindows
        ? {}
        : { credentials: { username, password } }

      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { ok: boolean; error?: string }
      setTestResult(data)
      if (data.ok) {
        setCredentials(platformInfo?.isWindows ? null : { username, password })
        setConnected(true)
      }
    } catch {
      setTestResult({ ok: false, error: 'Network error — is the API server running?' })
    } finally {
      setTesting(false)
    }
  }

  function handleDisconnect() {
    setCredentials(null)
    setConnected(false)
    setUsername(platformInfo?.defaultUsername ?? '')
    setPassword(platformInfo?.defaultPassword ?? '')
    setTestResult(null)
  }

  const displayUser = credentials?.username ?? 'Windows Authentication'

  return (
    <div className="max-w-lg space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-wtg-primary/10 flex items-center justify-center">
          <Database className="w-5 h-5 text-wtg-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Database Connection</h1>
          <p className="text-sm text-gray-500">ediprod.db.corporate.cargowise.com</p>
        </div>
      </div>

      {/* Status banner */}
      {isConnected && (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Connected</p>
              <p className="text-sm text-green-700 font-mono">{displayUser}</p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}

      {/* Loading platform info */}
      {!platformInfo && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Detecting platform…
        </div>
      )}

      {/* Mac: not supported */}
      {platformInfo && !platformInfo.isWindows && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <Monitor className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Windows Authentication not available</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Integrated Windows auth requires the server to run on Windows.
                Use SQL credentials below.
              </p>
            </div>
          </div>

          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="user@domain.com"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-wtg-secondary focus:border-transparent"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-wtg-secondary focus:border-transparent"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400">Credentials are held in memory only and cleared when you close the browser.</p>
            </div>

            {testResult && !testResult.ok && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">Connection failed</p>
                  <p className="text-xs text-red-700 mt-0.5 font-mono">{testResult.error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={testing}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-wtg-primary text-white text-sm font-semibold hover:bg-wtg-primary/90 disabled:opacity-60 transition-colors"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {testing ? 'Connecting…' : isConnected ? 'Reconnect' : 'Connect'}
            </button>
          </form>
        </div>
      )}

      {/* Windows: integrated auth */}
      {platformInfo?.isWindows && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
            <Monitor className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Windows Authentication</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Connects using your current Windows login — no password required.
              </p>
            </div>
          </div>

          {testResult && !testResult.ok && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 text-sm">Connection failed</p>
                <p className="text-xs text-red-700 mt-0.5 font-mono">{testResult.error}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => handleConnect()}
            disabled={testing}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-wtg-primary text-white text-sm font-semibold hover:bg-wtg-primary/90 disabled:opacity-60 transition-colors"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {testing ? 'Connecting…' : isConnected ? 'Reconnect' : 'Connect with Windows Auth'}
          </button>
        </div>
      )}
    </div>
  )
}
