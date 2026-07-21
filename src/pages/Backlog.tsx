import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Plus, AlertCircle, CheckCircle2, Clock, Database, Wrench, ShieldAlert,
  UserCheck, ArrowRightLeft, UserCog, Zap,
  RefreshCw, AlertTriangle, ListChecks, X,
} from 'lucide-react'
import { owners as staffRecords } from '../data/mockData'
import type { ColSpec, ImportColSpec } from '../lib/exportTable'
import { StringLookup } from '../components/Lookup'
import { DataTable } from '../components/DataTable'

const owners = staffRecords.map(s => s.fullName)

// --- Types ---

type BacklogType = 'rectification' | 'product_change' | 'rule_change' | 'governance_system_change'
type BacklogPriority = 'critical' | 'high' | 'medium' | 'low'
type BacklogStatus = 'open' | 'in_progress' | 'resolved' | 'wont_fix'
type AssignmentType = 'accepted' | 'delegated' | 'overridden'
type TabId = 'all' | BacklogType

interface BacklogItem {
  id: string
  type: BacklogType
  summary: string
  description: string
  priority: BacklogPriority
  status: BacklogStatus
  domain: string
  table: string | null
  affectedRecordCount: number | null
  defaultOwner: string
  assignedTo: string | null
  assignmentType: AssignmentType | null
  assignmentNotes: string | null
  createdBy: string
  createdAt: string
  resolvedAt: string | null
  resolutionNotes: string | null
}

interface FormState {
  type: BacklogType | ''
  summary: string
  description: string
  priority: BacklogPriority | ''
  domain: string
  table: string
  affectedRecordCount: string
  assignedTo: string
}

const emptyForm: FormState = {
  type: '', summary: '', description: '', priority: '',
  domain: '', table: '', affectedRecordCount: '', assignedTo: '',
}

// --- Constants ---

const PROTOTYPE_DATE = '2026-03-23'
const PROTOTYPE_TODAY = new Date(PROTOTYPE_DATE)

const DOMAIN_OWNERS: Record<string, string> = {
  'Core': 'Anna Lindqvist',
  'HR': 'Anna Lindqvist',
  'Master Data Management': 'Rachel Torres',
  'Sales and Marketing': 'Rachel Torres',
}

const TYPE_OPTIONS: {
  id: BacklogType
  label: string
  Icon: React.FC<{ className?: string }>
  desc: string
  selectedCls: string
  iconSelectedCls: string
}[] = [
  {
    id: 'product_change',
    label: 'Product Change',
    Icon: Wrench,
    desc: 'The system or schema needs to change to prevent this problem recurring.',
    selectedCls: 'border-violet-400 bg-violet-50',
    iconSelectedCls: 'bg-violet-100 text-violet-600',
  },
  {
    id: 'rule_change',
    label: 'Rule Change',
    Icon: ListChecks,
    desc: 'A data standard or validation rule needs to be defined or updated.',
    selectedCls: 'border-teal-400 bg-teal-50',
    iconSelectedCls: 'bg-teal-100 text-teal-600',
  },
  {
    id: 'rectification',
    label: 'Rectification',
    Icon: Database,
    desc: 'Specific data records need to be corrected or completed.',
    selectedCls: 'border-blue-400 bg-blue-50',
    iconSelectedCls: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'governance_system_change',
    label: 'Governance System Change',
    Icon: ShieldAlert,
    desc: 'The ownership model or governance structure needs to be updated.',
    selectedCls: 'border-amber-400 bg-amber-50',
    iconSelectedCls: 'bg-amber-100 text-amber-600',
  },
]

const PRIORITY_OPTIONS: { id: BacklogPriority; label: string; selectedCls: string }[] = [
  { id: 'critical', label: 'Critical', selectedCls: 'bg-red-500 text-white border-red-500' },
  { id: 'high',     label: 'High',     selectedCls: 'bg-orange-400 text-white border-orange-400' },
  { id: 'medium',   label: 'Medium',   selectedCls: 'bg-amber-400 text-white border-amber-400' },
  { id: 'low',      label: 'Low',      selectedCls: 'bg-gray-400 text-white border-gray-400' },
]

// --- Mock data ---

const initialItems: BacklogItem[] = [
  {
    id: 'BL-001',
    type: 'rectification',
    summary: 'Fill in missing email addresses for ~340 active customer records',
    description: 'Email addresses are blank for 340 active customer records in OrgContact. The contacts are otherwise valid — this appears to be a data entry gap over the past 18 months. Elena has access to the source CRM export and can batch-populate these from the original intake data.',
    priority: 'high',
    status: 'in_progress',
    domain: 'Master Data Management',
    table: 'OrgContact',
    affectedRecordCount: 340,
    defaultOwner: 'Rachel Torres',
    assignedTo: 'Elena Volkov',
    assignmentType: 'delegated',
    assignmentNotes: 'Delegated to Elena — she has direct access to the source CRM data for these contacts and can process in bulk.',
    createdBy: 'Rachel Torres',
    createdAt: '2026-03-18',
    resolvedAt: null,
    resolutionNotes: null,
  },
  {
    id: 'BL-002',
    type: 'rectification',
    summary: '14 staff members assigned to deprecated team codes',
    description: 'GlbEmploymentTeam contains 14 records referencing team codes that have been marked inactive. These staff members appear teamless in scheduling and reporting outputs. Each record needs to be reviewed and updated to a valid current team code by HR.',
    priority: 'high',
    status: 'open',
    domain: 'Core',
    table: 'GlbEmploymentTeam',
    affectedRecordCount: 14,
    defaultOwner: 'Anna Lindqvist',
    assignedTo: null,
    assignmentType: null,
    assignmentNotes: null,
    createdBy: 'Anna Lindqvist',
    createdAt: '2026-03-19',
    resolvedAt: null,
    resolutionNotes: null,
  },
  {
    id: 'BL-003',
    type: 'rectification',
    summary: '23 active staff records have no home branch assigned',
    description: 'GS_GB_HomeBranch is null for 23 currently active staff members. Home branch is required for scheduling, system access control, and payroll routing. These records need to be reviewed and assigned a branch — HR has confirmed they are all current employees.',
    priority: 'high',
    status: 'in_progress',
    domain: 'Core',
    table: 'GlbStaff',
    affectedRecordCount: 23,
    defaultOwner: 'Anna Lindqvist',
    assignedTo: 'Anna Lindqvist',
    assignmentType: 'accepted',
    assignmentNotes: null,
    createdBy: 'Thomas Müller',
    createdAt: '2026-03-17',
    resolvedAt: null,
    resolutionNotes: null,
  },
  {
    id: 'BL-004',
    type: 'rectification',
    summary: '7 circular manager reference chains in GlbStaffManager',
    description: 'The manager hierarchy contains 7 circular references (e.g., Staff A reports to B, B reports to A). These break all org hierarchy traversal used in reporting roll-ups, delegation logic, and notification routing. Each chain requires manual resolution by HR to assign the correct reporting line.',
    priority: 'critical',
    status: 'open',
    domain: 'HR',
    table: 'GlbStaffManager',
    affectedRecordCount: 7,
    defaultOwner: 'Anna Lindqvist',
    assignedTo: null,
    assignmentType: null,
    assignmentNotes: null,
    createdBy: 'David Park',
    createdAt: '2026-03-16',
    resolvedAt: null,
    resolutionNotes: null,
  },
  {
    id: 'BL-005',
    type: 'rectification',
    summary: '156 contacts with malformed email addresses',
    description: 'A format validation sweep of OC_Email found 156 values failing basic email pattern checks — including truncated entries, missing domain parts, entries with embedded whitespace, and entries ending in punctuation. These need to be reviewed and corrected, or flagged for follow-up with the contact.',
    priority: 'medium',
    status: 'open',
    domain: 'Master Data Management',
    table: 'OrgContact',
    affectedRecordCount: 156,
    defaultOwner: 'Rachel Torres',
    assignedTo: null,
    assignmentType: null,
    assignmentNotes: null,
    createdBy: 'Elena Volkov',
    createdAt: '2026-03-20',
    resolvedAt: null,
    resolutionNotes: null,
  },
  {
    id: 'BL-006',
    type: 'rectification',
    summary: '28 organisation registrations expired and not renewed',
    description: 'OrgRegistration records where OR_ExpiryDate is in the past and OR_Status is still active. These represent potentially invalid registrations that may create compliance exposure. Organisations need to be contacted to renew, or the registrations formally closed.',
    priority: 'medium',
    status: 'resolved',
    domain: 'Master Data Management',
    table: 'OrgRegistration',
    affectedRecordCount: 28,
    defaultOwner: 'Rachel Torres',
    assignedTo: 'Elena Volkov',
    assignmentType: 'delegated',
    assignmentNotes: 'Elena has the contact list and the access needed to manage registration records.',
    createdBy: 'Rachel Torres',
    createdAt: '2026-03-01',
    resolvedAt: '2026-03-21',
    resolutionNotes: 'All 28 organisations contacted. 19 renewed their registrations; 9 registrations formally closed as obsolete.',
  },
  {
    id: 'BL-007',
    type: 'product_change',
    summary: 'Add required-field validation for OC_Email on OrgContact',
    description: 'The current schema allows OC_Email to be null, which is causing ongoing data quality gaps (see BL-001, BL-005). A NOT NULL constraint — or application-layer validation before save — should be introduced to prevent new contacts being created without an email address.',
    priority: 'high',
    status: 'open',
    domain: 'Master Data Management',
    table: 'OrgContact',
    affectedRecordCount: null,
    defaultOwner: 'Rachel Torres',
    assignedTo: null,
    assignmentType: null,
    assignmentNotes: null,
    createdBy: 'Rachel Torres',
    createdAt: '2026-03-18',
    resolvedAt: null,
    resolutionNotes: null,
  },
  {
    id: 'BL-008',
    type: 'product_change',
    summary: 'Prevent circular manager assignment at the application layer',
    description: 'No validation exists to block circular reporting chains when a manager assignment is saved. The system should traverse the full ancestry path before committing any GlbStaffManager change and reject updates that would introduce a cycle. This prevents the class of issue in BL-004 from recurring.',
    priority: 'medium',
    status: 'open',
    domain: 'HR',
    table: 'GlbStaffManager',
    affectedRecordCount: null,
    defaultOwner: 'Anna Lindqvist',
    assignedTo: null,
    assignmentType: null,
    assignmentNotes: null,
    createdBy: 'David Park',
    createdAt: '2026-03-16',
    resolvedAt: null,
    resolutionNotes: null,
  },
  {
    id: 'BL-009',
    type: 'rule_change',
    summary: 'Define and publish the valid email format standard for contact records',
    description: 'There is no agreed data standard for what constitutes a valid email address. Decisions needed: RFC-5321 compliance level, domain allowlist/blocklist, treatment of disposable addresses, maximum length. Once agreed, the standard should be published and Spec 05 updated with a formal validation rule to be enforced going forward.',
    priority: 'medium',
    status: 'open',
    domain: 'Master Data Management',
    table: 'OrgContact',
    affectedRecordCount: null,
    defaultOwner: 'Rachel Torres',
    assignedTo: 'Rachel Torres',
    assignmentType: 'accepted',
    assignmentNotes: null,
    createdBy: 'Rachel Torres',
    createdAt: '2026-03-19',
    resolvedAt: null,
    resolutionNotes: null,
  },
  {
    id: 'BL-010',
    type: 'rule_change',
    summary: 'Clarify active status lifecycle rule for OrgHeader records',
    description: '342 organisations are marked active with no recorded activity in 24+ months. The current data standard does not define inactivity criteria for org records. A governance decision is needed: set an auto-archive threshold, require an annual owner review, or define another mechanism to keep the active population clean.',
    priority: 'medium',
    status: 'open',
    domain: 'Master Data Management',
    table: 'OrgHeader',
    affectedRecordCount: 342,
    defaultOwner: 'Rachel Torres',
    assignedTo: 'Rachel Torres',
    assignmentType: 'accepted',
    assignmentNotes: null,
    createdBy: 'Rachel Torres',
    createdAt: '2026-03-15',
    resolvedAt: null,
    resolutionNotes: null,
  },
  {
    id: 'BL-011',
    type: 'governance_system_change',
    summary: 'Assign a data owner to GlbStaffHoliday',
    description: 'GlbStaffHoliday currently has no table-level data owner and is in the inherited state. The domain owner (Anna Lindqvist) is the fallback owner by default. Given that this table manages staff leave records with payroll implications, a specific table-level owner should be nominated.',
    priority: 'low',
    status: 'open',
    domain: 'Core',
    table: 'GlbStaffHoliday',
    affectedRecordCount: null,
    defaultOwner: 'Anna Lindqvist',
    assignedTo: null,
    assignmentType: null,
    assignmentNotes: null,
    createdBy: 'Anna Lindqvist',
    createdAt: '2026-03-10',
    resolvedAt: null,
    resolutionNotes: null,
  },
  {
    id: 'BL-012',
    type: 'governance_system_change',
    summary: 'Assign a data owner to OrgOpportunity',
    description: 'OrgOpportunity has no primary data owner and no dev team owner assigned. It is in the inherited state under Organisation & Contacts. Given its role in the sales pipeline, a specific owner should be nominated — likely from the CRM & Sales team.',
    priority: 'low',
    status: 'open',
    domain: 'Sales and Marketing',
    table: 'OrgOpportunity',
    affectedRecordCount: null,
    defaultOwner: 'Rachel Torres',
    assignedTo: null,
    assignmentType: null,
    assignmentNotes: null,
    createdBy: 'Rachel Torres',
    createdAt: '2026-03-05',
    resolvedAt: null,
    resolutionNotes: null,
  },
]

// --- Helpers ---

function ageText(dateStr: string): string {
  const days = Math.floor((PROTOTYPE_TODAY.getTime() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  if (days < 14) return '1w ago'
  return `${Math.floor(days / 7)}w ago`
}

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// --- Sub-components ---

function TypeBadge({ type }: { type: BacklogType }) {
  if (type === 'rectification') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
      <Database className="w-3 h-3" /> Rectification
    </span>
  )
  if (type === 'product_change') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200">
      <Wrench className="w-3 h-3" /> Product Change
    </span>
  )
  if (type === 'rule_change') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
      <ListChecks className="w-3 h-3" /> Rule Change
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
      <ShieldAlert className="w-3 h-3" /> Gov. System
    </span>
  )
}

function PriorityDot({ priority }: { priority: BacklogPriority }) {
  const cfg = {
    critical: { dot: 'bg-red-500',    text: 'text-red-600',    label: 'Critical' },
    high:     { dot: 'bg-orange-400', text: 'text-orange-600', label: 'High' },
    medium:   { dot: 'bg-amber-400',  text: 'text-amber-600',  label: 'Medium' },
    low:      { dot: 'bg-gray-300',   text: 'text-gray-500',   label: 'Low' },
  }[priority]
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
    </div>
  )
}

function StatusChip({ status }: { status: BacklogStatus }) {
  const cfg = {
    open:        { label: 'Open',        cls: 'bg-red-50 text-red-600' },
    in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-600' },
    resolved:    { label: 'Resolved',    cls: 'bg-emerald-50 text-emerald-600' },
    wont_fix:    { label: "Won't Fix",   cls: 'bg-gray-100 text-gray-500' },
  }[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-6 h-6 rounded-full bg-wtg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
      {initials(name)}
    </div>
  )
}

function AssignmentTag({ type }: { type: AssignmentType }) {
  if (type === 'accepted') return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50">
      <UserCheck className="w-2.5 h-2.5" /> Accepted
    </span>
  )
  if (type === 'delegated') return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50">
      <ArrowRightLeft className="w-2.5 h-2.5" /> Delegated
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-violet-700 bg-violet-50">
      <UserCog className="w-2.5 h-2.5" /> Overridden
    </span>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null
  return <p className="text-xs text-red-500 mt-1">{message}</p>
}

// ─── Export / import column specs ────────────────────────────────────────────

const BACKLOG_EXPORT_COLS: ColSpec<BacklogItem>[] = [
  { kind: 'single', label: 'ID',               get: r => r.id },
  { kind: 'single', label: 'Type',             get: r => r.type },
  { kind: 'single', label: 'Summary',          get: r => r.summary },
  { kind: 'single', label: 'Priority',         get: r => r.priority },
  { kind: 'single', label: 'Status',           get: r => r.status },
  { kind: 'single', label: 'Domain',           get: r => r.domain },
  { kind: 'single', label: 'Table',            get: r => r.table },
  { kind: 'single', label: 'Affected Records', get: r => r.affectedRecordCount?.toString() },
  { kind: 'single', label: 'Assigned To',      get: r => r.assignedTo },
  { kind: 'single', label: 'Description',      get: r => r.description },
]

const BACKLOG_IMPORT_COLS: ImportColSpec<Partial<BacklogItem>>[] = [
  { header: 'ID',                              parse: (v, r) => { r.id               = v || undefined } },
  { header: 'Type',        required: true,     parse: (v, r) => { r.type             = v as BacklogType } },
  { header: 'Summary',     required: true,     parse: (v, r) => { r.summary          = v } },
  { header: 'Priority',                        parse: (v, r) => { r.priority         = (v as BacklogPriority) || 'medium' } },
  { header: 'Status',                          parse: (v, r) => { r.status           = (v as BacklogStatus) || 'open' } },
  { header: 'Domain',                          parse: (v, r) => { r.domain           = v } },
  { header: 'Table',                           parse: (v, r) => { r.table            = v || null } },
  { header: 'Affected Records',                parse: (v, r) => { r.affectedRecordCount = v ? parseInt(v, 10) : null } },
  { header: 'Assigned To',                     parse: (v, r) => { r.assignedTo       = v || null } },
  { header: 'Description',                     parse: (v, r) => { r.description      = v } },
]

// ─── Column definitions ───────────────────────────────────────────────────────

const backlogColumns: ColumnDef<BacklogItem>[] = [
  {
    id: 'summary',
    accessorKey: 'summary',
    header: 'Summary',
    cell: ({ row }) => (
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{row.original.id}</span>
          <span className="text-sm text-gray-900 font-medium leading-snug">{row.original.summary}</span>
        </div>
        {row.original.affectedRecordCount !== null && (
          <p className="text-xs text-gray-400 mt-0.5 ml-12">{row.original.affectedRecordCount.toLocaleString()} records affected</p>
        )}
      </div>
    ),
  },
  {
    id: 'type',
    accessorKey: 'type',
    header: 'Type',
    cell: ({ getValue }) => <TypeBadge type={getValue() as BacklogType} />,
    size: 150,
  },
  {
    id: 'table',
    accessorKey: 'table',
    header: 'Table',
    cell: ({ getValue }) => {
      const t = getValue() as string | null
      return t
        ? <span className="font-mono text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{t}</span>
        : <span className="text-xs text-gray-300">—</span>
    },
    size: 120,
  },
  {
    id: 'priority',
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ getValue }) => <PriorityDot priority={getValue() as BacklogPriority} />,
    size: 100,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusChip status={getValue() as BacklogStatus} />,
    size: 110,
  },
  {
    id: 'assignedTo',
    accessorKey: 'assignedTo',
    header: 'Assignee',
    cell: ({ row }) => {
      const { assignedTo, assignmentType } = row.original
      if (!assignedTo) return (
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex-shrink-0" />
          <span className="text-xs text-gray-400">Unassigned</span>
        </div>
      )
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Avatar name={assignedTo} />
          <span className="text-xs text-gray-600">{assignedTo.split(' ')[0]}</span>
          {assignmentType && assignmentType !== 'accepted' && <AssignmentTag type={assignmentType} />}
        </div>
      )
    },
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Age',
    cell: ({ getValue }) => (
      <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
        <Clock className="w-3 h-3" />{ageText(getValue() as string)}
      </div>
    ),
    size: 80,
  },
]

function BacklogSubRow({ item }: { item: BacklogItem }) {
  return (
    <div className="grid grid-cols-3 gap-8 py-5">
      <div className="col-span-2 space-y-4">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {item.description || <span className="text-gray-400 italic">No description provided.</span>}
          </p>
        </div>
        {item.resolvedAt && item.resolutionNotes && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">Resolution Notes</p>
            <p className="text-sm text-emerald-800 leading-relaxed">{item.resolutionNotes}</p>
            <p className="text-xs text-emerald-600 mt-1.5">Resolved {ageText(item.resolvedAt)} · {item.resolvedAt}</p>
          </div>
        )}
      </div>
      <div className="space-y-5">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Ownership</p>
          <div className="space-y-2">
            <div className="flex gap-3">
              <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">Domain</span>
              <span className="text-xs text-gray-700">{item.domain}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-24 flex-shrink-0">Default owner</span>
              <div className="flex items-center gap-1.5">
                <Avatar name={item.defaultOwner} />
                <span className="text-xs text-gray-700">{item.defaultOwner}</span>
              </div>
            </div>
            {item.assignedTo && item.assignmentType && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24 flex-shrink-0">Assigned to</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Avatar name={item.assignedTo} />
                  <span className="text-xs text-gray-700">{item.assignedTo}</span>
                  <AssignmentTag type={item.assignmentType} />
                </div>
              </div>
            )}
            {item.assignmentNotes && (
              <p className="text-xs text-gray-400 italic mt-0.5">"{item.assignmentNotes}"</p>
            )}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Integration</p>
          <button disabled className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 cursor-not-allowed">
            <Zap className="w-3.5 h-3.5 flex-shrink-0" />
            Sync to CargoWise
            <span className="ml-auto text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">Coming soon</span>
          </button>
        </div>
        <div className="text-xs text-gray-400 space-y-0.5 pt-1 border-t border-wtg-border">
          <p>Created by {item.createdBy} · {item.createdAt}</p>
          <p className="font-mono">{item.id}</p>
        </div>
      </div>
    </div>
  )
}

// --- Main page ---

export default function Backlog() {
  const [items, setItems] = useState<BacklogItem[]>(initialItems)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Set<string>>(new Set())

  const [activeTab, setActiveTab] = useState<TabId>('all')
  // Used only to auto-expand a newly created item; DataTable manages click-toggled expansion
  const [autoExpandId, setAutoExpandId] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [domainFilter, setDomainFilter] = useState('all')

  function handleImport(rows: Partial<BacklogItem>[]) {
    setItems(prev => {
      const map = new Map(prev.map(r => [r.id, r]))
      let nextNum = prev.reduce((max, r) => Math.max(max, parseInt(r.id.replace('BL-', ''), 10) || 0), 0) + 1
      for (const row of rows) {
        const id = row.id?.trim() || `BL-${String(nextNum++).padStart(3, '0')}`
        const existing = map.get(id)
        map.set(id, existing
          ? { ...existing, ...row, id }
          : {
              id, type: row.type ?? 'rectification', summary: row.summary ?? '',
              description: row.description ?? '', priority: row.priority ?? 'medium',
              status: row.status ?? 'open', domain: row.domain ?? '',
              table: row.table ?? null, affectedRecordCount: row.affectedRecordCount ?? null,
              defaultOwner: DOMAIN_OWNERS[row.domain ?? ''] ?? 'Unassigned',
              assignedTo: row.assignedTo ?? null,
              assignmentType: row.assignedTo ? 'delegated' : null,
              assignmentNotes: null, createdBy: 'Import', createdAt: PROTOTYPE_DATE,
              resolvedAt: null, resolutionNotes: null,
            } as BacklogItem
        )
      }
      return [...map.values()]
    })
  }

  const allDomains = Array.from(new Set(items.map(i => i.domain))).sort()

  const openCount      = items.filter(i => i.status === 'open').length
  const inProgressCount = items.filter(i => i.status === 'in_progress').length
  const resolvedCount  = items.filter(i => i.status === 'resolved').length
  const criticalCount  = items.filter(i => i.priority === 'critical' && i.status !== 'resolved').length

  const tabCounts: Record<TabId, number> = {
    all:                      items.length,
    rectification:            items.filter(i => i.type === 'rectification').length,
    product_change:           items.filter(i => i.type === 'product_change').length,
    rule_change:              items.filter(i => i.type === 'rule_change').length,
    governance_system_change: items.filter(i => i.type === 'governance_system_change').length,
  }

  const filtered = items.filter(item => {
    if (activeTab !== 'all' && item.type !== activeTab) return false
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (domainFilter !== 'all' && item.domain !== domainFilter) return false
    return true
  })

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors.has(key)) setErrors(prev => { const s = new Set(prev); s.delete(key); return s })
  }

  function openForm() {
    setForm(emptyForm)
    setErrors(new Set())
    setShowForm(true)
  }

  function handleSubmit() {
    const newErrors = new Set<string>()
    if (!form.type) newErrors.add('type')
    if (!form.summary.trim()) newErrors.add('summary')
    if (!form.priority) newErrors.add('priority')
    if (!form.domain) newErrors.add('domain')
    if (newErrors.size > 0) { setErrors(newErrors); return }

    const nextNum = items.reduce((max, item) => {
      const n = parseInt(item.id.replace('BL-', ''), 10)
      return n > max ? n : max
    }, 0) + 1
    const newId = `BL-${String(nextNum).padStart(3, '0')}`

    const newItem: BacklogItem = {
      id: newId,
      type: form.type as BacklogType,
      summary: form.summary.trim(),
      description: form.description.trim(),
      priority: form.priority as BacklogPriority,
      status: 'open',
      domain: form.domain,
      table: form.table.trim() || null,
      affectedRecordCount: form.affectedRecordCount ? parseInt(form.affectedRecordCount, 10) : null,
      defaultOwner: DOMAIN_OWNERS[form.domain] ?? 'Unassigned',
      assignedTo: form.assignedTo || null,
      assignmentType: form.assignedTo ? 'delegated' : null,
      assignmentNotes: null,
      createdBy: 'Current User',
      createdAt: PROTOTYPE_DATE,
      resolvedAt: null,
      resolutionNotes: null,
    }

    setItems(prev => [newItem, ...prev])
    setAutoExpandId(newId)
    setShowForm(false)
  }

  const summaryCharsLeft = 200 - form.summary.length

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Backlog</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track data rectification tasks, schema change requests, and governance actions across all domains.
          </p>
        </div>
        <button className="btn-primary" onClick={openForm}>
          <Plus className="w-4 h-4" /> New Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <AlertCircle className="w-4 h-4 text-red-500" /> Open
          </div>
          <p className="text-3xl font-bold text-gray-900">{openCount}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <RefreshCw className="w-4 h-4 text-blue-500" /> In Progress
          </div>
          <p className="text-3xl font-bold text-gray-900">{inProgressCount}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Resolved (30d)
          </div>
          <p className="text-3xl font-bold text-gray-900">{resolvedCount}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Critical Open
          </div>
          <p className="text-3xl font-bold text-gray-900">{criticalCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-wtg-border">
        {([
          { id: 'all' as const,                      label: 'All Items' },
          { id: 'product_change' as const,           label: 'Product Change' },
          { id: 'rule_change' as const,              label: 'Rule Change' },
          { id: 'rectification' as const,            label: 'Rectification' },
          { id: 'governance_system_change' as const, label: 'Governance System Change' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-wtg-accent text-wtg-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.id ? 'bg-wtg-accent/15 text-wtg-accent' : 'bg-gray-100 text-gray-500'
            }`}>
              {tabCounts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={backlogColumns}
        getRowId={item => item.id}
        placeholder="Search backlog items, tables, assignees…"
        totalCount={items.length}
        expandRowId={autoExpandId}
        renderSubRow={item => <BacklogSubRow item={item} />}
        toolbar={
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-gray-500 text-xs">Priority:</span>
              <div className="w-28">
                <StringLookup
                  value={priorityFilter === 'all' ? null : priorityFilter}
                  onChange={v => setPriorityFilter(v ?? 'all')}
                  items={['critical', 'high', 'medium', 'low']}
                  placeholder="All"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-gray-500 text-xs">Status:</span>
              <div className="w-28">
                <StringLookup
                  value={statusFilter === 'all' ? null : statusFilter}
                  onChange={v => setStatusFilter(v ?? 'all')}
                  items={['open', 'in_progress', 'resolved', 'wont_fix']}
                  placeholder="All"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-gray-500 text-xs">Domain:</span>
              <div className="w-36">
                <StringLookup
                  value={domainFilter === 'all' ? null : domainFilter}
                  onChange={v => setDomainFilter(v ?? 'all')}
                  items={allDomains}
                  placeholder="All"
                />
              </div>
            </div>
          </div>
        }
        actions={{
          filename: 'backlog',
          sheets: [{ name: 'Backlog', columns: BACKLOG_EXPORT_COLS, data: filtered }],
          csvSheet: { columns: BACKLOG_EXPORT_COLS, data: filtered },
          importConfig: { sheetName: 'Backlog', columns: BACKLOG_IMPORT_COLS, onImport: handleImport },
        }}
        emptyMessage="No backlog items match the current filters."
      />

            {/* New Item Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-wtg-border flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">New Backlog Item</h2>
                <p className="text-xs text-gray-500 mt-0.5">Log a data issue, schema request, or governance action.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Type selection */}
              <div>
                <FieldLabel required>Item type</FieldLabel>
                <div className="grid grid-cols-2 gap-2.5">
                  {TYPE_OPTIONS.map(opt => {
                    const selected = form.type === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setField('type', opt.id)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                          selected
                            ? opt.selectedCls
                            : 'border-wtg-border hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          selected ? opt.iconSelectedCls : 'bg-gray-100 text-gray-400'
                        }`}>
                          <opt.Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold leading-tight ${selected ? 'text-gray-900' : 'text-gray-700'}`}>
                            {opt.label}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{opt.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <FieldError show={errors.has('type')} message="Select an item type to continue." />
              </div>

              {/* Summary */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel required>Summary</FieldLabel>
                  <span className={`text-[10px] ${summaryCharsLeft < 20 ? 'text-red-500' : 'text-gray-400'}`}>
                    {summaryCharsLeft} chars remaining
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={200}
                  value={form.summary}
                  onChange={e => setField('summary', e.target.value)}
                  placeholder="Short, plain-English description of the problem"
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-wtg-blue/20 ${
                    errors.has('summary') ? 'border-red-400 focus:border-red-400' : 'border-wtg-border focus:border-wtg-blue-light'
                  }`}
                />
                <FieldError show={errors.has('summary')} message="Summary is required." />
              </div>

              {/* Description */}
              <div>
                <FieldLabel>Description <span className="text-gray-400 font-normal">(optional)</span></FieldLabel>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder="Provide context — what causes this, what the impact is, and any notes on how to resolve it."
                  className="w-full px-3 py-2.5 text-sm border border-wtg-border rounded-lg focus:outline-none focus:ring-2 focus:ring-wtg-blue/20 focus:border-wtg-blue-light resize-none"
                />
              </div>

              {/* Priority */}
              <div>
                <FieldLabel required>Priority</FieldLabel>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setField('priority', opt.id)}
                      className={`flex-1 py-2 px-3 text-sm font-semibold rounded-lg border-2 transition-all ${
                        form.priority === opt.id
                          ? opt.selectedCls
                          : 'border-wtg-border text-gray-500 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <FieldError show={errors.has('priority')} message="Select a priority." />
              </div>

              {/* Scope */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel required>Domain</FieldLabel>
                  <StringLookup
                    value={form.domain || null}
                    onChange={v => setField('domain', v || '')}
                    items={allDomains}
                    placeholder="Select domain…"
                    clearable={false}
                  />
                  <FieldError show={errors.has('domain')} message="Select a domain." />
                </div>
                <div>
                  <FieldLabel>Table <span className="text-gray-400 font-normal">(optional)</span></FieldLabel>
                  <input
                    type="text"
                    value={form.table}
                    onChange={e => setField('table', e.target.value)}
                    placeholder="e.g. OrgContact"
                    className="w-full px-3 py-2.5 text-sm border border-wtg-border rounded-lg focus:outline-none focus:ring-2 focus:ring-wtg-blue/20 focus:border-wtg-blue-light font-mono"
                  />
                </div>
                <div>
                  <FieldLabel>Records affected <span className="text-gray-400 font-normal">(optional)</span></FieldLabel>
                  <input
                    type="number"
                    min="0"
                    value={form.affectedRecordCount}
                    onChange={e => setField('affectedRecordCount', e.target.value)}
                    placeholder="e.g. 340"
                    className="w-full px-3 py-2.5 text-sm border border-wtg-border rounded-lg focus:outline-none focus:ring-2 focus:ring-wtg-blue/20 focus:border-wtg-blue-light"
                  />
                </div>
                <div>
                  <FieldLabel>Assign to <span className="text-gray-400 font-normal">(optional)</span></FieldLabel>
                  <StringLookup
                    value={form.assignedTo || null}
                    onChange={v => setField('assignedTo', v || '')}
                    items={owners}
                    placeholder="Leave unassigned"
                  />
                </div>
              </div>

              {/* Default owner note */}
              {form.domain && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <div className="w-5 h-5 rounded-full bg-wtg-navy text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {initials(DOMAIN_OWNERS[form.domain] ?? '?')}
                  </div>
                  <p>
                    <strong>{DOMAIN_OWNERS[form.domain] ?? 'Unassigned'}</strong> will be the default owner for this item, derived from the {form.domain} domain ownership.
                    {form.assignedTo && form.assignedTo !== DOMAIN_OWNERS[form.domain] && (
                      <span> The item will be <strong>delegated</strong> to {form.assignedTo}.</span>
                    )}
                  </p>
                </div>
              )}

            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-wtg-border flex-shrink-0 bg-gray-50/50 rounded-b-2xl">
              <p className="text-xs text-gray-400">Fields marked <span className="text-red-500">*</span> are required</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.type}
                  className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" /> Create Item
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
