import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { SLO, Alert, MetricData } from '../types/maestro-api';
import GrafanaPanel from './GrafanaPanel';
import SLOPanel from './SLOPanel';
import ServingLaneTrends from './ServingLaneTrends';

interface SLODashboardProps {
  className?: string;
}

function SLODashboard({ className }: SLODashboardProps) {
  const [slos, setSlos] = useState<SLO[]>([
    {
      name: 'Control Plane Availability',
      target: 0.999,
      current: 0.9984,
      errorBudget: 85.2,
      burnRate: 0.8,
      windowHours: 24,
    },
    {
      name: 'Run Success Rate',
      target: 0.97,
      current: 0.984,
      errorBudget: 42.1,
      burnRate: 1.2,
      windowHours: 24,
    },
    {
      name: 'P95 Build Duration',
      target: 600,
      current: 287,
      errorBudget: 78.9,
      burnRate: 0.3,
      windowHours: 24,
    },
    {
      name: 'UI Response Time',
      target: 2500,
      current: 1245,
      errorBudget: 91.7,
      burnRate: 0.2,
      windowHours: 24,
    },
  ]);

  const getSLOStatus = (slo: SLO) => {
    if (slo.burnRate > 2) return 'critical';
    if (slo.burnRate > 1) return 'warning';
    return 'healthy';
  };

  const getSLOColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };

  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          SLOs & Error Budgets
        </h2>
        <button className="rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
          Configure SLOs
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {slos.map((slo) => {
          const status = getSLOStatus(slo);
          return (
            <div key={slo.name} className="rounded-lg border p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-slate-900">
                    {slo.name}
                  </h3>
                  <div className="mt-1 text-xs text-slate-600">
                    Target:{' '}
                    {typeof slo.target === 'number' && slo.target < 1
                      ? `${(slo.target * 100).toFixed(2)}%`
                      : `${slo.target}${slo.name.includes('Duration') || slo.name.includes('Time') ? 'ms' : ''}`}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-lg font-semibold ${getSLOColor(status)}`}
                  >
                    {typeof slo.current === 'number' && slo.current < 1
                      ? `${(slo.current * 100).toFixed(2)}%`
                      : `${slo.current}${slo.name.includes('Duration') || slo.name.includes('Time') ? 'ms' : ''}`}
                  </div>
                  <div className="text-xs text-slate-500">
                    Budget: {slo.errorBudget.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Error Budget</span>
                  <span className={getSLOColor(status)}>
                    {slo.errorBudget.toFixed(1)}% remaining
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      status === 'critical'
                        ? 'bg-red-500'
                        : status === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${slo.errorBudget}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Burn rate: {slo.burnRate}×
                  </span>
                  <span className={`font-medium ${getSLOColor(status)}`}>
                    {status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MetricsDashboardProps {
  className?: string;
}

function MetricsDashboard({ className }: MetricsDashboardProps) {
  const { useObservability } = api();
  const { data: metrics } = useObservability();

  const goldenSignals = [
    {
      name: 'Latency (P95)',
      value: `${metrics?.latencyP95 || 180}ms`,
      trend: '-12ms',
      status: 'improving' as const,
      target: '≤ 300ms',
    },
    {
      name: 'Error Rate',
      value: `${metrics?.errorRate || 0.4}%`,
      trend: '+0.1%',
      status: 'stable' as const,
      target: '≤ 1.0%',
    },
    {
      name: 'Throughput',
      value: `${metrics?.throughput || 320}/min`,
      trend: '+45/min',
      status: 'improving' as const,
      target: '≥ 200/min',
    },
    {
      name: 'Queue Depth',
      value: `${metrics?.queueDepth || 7}`,
      trend: '-2',
      status: 'improving' as const,
      target: '≤ 10',
    },
  ];

  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${className}`}>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        Golden Signals
      </h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {goldenSignals.map((signal) => (
          <div key={signal.name} className="text-center">
            <div className="text-xs text-slate-600">{signal.name}</div>
            <div className="text-xl font-bold text-slate-900">
              {signal.value}
            </div>
            <div className="flex items-center justify-center gap-1 text-xs">
              <span
                className={`font-medium ${
                  signal.status === 'improving'
                    ? 'text-green-600'
                    : signal.status === 'degrading'
                      ? 'text-red-600'
                      : 'text-slate-600'
                }`}
              >
                {signal.status === 'improving'
                  ? '↗'
                  : signal.status === 'degrading'
                    ? '↘'
                    : '→'}{' '}
                {signal.trend}
              </span>
            </div>
            <div className="text-xs text-slate-500">{signal.target}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AlertsCenterProps {
  className?: string;
}

function AlertsCenter({ className }: AlertsCenterProps) {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 'alert-1',
      severity: 'critical',
      message: 'SLO burn rate exceeds 2x for Control Plane Availability',
      runbook: 'https://runbooks.example.com/slo-burn-rate',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: 'alert-2',
      severity: 'warning',
      message: 'Queue depth approaching limit (8/10)',
      runbook: 'https://runbooks.example.com/queue-depth',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'alert-3',
      severity: 'info',
      message: 'Deployment canary promoted to 50%',
      runbook: '',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
  ]);

  const handleAckAlert = async (alertId: string) => {
    try {
      // This would call the actual API
      console.log('Acknowledging alert:', alertId);
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Active Alerts</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{alerts.length} active</span>
          <button className="rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
            View All
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <div className="text-green-600 text-2xl mb-2">✓</div>
            <div className="text-sm">No active alerts</div>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border p-3 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        alert.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : alert.severity === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-900">
                    {alert.message}
                  </div>
                  {alert.runbook && (
                    <div className="mt-1">
                      <a
                        href={alert.runbook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        View Runbook →
                      </a>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAckAlert(alert.id)}
                    className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    Ack
                  </button>
                  <button className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                    Assign
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface TabPanelProps {
  children: React.ReactNode;
  value: string;
  index: string;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      hidden={value !== index}
      role="tabpanel"
      aria-labelledby={`obs-tab-${index}`}
    >
      {value === index && children}
    </div>
  );
}

export default function EnhancedObservability() {
  const [activeTab, setActiveTab] = useState('dashboards');

  const tabs = [
    { id: 'dashboards', label: 'Dashboards', icon: '📊' },
    { id: 'traces', label: 'Traces', icon: '🔍' },
    { id: 'logs', label: 'Logs', icon: '📋' },
    { id: 'alerts', label: 'Alerts', icon: '🚨' },
    { id: 'slos', label: 'SLOs', icon: '🎯' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Observability & SLOs
          </h1>
          <p className="text-sm text-slate-600">
            Monitor system health, track SLOs, and investigate issues
          </p>
        </div>
        <div className="flex gap-2">
          <button className="rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Export Metrics
          </button>
          <button className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700">
            Create Alert
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <TabPanel value={activeTab} index="dashboards">
        <div className="space-y-6">
          <MetricsDashboard />
          <SLODashboard />
          <ServingLaneTrends />

          {/* Grafana Panels */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <GrafanaPanel uid="maestro-overview" title="System Overview" />
            <GrafanaPanel uid="maestro-cost" title="Cost Trends" />
            <GrafanaPanel
              uid="maestro-performance"
              title="Performance Metrics"
            />
          </div>
        </div>
      </TabPanel>

      <TabPanel value={activeTab} index="traces">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Distributed Tracing
          </h2>
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              Trace Explorer
            </h3>
            <p className="text-sm mb-4">
              Search and analyze distributed traces across your runs
            </p>
            <button className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
              Open Jaeger UI
            </button>
          </div>
        </div>
      </TabPanel>

      <TabPanel value={activeTab} index="logs">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Centralized Logs
          </h2>
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              Log Explorer
            </h3>
            <p className="text-sm mb-4">
              Query and analyze logs from all runs and components
            </p>
            <button className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
              Open Grafana Logs
            </button>
          </div>
        </div>
      </TabPanel>

      <TabPanel value={activeTab} index="alerts">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
          <AlertsCenter />
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Alert Rules
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>SLO Burn Rate {`>`} 2x</span>
                <span className="text-green-600">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Queue Depth {`>`} 10</span>
                <span className="text-green-600">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Error Rate {`>`} 5%</span>
                <span className="text-green-600">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cost Spike {`>`} $100/hr</span>
                <span className="text-green-600">Active</span>
              </div>
            </div>
            <button className="mt-3 w-full rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Manage Rules
            </button>
          </div>
        </div>
      </TabPanel>

      <TabPanel value={activeTab} index="slos">
        <div className="space-y-6">
          <SLODashboard />
          <SLOPanel />
        </div>
      </TabPanel>
    </div>
  );
}
