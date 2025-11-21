import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Cpu,
  HardDrive,
  Network,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';

interface PluginMetrics {
  pluginId: string;
  name: string;
  state: string;
  metrics: {
    memoryUsageMB: number;
    memoryLimitMB: number;
    cpuPercent: number;
    cpuLimitPercent: number;
    networkBytesSent: number;
    networkBytesReceived: number;
    storageUsedMB: number;
    storageLimitMB: number;
    requestCount: number;
    errorCount: number;
    avgResponseTimeMs: number;
    uptime: number;
  };
  health: {
    healthy: boolean;
    message?: string;
    lastCheck: string;
  };
}

interface PluginDashboardProps {
  apiBaseUrl?: string;
  className?: string;
}

export function PluginDashboard({
  apiBaseUrl = '/api/plugins',
  className,
}: PluginDashboardProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['plugin-metrics'],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/metrics`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    refetchInterval: 2000, // Real-time updates
  });

  const { data: systemMetrics } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/system/metrics`);
      if (!response.ok) throw new Error('Failed to fetch system metrics');
      return response.json();
    },
    refetchInterval: 5000,
  });

  if (isLoading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const activePlugins = metrics?.filter((m: PluginMetrics) => m.state === 'active') || [];
  const unhealthyPlugins = metrics?.filter((m: PluginMetrics) => !m.health.healthy) || [];
  const totalMemory = activePlugins.reduce((sum: number, m: PluginMetrics) => sum + m.metrics.memoryUsageMB, 0);
  const totalRequests = activePlugins.reduce((sum: number, m: PluginMetrics) => sum + m.metrics.requestCount, 0);

  return (
    <div className={clsx('plugin-dashboard', className)}>
      <h1>Plugin System Dashboard</h1>

      {/* Overview Cards */}
      <div className="overview-cards">
        <div className="overview-card">
          <div className="card-icon">
            <Activity size={24} />
          </div>
          <div className="card-content">
            <span className="card-value">{activePlugins.length}</span>
            <span className="card-label">Active Plugins</span>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">
            <Cpu size={24} />
          </div>
          <div className="card-content">
            <span className="card-value">{totalMemory.toFixed(0)} MB</span>
            <span className="card-label">Total Memory</span>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">
            <TrendingUp size={24} />
          </div>
          <div className="card-content">
            <span className="card-value">{formatNumber(totalRequests)}</span>
            <span className="card-label">Total Requests</span>
          </div>
        </div>

        <div className={clsx('overview-card', unhealthyPlugins.length > 0 && 'warning')}>
          <div className="card-icon">
            {unhealthyPlugins.length > 0 ? (
              <AlertTriangle size={24} />
            ) : (
              <CheckCircle size={24} />
            )}
          </div>
          <div className="card-content">
            <span className="card-value">
              {unhealthyPlugins.length > 0 ? unhealthyPlugins.length : 'All Good'}
            </span>
            <span className="card-label">
              {unhealthyPlugins.length > 0 ? 'Unhealthy' : 'Health Status'}
            </span>
          </div>
        </div>
      </div>

      {/* System Resource Usage */}
      {systemMetrics && (
        <div className="system-metrics">
          <h2>System Resources</h2>
          <div className="system-bars">
            <SystemResourceBar
              icon={<Cpu size={16} />}
              label="CPU"
              used={systemMetrics.cpu.usage}
              total={100}
              unit="%"
            />
            <SystemResourceBar
              icon={<HardDrive size={16} />}
              label="Memory"
              used={systemMetrics.memory.usedMB}
              total={systemMetrics.memory.totalMB}
              unit="MB"
            />
            <SystemResourceBar
              icon={<Network size={16} />}
              label="Network"
              used={systemMetrics.network.bandwidthUsedMbps}
              total={systemMetrics.network.bandwidthLimitMbps}
              unit="Mbps"
            />
          </div>
        </div>
      )}

      {/* Plugin Metrics Table */}
      <div className="metrics-table-container">
        <h2>Plugin Metrics</h2>
        <table className="metrics-table">
          <thead>
            <tr>
              <th>Plugin</th>
              <th>Status</th>
              <th>Memory</th>
              <th>CPU</th>
              <th>Requests</th>
              <th>Errors</th>
              <th>Avg Response</th>
              <th>Uptime</th>
            </tr>
          </thead>
          <tbody>
            {metrics?.map((plugin: PluginMetrics) => (
              <tr key={plugin.pluginId} className={clsx(!plugin.health.healthy && 'unhealthy')}>
                <td>
                  <div className="plugin-name">
                    {plugin.name}
                    {!plugin.health.healthy && (
                      <AlertTriangle size={14} className="warning-icon" />
                    )}
                  </div>
                </td>
                <td>
                  <span className={clsx('status-badge', plugin.state)}>
                    {plugin.state}
                  </span>
                </td>
                <td>
                  <MiniBar
                    value={plugin.metrics.memoryUsageMB}
                    max={plugin.metrics.memoryLimitMB}
                    unit="MB"
                  />
                </td>
                <td>
                  <MiniBar
                    value={plugin.metrics.cpuPercent}
                    max={plugin.metrics.cpuLimitPercent}
                    unit="%"
                  />
                </td>
                <td>{formatNumber(plugin.metrics.requestCount)}</td>
                <td className={plugin.metrics.errorCount > 0 ? 'error-count' : ''}>
                  {plugin.metrics.errorCount}
                </td>
                <td>{plugin.metrics.avgResponseTimeMs.toFixed(0)}ms</td>
                <td>
                  <span className="uptime">
                    <Clock size={12} />
                    {formatUptime(plugin.metrics.uptime)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Health Issues */}
      {unhealthyPlugins.length > 0 && (
        <div className="health-issues">
          <h2>Health Issues</h2>
          {unhealthyPlugins.map((plugin: PluginMetrics) => (
            <div key={plugin.pluginId} className="health-issue">
              <AlertTriangle size={16} />
              <div>
                <strong>{plugin.name}</strong>
                <p>{plugin.health.message || 'Health check failed'}</p>
                <span className="last-check">
                  Last check: {new Date(plugin.health.lastCheck).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SystemResourceBarProps {
  icon: React.ReactNode;
  label: string;
  used: number;
  total: number;
  unit: string;
}

function SystemResourceBar({ icon, label, used, total, unit }: SystemResourceBarProps) {
  const percentage = (used / total) * 100;
  const status = percentage > 80 ? 'critical' : percentage > 60 ? 'warning' : 'good';

  return (
    <div className="system-resource-bar">
      <div className="bar-header">
        {icon}
        <span className="bar-label">{label}</span>
        <span className="bar-value">
          {used.toFixed(1)} / {total} {unit}
        </span>
      </div>
      <div className="bar-track">
        <div
          className={clsx('bar-fill', status)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface MiniBarProps {
  value: number;
  max: number;
  unit: string;
}

function MiniBar({ value, max, unit }: MiniBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const status = percentage > 80 ? 'critical' : percentage > 60 ? 'warning' : 'good';

  return (
    <div className="mini-bar">
      <div className="mini-bar-track">
        <div className={clsx('mini-bar-fill', status)} style={{ width: `${percentage}%` }} />
      </div>
      <span className="mini-bar-value">
        {value.toFixed(1)}{unit}
      </span>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default PluginDashboard;
