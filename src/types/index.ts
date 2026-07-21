export type Criticality = 'H' | 'M' | 'L' | 'N' | 'Inherit' | null;
export type TableType = 'Platform' | 'Configuration' | 'Master Data' | 'Experience' | null;
export type LMH = 'Low' | 'Medium' | 'High' | null;
export type Sensitivity = 'Restricted' | 'Open' | 'inherit' | null;

export interface StaffRecord {
  code: string;
  fullName: string;
  title: string | null;
  department: string | null;
  employmentDate: string | null;
  lastDayOfWork: string | null;
}

export interface SubtableDefinition {
  id: string;
  parentTableName: string;
  name: string;
  description: string;
  discriminatorColumn: string;
  discriminatorValue: string;
  primaryOwner: string | null;
  secondaryOwner: string | null;
  devTeamOwner: string | null;
}

export interface SchemaInfo {
  name: string;
  description: string;
  tableCount: number;
}

export interface SubdomainInfo {
  name: string;
  domainName: string;
  primaryOwner: string | null;
  secondaryOwner: string | null;
  priority: LMH;
  sensitiveData: Sensitivity;
  tableCount: number;
}

export interface DomainGroup {
  name: string;
  description: string;
  tableCount: number;
  columnCount: number;
  ownershipCoverage: number; // 0-100
  criticalityBreakdown: { H: number; M: number; L: number; unset: number };
  primaryOwner: string | null;
  secondaryOwner: string | null;
  priority: LMH;
  sensitiveData: 'Restricted' | 'Open' | null;
  subdomains?: SubdomainInfo[]; // derived at runtime from table records
}

export interface TableRecord {
  schema: string;
  tableName: string;
  productName: string | null;
  domain: string;
  subdomain: string | null;
  columnCount: number;
  primaryKeyColumns: string[];
  foreignKeys: { column: string; referencedTable: string; referencedColumn: string }[];
  criticality: Criticality;
  tableType: TableType;
  primaryOwner: string | null;
  secondaryOwner: string | null;
  devTeamOwner: string | null;
  description: string;
  lastConfirmedDate: string | null;
  isStale: boolean;
  subtables: SubtableDefinition[];
  // Usage classification fields
  internallyRelevant: boolean;
  usedInReporting: boolean;
  reportingUsage: LMH;
  importance: LMH;
  jl5Familiarity: LMH;
  priorityScore: number | null;
  sensitivity: Sensitivity;
}

export interface ColumnRecord {
  tableName: string;
  columnName: string;
  productName: string | null;
  ordinalPosition: number;
  dataType: string;
  maxLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  columnDefault: string | null;
  referencedTable: string | null;
  referencedColumn: string | null;
  sensitivity: Sensitivity;
  criticality: Criticality;
}

export interface OwnershipSummary {
  totalTables: number;
  assignedPrimary: number;
  assignedDevTeam: number;
  assignedBoth: number;
  unassigned: number;
  stale: number;
  criticalityH: number;
  criticalityM: number;
  criticalityL: number;
  criticalityUnset: number;
}

export type OwnershipStatus = 'assigned' | 'partial' | 'unassigned' | 'stale'

export type EvaluationFrequency = 'Hourly' | 'Daily' | 'Weekly' | 'Fortnightly' | 'Monthly'

export interface DataRule {
  id: string
  name: string
  type: 'completeness' | 'format' | 'consistency' | 'timeliness' | 'range' | 'reference'
  table: string
  field: string | null
  severity: 'H' | 'M' | 'L'
  owner: string
  frequency: EvaluationFrequency
  lastRuntime: string | null
  status: 'active' | 'draft' | 'disabled'
  alertThreshold: { mode: 'absolute' | 'percentage'; value: number }
  lastHealthPct: number | null
  notes: string
};
