import React, { useState, useEffect, useCallback, memo } from 'react'
import {
  ArrowRight,
  Search,
  AlertTriangle,
  FileText,
  BarChart3,
  LucideIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
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

// Extracted Memoized Components for Performance

const QuickActionCard = memo(({ action, onActionClick, onActionKeyDown }: {
  action: { title: string, description: string, icon: LucideIcon, href: string, color: string, badge?: string },
  onActionClick: (href: string) => void,
  onActionKeyDown: (e: React.KeyboardEvent, href: string) => void
}) => {
  const Icon = action.icon;
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      onClick={() => onActionClick(action.href)}
      tabIndex={0}
      onKeyDown={(e) => onActionKeyDown(e, action.href)}
      role="button"
      aria-label={`${action.title}: ${action.description}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${action.color} text-white`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate flex items-center gap-2">
              {action.title}
              {action.badge && (
                <Badge variant="destructive" className="text-xs">
                  {action.badge}
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {action.description}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
});
QuickActionCard.displayName = 'QuickActionCard';

const InvestigationRow = memo(({ investigation, onClick, onKeyDown }: {
  investigation: Investigation,
  onClick: (id: string) => void,
  onKeyDown: (e: React.KeyboardEvent, id: string) => void
}) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={`View investigation: ${investigation.title}`}
    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    onClick={() => onClick(investigation.id)}
    onKeyDown={(e) => onKeyDown(e, investigation.id)}
  >
    <div className="flex-1 min-w-0">
      <div className="font-medium truncate">
        {investigation.title}
      </div>
      <div className="text-sm text-muted-foreground">
        {investigation.status.replace('_', ' ')} •{' '}
        {new Date(investigation.createdAt).toLocaleDateString()}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="text-xs">
        {investigation.priority}
      </Badge>
    </div>
  </div>
));
InvestigationRow.displayName = 'InvestigationRow';

const AlertRow = memo(({ alert, onClick, onKeyDown, getSeverityBadgeVariant }: {
  alert: Alert,
  onClick: (id: string) => void,
  onKeyDown: (e: React.KeyboardEvent, id: string) => void,
  getSeverityBadgeVariant: (severity: string) => "default" | "secondary" | "destructive" | "outline" | "warning" | "success"
}) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={`View alert: ${alert.title}`}
    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    onClick={() => onClick(alert.id)}
    onKeyDown={(e) => onKeyDown(e, alert.id)}
  >
    <div className="flex-1 min-w-0">
      <div className="font-medium truncate">{alert.title}</div>
      <div className="text-sm text-muted-foreground">
        {alert.source} •{' '}
        {new Date(alert.createdAt).toLocaleDateString()}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge
        variant={getSeverityBadgeVariant(alert.severity) as any}
        className="text-xs"
      >
        {alert.severity}
      </Badge>
    </div>
  </div>
));
AlertRow.displayName = 'AlertRow';

const CaseRow = memo(({ caseItem, onClick, onKeyDown, getPriorityBadgeVariant }: {
  caseItem: Case,
  onClick: (id: string) => void,
  onKeyDown: (e: React.KeyboardEvent, id: string) => void,
  getPriorityBadgeVariant: (priority: string) => "default" | "secondary" | "destructive" | "outline" | "warning" | "success"
}) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={`View case: ${caseItem.title}`}
    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    onClick={() => onClick(caseItem.id)}
    onKeyDown={(e) => onKeyDown(e, caseItem.id)}
  >
    <div className="flex-1 min-w-0">
      <div className="font-medium truncate">{caseItem.title}</div>
      <div className="text-sm text-muted-foreground">
        {caseItem.investigationIds.length} investigations •{' '}
        {caseItem.alertIds.length} alerts
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge
        variant={getPriorityBadgeVariant(caseItem.priority) as any}
        className="text-xs"
      >
        {caseItem.priority}
      </Badge>
      <Badge variant="outline" className="text-xs">
        {caseItem.status.replace('_', ' ')}
      </Badge>
    </div>
  </div>
));
CaseRow.displayName = 'CaseRow';


export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetric[]>([])
  const [recentInvestigations, setRecentInvestigations] = useState<
    Investigation[]
  >([])
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])
  const [recentCases, setRecentCases] = useState<Case[]>([])
  const isDemoMode = useDemoMode()

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)

        if (!isDemoMode) {
          setKpiMetrics([])
          setRecentInvestigations([])
          setRecentAlerts([])
          setRecentCases([])
          return
        }

        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 1000))

        setKpiMetrics(mockData.kpiMetrics as KPIMetric[])
        setRecentInvestigations(
          mockData.investigations.slice(0, 3) as Investigation[]
        )
        setRecentAlerts(mockData.alerts.slice(0, 4) as Alert[])
        setRecentCases(mockData.cases.slice(0, 2) as Case[])
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [isDemoMode])

  const quickActions = [
    {
      title: 'Start Investigation',
      description: 'Create a new investigation',
      icon: Search,
      href: '/explore',
      color: 'bg-blue-500',
    },
    {
      title: 'Review Alerts',
      description: 'Review security alerts and triage status',
      icon: AlertTriangle,
      href: '/alerts',
      color: 'bg-red-500',
      badge: isDemoMode ? '3' : undefined,
    },
    {
      title: 'View Cases',
      description: 'Manage active cases',
      icon: FileText,
      href: '/cases',
      color: 'bg-green-500',
    },
    {
      title: 'Command Center',
      description: 'Real-time operations dashboard',
      icon: BarChart3,
      href: '/dashboards/command-center',
      color: 'bg-purple-500',
    },
  ]

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'warning'
      case 'low':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'warning'
      case 'low':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const handleItemKeyDown = useCallback((e: React.KeyboardEvent, path: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(path)
    }
  }, [navigate]);

  const handleActionClick = useCallback((href: string) => {
    navigate(href);
  }, [navigate]);

  const handleActionKeyDown = useCallback((e: React.KeyboardEvent, href: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(href);
    }
  }, [navigate]);

  const handleInvestigationClick = useCallback((id: string) => {
    navigate(`/explore?investigation=${id}`);
  }, [navigate]);

  const handleInvestigationKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    handleItemKeyDown(e, `/explore?investigation=${id}`);
  }, [handleItemKeyDown]);

  const handleAlertClick = useCallback((id: string) => {
    navigate(`/alerts/${id}`);
  }, [navigate]);

  const handleAlertKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    handleItemKeyDown(e, `/alerts/${id}`);
  }, [handleItemKeyDown]);

  const handleCaseClick = useCallback((id: string) => {
    navigate(`/cases/${id}`);
  }, [navigate]);

  const handleCaseKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    handleItemKeyDown(e, `/cases/${id}`);
  }, [handleItemKeyDown]);


  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your intelligence operations
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <DataIntegrityNotice
        mode={isDemoMode ? 'demo' : 'unavailable'}
        context="Home overview"
      />

      <ActivationProgressTile />

      {/* KPI Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
        <KPIStrip
          data={kpiMetrics}
          loading={loading}
          onSelect={metric => {
            if (metric.id === 'threats') {navigate('/alerts')}
            else if (metric.id === 'investigations') {navigate('/explore')}
          }}
        />
        {!loading && kpiMetrics.length === 0 && (
          <div className="mt-4">
            <EmptyState
              icon="chart"
              title="No live metrics"
              description="Connect a data source to populate KPI metrics."
            />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(action => (
            <QuickActionCard
              key={action.title}
              action={action as any}
              onActionClick={handleActionClick}
              onActionKeyDown={handleActionKeyDown}
            />
          ))}
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Recent Investigations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Recent Investigations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading
              ? [...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))
              : recentInvestigations.map(investigation => (
                  <InvestigationRow
                    key={investigation.id}
                    investigation={investigation}
                    onClick={handleInvestigationClick}
                    onKeyDown={handleInvestigationKeyDown}
                  />
                ))}
            {!loading && recentInvestigations.length === 0 && (
              <EmptyState
                icon="search"
                title="No investigations"
                description="Start a new investigation to see it here."
                className="py-4"
                action={{
                  label: 'Start Investigation',
                  onClick: () => navigate('/explore'),
                  variant: 'outline',
                }}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => navigate('/explore')}
            >
              View All Investigations
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {loading
              ? [...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              : recentAlerts.map(alert => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onClick={handleAlertClick}
                    onKeyDown={handleAlertKeyDown}
                    getSeverityBadgeVariant={getSeverityBadgeVariant as any}
                  />
                ))}
            {!loading && recentAlerts.length === 0 && (
              <EmptyState
                icon="alert"
                title="No alerts"
                description="New security alerts will appear here."
                className="py-4"
                action={{
                  label: 'View All Alerts',
                  onClick: () => navigate('/alerts'),
                  variant: 'outline',
                }}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => navigate('/alerts')}
            >
              View All Alerts
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Recent Cases */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Active Cases
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {loading
              ? [...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))
              : recentCases.map(case_ => (
                  <CaseRow
                    key={case_.id}
                    caseItem={case_}
                    onClick={handleCaseClick}
                    onKeyDown={handleCaseKeyDown}
                    getPriorityBadgeVariant={getPriorityBadgeVariant as any}
                  />
                ))}
            {!loading && recentCases.length === 0 && (
              <EmptyState
                icon="file"
                title="No active cases"
                description="Manage your active investigations in cases."
                className="py-4"
                action={{
                  label: 'View All Cases',
                  onClick: () => navigate('/cases'),
                  variant: 'outline',
                }}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => navigate('/cases')}
            >
              View All Cases
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
