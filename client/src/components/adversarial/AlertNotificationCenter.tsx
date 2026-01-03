import React, { useState, useMemo } from 'react';
import type { Alert, AlertRule, AlertSeverity, AlertCategory, AlertStatus } from './types';

export interface AlertNotificationCenterProps {
  alerts: Alert[];
  alertRules?: AlertRule[];
  onAcknowledge?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  onBulkAction?: (alertIds: string[], action: 'acknowledge' | 'dismiss' | 'resolve') => void;
  onSelectAlert?: (alert: Alert) => void;
  onToggleRule?: (ruleId: string, enabled: boolean) => void;
  className?: string;
}

const severityColors: Record<AlertSeverity, string> = {
  info: 'bg-gray-100 text-gray-800 border-gray-200',
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const severityIcons: Record<AlertSeverity, string> = {
  info: '\u2139\uFE0F',
  low: '\u{1F7E2}',
  medium: '\u{1F7E1}',
  high: '\u{1F7E0}',
  critical: '\u{1F534}',
};

const categoryIcons: Record<AlertCategory, string> = {
  detection: '\u{1F50D}',
  'ioc-match': '\u{1F3AF}',
  behavior: '\u{1F9E0}',
  policy: '\u{1F4DC}',
  system: '\u2699\uFE0F',
  'threat-intel': '\u{1F4E1}',
};

const statusColors: Record<AlertStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  acknowledged: 'bg-purple-100 text-purple-800',
  investigating: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800',
};

export const AlertNotificationCenter: React.FC<AlertNotificationCenterProps> = ({
  alerts,
  alertRules = [],
  onAcknowledge,
  onDismiss,
  onResolve,
  onBulkAction,
  onSelectAlert,
  onToggleRule,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules'>('alerts');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<AlertCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
      if (categoryFilter !== 'all' && alert.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          alert.title.toLowerCase().includes(query) ||
          alert.description.toLowerCase().includes(query) ||
          alert.source.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [alerts, severityFilter, categoryFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: alerts.length,
      new: alerts.filter((a) => a.status === 'new').length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      high: alerts.filter((a) => a.severity === 'high').length,
      activeRules: alertRules.filter((r) => r.enabled).length,
    };
  }, [alerts, alertRules]);

  const handleSelectAll = () => {
    if (selectedAlerts.size === filteredAlerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(filteredAlerts.map((a) => a.id)));
    }
  };

  const handleSelectAlert = (alertId: string) => {
    setSelectedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });
  };

  const handleBulkAction = (action: 'acknowledge' | 'dismiss' | 'resolve') => {
    if (selectedAlerts.size > 0) {
      onBulkAction?.(Array.from(selectedAlerts), action);
      setSelectedAlerts(new Set());
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 ${className}`}
      data-testid="alert-notification-center"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Alert Center</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-red-600 font-medium">{stats.critical} Critical</span>
              <span className="text-gray-400">|</span>
              <span className="text-orange-600 font-medium">{stats.high} High</span>
              <span className="text-gray-400">|</span>
              <span className="text-blue-600 font-medium">{stats.new} New</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'alerts'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('alerts')}
          >
            Alerts ({stats.total})
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'rules'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('rules')}
          >
            Rules ({alertRules.length})
          </button>
        </div>

        {activeTab === 'alerts' && (
          <>
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as AlertCategory | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                <option value="detection">Detection</option>
                <option value="ioc-match">IOC Match</option>
                <option value="behavior">Behavior</option>
                <option value="policy">Policy</option>
                <option value="system">System</option>
                <option value="threat-intel">Threat Intel</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            {/* Bulk Actions */}
            {selectedAlerts.size > 0 && (
              <div className="mt-3 flex items-center gap-3 p-2 bg-blue-50 rounded">
                <span className="text-sm text-blue-700">
                  {selectedAlerts.size} selected
                </span>
                <button
                  className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                  onClick={() => handleBulkAction('acknowledge')}
                >
                  Acknowledge
                </button>
                <button
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  onClick={() => handleBulkAction('resolve')}
                >
                  Resolve
                </button>
                <button
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  onClick={() => handleBulkAction('dismiss')}
                >
                  Dismiss
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Content */}
      {activeTab === 'alerts' && (
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {/* Select All */}
          {filteredAlerts.length > 0 && (
            <div className="p-2 bg-gray-50 border-b border-gray-200">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAlerts.size === filteredAlerts.length}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                Select all ({filteredAlerts.length})
              </label>
            </div>
          )}

          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 ${expandedAlertId === alert.id ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
              data-testid={`alert-${alert.id}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedAlerts.has(alert.id)}
                  onChange={() => handleSelectAlert(alert.id)}
                  className="mt-1 rounded"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 cursor-pointer" onClick={() => onSelectAlert?.(alert)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{severityIcons[alert.severity]}</span>
                      <span className="text-lg">{categoryIcons[alert.category]}</span>
                      <h3 className="font-medium text-gray-900">{alert.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded border ${
                          severityColors[alert.severity]
                        }`}
                      >
                        {alert.severity.toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          statusColors[alert.status]
                        }`}
                      >
                        {alert.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{alert.description}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>{alert.source}</span>
                    <span>{formatTimestamp(alert.timestamp)}</span>
                    {alert.assignee && <span>Assigned: {alert.assignee}</span>}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedAlertId === alert.id && alert.metadata && (
                <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Metadata</h4>
                  <pre className="text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(alert.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                {alert.status === 'new' && onAcknowledge && (
                  <button
                    className="px-3 py-1 text-sm text-purple-600 bg-purple-50 rounded hover:bg-purple-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcknowledge(alert.id);
                    }}
                  >
                    Acknowledge
                  </button>
                )}
                {alert.status !== 'resolved' && alert.status !== 'dismissed' && onResolve && (
                  <button
                    className="px-3 py-1 text-sm text-green-600 bg-green-50 rounded hover:bg-green-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolve(alert.id);
                    }}
                  >
                    Resolve
                  </button>
                )}
                {alert.status !== 'dismissed' && onDismiss && (
                  <button
                    className="px-3 py-1 text-sm text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(alert.id);
                    }}
                  >
                    Dismiss
                  </button>
                )}
                <button
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedAlertId(expandedAlertId === alert.id ? null : alert.id);
                  }}
                >
                  {expandedAlertId === alert.id ? 'Less' : 'More'}
                </button>
              </div>
            </div>
          ))}

          {filteredAlerts.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No alerts match your filters.
            </div>
          )}
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {alertRules.map((rule) => (
            <div key={rule.id} className="p-4 hover:bg-gray-50" data-testid={`rule-${rule.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{rule.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        severityColors[rule.severity]
                      }`}
                    >
                      {rule.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => onToggleRule?.(rule.id, !rule.enabled)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <span>Category: {rule.category}</span>
                <span>Cooldown: {rule.cooldownMinutes}m</span>
                <span>{rule.conditions.length} condition(s)</span>
                <span>{rule.actions.length} action(s)</span>
              </div>
            </div>
          ))}

          {alertRules.length === 0 && (
            <div className="p-8 text-center text-gray-500">No alert rules configured.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertNotificationCenter;
