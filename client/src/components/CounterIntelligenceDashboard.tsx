import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';

// GraphQL Queries
const GET_CI_OVERVIEW = gql`
  query GetCIOverview($timeRange: TimeRange!) {
    counterIntelligence {
      overview(timeRange: $timeRange) {
        anomalyCount
        criticalAlerts
        highRiskEntities
        activeInvestigations
        threatActorsTracked
        narrativesMonitored
      }
      recentAlerts(limit: 10) {
        id
        type
        severity
        title
        summary
        createdAt
        status
      }
      riskTrend(timeRange: $timeRange) {
        date
        score
        anomalyCount
      }
      topThreats(limit: 5) {
        id
        name
        pattern
        severity
        confidence
        entities
      }
    }
  }
`;

const GET_ANOMALIES = gql`
  query GetAnomalies($query: AnomalyQueryInput!) {
    anomalies(query: $query) {
      id
      type
      severity
      confidence
      description
      timestamp
      entityId
      status
      correlations
    }
  }
`;

const GET_THREAT_ACTORS = gql`
  query GetThreatActors {
    threatActors {
      id
      codename
      attribution {
        nationState
        confidence
      }
      capabilities {
        sophistication
        domains
      }
      confidence
      lastUpdated
    }
  }
`;

const GET_NARRATIVES = gql`
  query GetNarratives($status: NarrativeStatus) {
    narratives(status: $status) {
      id
      title
      themes
      authenticityScore
      status
      impactAssessment {
        potentialHarm
        reach
      }
      firstSeen
      lastSeen
    }
  }
`;

const ACKNOWLEDGE_ALERT = gql`
  mutation AcknowledgeAlert($alertId: ID!) {
    acknowledgeAlert(alertId: $alertId) {
      id
      status
      acknowledgedAt
    }
  }
`;

// Types
interface TimeRange {
  start: Date;
  end: Date;
}

interface Alert {
  id: string;
  type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  summary: string;
  createdAt: string;
  status: string;
}

interface Anomaly {
  id: string;
  type: string;
  severity: string;
  confidence: number;
  description: string;
  timestamp: string;
  entityId?: string;
  status: string;
  correlations: string[];
}

interface ThreatActor {
  id: string;
  codename: string;
  attribution: {
    nationState: string | null;
    confidence: string;
  };
  capabilities: {
    sophistication: string;
    domains: string[];
  };
  confidence: number;
  lastUpdated: string;
}

interface Narrative {
  id: string;
  title: string;
  themes: string[];
  authenticityScore: number;
  status: string;
  impactAssessment: {
    potentialHarm: string;
    reach: number;
  };
  firstSeen: string;
  lastSeen: string;
}

interface Overview {
  anomalyCount: number;
  criticalAlerts: number;
  highRiskEntities: number;
  activeInvestigations: number;
  threatActorsTracked: number;
  narrativesMonitored: number;
}

interface ThreatSummary {
  id: string;
  name: string;
  pattern: string;
  severity: string;
  confidence: number;
  entities: string[];
}

// Severity colors
const severityColors: Record<string, string> = {
  CRITICAL: '#d32f2f',
  HIGH: '#f57c00',
  MEDIUM: '#fbc02d',
  LOW: '#388e3c',
  INFO: '#1976d2',
};

const severityBgColors: Record<string, string> = {
  CRITICAL: '#ffebee',
  HIGH: '#fff3e0',
  MEDIUM: '#fffde7',
  LOW: '#e8f5e9',
  INFO: '#e3f2fd',
};

// Format helpers
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

// Components
interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = '#1976d2', onClick }) => (
  <div
    className="stat-card"
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default' }}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    <div className="stat-icon" style={{ backgroundColor: `${color}15`, color }}>
      {icon}
    </div>
    <div className="stat-content">
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
    </div>
    {trend && (
      <div className={`stat-trend ${trend}`}>
        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
      </div>
    )}
  </div>
);

interface AlertItemProps {
  alert: Alert;
  onAcknowledge: (id: string) => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, onAcknowledge }) => (
  <div
    className="alert-item"
    style={{ borderLeftColor: severityColors[alert.severity] }}
  >
    <div className="alert-header">
      <span
        className="alert-severity"
        style={{
          backgroundColor: severityBgColors[alert.severity],
          color: severityColors[alert.severity],
        }}
      >
        {alert.severity}
      </span>
      <span className="alert-type">{alert.type.replace(/_/g, ' ')}</span>
      <span className="alert-time">{formatRelativeTime(alert.createdAt)}</span>
    </div>
    <div className="alert-title">{alert.title}</div>
    <div className="alert-summary">{alert.summary}</div>
    <div className="alert-actions">
      {alert.status === 'NEW' && (
        <button
          className="btn-acknowledge"
          onClick={() => onAcknowledge(alert.id)}
        >
          Acknowledge
        </button>
      )}
      <button className="btn-investigate">Investigate</button>
    </div>
  </div>
);

interface ThreatActorCardProps {
  actor: ThreatActor;
  onClick: (id: string) => void;
}

const ThreatActorCard: React.FC<ThreatActorCardProps> = ({ actor, onClick }) => (
  <div className="threat-actor-card" onClick={() => onClick(actor.id)}>
    <div className="actor-header">
      <span className="actor-codename">{actor.codename}</span>
      <span className="actor-confidence">{Math.round(actor.confidence * 100)}%</span>
    </div>
    <div className="actor-attribution">
      {actor.attribution.nationState || 'Unknown Attribution'}
      <span className="attribution-confidence">
        ({actor.attribution.confidence})
      </span>
    </div>
    <div className="actor-capabilities">
      <span className="sophistication">{actor.capabilities.sophistication}</span>
      <div className="domains">
        {actor.capabilities.domains.slice(0, 3).map((domain, i) => (
          <span key={i} className="domain-tag">
            {domain.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    </div>
    <div className="actor-updated">
      Updated: {formatRelativeTime(actor.lastUpdated)}
    </div>
  </div>
);

interface NarrativeCardProps {
  narrative: Narrative;
  onClick: (id: string) => void;
}

const NarrativeCard: React.FC<NarrativeCardProps> = ({ narrative, onClick }) => {
  const harmColors: Record<string, string> = {
    SEVERE: '#d32f2f',
    HIGH: '#f57c00',
    MEDIUM: '#fbc02d',
    LOW: '#388e3c',
  };

  return (
    <div className="narrative-card" onClick={() => onClick(narrative.id)}>
      <div className="narrative-header">
        <span
          className="narrative-status"
          style={{
            backgroundColor: narrative.status === 'VIRAL' ? '#ffebee' : '#e3f2fd',
            color: narrative.status === 'VIRAL' ? '#d32f2f' : '#1976d2',
          }}
        >
          {narrative.status}
        </span>
        <span
          className="narrative-harm"
          style={{ color: harmColors[narrative.impactAssessment.potentialHarm] }}
        >
          {narrative.impactAssessment.potentialHarm} Risk
        </span>
      </div>
      <div className="narrative-title">{narrative.title}</div>
      <div className="narrative-themes">
        {narrative.themes.slice(0, 3).map((theme, i) => (
          <span key={i} className="theme-tag">{theme}</span>
        ))}
      </div>
      <div className="narrative-metrics">
        <span>Authenticity: {Math.round(narrative.authenticityScore * 100)}%</span>
        <span>Reach: {narrative.impactAssessment.reach.toLocaleString()}</span>
      </div>
      <div className="narrative-dates">
        First seen: {formatRelativeTime(narrative.firstSeen)}
      </div>
    </div>
  );
};

interface AnomalyTimelineProps {
  anomalies: Anomaly[];
  onSelect: (anomaly: Anomaly) => void;
}

const AnomalyTimeline: React.FC<AnomalyTimelineProps> = ({ anomalies, onSelect }) => (
  <div className="anomaly-timeline">
    {anomalies.map((anomaly) => (
      <div
        key={anomaly.id}
        className="timeline-item"
        onClick={() => onSelect(anomaly)}
        style={{ borderLeftColor: severityColors[anomaly.severity] }}
      >
        <div className="timeline-header">
          <span className="anomaly-type">{anomaly.type.replace(/_/g, ' ')}</span>
          <span
            className="anomaly-severity"
            style={{ color: severityColors[anomaly.severity] }}
          >
            {anomaly.severity}
          </span>
        </div>
        <div className="timeline-description">{anomaly.description}</div>
        <div className="timeline-meta">
          <span>{formatRelativeTime(anomaly.timestamp)}</span>
          {anomaly.entityId && <span>Entity: {anomaly.entityId.slice(0, 8)}...</span>}
          {anomaly.correlations.length > 0 && (
            <span className="correlation-badge">
              {anomaly.correlations.length} correlations
            </span>
          )}
        </div>
      </div>
    ))}
  </div>
);

// Main Dashboard Component
export function CounterIntelligenceDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'anomalies' | 'actors' | 'narratives'>('overview');
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);

  // Mock data for demonstration (replace with actual GraphQL queries)
  const mockOverview: Overview = {
    anomalyCount: 47,
    criticalAlerts: 3,
    highRiskEntities: 12,
    activeInvestigations: 5,
    threatActorsTracked: 23,
    narrativesMonitored: 8,
  };

  const mockAlerts: Alert[] = [
    {
      id: '1',
      type: 'PATTERN_MATCH',
      severity: 'CRITICAL',
      title: 'Data Exfiltration Pattern Detected',
      summary: 'Multiple indicators suggest unauthorized data transfer involving 3 entities',
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      status: 'NEW',
    },
    {
      id: '2',
      type: 'ANOMALY_CORRELATION',
      severity: 'HIGH',
      title: 'Unusual Access Pattern Cluster',
      summary: 'Correlated access anomalies from finance department after hours',
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      status: 'INVESTIGATING',
    },
    {
      id: '3',
      type: 'BEHAVIOR_CHANGE',
      severity: 'MEDIUM',
      title: 'Communication Pattern Shift',
      summary: 'Significant change in external communication volume detected',
      createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      status: 'NEW',
    },
  ];

  const mockThreatActors: ThreatActor[] = [
    {
      id: 'ta1',
      codename: 'PHANTOM_SERPENT',
      attribution: { nationState: 'APT29', confidence: 'HIGH' },
      capabilities: { sophistication: 'NATION_STATE', domains: ['NETWORK_EXPLOITATION', 'SUPPLY_CHAIN'] },
      confidence: 0.87,
      lastUpdated: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'ta2',
      codename: 'SHADOW_MANTIS',
      attribution: { nationState: null, confidence: 'LOW' },
      capabilities: { sophistication: 'ADVANCED', domains: ['SOCIAL_ENGINEERING', 'DISINFORMATION'] },
      confidence: 0.65,
      lastUpdated: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ];

  const mockNarratives: Narrative[] = [
    {
      id: 'n1',
      title: 'Corporate Security Breach Claims',
      themes: ['Data Breach', 'Corporate Espionage', 'Insider Threat'],
      authenticityScore: 0.23,
      status: 'ACTIVE',
      impactAssessment: { potentialHarm: 'HIGH', reach: 45000 },
      firstSeen: new Date(Date.now() - 3 * 86400000).toISOString(),
      lastSeen: new Date(Date.now() - 1 * 3600000).toISOString(),
    },
    {
      id: 'n2',
      title: 'Supply Chain Vulnerability Allegations',
      themes: ['Supply Chain', 'Software Security'],
      authenticityScore: 0.78,
      status: 'EMERGING',
      impactAssessment: { potentialHarm: 'MEDIUM', reach: 12000 },
      firstSeen: new Date(Date.now() - 1 * 86400000).toISOString(),
      lastSeen: new Date(Date.now() - 30 * 60000).toISOString(),
    },
  ];

  const mockAnomalies: Anomaly[] = [
    {
      id: 'a1',
      type: 'DATA_EXFILTRATION',
      severity: 'CRITICAL',
      confidence: 0.92,
      description: 'Large data transfer to external endpoint detected outside business hours',
      timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
      entityId: 'user-12345',
      status: 'CORRELATED',
      correlations: ['cluster-1'],
    },
    {
      id: 'a2',
      type: 'ACCESS_ANOMALY',
      severity: 'HIGH',
      confidence: 0.85,
      description: 'Unusual access to restricted financial documents',
      timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
      entityId: 'user-12345',
      status: 'CORRELATED',
      correlations: ['cluster-1'],
    },
    {
      id: 'a3',
      type: 'BEHAVIORAL_DEVIATION',
      severity: 'MEDIUM',
      confidence: 0.72,
      description: 'Significant deviation from normal working hours pattern',
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
      entityId: 'user-67890',
      status: 'NEW',
      correlations: [],
    },
  ];

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    console.log('Acknowledging alert:', alertId);
    // Would call mutation
  }, []);

  const handleSelectThreatActor = useCallback((actorId: string) => {
    console.log('Selected threat actor:', actorId);
    // Would navigate to detail view
  }, []);

  const handleSelectNarrative = useCallback((narrativeId: string) => {
    console.log('Selected narrative:', narrativeId);
    // Would navigate to detail view
  }, []);

  const handleSelectAnomaly = useCallback((anomaly: Anomaly) => {
    setSelectedAnomaly(anomaly);
  }, []);

  return (
    <div className="ci-dashboard">
      <style>{`
        .ci-dashboard {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 24px;
          background: #f5f5f5;
          min-height: 100vh;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .dashboard-title {
          font-size: 28px;
          font-weight: 600;
          color: #1a1a2e;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dashboard-title-icon {
          font-size: 32px;
        }

        .time-range-selector {
          display: flex;
          gap: 8px;
        }

        .time-btn {
          padding: 8px 16px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .time-btn:hover {
          background: #f0f0f0;
        }

        .time-btn.active {
          background: #1976d2;
          color: white;
          border-color: #1976d2;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a2e;
        }

        .stat-title {
          font-size: 13px;
          color: #666;
          margin-top: 4px;
        }

        .stat-trend {
          font-size: 18px;
          font-weight: 600;
        }

        .stat-trend.up { color: #d32f2f; }
        .stat-trend.down { color: #388e3c; }
        .stat-trend.stable { color: #666; }

        .tab-nav {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          background: white;
          padding: 4px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .tab-btn {
          padding: 12px 24px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          background: #f5f5f5;
        }

        .tab-btn.active {
          background: #1976d2;
          color: white;
        }

        .main-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        .alerts-section, .threats-section, .actors-section, .narratives-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .alert-item {
          padding: 16px;
          border-left: 4px solid;
          background: #fafafa;
          border-radius: 0 8px 8px 0;
          margin-bottom: 12px;
        }

        .alert-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .alert-severity {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .alert-type {
          font-size: 12px;
          color: #666;
        }

        .alert-time {
          margin-left: auto;
          font-size: 12px;
          color: #999;
        }

        .alert-title {
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 4px;
        }

        .alert-summary {
          font-size: 14px;
          color: #666;
          margin-bottom: 12px;
        }

        .alert-actions {
          display: flex;
          gap: 8px;
        }

        .btn-acknowledge, .btn-investigate {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-acknowledge {
          background: #1976d2;
          color: white;
          border: none;
        }

        .btn-acknowledge:hover {
          background: #1565c0;
        }

        .btn-investigate {
          background: white;
          color: #1976d2;
          border: 1px solid #1976d2;
        }

        .btn-investigate:hover {
          background: #e3f2fd;
        }

        .threat-actor-card, .narrative-card {
          padding: 16px;
          background: #fafafa;
          border-radius: 8px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .threat-actor-card:hover, .narrative-card:hover {
          background: #f0f0f0;
          transform: translateX(4px);
        }

        .actor-header, .narrative-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .actor-codename {
          font-weight: 600;
          color: #1a1a2e;
          font-family: monospace;
        }

        .actor-confidence {
          font-size: 14px;
          font-weight: 600;
          color: #1976d2;
        }

        .actor-attribution {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .attribution-confidence {
          font-size: 12px;
          color: #999;
          margin-left: 4px;
        }

        .actor-capabilities {
          margin-bottom: 8px;
        }

        .sophistication {
          font-size: 12px;
          padding: 2px 8px;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 4px;
          margin-right: 8px;
        }

        .domains {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }

        .domain-tag, .theme-tag {
          font-size: 11px;
          padding: 2px 6px;
          background: #f5f5f5;
          border-radius: 4px;
          color: #666;
        }

        .actor-updated {
          font-size: 12px;
          color: #999;
        }

        .narrative-status {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .narrative-harm {
          font-size: 12px;
          font-weight: 600;
        }

        .narrative-title {
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 8px;
        }

        .narrative-themes {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
        }

        .narrative-metrics {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }

        .narrative-dates {
          font-size: 12px;
          color: #999;
        }

        .anomaly-timeline {
          max-height: 400px;
          overflow-y: auto;
        }

        .timeline-item {
          padding: 12px;
          border-left: 3px solid;
          margin-bottom: 8px;
          background: #fafafa;
          border-radius: 0 6px 6px 0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .timeline-item:hover {
          background: #f0f0f0;
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .anomaly-type {
          font-size: 12px;
          font-weight: 600;
          color: #1a1a2e;
        }

        .anomaly-severity {
          font-size: 11px;
          font-weight: 600;
        }

        .timeline-description {
          font-size: 13px;
          color: #666;
          margin-bottom: 8px;
        }

        .timeline-meta {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #999;
        }

        .correlation-badge {
          background: #e3f2fd;
          color: #1976d2;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        @media (max-width: 1200px) {
          .main-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="dashboard-header">
        <h1 className="dashboard-title">
          <span className="dashboard-title-icon">🛡️</span>
          Counterintelligence Operations Center
        </h1>
        <div className="time-range-selector">
          <button className="time-btn">24h</button>
          <button className="time-btn active">7d</button>
          <button className="time-btn">30d</button>
          <button className="time-btn">90d</button>
        </div>
      </header>

      <div className="stats-grid">
        <StatCard
          title="Total Anomalies"
          value={mockOverview.anomalyCount}
          icon="📊"
          trend="up"
          color="#1976d2"
        />
        <StatCard
          title="Critical Alerts"
          value={mockOverview.criticalAlerts}
          icon="🚨"
          color="#d32f2f"
        />
        <StatCard
          title="High Risk Entities"
          value={mockOverview.highRiskEntities}
          icon="⚠️"
          trend="up"
          color="#f57c00"
        />
        <StatCard
          title="Active Investigations"
          value={mockOverview.activeInvestigations}
          icon="🔍"
          color="#7b1fa2"
        />
        <StatCard
          title="Threat Actors Tracked"
          value={mockOverview.threatActorsTracked}
          icon="👤"
          color="#455a64"
        />
        <StatCard
          title="Narratives Monitored"
          value={mockOverview.narrativesMonitored}
          icon="📰"
          color="#00897b"
        />
      </div>

      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'anomalies' ? 'active' : ''}`}
          onClick={() => setActiveTab('anomalies')}
        >
          Anomalies
        </button>
        <button
          className={`tab-btn ${activeTab === 'actors' ? 'active' : ''}`}
          onClick={() => setActiveTab('actors')}
        >
          Threat Actors
        </button>
        <button
          className={`tab-btn ${activeTab === 'narratives' ? 'active' : ''}`}
          onClick={() => setActiveTab('narratives')}
        >
          Narratives
        </button>
      </nav>

      <div className="main-content">
        <div className="alerts-section">
          <h2 className="section-title">
            🚨 Recent Alerts
          </h2>
          {mockAlerts.map((alert) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledgeAlert}
            />
          ))}
        </div>

        <div className="sidebar">
          <div className="actors-section">
            <h2 className="section-title">
              👤 Active Threat Actors
            </h2>
            {mockThreatActors.map((actor) => (
              <ThreatActorCard
                key={actor.id}
                actor={actor}
                onClick={handleSelectThreatActor}
              />
            ))}
          </div>

          <div className="narratives-section">
            <h2 className="section-title">
              📰 Tracked Narratives
            </h2>
            {mockNarratives.map((narrative) => (
              <NarrativeCard
                key={narrative.id}
                narrative={narrative}
                onClick={handleSelectNarrative}
              />
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'anomalies' && (
        <div className="anomalies-section" style={{ marginTop: 24 }}>
          <h2 className="section-title">📊 Anomaly Timeline</h2>
          <AnomalyTimeline
            anomalies={mockAnomalies}
            onSelect={handleSelectAnomaly}
          />
        </div>
      )}
    </div>
  );
}

export default CounterIntelligenceDashboard;
