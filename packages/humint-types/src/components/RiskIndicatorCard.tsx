/**
 * Risk Indicator Card Component
 *
 * Displays risk indicators for HUMINT sources.
 */

import React from 'react';
import type { RiskIndicator } from '../asset-tracking.js';
import type { RiskLevel } from '../constants.js';
import { RISK_LEVELS } from '../constants.js';

export interface RiskIndicatorCardProps {
  indicator: RiskIndicator;
  onMitigate?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onEscalate?: (id: string) => void;
  compact?: boolean;
}

const getRiskColor = (severity: RiskLevel): string => {
  const colors: Record<RiskLevel, string> = {
    MINIMAL: '#10b981',
    LOW: '#22c55e',
    MODERATE: '#f59e0b',
    ELEVATED: '#f97316',
    HIGH: '#ef4444',
    CRITICAL: '#dc2626',
  };
  return colors[severity];
};

const getRiskBackground = (severity: RiskLevel): string => {
  const colors: Record<RiskLevel, string> = {
    MINIMAL: '#ecfdf5',
    LOW: '#f0fdf4',
    MODERATE: '#fffbeb',
    ELEVATED: '#fff7ed',
    HIGH: '#fef2f2',
    CRITICAL: '#fef2f2',
  };
  return colors[severity];
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getIndicatorTypeIcon = (type: RiskIndicator['indicatorType']): string => {
  const icons: Record<RiskIndicator['indicatorType'], string> = {
    BEHAVIORAL: '🔍',
    COMMUNICATION: '📡',
    FINANCIAL: '💰',
    TRAVEL: '✈️',
    COUNTERINTEL: '🛡️',
    OPERATIONAL: '⚙️',
  };
  return icons[type];
};

export const RiskIndicatorCard: React.FC<RiskIndicatorCardProps> = ({
  indicator,
  onMitigate,
  onDismiss,
  onEscalate,
  compact = false,
}) => {
  const riskInfo = RISK_LEVELS[indicator.severity];

  if (compact) {
    return (
      <div
        className="risk-indicator-compact"
        style={{
          borderLeftColor: getRiskColor(indicator.severity),
          backgroundColor: getRiskBackground(indicator.severity),
        }}
      >
        <span className="indicator-icon">
          {getIndicatorTypeIcon(indicator.indicatorType)}
        </span>
        <span className="indicator-type">{indicator.indicatorType}</span>
        <span
          className="indicator-severity"
          style={{ color: getRiskColor(indicator.severity) }}
        >
          {indicator.severity}
        </span>
        <span className="indicator-desc">{indicator.description}</span>
      </div>
    );
  }

  return (
    <div
      className="risk-indicator-card"
      style={{
        borderColor: getRiskColor(indicator.severity),
        backgroundColor: getRiskBackground(indicator.severity),
      }}
    >
      {/* Header */}
      <div className="indicator-header">
        <div className="indicator-title">
          <span className="indicator-icon">
            {getIndicatorTypeIcon(indicator.indicatorType)}
          </span>
          <span className="indicator-type">
            {indicator.indicatorType.replace(/_/g, ' ')}
          </span>
        </div>
        <div
          className="severity-badge"
          style={{
            backgroundColor: getRiskColor(indicator.severity),
          }}
        >
          {riskInfo.label}
        </div>
      </div>

      {/* Description */}
      <div className="indicator-body">
        <p className="indicator-description">{indicator.description}</p>

        {/* Metadata */}
        <div className="indicator-meta">
          <div className="meta-item">
            <span className="meta-label">Detected:</span>
            <span className="meta-value">{formatDate(indicator.detectedAt)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Method:</span>
            <span className="meta-value">{indicator.detectionMethod}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Status:</span>
            <span className={`meta-value status-${indicator.status.toLowerCase()}`}>
              {indicator.status}
            </span>
          </div>
        </div>

        {/* Mitigation Actions */}
        {indicator.mitigationActions.length > 0 && (
          <div className="mitigation-actions">
            <span className="actions-label">Mitigation Actions:</span>
            <ul className="actions-list">
              {indicator.mitigationActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Resolved info */}
        {indicator.resolvedAt && (
          <div className="resolved-info">
            <span className="resolved-label">Resolved:</span>
            <span className="resolved-date">{formatDate(indicator.resolvedAt)}</span>
            {indicator.resolvedBy && (
              <span className="resolved-by">by {indicator.resolvedBy}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {indicator.status === 'ACTIVE' && (
        <div className="indicator-actions">
          {onMitigate && (
            <button
              className="btn-action mitigate"
              onClick={() => onMitigate(indicator.id)}
            >
              Mark Mitigated
            </button>
          )}
          {onDismiss && (
            <button
              className="btn-action dismiss"
              onClick={() => onDismiss(indicator.id)}
            >
              Dismiss
            </button>
          )}
          {onEscalate && indicator.severity !== 'CRITICAL' && (
            <button
              className="btn-action escalate"
              onClick={() => onEscalate(indicator.id)}
            >
              Escalate
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Risk Summary Component - displays aggregated risk overview
 */
export interface RiskSummaryProps {
  indicators: RiskIndicator[];
  onViewAll?: () => void;
}

export const RiskSummary: React.FC<RiskSummaryProps> = ({
  indicators,
  onViewAll,
}) => {
  const activeIndicators = indicators.filter((i) => i.status === 'ACTIVE');
  const bySeverity: Record<string, number> = {};

  activeIndicators.forEach((i) => {
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
  });

  const criticalCount = bySeverity['CRITICAL'] || 0;
  const highCount = bySeverity['HIGH'] || 0;

  return (
    <div className="risk-summary">
      <div className="summary-header">
        <h4>Risk Indicators</h4>
        {activeIndicators.length > 0 && (
          <span className="active-count">{activeIndicators.length} Active</span>
        )}
      </div>

      {activeIndicators.length === 0 ? (
        <div className="no-risks">No active risk indicators</div>
      ) : (
        <>
          <div className="severity-breakdown">
            {Object.entries(RISK_LEVELS)
              .reverse()
              .map(([key, value]) => {
                const count = bySeverity[key] || 0;
                if (count === 0) return null;
                return (
                  <div
                    key={key}
                    className="severity-item"
                    style={{ borderLeftColor: getRiskColor(key as RiskLevel) }}
                  >
                    <span className="severity-count">{count}</span>
                    <span className="severity-label">{value.label}</span>
                  </div>
                );
              })}
          </div>

          {(criticalCount > 0 || highCount > 0) && (
            <div className="risk-alert">
              ⚠️ {criticalCount + highCount} high-priority indicator
              {criticalCount + highCount > 1 ? 's' : ''} require attention
            </div>
          )}

          {onViewAll && (
            <button className="btn-text view-all" onClick={onViewAll}>
              View All Indicators →
            </button>
          )}
        </>
      )}
    </div>
  );
};
