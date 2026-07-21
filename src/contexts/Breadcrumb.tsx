import { createContext, useContext, useState, type ReactNode } from 'react'

export type ExtraCrumb = { label: string; onClick?: () => void }

type ContextValue = {
  extra: ExtraCrumb[]
  setExtra: (crumbs: ExtraCrumb[]) => void
  crumbActions: Record<string, () => void>
  setCrumbActions: (actions: Record<string, () => void>) => void
}

const BreadcrumbContext = createContext<ContextValue>({
  extra: [], setExtra: () => {},
  crumbActions: {}, setCrumbActions: () => {},
})

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [extra, setExtra] = useState<ExtraCrumb[]>([])
  const [crumbActions, setCrumbActions] = useState<Record<string, () => void>>({})
  return (
    <BreadcrumbContext.Provider value={{ extra, setExtra, crumbActions, setCrumbActions }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumb() { return useContext(BreadcrumbContext) }
