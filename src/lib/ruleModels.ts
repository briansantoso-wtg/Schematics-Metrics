import type { DataRule as SummaryRule, EvaluationFrequency } from '../types'

export type RuleType = 'completeness' | 'format' | 'consistency' | 'timeliness' | 'range' | 'reference'
export type RuleSeverity = 'H' | 'M' | 'L'
export type RuleStatus = 'active' | 'paused' | 'draft'
export type RuleSchedule = 'Hourly' | 'Daily' | 'Weekly' | 'Fortnightly' | 'Monthly'

export interface RuleThreshold {
  mode: 'absolute' | 'percentage'
  value: number
}

export interface PersistedRule {
  id: string
  name: string
  type: RuleType
  table: string
  field: string | null
  subtableScope: string | null
  description: string
  severity: RuleSeverity
  status: RuleStatus
  owner: string
  schedule: RuleSchedule
  lastRun: string | null
  passRate: number | null
  failCount: number
  sqlExpression: string
  alertThreshold: RuleThreshold
  lastHealthPct: number | null
  notes: string
}

export interface CreateRuleInput {
  name: string
  type: RuleType
  table: string
  field: string | null
  subtableScope: string | null
  description: string
  severity: RuleSeverity
  owner: string
  schedule: RuleSchedule
  status: 'active' | 'draft'
  alertThreshold: RuleThreshold
  sqlExpression: string
}

const SUMMARY_FREQUENCIES = new Set<EvaluationFrequency>(['Hourly', 'Daily', 'Weekly', 'Fortnightly', 'Monthly'])
const REFERENCE_NOW = new Date('2026-03-25T12:00:00Z').getTime()

export function createPersistedRule(input: CreateRuleInput): PersistedRule {
  return {
    id: `r-${Date.now()}`,
    name: input.name,
    type: input.type,
    table: input.table,
    field: input.field,
    subtableScope: input.subtableScope,
    description: input.description,
    severity: input.severity,
    status: input.status,
    owner: input.owner,
    schedule: input.schedule,
    lastRun: null,
    passRate: null,
    failCount: 0,
    sqlExpression: input.sqlExpression,
    alertThreshold: input.alertThreshold,
    lastHealthPct: null,
    notes: '',
  }
}

function parseRelativeLastRun(lastRun: string | null): string | null {
  if (!lastRun) return null
  const parsed = Date.parse(lastRun)
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString()

  const match = lastRun.match(/^(\d+)\s+(hour|hours|day|days|week|weeks)\s+ago$/i)
  if (!match) return null

  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  let diffMs = 0
  if (unit.startsWith('hour')) diffMs = amount * 3_600_000
  else if (unit.startsWith('day')) diffMs = amount * 86_400_000
  else if (unit.startsWith('week')) diffMs = amount * 7 * 86_400_000

  return new Date(REFERENCE_NOW - diffMs).toISOString()
}

export function toSummaryRule(rule: PersistedRule): SummaryRule {
  const frequency = SUMMARY_FREQUENCIES.has(rule.schedule as EvaluationFrequency)
    ? rule.schedule as EvaluationFrequency
    : 'Daily'

  return {
    id: rule.id,
    name: rule.name,
    type: rule.type,
    table: rule.table,
    field: rule.field,
    severity: rule.severity,
    owner: rule.owner,
    frequency,
    lastRuntime: parseRelativeLastRun(rule.lastRun),
    status: rule.status === 'paused' ? 'disabled' : rule.status,
    alertThreshold: rule.alertThreshold,
    lastHealthPct: rule.lastHealthPct ?? rule.passRate,
    notes: rule.notes,
  }
}