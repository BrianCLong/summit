import React, { useState, useEffect } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { StatePanel } from '@/components/ui/StatePanel'
import { SearchBar } from '@/components/ui/SearchBar'
import { KPIStrip } from '@/components/panels/KPIStrip'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { DataIntegrityNotice } from '@/components/common/DataIntegrityNotice'
import { useDemoMode } from '@/components/common/DemoIndicator'
import { getMilestoneStatus, setMilestoneStatus } from '@/lib/firstRunFunnel'
import { trackFirstRunEvent } from '@/telemetry/metrics'
import {
  useAlerts,
  useAlertUpdates,
  useUpdateAlertStatus,
} from '@/hooks/useGraphQL'
import mockData from '@/mock/data.json'
import type { Alert, KPIMetric, AlertStatus } from '@/types'

export default function AlertsPage() {
  // GraphQL hooks
  const {
    data: alertsData,
    loading: alertsLoading,
    error: alertsError,
    refetch,
  } = useAlerts()
  const { data: alertUpdates } = useAlertUpdates()
  const [updateAlertStatus] = useUpdateAlertStatus()

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const isDemoMode = useDemoMode()

  // Load data - prefer GraphQL over mock data in demo mode only
  useEffect(() => {
    if (getMilestoneStatus('review_alerts') === 'not_started') {
      const nextStatus = setMilestoneStatus('review_alerts', 'in_progress')
      trackFirstRunEvent('first_run_milestone_started', {
        milestoneId: 'review_alerts',
        status: nextStatus,
        source: 'alerts_page',
      })
    }

    if (alertsData?.alerts) {
      setAlerts(alertsData.alerts)
      setLoading(alertsLoading)
      setError(alertsError)
    } else {
      if (!isDemoMode) {
        setAlerts([])
        setLoading(false)
        setError(
          new Error('Live alerts are unavailable without a backend connection.')
        )
        return
      }
      // Fallback to demo data
      const loadMockData = async () => {
        try {
          setLoading(true)
          await new Promise(resolve => setTimeout(resolve, 800))
          setAlerts(mockData.alerts as Alert[])
        } catch (err) {
          setError(err as Error)
        } finally {
          setLoading(false)
        }
      }
      loadMockData()
    }
  }, [alertsData, alertsLoading, alertsError, isDemoMode])

  useEffect(() => {
    if (!loading && alerts.length > 0) {
      if (getMilestoneStatus('review_alerts') !== 'complete') {
        const nextStatus = setMilestoneStatus('review_alerts', 'complete')
        trackFirstRunEvent('first_run_milestone_completed', {
          milestoneId: 'review_alerts',
          status: nextStatus,
          source: 'alerts_loaded',
        })
      }
    }
  }, [alerts.length, loading])

  // Handle real-time alert updates
  useEffect(() => {
    if (alertUpdates?.alertCreated) {
      setAlerts(prev => [alertUpdates.alertCreated, ...prev])
    }
  }, [alertUpdates])

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (selectedSeverity && alert.severity !== selectedSeverity) {return false}
    if (selectedStatus && alert.status !== selectedStatus) {return false}
    if (
      searchQuery &&
      !alert.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
      {return false}
    return true
  })

  // Calculate KPIs (do not show change deltas in demo-only mode)
  const kpiMetrics: KPIMetric[] = [
    {
      id: 'critical',
      title: 'Critical Alerts',
      value: alerts.filter(a => a.severity === 'critical').length,
      format: 'number',
      status:
        alerts.filter(a => a.severity === 'critical').length > 0
          ? 'error'
          : 'success',
      ...(alertsData ? { change: { value: 12, direction: 'up', period: 'last hour' } } : {}),
    },
    {
      id: 'active',
      title: 'Active Alerts',
      value: alerts.filter(a => a.status === 'open').length,
      format: 'number',
      status: 'warning',
      ...(alertsData ? { change: { value: 5, direction: 'down', period: 'last hour' } } : {}),
    },
    {
      id: 'resolved',
      title: 'Resolved Today',
      value: alerts.filter(a => a.status === 'resolved').length,
      format: 'number',
      status: 'success',
      ...(alertsData ? { change: { value: 23, direction: 'up', period: 'yesterday' } } : {}),
    },
    {
      id: 'response',
      title: 'Avg Response Time',
      value: 156,
      format: 'duration',
      status: 'neutral',
      ...(alertsData ? { change: { value: 8, direction: 'down', period: 'last week' } } : {}),
    },
  ]

  const handleStatusChange = async (
    alertId: string,
    newStatus: AlertStatus
  ) => {
    try {
      if (alertsData) {
        await updateAlertStatus({
          variables: { id: alertId, status: newStatus },
        })
      } else {
        // Update mock data
        setAlerts(prev =>
          prev.map(alert =>
            alert.id === alertId
              ? {
                  ...alert,
                  status: newStatus,
                  updatedAt: new Date().toISOString(),
                }
              : alert
          )
        )
      }
    } catch (error) {
      console.error('Failed to update alert status:', error)
    }
  }

  const handleRefresh = async () => {
    if (alertsData) {
      await refetch()
    } else {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 800))
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive'
      case 'investigating':
        return 'warning'
      case 'resolved':
        return 'success'
      default:
        return 'secondary'
    }
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <StatePanel
          variant="error"
          title="Failed to load alerts"
          description={error.message}
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
          secondaryAction={{ label: 'Back to setup', href: '/setup' }}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Security Alerts</h1>
          <ConnectionStatus />
        </div>

        <div className="flex items-center gap-3">
          <SearchBar
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-80"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {!alertsData && (
        <DataIntegrityNotice
          mode={isDemoMode ? 'demo' : 'unavailable'}
          context="Alerts overview"
        />
      )}

      {/* KPI Strip */}
      <KPIStrip data={kpiMetrics} loading={loading} columns={4} />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Severity:</span>
          <select
            value={selectedSeverity}
            onChange={e => setSelectedSeverity(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-muted-foreground">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </div>
      </div>

      {/* Alerts Table */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Alert Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <StatePanel
              variant="loading"
              title="Loading alerts"
              description="Fetching the latest alert stream."
              className="py-12"
            />
          ) : filteredAlerts.length === 0 ? (
            <StatePanel
              variant="empty"
              icon="search"
              title="No alerts found"
              description="Try adjusting your filters or search criteria."
              action={{
                label: 'Clear filters',
                onClick: () => {
                  setSearchQuery('')
                  setSelectedSeverity('')
                  setSelectedStatus('')
                },
              }}
              secondaryAction={{ label: 'Back to setup', href: '/setup' }}
              className="py-12"
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className="w-4"></th>
                  <th>Alert</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map(alert => (
                  <tr key={alert.id} className="group">
                    <td>
                      <div
                        className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`}
                      />
                    </td>
                    <td>
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {alert.description}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge
                        variant={
                          alert.severity === 'critical'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {alert.severity}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={getStatusColor(alert.status) as 'destructive' | 'warning' | 'success' | 'secondary'}>
                        {alert.status}
                      </Badge>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {alert.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleStatusChange(alert.id, 'investigating')
                            }
                          >
                            Investigate
                          </Button>
                        )}
                        {alert.status === 'investigating' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleStatusChange(alert.id, 'resolved')
                            }
                          >
                            Resolve
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
