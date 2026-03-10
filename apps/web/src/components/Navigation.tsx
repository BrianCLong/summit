import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Search,
  AlertTriangle,
  FileText,
  BarChart3,
  Database,
  Brain,
  FileBarChart,
  Settings,
  HelpCircle,
  History,
  LogOut,
  Command,
  Network,
  Layers,
  Shield,
  Zap,
  ChevronRight,
  ChevronLeft,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip'
import { useAuth } from '@/contexts/AuthContext'
import { useSearch } from '@/contexts/SearchContext'
import { useRbac } from '@/hooks/useRbac'
import type { User } from '@/types'
import { cn } from '@/lib/utils'

interface NavigationProps {
  user: User | null
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  badgeVariant?: 'default' | 'critical' | 'warning'
  resource?: string
  action?: string
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Investigate',
    items: [
      {
        name: 'IntelGraph',
        href: '/explore',
        icon: Network as React.ComponentType<{ className?: string }>,
        resource: 'investigations',
        action: 'read',
      },
      {
        name: 'Alerts',
        href: '/alerts',
        icon: AlertTriangle as React.ComponentType<{ className?: string }>,
        badge: 3,
        badgeVariant: 'critical',
        resource: 'alerts',
        action: 'read',
      },
      {
        name: 'Cases',
        href: '/cases',
        icon: FileText as React.ComponentType<{ className?: string }>,
        resource: 'cases',
        action: 'read',
      },
    ],
  },
  {
    label: 'Operate',
    items: [
      {
        name: 'Command Center',
        href: '/dashboards/command-center',
        icon: Activity as React.ComponentType<{ className?: string }>,
        resource: 'dashboards',
        action: 'read',
      },
      {
        name: 'Maestro',
        href: '/maestro',
        icon: Zap as React.ComponentType<{ className?: string }>,
        resource: 'dashboards',
        action: 'read',
      },
      {
        name: 'Supply Chain',
        href: '/dashboards/supply-chain',
        icon: Layers as React.ComponentType<{ className?: string }>,
        resource: 'dashboards',
        action: 'read',
      },
    ],
  },
  {
    label: 'Platform',
    items: [
      {
        name: 'Data Sources',
        href: '/data/sources',
        icon: Database as React.ComponentType<{ className?: string }>,
        resource: 'data',
        action: 'read',
      },
      {
        name: 'Models',
        href: '/models',
        icon: Brain as React.ComponentType<{ className?: string }>,
        resource: 'models',
        action: 'read',
      },
      {
        name: 'Reports',
        href: '/reports',
        icon: FileBarChart as React.ComponentType<{ className?: string }>,
        resource: 'reports',
        action: 'read',
      },
      {
        name: 'Trust & Governance',
        href: '/trust',
        icon: Shield as React.ComponentType<{ className?: string }>,
        resource: 'admin',
        action: 'read',
      },
      {
        name: 'Admin',
        href: '/admin',
        icon: Settings as React.ComponentType<{ className?: string }>,
        resource: 'admin',
        action: 'read',
      },
    ],
  },
]

const supportItems: NavItem[] = [
  {
    name: 'Help & Docs',
    href: '/help',
    icon: HelpCircle as React.ComponentType<{ className?: string }>,
  },
  {
    name: 'Changelog',
    href: '/changelog',
    icon: History as React.ComponentType<{ className?: string }>,
  },
]

const NavItemComponent = ({
  item,
  user,
  collapsed,
}: {
  item: NavItem
  user: User | null
  collapsed: boolean
}) => {
  const location = useLocation()
  const { hasPermission } = useRbac(item.resource || '', item.action || '', {
    user,
    fallback: !item.resource,
  })

  if (item.resource && !hasPermission) {
    return null
  }

  const isActive =
    location.pathname === item.href ||
    (item.href !== '/' && location.pathname.startsWith(item.href))

  const inner = (
    <NavLink
      to={item.href}
      className={cn(
        'group relative flex items-center gap-3 rounded-md text-[13px] font-medium transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-600)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-raised)]',
        collapsed ? 'px-0 py-2.5 justify-center w-9 h-9' : 'px-2.5 py-2 w-full',
        isActive
          ? [
              'bg-[var(--surface-high)] text-[var(--text-primary)]',
              'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
              'before:w-[2px] before:h-5 before:rounded-full before:bg-[var(--accent-500)]',
            ]
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Active indicator bar (non-collapsed) */}
      {!collapsed && isActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full bg-[var(--accent-500)]"
        />
      )}

      <item.icon
        className={cn(
          'shrink-0 transition-colors duration-150',
          collapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4',
          isActive ? 'text-[var(--accent-400)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'
        )}
      />

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.name}</span>
          {item.badge !== undefined && (
            <span
              className={cn(
                'inline-flex items-center justify-center rounded-full min-w-[18px] h-[18px] px-1 text-[10px] font-semibold tabular-nums leading-none',
                item.badgeVariant === 'critical'
                  ? 'bg-[var(--severity-critical-bg)] text-[var(--severity-critical-fg)] border border-[var(--severity-critical-border)]'
                  : item.badgeVariant === 'warning'
                    ? 'bg-[var(--severity-medium-bg)] text-[var(--severity-medium-fg)] border border-[var(--severity-medium-border)]'
                    : 'bg-[var(--surface-high)] text-[var(--text-secondary)]'
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.name}
          {item.badge !== undefined && (
            <span className="text-[var(--severity-critical-fg)] font-semibold">{item.badge}</span>
          )}
        </TooltipContent>
      </Tooltip>
    )
  }

  return inner
}

export function Navigation({ user }: NavigationProps) {
  const { logout } = useAuth()
  const { openSearch } = useSearch()
  const [collapsed, setCollapsed] = useState(false)

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <nav
      className={cn(
        'relative flex flex-col border-r transition-all duration-250',
        'bg-[var(--surface-raised)] border-[var(--border-subtle)]',
        collapsed ? 'w-[56px]' : 'w-[220px]'
      )}
      aria-label="Primary navigation"
    >
      {/* ── Logo / Wordmark ────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center border-b border-[var(--border-subtle)]',
          collapsed ? 'px-0 py-4 justify-center h-[52px]' : 'px-4 h-[52px] gap-2.5'
        )}
      >
        {/* Logomark */}
        <div
          className="shrink-0 h-7 w-7 rounded-md flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--accent-700) 0%, var(--accent-500) 100%)',
          }}
        >
          <Network className="h-4 w-4 text-white" />
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div
              className="text-[13px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] leading-none"
            >
              Summit
            </div>
            <div className="text-[10px] font-medium text-[var(--text-tertiary)] tracking-[0.06em] uppercase leading-none mt-0.5">
              Intelligence
            </div>
          </div>
        )}
      </div>

      {/* ── Search Trigger ────────────────────────────────── */}
      <div className={cn('px-2 py-2.5 border-b border-[var(--border-subtle)]')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={openSearch}
                className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-md',
                  'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
                  'hover:bg-[var(--surface-overlay)] transition-colors duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-600)]'
                )}
                aria-label="Search (⌘K)"
              >
                <Search className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Search <kbd className="ml-1 text-[var(--text-tertiary)] font-mono">⌘K</kbd></TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={openSearch}
            className={cn(
              'w-full flex items-center gap-2 rounded-md px-2.5 py-1.5',
              'text-[12px] text-[var(--text-tertiary)] font-medium',
              'bg-[var(--surface-panel)] border border-[var(--border-subtle)]',
              'hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]',
              'transition-all duration-150 cursor-pointer',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-600)]'
            )}
            aria-label="Search (⌘K)"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Search...</span>
            <kbd
              className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-mono text-[var(--text-disabled)] leading-none"
            >
              ⌘K
            </kbd>
          </button>
        )}
      </div>

      {/* ── Navigation Sections ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {navSections.map(section => (
          <div key={section.label} className="mb-1">
            {!collapsed && (
              <div
                className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-disabled)]"
              >
                {section.label}
              </div>
            )}
            {collapsed && <div className="mt-2 mb-1 mx-auto w-5 h-px bg-[var(--border-subtle)]" />}
            <div className={cn('space-y-0.5', collapsed ? 'px-2 flex flex-col items-center' : 'px-2')}>
              {section.items.map(item => (
                <NavItemComponent
                  key={item.href}
                  item={item}
                  user={user}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer: Support + User ────────────────────────── */}
      <div className="border-t border-[var(--border-subtle)]">
        {/* Support links */}
        <div className={cn('px-2 py-2 space-y-0.5', collapsed && 'flex flex-col items-center')}>
          {supportItems.map(item => (
            <NavItemComponent
              key={item.href}
              item={item}
              user={user}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* User row */}
        <div
          className={cn(
            'border-t border-[var(--border-subtle)] px-2 py-2',
            collapsed ? 'flex flex-col items-center gap-1' : 'space-y-1'
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center cursor-default"
                  style={{ background: 'linear-gradient(135deg, var(--accent-700) 0%, var(--accent-500) 100%)' }}
                >
                  <span className="text-[11px] font-semibold text-white">{userInitials}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="font-medium">{user?.name}</div>
                <div className="text-[var(--text-secondary)] text-xs">{user?.role}</div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--surface-overlay)] transition-colors duration-150">
              <div
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--accent-700) 0%, var(--accent-500) 100%)' }}
              >
                <span className="text-[11px] font-semibold text-white">{userInitials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-[var(--text-primary)] truncate leading-tight">
                  {user?.name}
                </div>
                <div className="text-[10px] text-[var(--text-tertiary)] truncate leading-tight capitalize">
                  {user?.role}
                </div>
              </div>
            </div>
          )}

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={logout}
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-md',
                    'text-[var(--text-tertiary)] hover:text-[var(--severity-critical-fg)]',
                    'hover:bg-[var(--severity-critical-bg)] transition-colors duration-150',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-600)]'
                  )}
                  aria-label="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={logout}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md',
                'text-[12px] font-medium text-[var(--text-tertiary)]',
                'hover:text-[var(--severity-critical-fg)] hover:bg-[var(--severity-critical-bg)]',
                'transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-600)]'
              )}
              aria-label="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* ── Collapse Toggle ───────────────────────────────── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={cn(
          'absolute -right-3 top-[52px] z-10',
          'w-6 h-6 rounded-full flex items-center justify-center',
          'bg-[var(--surface-panel)] border border-[var(--border-default)]',
          'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
          'hover:border-[var(--border-strong)] hover:bg-[var(--surface-overlay)]',
          'transition-all duration-150 shadow-sm',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-600)]'
        )}
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft className="h-3 w-3" />
        }
      </button>
    </nav>
  )
}
