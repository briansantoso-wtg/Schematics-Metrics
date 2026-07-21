import type { TableRecord, ColumnRecord, DomainGroup, SchemaInfo, StaffRecord, OwnershipSummary, Criticality, LMH, Sensitivity } from '../types'
import type { CreateRuleInput, PersistedRule } from './ruleModels'

export type TableWithColumns = TableRecord & { columns: ColumnRecord[] }

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
  return res.json()
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`)
  return res.json()
}

export const api = {
  getTables: () => get<TableRecord[]>('/api/tables'),
  getTable: (tableName: string) => get<TableWithColumns>(`/api/tables/${encodeURIComponent(tableName)}`),
  updateTable: (tableName: string, data: {
    domain?: string
    subdomain?: string | null
    tableType?: TableRecord['tableType']
    primaryOwner?: string | null
    secondaryOwner?: string | null
    devTeamOwner?: string | null
    criticality?: Criticality
    description?: string
    isStale?: boolean
    lastConfirmedDate?: string | null
    sensitivity?: Sensitivity
  }) => patch<TableRecord>(`/api/tables/${encodeURIComponent(tableName)}`, data),
  updateColumn: (tableName: string, columnName: string, data: { criticality?: Criticality; sensitivity?: Sensitivity }) =>
    patch<ColumnRecord>(`/api/columns/${encodeURIComponent(tableName)}/${encodeURIComponent(columnName)}`, data),
  getDomains: () => get<DomainGroup[]>('/api/domains'),
  createDomain: (data: { name: string; description?: string; primaryOwner?: string | null; secondaryOwner?: string | null; priority?: LMH; sensitiveData?: 'Restricted' | 'Open' | null }) =>
    post<DomainGroup>('/api/domains', data),
  updateDomain: (name: string, data: {
    description?: string
    primaryOwner?: string | null
    secondaryOwner?: string | null
    priority?: LMH
    sensitiveData?: 'Restricted' | 'Open' | null
    newName?: string
    subdomainOwners?: Record<string, { primaryOwner: string | null; secondaryOwner: string | null; priority?: LMH; sensitiveData?: Sensitivity } | null>
  }) => patch<DomainGroup>(`/api/domains/${encodeURIComponent(name)}`, data),
  deleteDomain: (name: string) => del<{ ok: boolean }>(`/api/domains/${encodeURIComponent(name)}`),
  getSchemas: () => get<SchemaInfo[]>('/api/schemas'),
  getTeams: () => get<string[]>('/api/teams'),
  getOwners: () => get<StaffRecord[]>('/api/owners'),
  getSummary: () => get<OwnershipSummary>('/api/summary'),
  getRules: () => get<PersistedRule[]>('/api/rules'),
  getRule: (ruleId: string) => get<PersistedRule>(`/api/rules/${encodeURIComponent(ruleId)}`),
  createRule: (data: CreateRuleInput) => post<PersistedRule>('/api/rules', data),
  updateRule: (ruleId: string, data: Partial<PersistedRule>) => patch<PersistedRule>(`/api/rules/${encodeURIComponent(ruleId)}`, data),
  deleteRule: (ruleId: string) => del<{ ok: boolean }>(`/api/rules/${encodeURIComponent(ruleId)}`),
}
