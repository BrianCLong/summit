/**
 * CompanyOS Operations Dashboard
 * Meta-view showing how Summit operates itself
 */

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, TrendingUp, GitBranch, Activity } from 'lucide-react';

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  started_at: string;
  commander?: string;
  customer_impact: boolean;
}

interface Alert {
  id: string;
  alert_name: string;
  severity: string;
  status: string;
  summary: string;
  triggered_at: string;
  service_name?: string;
}

interface Deployment {
  id: string;
  service_name: string;
  version: string;
  environment: string;
  status: string;
  started_at: string;
  deployed_by: string;
}

interface SLOViolation {
  id: string;
  slo_name: string;
  service_name: string;
  actual_value: number;
  threshold_value: number;
  triggered_at: string;
}

interface DashboardData {
  activeIncidents: Incident[];
  firingAlerts: Alert[];
  recentDeployments: Deployment[];
  sloViolations: SLOViolation[];
  timestamp: string;
}

export function OperationsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/companyos/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const data = await response.json();
      setData(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'sev1':
      case 'critical':
        return 'bg-red-500';
      case 'sev2':
      case 'warning':
        return 'bg-orange-500';
      case 'sev3':
        return 'bg-yellow-500';
      case 'sev4':
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
      case 'firing':
      case 'in_progress':
        return 'bg-red-500';
      case 'investigating':
      case 'acknowledged':
        return 'bg-orange-500';
      case 'monitoring':
        return 'bg-yellow-500';
      case 'resolved':
      case 'succeeded':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading operations dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CompanyOS Operations</h1>
          <p className="text-gray-600 mt-1">How Summit runs on Summit</p>
        </div>
        <Badge variant="outline" className="px-4 py-2">
          <Clock className="w-4 h-4 mr-2" />
          Last updated: {formatRelativeTime(data.timestamp)}
        </Badge>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={data.activeIncidents.length > 0 ? 'border-red-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.activeIncidents.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {data.activeIncidents.filter((i) => i.customer_impact).length} with customer impact
            </p>
          </CardContent>
        </Card>

        <Card className={data.firingAlerts.length > 0 ? 'border-orange-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Firing Alerts</CardTitle>
            <Activity className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.firingAlerts.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {data.firingAlerts.filter((a) => a.severity === 'critical').length} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Deployments</CardTitle>
            <GitBranch className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.recentDeployments.filter((d) => d.status === 'succeeded').length}/
              {data.recentDeployments.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Success rate: {data.recentDeployments.length > 0
                ? Math.round((data.recentDeployments.filter((d) => d.status === 'succeeded').length / data.recentDeployments.length) * 100)
                : 0}%
            </p>
          </CardContent>
        </Card>

        <Card className={data.sloViolations.length > 0 ? 'border-yellow-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SLO Violations</CardTitle>
            <TrendingUp className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.sloViolations.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Unresolved violations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
            Active Incidents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.activeIncidents.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <CheckCircle className="w-6 h-6 mr-2 text-green-500" />
              No active incidents
            </div>
          ) : (
            <div className="space-y-3">
              {data.activeIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(incident.severity)}>
                        {incident.severity.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(incident.status)} variant="outline">
                        {incident.status}
                      </Badge>
                      {incident.customer_impact && (
                        <Badge variant="destructive">Customer Impact</Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900">{incident.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Commander: {incident.commander || 'Unassigned'} · Started {formatRelativeTime(incident.started_at)}
                    </p>
                  </div>
                  <a
                    href={`/companyos/incidents/${incident.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View →
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Firing Alerts & Recent Deployments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Firing Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-orange-500" />
              Firing Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.firingAlerts.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <CheckCircle className="w-6 h-6 mr-2 text-green-500" />
                No firing alerts
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {data.firingAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      {alert.service_name && (
                        <span className="text-xs text-gray-600">{alert.service_name}</span>
                      )}
                    </div>
                    <h5 className="font-medium text-sm text-gray-900">{alert.alert_name}</h5>
                    <p className="text-xs text-gray-600 mt-1 truncate">{alert.summary}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(alert.triggered_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Deployments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GitBranch className="w-5 h-5 mr-2 text-blue-500" />
              Recent Deployments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentDeployments.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                No recent deployments
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {data.recentDeployments.map((deployment) => (
                  <div
                    key={deployment.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(deployment.status)}>
                          {deployment.status}
                        </Badge>
                        <Badge variant="outline">{deployment.environment}</Badge>
                      </div>
                      <span className="text-xs text-gray-500">{formatRelativeTime(deployment.started_at)}</span>
                    </div>
                    <h5 className="font-medium text-sm text-gray-900">
                      {deployment.service_name} <span className="text-gray-600">v{deployment.version}</span>
                    </h5>
                    <p className="text-xs text-gray-600 mt-1">
                      Deployed by {deployment.deployed_by}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SLO Violations */}
      {data.sloViolations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-yellow-500" />
              SLO Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.sloViolations.map((violation) => (
                <div
                  key={violation.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900">{violation.slo_name}</h5>
                      <p className="text-sm text-gray-600 mt-1">
                        {violation.service_name} · Actual: {violation.actual_value.toFixed(2)} (Threshold: {violation.threshold_value.toFixed(2)})
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Triggered {formatRelativeTime(violation.triggered_at)}
                      </p>
                    </div>
                    <Badge variant="destructive">VIOLATION</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 pt-4">
        <p>CompanyOS: Summit's internal operational intelligence platform</p>
        <p className="mt-1">
          This dashboard demonstrates Summit using itself for incident management, deployment tracking, and operational metrics
        </p>
      </div>
    </div>
  );
}
