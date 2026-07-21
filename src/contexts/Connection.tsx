import { createContext, useContext, useState, type ReactNode } from 'react'

export interface DbCredentials {
  username: string
  password: string
}

interface ConnectionState {
  credentials: DbCredentials | null  // null when using integrated Windows auth
  isConnected: boolean
  setCredentials: (creds: DbCredentials | null) => void
  setConnected: (connected: boolean) => void
}

const ConnectionContext = createContext<ConnectionState | null>(null)

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<DbCredentials | null>(null)
  const [isConnected, setConnected] = useState(false)

  function handleSetCredentials(creds: DbCredentials | null) {
    setCredentials(creds)
    if (!creds) setConnected(false)
  }

  return (
    <ConnectionContext.Provider value={{ credentials, isConnected, setCredentials: handleSetCredentials, setConnected }}>
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection() {
  const ctx = useContext(ConnectionContext)
  if (!ctx) throw new Error('useConnection must be used within ConnectionProvider')
  return ctx
}
