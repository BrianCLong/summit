/**
 * Source Dashboard Component
 *
 * Displays comprehensive source status and activity dashboard.
 */

import React from 'react';
import type { AssetDashboard } from '../asset-tracking.js';
import type { SourceStatus, RiskLevel, CredibilityRating } from '../constants.js';
import { CREDIBILITY_RATINGS, RISK_LEVELS, SOURCE_STATUS } from '../constants.js';

export interface SourceDashboardProps {
  dashboard: AssetDashboard;
  onScheduleDebrief: () => void;
  onViewNetwork: () => void;
  onRecordActivity: () => void;
  onEditSource: () => void;
}

const getStatusColor = (status: SourceStatus): string => {
  const colors: Record<string, string> = {
    ACTIVE: '#10b981',
    DEVELOPMENTAL: '#3b82f6',
    EVALUATION: '#8b5cf6',
    DORMANT: '#f59e0b',
    TERMINATED: '#6b7280',
    COMPROMISED: '#ef4444',
    RESETTLED: '#06b6d4',
    DECEASED: '#1f2937',
  };
  return colors[status] || '#6b7280';
};

const getRiskColor = (risk: RiskLevel): string => {
  const colors: Record<string, string> = {
    MINIMAL: '#10b981',
    LOW: '#22c55e',
    MODERATE: '#f59e0b',
    ELEVATED: '#f97316',
    HIGH: '#ef4444',
    CRITICAL: '#dc2626',
  };
  return colors[risk] || '#6b7280';
};

const getCredibilityColor = (score: number): string => {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  if (score >= 20) return '#f97316';
  return '#ef4444';
};

const formatDate = (date: Date | null): string => {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (date: Date): string => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const SourceDashboard: React.FC<SourceDashboardProps> = ({
  dashboard,
  onScheduleDebrief,
  onViewNetwork,
  onRecordActivity,
  onEditSource,
}) => {
  const daysUntilContact = dashboard.nextScheduledContact
    ? Math.ceil(
        (new Date(dashboard.nextScheduledContact).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const daysSinceContact = dashboard.lastContact
    ? Math.floor(
        (Date.now() - new Date(dashboard.lastContact).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <div className="source-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-main">
          <h1 className="cryptonym">{dashboard.sourceCryptonym}</h1>
          <span
            className="status-badge"
            style={{ backgroundColor: getStatusColor(dashboard.status) }}
          >
            {dashboard.status}
          </span>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={onEditSource}>
            Edit
          </button>
          <button className="btn-primary" onClick={onScheduleDebrief}>
            Schedule Debrief
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Credibility Score</div>
          <div
            className="metric-value"
            style={{ color: getCredibilityColor(dashboard.credibilityScore) }}
          >
            {dashboard.credibilityScore}
          </div>
          <div className="metric-bar">
            <div
              className="metric-bar-fill"
              style={{
                width: `${dashboard.credibilityScore}%`,
                backgroundColor: getCredibilityColor(dashboard.credibilityScore),
              }}
            />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Risk Level</div>
          <div
            className="metric-value risk"
            style={{ color: getRiskColor(dashboard.riskLevel) }}
          >
            {RISK_LEVELS[dashboard.riskLevel]?.label || dashboard.riskLevel}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Last Contact</div>
          <div className="metric-value">{formatDate(dashboard.lastContact)}</div>
          {daysSinceContact !== null && (
            <div className={`metric-sublabel ${daysSinceContact > 30 ? 'warning' : ''}`}>
              {daysSinceContact} days ago
            </div>
          )}
        </div>

        <div className="metric-card">
          <div className="metric-label">Next Contact</div>
          <div className="metric-value">
            {dashboard.nextScheduledContact
              ? formatDate(dashboard.nextScheduledContact)
              : 'Not Scheduled'}
          </div>
          {daysUntilContact !== null && daysUntilContact <= 7 && (
            <div className="metric-sublabel upcoming">In {daysUntilContact} days</div>
          )}
        </div>
      </div>

      {/* Alerts Section */}
      {dashboard.alerts.length > 0 && (
        <div className="alerts-section">
          <h3>Active Alerts ({dashboard.activeIndicators})</h3>
          <div className="alerts-list">
            {dashboard.alerts.map((alert) => (
              <div
                key={alert.id}
                className="alert-item"
                style={{ borderLeftColor: getRiskColor(alert.severity) }}
              >
                <div className="alert-severity">{alert.severity}</div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-time">{formatDateTime(alert.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="dashboard-columns">
        {/* Left Column */}
        <div className="dashboard-column">
          {/* Upcoming Debriefs */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Upcoming Debriefs</h3>
              <button className="btn-text" onClick={onScheduleDebrief}>
                + Schedule
              </button>
            </div>
            {dashboard.upcomingDebriefs.length > 0 ? (
              <ul className="debrief-list">
                {dashboard.upcomingDebriefs.map((debrief) => (
                  <li key={debrief.id} className="debrief-item">
                    <span className="debrief-type">{debrief.type}</span>
                    <span className="debrief-date">
                      {formatDateTime(debrief.scheduledAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">No upcoming debriefs scheduled</div>
            )}
          </div>

          {/* Recent Intelligence */}
          <div className="dashboard-card">
            <h3>Recent Intelligence</h3>
            {dashboard.recentIntelligence.length > 0 ? (
              <ul className="intel-list">
                {dashboard.recentIntelligence.map((intel) => (
                  <li key={intel.id} className="intel-item">
                    <span className="intel-topic">{intel.topic}</span>
                    <span className="intel-rating">Rating: {intel.rating}</span>
                    <span className="intel-date">{formatDate(intel.date)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">No recent intelligence</div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="dashboard-column">
          {/* Graph Connections */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Knowledge Graph</h3>
              <button className="btn-text" onClick={onViewNetwork}>
                View Network
              </button>
            </div>
            <div className="connections-grid">
              <div className="connection-stat">
                <div className="stat-value">{dashboard.graphConnections.persons}</div>
                <div className="stat-label">Persons</div>
              </div>
              <div className="connection-stat">
                <div className="stat-value">{dashboard.graphConnections.organizations}</div>
                <div className="stat-label">Organizations</div>
              </div>
              <div className="connection-stat">
                <div className="stat-value">{dashboard.graphConnections.locations}</div>
                <div className="stat-label">Locations</div>
              </div>
              <div className="connection-stat total">
                <div className="stat-value">{dashboard.graphConnections.total}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Recent Activity</h3>
              <button className="btn-text" onClick={onRecordActivity}>
                + Record
              </button>
            </div>
            {dashboard.recentActivities.length > 0 ? (
              <ul className="activity-list">
                {dashboard.recentActivities.slice(0, 5).map((activity) => (
                  <li key={activity.id} className="activity-item">
                    <span className="activity-type">{activity.activityType}</span>
                    <span className="activity-desc">
                      {activity.description.slice(0, 50)}
                      {activity.description.length > 50 ? '...' : ''}
                    </span>
                    <span className="activity-time">
                      {formatDateTime(activity.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">No recent activity recorded</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
