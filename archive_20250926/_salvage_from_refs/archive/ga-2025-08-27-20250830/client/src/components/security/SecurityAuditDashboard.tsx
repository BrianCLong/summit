import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface SecurityEvent {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'data_export' | 'system' | 'compliance';
  eventType: string;
  userId: string;
  userName: string;
  userRole: string;
  sourceIP: string;
  userAgent: string;
  resource: string;
  action: string;
  outcome: 'success' | 'failure' | 'blocked';
  details: {
    investigationId?: string;
    entityIds?: string[];
    exportFormat?: string;
    failureReason?: string;
    riskScore?: number;
    geolocation?: {
      country: string;
      region: string;
      city: string;
    };
  };
  metadata: {
    sessionId: string;
    requestId: string;
    processingTime: number;
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  };
}

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  framework: 'GDPR' | 'CCPA' | 'SOX' | 'HIPAA' | 'ISO27001' | 'NIST' | 'Custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  conditions: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: any;
  }[];
  actions: {
    type: 'alert' | 'block' | 'require_approval' | 'log' | 'escalate';
    parameters: any;
  }[];
  isActive: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

interface RiskAssessment {
  id: string;
  timestamp: Date;
  userId: string;
  sessionId: string;
  overallRiskScore: number;
  riskFactors: {
    factor: string;
    score: number;
    weight: number;
    description: string;
  }[];
  mitigationActions: string[];
  requiredApprovals: string[];
  automaticBlocks: string[];
}

interface AuditConfiguration {
  retentionPeriodDays: number;
  enableRealTimeAlerts: boolean;
  enableGeoLocationTracking: boolean;
  enableBehavioralAnalysis: boolean;
  dataClassificationRequired: boolean;
  requireApprovalThreshold: number;
  blockActionsThreshold: number;
  alertingChannels: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
    siem: boolean;
  };
  complianceFrameworks: string[];
  sensitiveDataPatterns: string[];
}

interface SecurityAuditDashboardProps {
  investigationId?: string;
  onSecurityAlert?: (event: SecurityEvent) => void;
  onComplianceViolation?: (rule: ComplianceRule, event: SecurityEvent) => void;
  onRiskAssessment?: (assessment: RiskAssessment) => void;
  className?: string;
}

const SecurityAuditDashboard: React.FC<SecurityAuditDashboardProps> = ({
  investigationId,
  onSecurityAlert,
  onComplianceViolation,
  onRiskAssessment,
  className = ''
}) => {
  const [activeView, setActiveView] = useState<'events' | 'compliance' | 'risk' | 'config'>('events');
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [auditConfig, setAuditConfig] = useState<AuditConfiguration | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>('24h');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  const mockSecurityEvents: SecurityEvent[] = useMemo(() => [
    {
      id: 'event-001',
      timestamp: new Date(Date.now() - 300000),
      severity: 'high',
      category: 'data_export',
      eventType: 'BULK_DATA_EXPORT_ATTEMPTED',
      userId: 'user-001',
      userName: 'John Doe',
      userRole: 'analyst',
      sourceIP: '192.168.1.45',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      resource: '/api/export/investigation',
      action: 'POST',
      outcome: 'blocked',
      details: {
        investigationId: 'inv-123',
        entityIds: ['ent-001', 'ent-002', 'ent-003'],
        exportFormat: 'CSV',
        failureReason: 'Risk score exceeded threshold (85/100)',
        riskScore: 85,
        geolocation: {
          country: 'United States',
          region: 'California',
          city: 'San Francisco'
        }
      },
      metadata: {
        sessionId: 'sess-abc123',
        requestId: 'req-xyz789',
        processingTime: 1250,
        dataClassification: 'confidential'
      }
    },
    {
      id: 'event-002',
      timestamp: new Date(Date.now() - 600000),
      severity: 'medium',
      category: 'authentication',
      eventType: 'SUSPICIOUS_LOGIN_PATTERN',
      userId: 'user-002',
      userName: 'Sarah Chen',
      userRole: 'investigator',
      sourceIP: '203.0.113.15',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      resource: '/auth/login',
      action: 'POST',
      outcome: 'success',
      details: {
        riskScore: 65,
        geolocation: {
          country: 'Singapore',
          region: 'Central Singapore',
          city: 'Singapore'
        }
      },
      metadata: {
        sessionId: 'sess-def456',
        requestId: 'req-uvw123',
        processingTime: 890,
        dataClassification: 'internal'
      }
    },
    {
      id: 'event-003',
      timestamp: new Date(Date.now() - 900000),
      severity: 'critical',
      category: 'authorization',
      eventType: 'PRIVILEGE_ESCALATION_ATTEMPT',
      userId: 'user-003',
      userName: 'Alex Rodriguez',
      userRole: 'viewer',
      sourceIP: '198.51.100.23',
      userAgent: 'curl/7.68.0',
      resource: '/api/admin/users',
      action: 'GET',
      outcome: 'blocked',
      details: {
        failureReason: 'Insufficient privileges for admin endpoint',
        riskScore: 95
      },
      metadata: {
        sessionId: 'sess-ghi789',
        requestId: 'req-rst456',
        processingTime: 125,
        dataClassification: 'restricted'
      }
    },
    {
      id: 'event-004',
      timestamp: new Date(Date.now() - 1200000),
      severity: 'low',
      category: 'data_access',
      eventType: 'LARGE_DATASET_QUERY',
      userId: 'user-004',
      userName: 'Michael Zhang',
      userRole: 'analyst',
      sourceIP: '10.0.0.142',
      userAgent: 'IntelGraph Desktop/2.3.1',
      resource: '/api/graph/query',
      action: 'POST',
      outcome: 'success',
      details: {
        investigationId: 'inv-456',
        riskScore: 25
      },
      metadata: {
        sessionId: 'sess-jkl012',
        requestId: 'req-opq789',
        processingTime: 5420,
        dataClassification: 'internal'
      }
    }
  ], []);

  const mockComplianceRules: ComplianceRule[] = useMemo(() => [
    {
      id: 'rule-001',
      name: 'GDPR Data Export Approval',
      description: 'All exports containing PII must be approved by data protection officer',
      framework: 'GDPR',
      severity: 'high',
      category: 'data_export',
      conditions: [
        { field: 'category', operator: 'equals', value: 'data_export' },
        { field: 'details.dataClassification', operator: 'in', value: ['confidential', 'restricted'] }
      ],
      actions: [
        { type: 'require_approval', parameters: { approverRole: 'dpo', timeoutMinutes: 60 } },
        { type: 'log', parameters: { level: 'info' } }
      ],
      isActive: true,
      lastTriggered: new Date(Date.now() - 300000),
      triggerCount: 15
    },
    {
      id: 'rule-002',
      name: 'SOX Financial Data Access',
      description: 'Access to financial investigation data requires dual approval',
      framework: 'SOX',
      severity: 'critical',
      category: 'data_access',
      conditions: [
        { field: 'resource', operator: 'contains', value: 'financial' },
        { field: 'details.dataClassification', operator: 'equals', value: 'restricted' }
      ],
      actions: [
        { type: 'require_approval', parameters: { approverRole: 'financial_controller', count: 2 } },
        { type: 'alert', parameters: { channel: 'email', recipients: ['compliance@company.com'] } }
      ],
      isActive: true,
      triggerCount: 3
    },
    {
      id: 'rule-003',
      name: 'High Risk Score Block',
      description: 'Automatically block actions with risk score above 80',
      framework: 'Custom',
      severity: 'high',
      category: 'system',
      conditions: [
        { field: 'details.riskScore', operator: 'greater_than', value: 80 }
      ],
      actions: [
        { type: 'block', parameters: { reason: 'Risk score exceeded threshold' } },
        { type: 'escalate', parameters: { to: 'security_team' } }
      ],
      isActive: true,
      lastTriggered: new Date(Date.now() - 300000),
      triggerCount: 8
    }
  ], []);

  const mockAuditConfig: AuditConfiguration = useMemo(() => ({
    retentionPeriodDays: 2555, // 7 years for compliance
    enableRealTimeAlerts: true,
    enableGeoLocationTracking: true,
    enableBehavioralAnalysis: true,
    dataClassificationRequired: true,
    requireApprovalThreshold: 70,
    blockActionsThreshold: 80,
    alertingChannels: {
      email: true,
      slack: true,
      webhook: false,
      siem: true
    },
    complianceFrameworks: ['GDPR', 'SOX', 'ISO27001'],
    sensitiveDataPatterns: ['SSN', 'Credit Card', 'Email', 'Phone', 'IP Address']
  }), []);

  // Initialize data
  useEffect(() => {
    setSecurityEvents(mockSecurityEvents);
    setComplianceRules(mockComplianceRules);
    setAuditConfig(mockAuditConfig);

    // Simulate real-time events
    const interval = setInterval(() => {
      const eventTypes = [
        'DATA_ACCESS_ATTEMPT', 'EXPORT_INITIATED', 'LOGIN_FROM_NEW_LOCATION', 
        'BULK_QUERY_EXECUTED', 'PERMISSION_DENIED'
      ];
      
      const newEvent: SecurityEvent = {
        id: `event-${Date.now()}`,
        timestamp: new Date(),
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
        category: ['authentication', 'authorization', 'data_access'][Math.floor(Math.random() * 3)] as any,
        eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        userId: `user-${Math.floor(Math.random() * 10)}`,
        userName: 'Live User',
        userRole: 'analyst',
        sourceIP: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'IntelGraph Web Client',
        resource: '/api/live/action',
        action: 'GET',
        outcome: Math.random() > 0.8 ? 'failure' : 'success',
        details: {
          riskScore: Math.floor(Math.random() * 100)
        },
        metadata: {
          sessionId: `sess-live-${Date.now()}`,
          requestId: `req-live-${Date.now()}`,
          processingTime: Math.floor(Math.random() * 2000),
          dataClassification: 'internal'
        }
      };
      
      setSecurityEvents(prev => [newEvent, ...prev.slice(0, 99)]);
    }, 8000);

    return () => clearInterval(interval);
  }, [mockSecurityEvents, mockComplianceRules, mockAuditConfig]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let filtered = securityEvents;
    
    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.resource.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (severityFilter !== 'all') {
      filtered = filtered.filter(event => event.severity === severityFilter);
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(event => event.category === categoryFilter);
    }
    
    const timeRange = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000
    }[timeRangeFilter] || 86400000;
    
    filtered = filtered.filter(event => 
      Date.now() - event.timestamp.getTime() <= timeRange
    );
    
    return filtered;
  }, [securityEvents, searchQuery, severityFilter, categoryFilter, timeRangeFilter]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'authentication': return '🔐';
      case 'authorization': return '🛡️';
      case 'data_access': return '📊';
      case 'data_export': return '📤';
      case 'system': return '⚙️';
      case 'compliance': return '📋';
      default: return '📝';
    }
  };

  const handleEventSelect = useCallback((event: SecurityEvent) => {
    setSelectedEvent(event);
    onSecurityAlert?.(event);
  }, [onSecurityAlert]);

  return (
    <div className={`security-audit-dashboard ${className}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '16px' }}>
          🔒 Security & Audit Dashboard
        </h3>

        {/* View Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--hairline)', marginBottom: '16px' }}>
          {[
            { key: 'events', label: '🚨 Security Events', count: filteredEvents.length },
            { key: 'compliance', label: '📋 Compliance Rules', count: complianceRules.length },
            { key: 'risk', label: '⚖️ Risk Assessment', count: riskAssessments.length },
            { key: 'config', label: '⚙️ Configuration', count: 0 }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              style={{
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeView === tab.key ? '2px solid #1a73e8' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeView === tab.key ? '600' : '400',
                color: activeView === tab.key ? '#1a73e8' : '#666'
              }}
            >
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Filters */}
        {activeView === 'events' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search events, users, or resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                flex: '1 1 300px',
                fontSize: '14px'
              }}
            />
            
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{ padding: '8px', border: '1px solid var(--hairline)', borderRadius: '4px', fontSize: '14px' }}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '8px', border: '1px solid var(--hairline)', borderRadius: '4px', fontSize: '14px' }}
            >
              <option value="all">All Categories</option>
              <option value="authentication">Authentication</option>
              <option value="authorization">Authorization</option>
              <option value="data_access">Data Access</option>
              <option value="data_export">Data Export</option>
              <option value="system">System</option>
            </select>

            <select
              value={timeRangeFilter}
              onChange={(e) => setTimeRangeFilter(e.target.value)}
              style={{ padding: '8px', border: '1px solid var(--hairline)', borderRadius: '4px', fontSize: '14px' }}
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeView === 'events' && (
          <div style={{ height: '100%', display: 'grid', gridTemplateColumns: selectedEvent ? '1fr 1fr' : '1fr', gap: '16px' }}>
            {/* Events List */}
            <div style={{ overflow: 'auto', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--hairline)', backgroundColor: '#f8f9fa' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                  Security Events ({filteredEvents.length})
                </h4>
              </div>
              
              <div>
                {filteredEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => handleEventSelect(event)}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      backgroundColor: selectedEvent?.id === event.id ? '#e3f2fd' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedEvent?.id !== event.id) {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedEvent?.id !== event.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{getSeverityIcon(event.severity)}</span>
                        <span style={{ fontSize: '16px' }}>{getCategoryIcon(event.category)}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600' }}>
                            {event.eventType.replace(/_/g, ' ')}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {event.userName} • {event.sourceIP}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '12px',
                            backgroundColor: getSeverityColor(event.severity),
                            color: 'white',
                            fontWeight: '600'
                          }}
                        >
                          {event.severity.toUpperCase()}
                        </span>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                          {event.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      <strong>Resource:</strong> {event.resource}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '12px',
                            backgroundColor: event.outcome === 'success' ? '#d4edda' : 
                                            event.outcome === 'blocked' ? '#f8d7da' : '#fff3cd',
                            color: event.outcome === 'success' ? '#155724' : 
                                   event.outcome === 'blocked' ? '#721c24' : '#856404',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}
                        >
                          {event.outcome.toUpperCase()}
                        </span>
                      </div>
                      
                      {event.details.riskScore && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Risk: {event.details.riskScore}/100
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Details */}
            {selectedEvent && (
              <div style={{ overflow: 'auto', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--hairline)', backgroundColor: '#f8f9fa' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                    Event Details
                  </h4>
                </div>
                
                <div style={{ padding: '16px' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{getSeverityIcon(selectedEvent.severity)}</span>
                      <span style={{ fontSize: '20px' }}>{getCategoryIcon(selectedEvent.category)}</span>
                      <div>
                        <h5 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                          {selectedEvent.eventType.replace(/_/g, ' ')}
                        </h5>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {selectedEvent.timestamp.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>User Information</h6>
                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                      <div><strong>Name:</strong> {selectedEvent.userName}</div>
                      <div><strong>Role:</strong> {selectedEvent.userRole}</div>
                      <div><strong>User ID:</strong> {selectedEvent.userId}</div>
                      <div><strong>Source IP:</strong> {selectedEvent.sourceIP}</div>
                      {selectedEvent.details.geolocation && (
                        <div><strong>Location:</strong> {selectedEvent.details.geolocation.city}, {selectedEvent.details.geolocation.country}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Request Details</h6>
                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                      <div><strong>Resource:</strong> {selectedEvent.resource}</div>
                      <div><strong>Action:</strong> {selectedEvent.action}</div>
                      <div><strong>Outcome:</strong> 
                        <span style={{
                          marginLeft: '4px',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          backgroundColor: selectedEvent.outcome === 'success' ? '#d4edda' : 
                                          selectedEvent.outcome === 'blocked' ? '#f8d7da' : '#fff3cd',
                          color: selectedEvent.outcome === 'success' ? '#155724' : 
                                 selectedEvent.outcome === 'blocked' ? '#721c24' : '#856404',
                          fontSize: '11px',
                          fontWeight: '500'
                        }}>
                          {selectedEvent.outcome.toUpperCase()}
                        </span>
                      </div>
                      <div><strong>Processing Time:</strong> {selectedEvent.metadata.processingTime}ms</div>
                    </div>
                  </div>

                  {selectedEvent.details.riskScore && (
                    <div style={{ marginBottom: '24px' }}>
                      <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Risk Assessment</h6>
                      <div style={{ fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span><strong>Risk Score:</strong> {selectedEvent.details.riskScore}/100</span>
                          <div style={{ 
                            flex: 1,
                            height: '8px', 
                            backgroundColor: '#e9ecef', 
                            borderRadius: '4px' 
                          }}>
                            <div 
                              style={{ 
                                width: `${selectedEvent.details.riskScore}%`, 
                                height: '100%', 
                                backgroundColor: selectedEvent.details.riskScore > 80 ? '#dc3545' :
                                                selectedEvent.details.riskScore > 60 ? '#fd7e14' :
                                                selectedEvent.details.riskScore > 40 ? '#ffc107' : '#28a745',
                                borderRadius: '4px',
                                transition: 'width 0.3s ease'
                              }} 
                            />
                          </div>
                        </div>
                        {selectedEvent.details.failureReason && (
                          <div><strong>Failure Reason:</strong> {selectedEvent.details.failureReason}</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '24px' }}>
                    <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Metadata</h6>
                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                      <div><strong>Session ID:</strong> {selectedEvent.metadata.sessionId}</div>
                      <div><strong>Request ID:</strong> {selectedEvent.metadata.requestId}</div>
                      <div><strong>Data Classification:</strong> 
                        <span style={{
                          marginLeft: '4px',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          backgroundColor: selectedEvent.metadata.dataClassification === 'restricted' ? '#dc3545' :
                                          selectedEvent.metadata.dataClassification === 'confidential' ? '#fd7e14' :
                                          selectedEvent.metadata.dataClassification === 'internal' ? '#ffc107' : '#28a745',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: '500'
                        }}>
                          {selectedEvent.metadata.dataClassification.toUpperCase()}
                        </span>
                      </div>
                      <div><strong>User Agent:</strong> {selectedEvent.userAgent}</div>
                    </div>
                  </div>

                  {selectedEvent.details.investigationId && (
                    <div>
                      <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Related Resources</h6>
                      <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                        <div><strong>Investigation:</strong> {selectedEvent.details.investigationId}</div>
                        {selectedEvent.details.entityIds && (
                          <div><strong>Entities:</strong> {selectedEvent.details.entityIds.join(', ')}</div>
                        )}
                        {selectedEvent.details.exportFormat && (
                          <div><strong>Export Format:</strong> {selectedEvent.details.exportFormat}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'compliance' && (
          <div style={{ padding: '16px', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Compliance Rules & Policies
            </h4>
            
            {complianceRules.map(rule => (
              <div
                key={rule.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
                      {rule.name}
                    </h5>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {rule.framework} • {rule.category}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '12px',
                        backgroundColor: getSeverityColor(rule.severity),
                        color: 'white',
                        fontWeight: '600'
                      }}
                    >
                      {rule.severity.toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '12px',
                        backgroundColor: rule.isActive ? '#28a745' : '#6c757d',
                        color: 'white',
                        fontWeight: '600'
                      }}
                    >
                      {rule.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
                
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px', lineHeight: '1.4' }}>
                  {rule.description}
                </p>
                
                <div style={{ fontSize: '12px' }}>
                  <div><strong>Trigger Count:</strong> {rule.triggerCount}</div>
                  {rule.lastTriggered && (
                    <div><strong>Last Triggered:</strong> {rule.lastTriggered.toLocaleString()}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeView === 'risk' && (
          <div style={{ padding: '16px', border: '1px solid var(--hairline)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ padding: '40px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                🔮 Risk Assessment Engine
              </h4>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
                AI-powered risk assessment and behavioral analysis for security events.
              </p>
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '13px', color: '#666' }}>
                🚧 Risk assessment dashboard coming soon - will include:
                <ul style={{ textAlign: 'left', marginTop: '12px', marginLeft: '20px' }}>
                  <li>Real-time risk scoring</li>
                  <li>Behavioral anomaly detection</li>
                  <li>Risk trend analysis</li>
                  <li>Automated mitigation recommendations</li>
                  <li>Compliance risk assessment</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeView === 'config' && auditConfig && (
          <div style={{ padding: '16px', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Audit Configuration
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>General Settings</h5>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <div><strong>Retention Period:</strong> {auditConfig.retentionPeriodDays} days</div>
                  <div><strong>Real-time Alerts:</strong> {auditConfig.enableRealTimeAlerts ? '✅ Enabled' : '❌ Disabled'}</div>
                  <div><strong>Geo-location Tracking:</strong> {auditConfig.enableGeoLocationTracking ? '✅ Enabled' : '❌ Disabled'}</div>
                  <div><strong>Behavioral Analysis:</strong> {auditConfig.enableBehavioralAnalysis ? '✅ Enabled' : '❌ Disabled'}</div>
                </div>
              </div>
              
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Risk Thresholds</h5>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <div><strong>Approval Threshold:</strong> {auditConfig.requireApprovalThreshold}/100</div>
                  <div><strong>Block Threshold:</strong> {auditConfig.blockActionsThreshold}/100</div>
                  <div><strong>Data Classification Required:</strong> {auditConfig.dataClassificationRequired ? '✅ Yes' : '❌ No'}</div>
                </div>
              </div>
              
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Alerting Channels</h5>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <div><strong>Email:</strong> {auditConfig.alertingChannels.email ? '✅ Enabled' : '❌ Disabled'}</div>
                  <div><strong>Slack:</strong> {auditConfig.alertingChannels.slack ? '✅ Enabled' : '❌ Disabled'}</div>
                  <div><strong>Webhook:</strong> {auditConfig.alertingChannels.webhook ? '✅ Enabled' : '❌ Disabled'}</div>
                  <div><strong>SIEM:</strong> {auditConfig.alertingChannels.siem ? '✅ Enabled' : '❌ Disabled'}</div>
                </div>
              </div>
              
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Compliance Frameworks</h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {auditConfig.complianceFrameworks.map(framework => (
                    <span
                      key={framework}
                      style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '12px',
                        color: '#495057'
                      }}
                    >
                      {framework}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityAuditDashboard;