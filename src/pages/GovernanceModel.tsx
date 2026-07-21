import { useState } from 'react'
import {
  Shield, Users, Layers, GitBranch, AlertTriangle, CheckCircle2,
  ArrowRight, BookOpen, Workflow, Target, Eye, Bot, Activity, Lock,
} from 'lucide-react'

export default function GovernanceModel() {
  const [activeSection, setActiveSection] = useState<string>('overview')

  const sections = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'ownership', label: 'Ownership Roles', icon: Users },
    { id: 'sensitivity', label: 'Sensitivity', icon: Lock },
    { id: 'criticality', label: 'Criticality Model', icon: Target },
    { id: 'lifecycle', label: 'Lifecycle Ownership', icon: GitBranch },
    { id: 'validation', label: 'Validation Process', icon: Shield },
    { id: 'principles', label: 'Design Principles', icon: Eye },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Governance Model</h1>
        <p className="text-sm text-gray-500 mt-1">
          The data governance framework that underpins ownership, quality, and remediation across the enterprise.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Section nav */}
        <div className="w-56 flex-shrink-0">
          <div className="card p-2 space-y-0.5 sticky top-6">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                  activeSection === s.id
                    ? 'bg-wtg-secondary/10 text-wtg-secondary'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <s.icon className="w-4 h-4 flex-shrink-0" /> {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Data Governance Framework</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  This governance model ensures the accuracy and reliability of operational data through clear ownership,
                  defined standards, and systematic monitoring. It is designed to be built incrementally — starting with
                  foundational ownership and expanding to include automated validation and agentic remediation.
                </p>
                <p className="text-sm text-gray-600 leading-relaxed mt-3">
                  The <strong>Productivity Team</strong> governs this model — they own the framework, arbitrate ownership disputes,
                  and drive continuous improvement. They do not own the data directly; they own the process.
                </p>
              </div>

              {/* Visual model */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-5">Governance Layers</h3>
                <div className="relative">
                  {[
                    { layer: 'Layer 1', title: 'Table & Field Registry', desc: 'Complete catalogue of what data exists', phase: 1, color: 'bg-wtg-primary' },
                    { layer: 'Layer 2', title: 'Ownership Model', desc: 'Who owns, edits, validates, and knows the truth', phase: 1, color: 'bg-wtg-secondary' },
                    { layer: 'Layer 3', title: 'Criticality & Use Cases', desc: 'How important and where it\'s used', phase: 1, color: 'bg-wtg-secondary-light' },
                    { layer: 'Layer 4', title: 'Validation Process', desc: 'How data quality is checked and maintained', phase: 2, color: 'bg-amber-500' },
                    { layer: 'Layer 5', title: 'Monitoring & Dashboards', desc: 'Continuous visibility into data health', phase: 2, color: 'bg-amber-400' },
                    { layer: 'Layer 6', title: 'Agentic Remediation', desc: 'Automated identification and resolution of issues', phase: 3, color: 'bg-emerald-500' },
                  ].map(l => (
                    <div key={l.layer} className="flex items-center gap-4 mb-3">
                      <div className={`w-2 h-14 rounded-full ${l.color}`} />
                      <div className="flex-1 bg-gray-50 rounded-lg p-3.5 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400">{l.layer}</span>
                            <h4 className="text-sm font-semibold text-gray-900">{l.title}</h4>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{l.desc}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          l.phase === 1 ? 'bg-wtg-secondary/10 text-wtg-secondary' :
                          l.phase === 2 ? 'bg-amber-100 text-amber-600' :
                          'bg-emerald-100 text-emerald-600'
                        }`}>
                          Phase {l.phase}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'ownership' && (
            <div className="space-y-4">
              <div className="card p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Ownership Roles</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Each table (and optionally each field) can carry the following ownership dimensions.
                  Table-level by default, with field-level overrides where needed.
                </p>

                <div className="space-y-4">
                  {[
                    { role: 'Primary Owner', phase: 1, required: true, desc: 'Team or individual with primary accountability for data accuracy. First point of contact for quality issues.', icon: Users, color: 'bg-blue-50 text-blue-600' },
                    { role: 'Secondary Owner', phase: 1, required: false, desc: 'Optional second team where ownership is genuinely shared. Models reality when single ownership would misrepresent accountability.', icon: Users, color: 'bg-blue-50 text-blue-400' },
                    { role: 'Dev Team (Schema Authority)', phase: 1, required: true, desc: 'The development team that built and maintains the system. Also the schema authority for structural changes.', icon: Layers, color: 'bg-purple-50 text-purple-600' },
                    { role: 'Operational Editor', phase: 2, required: true, desc: 'Who actually enters, updates, or maintains this data in normal operations. May differ from the primary owner.', icon: Workflow, color: 'bg-amber-50 text-amber-600' },
                    { role: 'Security Rights', phase: 2, required: false, desc: 'Who has system-level access to make changes, separate from who operationally does so.', icon: Shield, color: 'bg-red-50 text-red-500' },
                    { role: 'Subject Matter Expert', phase: 2, required: false, desc: 'Optional — who holds ground truth knowledge of what correct looks like, even without ability to edit.', icon: Eye, color: 'bg-green-50 text-green-600' },
                  ].map(r => (
                    <div key={r.role} className="flex gap-4 p-4 rounded-xl bg-gray-50/50 border border-wtg-border/50">
                      <div className={`w-10 h-10 rounded-xl ${r.color} flex items-center justify-center flex-shrink-0`}>
                        <r.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{r.role}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.phase === 1 ? 'bg-wtg-secondary/10 text-wtg-secondary' : 'bg-amber-100 text-amber-600'
                          }`}>
                            Phase {r.phase}
                          </span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            r.required ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {r.required ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editor Context Level */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Editor Context Level</h3>
                <p className="text-xs text-gray-500 mb-4">
                  How much the operational editor understands about the data they are responsible for changing.
                  This directly affects remediation workflow design.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { level: 3, label: 'Contextual', desc: 'Full domain understanding. Can make judgment calls independently.', color: 'border-emerald-200 bg-emerald-50' },
                    { level: 2, label: 'Informed', desc: 'Sufficient understanding to review proposals and ask good questions.', color: 'border-amber-200 bg-amber-50' },
                    { level: 1, label: 'Dependent', desc: 'Limited context. Relies on SME input to know correct values.', color: 'border-red-200 bg-red-50' },
                  ].map(l => (
                    <div key={l.level} className={`rounded-xl border p-4 ${l.color}`}>
                      <div className="text-2xl font-bold text-gray-900 mb-1">Level {l.level}</div>
                      <div className="text-sm font-semibold text-gray-700">{l.label}</div>
                      <p className="text-xs text-gray-500 mt-1.5">{l.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'sensitivity' && (
            <div className="space-y-4">
              <div className="card p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Sensitivity</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Sensitivity describes whether data is restricted to authorised users only, or open for general access.
                  It is set at the domain level and inherited downward through subdomains, tables, and columns unless explicitly overridden.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    {
                      level: 'Restricted',
                      desc: 'Data is sensitive and access must be controlled. Contains personally identifiable information, confidential business data, or regulated content.',
                      color: 'bg-red-500',
                      badge: 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-200',
                      examples: ['HR / Staff data', 'Finance records', 'Customer PII'],
                    },
                    {
                      level: 'Open',
                      desc: 'Data is not sensitive and may be accessed broadly. Contains operational or reference data with no confidentiality requirements.',
                      color: 'bg-emerald-500',
                      badge: 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200',
                      examples: ['Workflow configuration', 'Public product data', 'Lookup tables'],
                    },
                    {
                      level: 'Inherit',
                      desc: 'The entity adopts the sensitivity of its parent. Subdomains inherit from their domain; tables from their subdomain or domain; columns from their table.',
                      color: 'bg-gray-300',
                      badge: 'bg-gray-100 text-gray-400',
                      examples: ['Default for all subdomains', 'Default for all tables', 'Default for all columns'],
                    },
                  ].map(s => (
                    <div key={s.level} className="card p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-3 h-3 rounded-full ${s.color}`} />
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>{s.level}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{s.desc}</p>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Examples</p>
                        {s.examples.map(e => (
                          <p key={e} className="text-xs text-gray-600">{e}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-blue-800">Inheritance Rules</h4>
                  <ul className="text-xs text-blue-700 space-y-1.5 list-none">
                    {[
                      'Domains are the top of the hierarchy — they cannot inherit. They must be set explicitly (Restricted, Open, or left blank).',
                      'Subdomains, tables, and columns default to Inherit. The effective sensitivity resolves by walking up to the nearest explicit value.',
                      'An explicit override at any level breaks the inheritance chain for that entity and its children.',
                      'Blank (unset) on a domain means sensitivity has not yet been determined — treat it as a governance gap to resolve.',
                    ].map(rule => (
                      <li key={rule} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'criticality' && (
            <div className="space-y-4">
              <div className="card p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Criticality Model</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Criticality captures how important it is that data is accurate. Used to prioritise monitoring,
                  remediation effort, and governance attention.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { level: 'High', code: 'H', desc: 'Inaccuracy has significant operational, financial, or reporting consequences. Actively monitored.', color: 'bg-red-500', examples: ['GlbStaff', 'OrgHeader', 'GlbCompany', 'GlbSecurity'] },
                    { level: 'Medium', code: 'M', desc: 'Inaccuracy causes inconvenience or moderate risk. Periodically monitored.', color: 'bg-amber-400', examples: ['OrgRelatedParty', 'StmScheduleTask', 'EDIMessage'] },
                    { level: 'Low', code: 'L', desc: 'Inaccuracy has minimal impact. Monitored opportunistically.', color: 'bg-emerald-500', examples: ['StmNote', 'GlbHoliday', 'TagDefinition'] },
                  ].map(c => (
                    <div key={c.code} className="card p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-3 h-3 rounded-full ${c.color}`} />
                        <h3 className="text-sm font-bold text-gray-900">{c.level} ({c.code})</h3>
                      </div>
                      <p className="text-xs text-gray-500">{c.desc}</p>
                      <div className="mt-3 space-y-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Examples</p>
                        {c.examples.map(e => (
                          <p key={e} className="text-xs text-gray-600 font-mono">{e}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-800 mb-1">Use Case Criticality Override (Phase 2)</h4>
                  <p className="text-xs text-blue-600">
                    Each field carries a default criticality. On field-to-use-case links, a nullable override allows
                    a field rated M overall to be flagged H in a specific context (e.g. a PQD dashboard). When all
                    links have explicit criticality, aggregate field priority can be inferred.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'lifecycle' && (
            <div className="space-y-4">
              <div className="card p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Lifecycle Ownership</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Some entities change hands over their lifecycle. Ownership is scoped to named stages
                  with deterministic entry conditions.
                </p>

                {/* Visual lifecycle */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    Example: Organisation Lifecycle
                  </h4>
                  <div className="flex items-center gap-2">
                    {[
                      { stage: 'Prospect', owner: 'Marketing', condition: 'OH_IsProspect = 1', color: 'bg-purple-100 border-purple-300 text-purple-700' },
                      { stage: 'Lead', owner: 'Sales', condition: 'OH_IsLead = 1', color: 'bg-blue-100 border-blue-300 text-blue-700' },
                      { stage: 'Onboarding', owner: 'Customer Success', condition: 'OH_Status = \'ONB\'', color: 'bg-amber-100 border-amber-300 text-amber-700' },
                      { stage: 'Active', owner: 'Account Management', condition: 'OH_IsActive = 1', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
                    ].map((s, i) => (
                      <div key={s.stage} className="flex items-center gap-2 flex-1">
                        <div className={`flex-1 rounded-lg border p-3 ${s.color}`}>
                          <p className="text-xs font-bold">{s.stage}</p>
                          <p className="text-[10px] mt-0.5 opacity-75">Owner: {s.owner}</p>
                          <p className="text-[10px] mt-1 font-mono opacity-60">{s.condition}</p>
                        </div>
                        {i < 3 && <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-amber-800 mb-1">Design Rule</h4>
                  <p className="text-xs text-amber-700">
                    Lifecycle stage <strong>must be deterministic from the data itself</strong>. Where the current system
                    doesn't support this, it's tracked as a data product gap and the product/schema will be adjusted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'validation' && (
            <div className="space-y-4">
              <div className="card p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Validation Process</h2>
                <p className="text-sm text-gray-500 mb-5">
                  The validation owner role is only meaningful when backed by a defined process.
                  Target design includes automated and human-led modes.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { title: 'Automated Monitoring', desc: 'Continuous or scheduled checks against defined data standards and rules, surfaced via dashboards and alerts.', icon: Activity, phase: 2 },
                    { title: 'Periodic Human Review', desc: 'Structured review cycles where the validation owner confirms accuracy against a defined checklist or sample.', icon: CheckCircle2, phase: 2 },
                    { title: 'Triggered Review', desc: 'Reviews initiated by data quality alerts, lifecycle transitions, or external events like system migrations.', icon: AlertTriangle, phase: 2 },
                    { title: 'Agentic Remediation', desc: 'Agent-driven identification and resolution. Actions classified: autonomous, confirmation required, or warning only.', icon: Bot, phase: 3 },
                  ].map(v => (
                    <div key={v.title} className="rounded-xl border border-wtg-border p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <v.icon className="w-4.5 h-4.5 text-gray-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-900">{v.title}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              v.phase === 2 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                              Phase {v.phase}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{v.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'principles' && (
            <div className="space-y-4">
              <div className="card p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Design Principles</h2>
                <p className="text-sm text-gray-500 mb-5">
                  These principles guide how decisions are made in this governance system.
                </p>

                <div className="space-y-4">
                  <div className="rounded-xl border-2 border-wtg-primary/20 bg-wtg-primary/[0.02] p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold bg-wtg-primary text-white px-2 py-0.5 rounded">Principle 1</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Model Reality, Even When Inconvenient</h3>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                      The model should reflect how data ownership, accountability, and quality actually exist — not how
                      we would prefer them to exist for the sake of simplicity. If ownership is shared, model it as shared.
                      If no one owns it, leave it blank and flag it as a risk. An honest, complex model is more useful than
                      a clean model that is incorrect.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {[
                        'Shared ownership uses Primary + Secondary, not forced single owner',
                        'Blank ownership is a flagged risk, not a hidden gap',
                        'Lifecycle exceptions are modelled, not hidden under cleaner abstractions',
                        'Criticality variance by use case is captured, not flattened',
                      ].map(ex => (
                        <div key={ex} className="flex items-start gap-2 text-xs text-gray-500">
                          <CheckCircle2 className="w-3.5 h-3.5 text-wtg-secondary flex-shrink-0 mt-0.5" />
                          {ex}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed border-gray-300 p-6 opacity-60">
                    <span className="text-xs font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded">Principle 2+</span>
                    <p className="text-sm text-gray-400 mt-2">
                      Additional principles will be added as the project progresses and new decision points are encountered.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
