import { createContext, useContext, useState } from 'react'

type NameMode = 'database' | 'product'

interface NameDisplayContextValue {
  nameMode: NameMode
  setNameMode: (mode: NameMode) => void
  displayTable: (dbName: string, productName: string | null | undefined) => string
  displayColumn: (dbName: string, productName: string | null | undefined) => string
}

const NameDisplayContext = createContext<NameDisplayContextValue>({
  nameMode: 'database',
  setNameMode: () => {},
  displayTable: (db) => db,
  displayColumn: (db) => db,
})

export function NameDisplayProvider({ children }: { children: React.ReactNode }) {
  const [nameMode, setNameMode] = useState<NameMode>('database')

  const displayTable = (dbName: string, productName: string | null | undefined) =>
    nameMode === 'product' && productName ? productName : dbName

  const displayColumn = (dbName: string, productName: string | null | undefined) =>
    nameMode === 'product' && productName ? productName : dbName

  return (
    <NameDisplayContext.Provider value={{ nameMode, setNameMode, displayTable, displayColumn }}>
      {children}
    </NameDisplayContext.Provider>
  )
}

export function useNameDisplay() {
  return useContext(NameDisplayContext)
}
