import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  Users,
  ShieldCheck,
  Activity,
  BookOpen,
  ChevronRight,
  Bell,
  ClipboardList,
  ListChecks,
  Table2,
  Globe,
  BarChart3,
} from 'lucide-react'
import { useNameDisplay } from '../contexts/NameDisplay'
import { useBreadcrumb } from '../contexts/Breadcrumb'
import TableSearch from './TableSearch'
import ProfileTray from './ProfileTray'

type NavItem = { to: string; icon: React.ElementType; label: string; disabled?: boolean }
type NavSection = { heading?: string; items: NavItem[] }

const navSections: NavSection[] = [
  {
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    heading: 'Config',
    items: [
      { to: '/domains', icon: Globe, label: 'Domains' },
      { to: '/ownership', icon: Users, label: 'Owners' },
    ],
  },
  {
    heading: 'Schema',
    items: [
      { to: '/tables', icon: Table2, label: 'Tables' },
    ],
  },
  {
    heading: 'Data Quality',
    items: [
      { to: '/rules', icon: ListChecks, label: 'Data Rules' },
      { to: '/quality', icon: Activity, label: 'Data Quality' },
    ],
  },
  {
    heading: 'Backlog',
    items: [
      { to: '/backlog', icon: ClipboardList, label: 'Backlog' },
    ],
  },
  {
    heading: 'Reporting',
    items: [
      { to: '/metrics', icon: BarChart3, label: 'Metrics' },
      { to: '/schrg', icon: Activity, label: 'SCHRG Report' },
    ],
  },
  {
    heading: 'Content',
    items: [
      { to: '/governance', icon: ShieldCheck, label: 'Governance Model' },
    ],
  },
]

function getBreadcrumbs(pathname: string) {
  const crumbs = [{ label: 'Home', path: '/' }]
  if (pathname.startsWith('/domains')) {
    crumbs.push({ label: 'Domains', path: '/domains' })
  }
  if (pathname.startsWith('/tables')) {
    crumbs.push({ label: 'Tables', path: '/tables' })
  }
if (pathname.startsWith('/ownership')) {
    crumbs.push({ label: 'Owners', path: '/ownership' })
  }
  if (pathname.startsWith('/quality')) {
    crumbs.push({ label: 'Data Quality', path: '/quality' })
  }
  if (pathname.startsWith('/rules')) {
    crumbs.push({ label: 'Data Rules', path: '/rules' })
    const ruleMatch = pathname.match(/^\/rules\/([^/]+)/)
    if (ruleMatch) {
      const ruleId = ruleMatch[1]
      if (pathname.includes('/failures')) {
        crumbs.push({ label: ruleId, path: `/rules/${ruleId}` })
        crumbs.push({ label: 'Failing Records', path: pathname })
      } else {
        crumbs.push({ label: ruleId, path: pathname })
      }
    }
  }
  if (pathname.startsWith('/backlog')) {
    crumbs.push({ label: 'Backlog', path: '/backlog' })
  }
  if (pathname.startsWith('/governance')) {
    crumbs.push({ label: 'Governance Model', path: '/governance' })
  }
  if (pathname.startsWith('/schema/')) {
    crumbs.push({ label: 'Tables', path: '/tables' })
    const domainName = decodeURIComponent(pathname.split('/')[2] || '')
    if (domainName) crumbs.push({ label: domainName, path: pathname })
  }
  if (pathname.startsWith('/table/')) {
    crumbs.push({ label: 'Tables', path: '/tables' })
    const parts = pathname.split('/')
    const tableName = parts[2] || ''
    if (parts[3] === 'preview') {
      crumbs.push({ label: tableName, path: `/table/${tableName}` })
      crumbs.push({ label: 'Data Preview', path: pathname })
    } else {
      crumbs.push({ label: tableName, path: pathname })
    }
  }
  if (pathname === '/connection') {
    crumbs.push({ label: 'Connection Settings', path: '/connection' })
  }
  return crumbs
}

function Switch({ on, onToggle, labelOff, labelOn }: {
  on: boolean
  onToggle: () => void
  labelOff: string
  labelOn: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium transition-colors duration-200 ${!on ? 'text-gray-800' : 'text-gray-400'}`}>{labelOff}</span>
      <button
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ease-out flex-shrink-0 ${on ? 'bg-wtg-secondary' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ease-out ${on ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
      <span className={`text-xs font-medium transition-colors duration-200 ${on ? 'text-gray-800' : 'text-gray-400'}`}>{labelOn}</span>
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const breadcrumbs = getBreadcrumbs(location.pathname)
  const { nameMode, setNameMode } = useNameDisplay()
  const { extra, crumbActions } = useBreadcrumb()

  return (
    <div className="flex h-screen bg-wtg-surface">
      {/* Sidebar */}
      <aside className="w-64 bg-wtg-primary flex flex-col flex-shrink-0 overflow-hidden">
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-wtg-secondary flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white text-sm font-bold leading-tight">Data Governance</h1>
              <p className="text-white/50 text-[11px] font-medium">WiseTech Global</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-4">
          {navSections.map((section, si) => (
            <div key={si}>
              {section.heading && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30 select-none">
                  {section.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) =>
                  item.disabled ? (
                    <div
                      key={item.to}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/20 cursor-not-allowed select-none"
                    >
                      <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                      {item.label}
                    </div>
                  ) : (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/' || item.to === '/backlog'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-wtg-secondary/15 text-wtg-secondary-light'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                      {item.label}
                    </NavLink>
                  )
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom info */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Phase 1 — Foundation</span>
          </div>
          <div className="mt-1.5 w-full bg-white/10 rounded-full h-1.5">
            <div className="bg-wtg-secondary h-1.5 rounded-full" style={{ width: '15%' }} />
          </div>
          <p className="text-white/30 text-[10px] mt-1.5">Prototype v0.1</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-wtg-border flex items-center justify-between px-6 flex-shrink-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => {
              const isLastUrlCrumb = i === breadcrumbs.length - 1
              const isCurrent = isLastUrlCrumb && extra.length === 0
              const action = crumbActions[crumb.path]
              return (
                <span key={crumb.path} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
                  {isCurrent ? (
                    <span className="text-gray-900 font-medium">{crumb.label}</span>
                  ) : action ? (
                    <button onClick={action} className="text-gray-400 hover:text-gray-600 transition-colors">{crumb.label}</button>
                  ) : (
                    <Link to={crumb.path} className="text-gray-400 hover:text-gray-600 transition-colors">{crumb.label}</Link>
                  )}
                </span>
              )
            })}
            {extra.map((crumb, i) => {
              const isLast = i === extra.length - 1
              return (
                <span key={`extra-${i}`} className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  {isLast ? (
                    <span className="text-gray-900 font-medium">{crumb.label}</span>
                  ) : (
                    <button onClick={crumb.onClick} className="text-gray-400 hover:text-gray-600 transition-colors">{crumb.label}</button>
                  )}
                </span>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Name display toggle */}
            <Switch
              on={nameMode === 'product'}
              onToggle={() => setNameMode(nameMode === 'database' ? 'product' : 'database')}
              labelOff="DB"
              labelOn="Product"
            />
            <div className="w-px h-5 bg-gray-200" />
            <TableSearch />
            <button className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Bell className="w-[18px] h-[18px] text-gray-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-wtg-secondary rounded-full" />
            </button>
            <ProfileTray />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
