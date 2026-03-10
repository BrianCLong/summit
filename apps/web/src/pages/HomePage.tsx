import React, { useState, useEffect } from 'react'
import {
  ArrowRight,
  Search,
  AlertTriangle,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Network,
  Activity,
  Shield,
  Clock,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { KPIStrip } from '@/components/panels/KPIStrip'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ActivationProgressTile } from '@/components/activation/ActivationProgressTile'
import { DataIntegrityNotice } from '@/components/common/DataIntegrityNotice'
import { useDemoMode } from '@/components/common/DemoIndicator'
import mockData from '@/mock/data.json'
import type { KPIMetric, Investigation, Alert, Case } from '@/types'
import { cn } from '@/lib/utils'

// ── Severity badge ─────────────────────────────────────────────
function SeverityBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    critical: 'severity-critical',
    high: 'severity-high',
    medium: 'severity-medium',
    low: 'severity-low',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
        map[level] ?? 'severity-info'
      )}
    >
      {level}
    </span>
  )
}

// ── Quick action card ──────────────────────────────────────────
interface QuickAction {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  accent: string
  badge?: string
}

function QuickActionCard({ action, onClick }: { action: QuickAction; onClick: () => void }) {
  const Icon = action.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full text-left rounded-lg p-4',
        'border border-[var(--border-subtle)] bg-[var(--surface-panel)]',
        'hover:border-[var(--border-default)] hover:bg-[var(--surface-overlay)]',
        'transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-600)]'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center"
          style={{ background: action.accent }}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
              {action.title}
            </span>
            {action.badge && (
              <span className="severity-critical inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold">
                {action.badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-snug">
            {action.description}
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight
          className={cn(
            'shrink-0 h-4 w-4 text-[var(--text-disabled)] mt-0.5',
            'group-hover:text-[var(--text-tertiary)] group-hover:translate-x-0.5',
            'transition-all duration-150'
          )}
        />
      </div>
    </button>
  )
}

// ── Metric delta indicator ─────────────────────────────────────
function DeltaIndicator({ value, unit = '%' }: { value: number; unit?: string }) {
  if (value === 0) return <Minus className="h-3 w-3 text-[var(--text-tertiary)]" />
  const positive = value > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
        positive ? 'text-[var(--status-success)]' : 'text-[var(--severity-critical-fg)]'
      )}
    >
      {positive
        ? <TrendingUp className="h-3 w-3" />
        : <TrendingDown className="h-3 w-3" />
      }
      {Math.abs(value)}{unit}
    </span>
  )
}

// ── Status row item ────────────────────────────────────────────
function StatusIndicator({ label, status }: { label: string; status: 'ok' | 'warning' | 'error' }) {
  const colors = {
    ok: 'var(--status-active)',
    warning: 'var(--status-warning)',
    error: 'var(--status-error)',
  }
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: colors[status] }}
        />
        <span className="text-[11px] font-medium capitalize" style={{ color: colors[status] }}>
          {status === 'ok' ? 'Operational' : status}
        </span>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetric[]>([])
  const [recentInvestigations, setRecentInvestigations] = useState<Investigation[]>([])
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])
  const [recentCases, setRecentCases] = useState<Case[]>([])
  const isDemoMode = useDemoMode()

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        if (!isDemoMode) {
          setKpiMetrics([])
          setRecentInvestigations([])
          setRecentAlerts([])
          setRecentCases([])
          return
        }
        await new Promise(resolve => setTimeout(resolve, 800))
        setKpiMetrics(mockData.kpiMetrics as KPIMetric[])
        setRecentInvestigations(mockData.investigations.slice(0, 4) as Investigation[])
        setRecentAlerts(mockData.alerts.slice(0, 5) as Alert[])
        setRecentCases(mockData.cases.slice(0, 3) as Case[])
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isDemoMode])

  const quickActions: QuickAction[] = [
    {
      title: 'Start Investigation',
      description: 'Open IntelGraph and begin a new entity investigation',
      icon: Network,
      href: '/explore',
      accent: 'linear-gradient(135deg, var(--accent-700), var(--accent-500))',
    },
    {
      title: 'Review Alerts',
      description: 'Triage security alerts and escalate findings',
      icon: AlertTriangle,
      href: '/alerts',
      accent: 'linear-gradient(135deg, #7f1d1d, #dc2626)',
      badge: isDemoMode ? '3' : undefined,
    },
    {
      title: 'Active Cases',
      description: 'Manage open investigations and case files',
      icon: FileText,
      href: '/cases',
      accent: 'linear-gradient(135deg, #134e4a, #0d9488)',
    },
    {
      title: 'Command Center',
      description: 'Real-time operational status and mission control',
      icon: Activity,
      href: '/dashboards/command-center',
      accent: 'linear-gradient(135deg, #4a1d96, #7c3aed)',
    },
  ]

  const handleItemKeyDown = (e: React.KeyboardEvent, path: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(path)
    }
  }

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: 'var(--surface-base)' }}
    >
      {/* ── Page Header ─────────────────────────────────── */}
      <div
        className="shrink-0 px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-[-0.025em] leading-tight">
            {greeting()} {user?.name?.split(' ')[0] || 'Operator'}
          </h1>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
            Intelligence operations overview
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Datetime */}
          <div className="text-right">
            <div className="text-[18px] font-mono font-semibold text-[var(--text-primary)] tabular-nums leading-none">
              {timeStr}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5 tracking-wide">
              {dateStr}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="px-6 py-5 space-y-6 max-w-[1400px]">

          <DataIntegrityNotice
            mode={isDemoMode ? 'demo' : 'unavailable'}
            context="Home overview"
          />

          <ActivationProgressTile />

          {/* ── KPI Strip ─────────────────────────────────── */}
          <section aria-labelledby="kpi-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="kpi-heading" className="label-caps">
                Operational Metrics
              </h2>
            </div>
            <KPIStrip
              data={kpiMetrics}
              loading={loading}
              onSelect={metric => {
                if (metric.id === 'threats') navigate('/alerts')
                else if (metric.id === 'investigations') navigate('/explore')
              }}
            />
            {!loading && kpiMetrics.length === 0 && (
              <div className="mt-3">
                <EmptyState
                  icon="chart"
                  title="No live metrics"
                  description="Connect a data source to populate KPI metrics."
                />
              </div>
            )}
          </section>

          {/* ── Two-column layout ─────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">

            {/* Left: Quick actions + Activity ─────────────── */}
            <div className="space-y-5">

              {/* Quick actions grid */}
              <section aria-labelledby="actions-heading">
                <h2 id="actions-heading" className="label-caps mb-3">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {quickActions.map(action => (
                    <QuickActionCard
                      key={action.href}
                      action={action}
                      onClick={() => navigate(action.href)}
                    />
                  ))}
                </div>
              </section>

              {/* Recent investigations + Alerts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Recent Investigations */}
                <section
                  aria-labelledby="investigations-heading"
                  className="rounded-lg border overflow-hidden"
                  style={{
                    background: 'var(--surface-panel)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <h2
                      id="investigations-heading"
                      className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-primary)]"
                    >
                      <Network className="h-3.5 w-3.5 text-[var(--accent-400)]" />
                      Investigations
                    </h2>
                    <button
                      onClick={() => navigate('/explore')}
                      className="text-[11px] text-[var(--text-accent)] hover:text-[var(--accent-300)] transition-colors"
                    >
                      View all →
                    </button>
                  </div>

                  <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                    {loading
                      ? [...Array(4)].map((_, i) => (
                          <div key={i} className="px-4 py-3 space-y-1.5">
                            <div className="h-3.5 w-4/5 rounded skeleton-shimmer" />
                            <div className="h-2.5 w-1/2 rounded skeleton-shimmer" />
                          </div>
                        ))
                      : recentInvestigations.length > 0
                        ? recentInvestigations.map(inv => (
                            <div
                              key={inv.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`Open investigation: ${inv.title}`}
                              className="group px-4 py-3 flex items-center gap-3 hover:bg-[var(--surface-overlay)] cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-[var(--surface-overlay)]"
                              onClick={() => navigate(`/explore?investigation=${inv.id}`)}
                              onKeyDown={e => handleItemKeyDown(e, `/explore?investigation=${inv.id}`)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-medium text-[var(--text-primary)] truncate leading-tight">
                                  {inv.title}
                                </div>
                                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                                  {inv.entityCount} entities · {inv.relationshipCount} relationships
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5">
                                <SeverityBadge level={inv.priority} />
                              </div>
                            </div>
                          ))
                        : (
                          <div className="px-4 py-8">
                            <EmptyState
                              icon="search"
                              title="No investigations"
                              description="Start a new investigation to see it here."
                              className="py-0"
                              action={{
                                label: 'Start Investigation',
                                onClick: () => navigate('/explore'),
                                variant: 'outline',
                              }}
                            />
                          </div>
                        )
                    }
                  </div>
                </section>

                {/* Recent Alerts */}
                <section
                  aria-labelledby="alerts-heading"
                  className="rounded-lg border overflow-hidden"
                  style={{
                    background: 'var(--surface-panel)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <h2
                      id="alerts-heading"
                      className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-primary)]"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-[var(--severity-critical-fg)]" />
                      Active Alerts
                      {isDemoMode && recentAlerts.length > 0 && (
                        <span className="severity-critical text-[10px] px-1.5 py-0.5 rounded font-semibold">
                          {recentAlerts.length}
                        </span>
                      )}
                    </h2>
                    <button
                      onClick={() => navigate('/alerts')}
                      className="text-[11px] text-[var(--text-accent)] hover:text-[var(--accent-300)] transition-colors"
                    >
                      View all →
                    </button>
                  </div>

                  <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                    {loading
                      ? [...Array(5)].map((_, i) => (
                          <div key={i} className="px-4 py-3 space-y-1.5">
                            <div className="h-3.5 w-4/5 rounded skeleton-shimmer" />
                            <div className="h-2.5 w-1/3 rounded skeleton-shimmer" />
                          </div>
                        ))
                      : recentAlerts.length > 0
                        ? recentAlerts.map(alert => (
                            <div
                              key={alert.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`View alert: ${alert.title}`}
                              className="group px-4 py-3 flex items-center gap-3 hover:bg-[var(--surface-overlay)] cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-[var(--surface-overlay)]"
                              onClick={() => navigate(`/alerts/${alert.id}`)}
                              onKeyDown={e => handleItemKeyDown(e, `/alerts/${alert.id}`)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-medium text-[var(--text-primary)] truncate leading-tight">
                                  {alert.title}
                                </div>
                                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                                  {alert.source} · {new Date(alert.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <SeverityBadge level={alert.severity} />
                            </div>
                          ))
                        : (
                          <div className="px-4 py-8">
                            <EmptyState
                              icon="alert"
                              title="No alerts"
                              description="New security alerts will appear here."
                              className="py-0"
                              action={{
                                label: 'View All Alerts',
                                onClick: () => navigate('/alerts'),
                                variant: 'outline',
                              }}
                            />
                          </div>
                        )
                    }
                  </div>
                </section>
              </div>
            </div>

            {/* Right rail: Status + Cases ───────────────────── */}
            <div className="space-y-5">

              {/* System Status */}
              <section
                aria-labelledby="status-heading"
                className="rounded-lg border overflow-hidden"
                style={{
                  background: 'var(--surface-panel)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <h2
                    id="status-heading"
                    className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-primary)]"
                  >
                    <Shield className="h-3.5 w-3.5 text-[var(--status-active)]" />
                    System Status
                  </h2>
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--status-active)]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-active)] animate-pulse" />
                    All Systems
                  </span>
                </div>
                <div className="px-4 divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  <StatusIndicator label="IntelGraph Engine" status="ok" />
                  <StatusIndicator label="Data Ingestion" status="ok" />
                  <StatusIndicator label="AI Orchestration" status="ok" />
                  <StatusIndicator label="Alert Pipeline" status="ok" />
                  <StatusIndicator label="Evidence Store" status="ok" />
                </div>
                <div
                  className="px-4 py-3 border-t"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <button
                    onClick={() => navigate('/trust')}
                    className="text-[11px] text-[var(--text-accent)] hover:text-[var(--accent-300)] transition-colors"
                  >
                    Trust & Governance dashboard →
                  </button>
                </div>
              </section>

              {/* Active Cases */}
              <section
                aria-labelledby="cases-heading"
                className="rounded-lg border overflow-hidden"
                style={{
                  background: 'var(--surface-panel)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <h2
                    id="cases-heading"
                    className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-primary)]"
                  >
                    <FileText className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                    Active Cases
                  </h2>
                  <button
                    onClick={() => navigate('/cases')}
                    className="text-[11px] text-[var(--text-accent)] hover:text-[var(--accent-300)] transition-colors"
                  >
                    View all →
                  </button>
                </div>

                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {loading
                    ? [...Array(3)].map((_, i) => (
                        <div key={i} className="px-4 py-3 space-y-1.5">
                          <div className="h-3.5 w-4/5 rounded skeleton-shimmer" />
                          <div className="h-2.5 w-1/2 rounded skeleton-shimmer" />
                        </div>
                      ))
                    : recentCases.length > 0
                      ? recentCases.map(case_ => (
                          <div
                            key={case_.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`View case: ${case_.title}`}
                            className="group px-4 py-3 flex items-center gap-3 hover:bg-[var(--surface-overlay)] cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-[var(--surface-overlay)]"
                            onClick={() => navigate(`/cases/${case_.id}`)}
                            onKeyDown={e => handleItemKeyDown(e, `/cases/${case_.id}`)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-medium text-[var(--text-primary)] truncate leading-tight">
                                {case_.title}
                              </div>
                              <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                                {case_.investigationIds.length} investigations · {case_.alertIds.length} alerts
                              </div>
                            </div>
                            <SeverityBadge level={case_.priority} />
                          </div>
                        ))
                      : (
                        <div className="px-4 py-8">
                          <EmptyState
                            icon="file"
                            title="No active cases"
                            description="Manage investigations in cases."
                            className="py-0"
                            action={{
                              label: 'View Cases',
                              onClick: () => navigate('/cases'),
                              variant: 'outline',
                            }}
                          />
                        </div>
                      )
                  }
                </div>
              </section>

              {/* Maestro shortcut */}
              <button
                onClick={() => navigate('/maestro')}
                className={cn(
                  'group w-full text-left rounded-lg p-4',
                  'border border-[var(--border-subtle)]',
                  'hover:border-[var(--border-accent)] hover:bg-[var(--accent-subtle)]',
                  'transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-600)]'
                )}
                style={{ background: 'var(--surface-panel)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #4a1d96, #7c3aed)' }}
                  >
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold text-[var(--text-primary)]">
                      Maestro Orchestration
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                      Launch AI-powered investigation workflows
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--text-disabled)] group-hover:text-[var(--text-tertiary)] group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5)  return 'Good night,'
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  if (h < 21) return 'Good evening,'
  return 'Good night,'
}
