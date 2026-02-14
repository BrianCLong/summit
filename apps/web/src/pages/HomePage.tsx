import React, { useState, useEffect } from 'react'
import {
  ArrowRight,
  Search,
  AlertTriangle,
  FileText,
  BarChart3,
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
          {quickActions.map(action => {
            const Icon = action.icon
            return (
              <Card
                key={action.title}
                className="cursor-pointer hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={() => navigate(action.href)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(action.href);
                  }
                }}
                role="button"
                aria-label={`${action.title}: ${action.description}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${action.color} text-white`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
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
            )
          })}
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
                  <div
                    key={investigation.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    onClick={() =>
                      navigate(`/explore?investigation=${investigation.id}`)
                    }
                    tabIndex={0}
                    role="button"
                    aria-label={`Investigation: ${investigation.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/explore?investigation=${investigation.id}`)
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {investigation.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {investigation.entityCount} entities •{' '}
                        {investigation.relationshipCount} relationships
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={getPriorityBadgeVariant(
                          investigation.priority
                        )}
                        className="text-xs"
                      >
                        {investigation.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {investigation.status}
                      </Badge>
                    </div>
                  </div>
                ))}
            {!loading && recentInvestigations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No investigations available.
              </p>
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
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    onClick={() => navigate(`/alerts/${alert.id}`)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Alert: ${alert.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/alerts/${alert.id}`)
                      }
                    }}
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
                        variant={getSeverityBadgeVariant(alert.severity)}
                        className="text-xs"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
            {!loading && recentAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No alerts available.
              </p>
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
                  <div
                    key={case_.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    onClick={() => navigate(`/cases/${case_.id}`)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Case: ${case_.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/cases/${case_.id}`)
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{case_.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {case_.investigationIds.length} investigations •{' '}
                        {case_.alertIds.length} alerts
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={getPriorityBadgeVariant(case_.priority)}
                        className="text-xs"
                      >
                        {case_.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {case_.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
            {!loading && recentCases.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No cases available.
              </p>
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
