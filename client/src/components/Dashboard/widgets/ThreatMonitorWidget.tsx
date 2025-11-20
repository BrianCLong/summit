/**
 * Threat Monitoring Dashboard Widget
 * Real-time threat intelligence monitoring and alerting
 */

import React, { useState, useEffect } from 'react';
import { wsService } from '../../../services/websocket';

interface ThreatIndicator {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email';
  value: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  tags: string[];
  description?: string;
}

interface ThreatEvent {
  id: string;
  timestamp: Date;
  type: 'detection' | 'correlation' | 'escalation';
  title: string;
  description: string;
  indicators: ThreatIndicator[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'investigating' | 'resolved';
}

interface ThreatMonitorWidgetProps {
  config?: {
    sources?: string[];
    minSeverity?: 'low' | 'medium' | 'high' | 'critical';
    autoRefresh?: boolean;
    refreshInterval?: number;
  };
}

const ThreatMonitorWidget: React.FC<ThreatMonitorWidgetProps> = ({ config }) => {
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [indicators, setIndicators] = useState<ThreatIndicator[]>([]);
  const [selectedThreat, setSelectedThreat] = useState<ThreatEvent | null>(null);
  const [view, setView] = useState<'list' | 'timeline' | 'heatmap'>('list');
  const [filter, setFilter] = useState<'all' | 'active' | 'critical'>('all');

  useEffect(() => {
    // Load mock threat data
    loadMockThreats();

    // Subscribe to real-time threat updates
    wsService.on('threat:new', handleNewThreat);
    wsService.on('threat:update', handleThreatUpdate);

    return () => {
      wsService.off('threat:new', handleNewThreat);
      wsService.off('threat:update', handleThreatUpdate);
    };
  }, []);

  const loadMockThreats = () => {
    const mockThreats: ThreatEvent[] = [
      {
        id: 'threat-001',
        timestamp: new Date(Date.now() - 300000),
        type: 'detection',
        title: 'Suspicious Network Activity Detected',
        description: 'Multiple failed authentication attempts from foreign IP addresses',
        indicators: [
          {
            id: 'ioc-001',
            type: 'ip',
            value: '203.0.113.42',
            severity: 'high',
            confidence: 0.92,
            source: 'SIEM',
            firstSeen: new Date(Date.now() - 600000),
            lastSeen: new Date(Date.now() - 300000),
            tags: ['brute-force', 'authentication'],
          },
        ],
        severity: 'high',
        status: 'active',
      },
      {
        id: 'threat-002',
        timestamp: new Date(Date.now() - 900000),
        type: 'correlation',
        title: 'APT Group Activity Correlation',
        description: 'TTPs matching known APT29 infrastructure',
        indicators: [
          {
            id: 'ioc-002',
            type: 'domain',
            value: 'suspicious-domain.example.com',
            severity: 'critical',
            confidence: 0.87,
            source: 'Threat Intel Feed',
            firstSeen: new Date(Date.now() - 1800000),
            lastSeen: new Date(Date.now() - 900000),
            tags: ['apt29', 'c2'],
          },
        ],
        severity: 'critical',
        status: 'investigating',
      },
      {
        id: 'threat-003',
        timestamp: new Date(Date.now() - 1800000),
        type: 'detection',
        title: 'Malware Hash Detected',
        description: 'Known ransomware hash found in email attachment',
        indicators: [
          {
            id: 'ioc-003',
            type: 'hash',
            value: 'a1b2c3d4e5f6...',
            severity: 'critical',
            confidence: 0.98,
            source: 'Email Gateway',
            firstSeen: new Date(Date.now() - 1800000),
            lastSeen: new Date(Date.now() - 1800000),
            tags: ['ransomware', 'email'],
          },
        ],
        severity: 'critical',
        status: 'resolved',
      },
    ];

    setThreats(mockThreats);
    setIndicators(mockThreats.flatMap((t) => t.indicators));
  };

  const handleNewThreat = (data: ThreatEvent) => {
    setThreats((prev) => [data, ...prev]);
  };

  const handleThreatUpdate = (data: ThreatEvent) => {
    setThreats((prev) =>
      prev.map((t) => (t.id === data.id ? data : t))
    );
  };

  const filteredThreats = threats.filter((threat) => {
    if (filter === 'all') return true;
    if (filter === 'active') return threat.status === 'active';
    if (filter === 'critical') return threat.severity === 'critical';
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#84cc16';
      default:
        return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#dc2626';
      case 'investigating':
        return '#f59e0b';
      case 'resolved':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="threat-monitor-widget" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '12px',
        background: '#1e293b',
        borderRadius: '6px',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'active', 'critical'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              style={{
                padding: '6px 12px',
                background: filter === f ? '#3b82f6' : 'transparent',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: '#f1f5f9',
                cursor: 'pointer',
                fontSize: '13px',
                textTransform: 'capitalize',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['list', 'timeline', 'heatmap'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v as any)}
              style={{
                padding: '6px 12px',
                background: view === v ? '#3b82f6' : 'transparent',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: '#f1f5f9',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {v === 'list' && '📋'}
              {v === 'timeline' && '📅'}
              {v === 'heatmap' && '🔥'}
            </button>
          ))}
        </div>
      </div>

      {/* Threat Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '16px',
      }}>
        {[
          { label: 'Active Threats', value: threats.filter(t => t.status === 'active').length, color: '#dc2626' },
          { label: 'Critical', value: threats.filter(t => t.severity === 'critical').length, color: '#ea580c' },
          { label: 'Investigating', value: threats.filter(t => t.status === 'investigating').length, color: '#f59e0b' },
          { label: 'Total IOCs', value: indicators.length, color: '#3b82f6' },
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px',
              background: '#1e293b',
              borderRadius: '6px',
              borderLeft: `4px solid ${stat.color}`,
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: '700', color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Threat List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredThreats.map((threat) => (
              <div
                key={threat.id}
                onClick={() => setSelectedThreat(threat)}
                style={{
                  padding: '12px',
                  background: '#1e293b',
                  border: `1px solid ${selectedThreat?.id === threat.id ? '#3b82f6' : '#334155'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#f1f5f9', marginBottom: '4px' }}>
                      {threat.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                      {threat.description}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        background: getSeverityColor(threat.severity),
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                      }}
                    >
                      {threat.severity}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        background: getStatusColor(threat.status),
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                      }}
                    >
                      {threat.status}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#94a3b8' }}>
                  <span>🕐 {new Date(threat.timestamp).toLocaleTimeString()}</span>
                  <span>📊 {threat.indicators.length} IOCs</span>
                  <span>
                    {threat.type === 'detection' && '🔍 Detection'}
                    {threat.type === 'correlation' && '🔗 Correlation'}
                    {threat.type === 'escalation' && '⚠️ Escalation'}
                  </span>
                </div>

                {selectedThreat?.id === threat.id && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #334155' }}>
                    <div style={{ fontWeight: '600', color: '#f1f5f9', marginBottom: '8px' }}>
                      Indicators of Compromise:
                    </div>
                    {threat.indicators.map((ioc) => (
                      <div
                        key={ioc.id}
                        style={{
                          padding: '8px',
                          background: '#0f172a',
                          borderRadius: '4px',
                          marginBottom: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{
                              padding: '2px 6px',
                              background: '#334155',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#cbd5e1',
                              marginRight: '8px',
                            }}>
                              {ioc.type.toUpperCase()}
                            </span>
                            <code style={{ color: '#60a5fa', fontSize: '12px' }}>
                              {ioc.value}
                            </code>
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            Confidence: {(ioc.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                          <span>Source: {ioc.source}</span>
                          <span style={{ margin: '0 8px' }}>•</span>
                          <span>Tags: {ioc.tags.join(', ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {view === 'timeline' && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
            Timeline view - Shows temporal distribution of threats
          </div>
        )}

        {view === 'heatmap' && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
            Heatmap view - Shows geographic or categorical threat distribution
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreatMonitorWidget;
