import columns from '../../data/columns.json'
import domains from '../../data/domains.json'
import meta from '../../data/meta.json'
import tables from '../../data/tables.json'
import type {
  ColumnRecord,
  DomainGroup,
  OwnershipSummary,
  SchemaInfo,
  StaffRecord,
  SubtableDefinition,
  TableRecord,
  TableType,
} from '../types'

interface MetaFile {
  schemas: SchemaInfo[]
  teams: string[]
  owners: StaffRecord[]
}

type TableFile = Array<Omit<TableRecord, 'tableType'> & { tableType?: TableType }>

function normalizeTable(table: TableFile[number]): TableRecord {
  return {
    ...table,
    tableType: table.tableType ?? null,
  }
}

const rawTables = tables as TableFile
const rawMeta = meta as MetaFile

export const sampleTables: TableRecord[] = rawTables.map(normalizeTable)
export const domainGroups: DomainGroup[] = domains as DomainGroup[]
export const schemas: SchemaInfo[] = rawMeta.schemas
export const teams: string[] = rawMeta.teams
export const owners: StaffRecord[] = rawMeta.owners

export const subtableDefinitions: SubtableDefinition[] = sampleTables.flatMap(table => table.subtables)
export const glbStaffColumns: ColumnRecord[] = (columns as ColumnRecord[]).filter(column => column.tableName === 'GlbStaff')
export const orgHeaderColumns: ColumnRecord[] = (columns as ColumnRecord[]).filter(column => column.tableName === 'OrgHeader')

export function getOwnershipSummary(): OwnershipSummary {
  return {
    totalTables: sampleTables.length,
    assignedPrimary: sampleTables.filter(table => table.primaryOwner).length,
    assignedDevTeam: sampleTables.filter(table => table.devTeamOwner).length,
    assignedBoth: sampleTables.filter(table => table.primaryOwner && table.devTeamOwner).length,
    unassigned: sampleTables.filter(table => !table.primaryOwner && !table.devTeamOwner).length,
    stale: sampleTables.filter(table => table.isStale).length,
    criticalityH: sampleTables.filter(table => table.criticality === 'H').length,
    criticalityM: sampleTables.filter(table => table.criticality === 'M').length,
    criticalityL: sampleTables.filter(table => table.criticality === 'L').length,
    criticalityUnset: sampleTables.filter(table => !table.criticality).length,
  }
}

export function getTablesByDomain(domain: string): TableRecord[] {
  return sampleTables.filter(table => table.domain === domain)
}

export function getColumnsForTable(tableName: string): ColumnRecord[] {
  return (columns as ColumnRecord[]).filter(column => column.tableName === tableName)
}
