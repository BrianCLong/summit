import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'map' | 'timeline' | 'network' | 'list' | 'gauge';
  size: 'small' | 'medium' | 'large' | 'xlarge';
  position: { row: number; col: number; width: number; height: number };
  data: any;
  configuration: {
    refreshInterval?: number;
    thresholds?: { warning: number; critical: number };
    filters?: any[];
    aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
    timeRange?: string;
  };
  isVisible: boolean;
  isLoading: boolean;
  lastUpdated: Date;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'executive' | 'operational' | 'compliance' | 'investigation' | 'security';
  audience: 'board' | 'management' | 'analysts' | 'compliance' | 'investigators';
  frequency: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'ondemand';
  format: 'pdf' | 'excel' | 'powerpoint' | 'html' | 'json';
  sections: {
    id: string;
    title: string;
    type: 'executive_summary' | 'metrics' | 'charts' | 'tables' | 'narrative' | 'appendix';
    content: any;
    pageBreak: boolean;
  }[];
  parameters: {
    name: string;
    type: 'date' | 'select' | 'text' | 'number' | 'boolean';
    required: boolean;
    defaultValue?: any;
    options?: string[];
  }[];
  schedule?: {
    enabled: boolean;
    time: string;
    timezone: string;
    recipients: string[];
  };
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  lastGenerated?: Date;
}

interface DashboardMetrics {
  investigations: {
    active: number;
    completed: number;
    overdue: number;
    averageResolutionTime: number;
    successRate: number;
  };
  threats: {
    detected: number;
    mitigated: number;
    critical: number;
    trendsLast30Days: number[];
  };
  compliance: {
    adherenceRate: number;
    violations: number;
    pendingReviews: number;
    auditReadiness: number;
  };
  performance: {
    systemUptime: number;
    processingSpeed: number;
    dataQuality: number;
    userSatisfaction: number;
  };
  financial: {
    costSavings: number;
    roi: number;
    budget: {
      allocated: number;
      used: number;
      remaining: number;
    };
  };
}

interface EnterpriseDashboardProps {
  organizationId?: string;
  userRole: 'executive' | 'manager' | 'analyst' | 'investigator' | 'compliance';
  customizations?: {
    branding?: {
      logo?: string;
      colors?: {
        primary: string;
        secondary: string;
        accent: string;
      };
    };
    layout?: 'grid' | 'flow' | 'tabs';
  };
  onWidgetInteraction?: (widgetId: string, action: string, data?: any) => void;
  onReportGenerate?: (templateId: string, parameters: any) => void;
  onReportSchedule?: (templateId: string, schedule: any) => void;
  className?: string;
}

const EnterpriseDashboard: React.FC<EnterpriseDashboardProps> = ({
  organizationId,
  userRole,
  customizations,
  onWidgetInteraction,
  onReportGenerate,
  onReportSchedule,
  className = ''
}) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'reports' | 'analytics' | 'settings'>('dashboard');
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('7d');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportTemplate | null>(null);
  const [reportParameters, setReportParameters] = useState<{ [key: string]: any }>({});
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Mock dashboard metrics
  const mockMetrics: DashboardMetrics = useMemo(() => ({
    investigations: {
      active: 47,
      completed: 156,
      overdue: 8,
      averageResolutionTime: 12.5,
      successRate: 94.2
    },
    threats: {
      detected: 234,
      mitigated: 189,
      critical: 12,
      trendsLast30Days: Array.from({ length: 30 }, () => Math.floor(Math.random() * 50) + 10)
    },
    compliance: {
      adherenceRate: 97.8,
      violations: 3,
      pendingReviews: 15,
      auditReadiness: 92.5
    },
    performance: {
      systemUptime: 99.97,
      processingSpeed: 1.2,
      dataQuality: 96.4,
      userSatisfaction: 4.7
    },
    financial: {
      costSavings: 2350000,
      roi: 340,
      budget: {
        allocated: 1200000,
        used: 890000,
        remaining: 310000
      }
    }
  }), []);

  // Mock widgets
  const mockWidgets: DashboardWidget[] = useMemo(() => [
    {
      id: 'widget-001',
      title: 'Active Investigations',
      type: 'metric',
      size: 'small',
      position: { row: 0, col: 0, width: 1, height: 1 },
      data: { value: mockMetrics.investigations.active, trend: 12, unit: 'cases' },
      configuration: { refreshInterval: 300000, thresholds: { warning: 40, critical: 60 } },
      isVisible: true,
      isLoading: false,
      lastUpdated: new Date()
    },
    {
      id: 'widget-002',
      title: 'Threat Detection Trends',
      type: 'chart',
      size: 'medium',
      position: { row: 0, col: 1, width: 2, height: 1 },
      data: { series: mockMetrics.threats.trendsLast30Days, labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`) },
      configuration: { refreshInterval: 600000, timeRange: '30d' },
      isVisible: true,
      isLoading: false,
      lastUpdated: new Date()
    },
    {
      id: 'widget-003',
      title: 'Compliance Status',
      type: 'gauge',
      size: 'medium',
      position: { row: 1, col: 0, width: 1, height: 1 },
      data: { value: mockMetrics.compliance.adherenceRate, max: 100, unit: '%' },
      configuration: { thresholds: { warning: 85, critical: 70 } },
      isVisible: true,
      isLoading: false,
      lastUpdated: new Date()
    },
    {
      id: 'widget-004',
      title: 'System Performance',
      type: 'metric',
      size: 'small',
      position: { row: 1, col: 1, width: 1, height: 1 },
      data: { value: mockMetrics.performance.systemUptime, unit: '%', trend: 0.1 },
      configuration: { refreshInterval: 60000, thresholds: { warning: 95, critical: 90 } },
      isVisible: true,
      isLoading: false,
      lastUpdated: new Date()
    },
    {
      id: 'widget-005',
      title: 'Recent Investigations',
      type: 'table',
      size: 'large',
      position: { row: 2, col: 0, width: 3, height: 2 },
      data: {
        headers: ['ID', 'Title', 'Priority', 'Status', 'Assigned', 'Updated'],
        rows: [
          ['INV-2024-001', 'Financial Fraud Investigation', 'High', 'Active', 'J. Smith', '2 hours ago'],
          ['INV-2024-002', 'Data Breach Analysis', 'Critical', 'In Review', 'M. Johnson', '4 hours ago'],
          ['INV-2024-003', 'Compliance Violation', 'Medium', 'Pending', 'S. Davis', '1 day ago'],
          ['INV-2024-004', 'Threat Intelligence Analysis', 'High', 'Active', 'R. Wilson', '3 hours ago'],
          ['INV-2024-005', 'OSINT Investigation', 'Low', 'Completed', 'A. Brown', '2 days ago']
        ]
      },
      configuration: { refreshInterval: 900000 },
      isVisible: true,
      isLoading: false,
      lastUpdated: new Date()
    }
  ], [mockMetrics]);

  // Mock report templates
  const mockReportTemplates: ReportTemplate[] = useMemo(() => [
    {
      id: 'template-001',
      name: 'Executive Security Dashboard',
      description: 'High-level security metrics and KPIs for executive leadership',
      category: 'executive',
      audience: 'board',
      frequency: 'weekly',
      format: 'pdf',
      sections: [
        {
          id: 'section-001',
          title: 'Executive Summary',
          type: 'executive_summary',
          content: 'Weekly security posture and investigation summary',
          pageBreak: false
        },
        {
          id: 'section-002',
          title: 'Key Performance Indicators',
          type: 'metrics',
          content: 'Critical security and investigation metrics',
          pageBreak: false
        },
        {
          id: 'section-003',
          title: 'Threat Landscape',
          type: 'charts',
          content: 'Threat detection trends and analysis',
          pageBreak: true
        }
      ],
      parameters: [
        { name: 'report_period', type: 'date', required: true, defaultValue: new Date() },
        { name: 'include_financial', type: 'boolean', required: false, defaultValue: true }
      ],
      schedule: {
        enabled: true,
        time: '08:00',
        timezone: 'UTC',
        recipients: ['ceo@company.com', 'ciso@company.com']
      },
      isActive: true,
      createdBy: 'admin',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastGenerated: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: 'template-002',
      name: 'Investigation Status Report',
      description: 'Detailed report on active and completed investigations',
      category: 'operational',
      audience: 'management',
      frequency: 'daily',
      format: 'excel',
      sections: [
        {
          id: 'section-004',
          title: 'Investigation Overview',
          type: 'metrics',
          content: 'Summary of investigation activities',
          pageBreak: false
        },
        {
          id: 'section-005',
          title: 'Active Cases',
          type: 'tables',
          content: 'Detailed listing of active investigations',
          pageBreak: false
        },
        {
          id: 'section-006',
          title: 'Completed Cases',
          type: 'tables',
          content: 'Summary of recently completed investigations',
          pageBreak: false
        }
      ],
      parameters: [
        { name: 'priority_filter', type: 'select', required: false, options: ['All', 'Critical', 'High', 'Medium', 'Low'] },
        { name: 'team_filter', type: 'select', required: false, options: ['All Teams', 'Cyber', 'Financial', 'Compliance'] }
      ],
      schedule: {
        enabled: true,
        time: '07:00',
        timezone: 'UTC',
        recipients: ['operations@company.com', 'investigations@company.com']
      },
      isActive: true,
      createdBy: 'ops_manager',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastGenerated: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: 'template-003',
      name: 'Compliance Audit Report',
      description: 'Comprehensive compliance status and audit readiness report',
      category: 'compliance',
      audience: 'compliance',
      frequency: 'monthly',
      format: 'pdf',
      sections: [
        {
          id: 'section-007',
          title: 'Compliance Overview',
          type: 'executive_summary',
          content: 'Monthly compliance status summary',
          pageBreak: false
        },
        {
          id: 'section-008',
          title: 'Regulatory Adherence',
          type: 'metrics',
          content: 'Compliance metrics by regulation',
          pageBreak: false
        },
        {
          id: 'section-009',
          title: 'Violations and Remediation',
          type: 'tables',
          content: 'Detailed violation tracking and remediation status',
          pageBreak: true
        },
        {
          id: 'section-010',
          title: 'Audit Trail',
          type: 'appendix',
          content: 'Supporting documentation and audit trails',
          pageBreak: true
        }
      ],
      parameters: [
        { name: 'regulations', type: 'select', required: false, options: ['All', 'GDPR', 'SOX', 'HIPAA', 'PCI-DSS'] },
        { name: 'include_remediation', type: 'boolean', required: false, defaultValue: true }
      ],
      isActive: true,
      createdBy: 'compliance_officer',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      lastGenerated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
  ], []);

  // Initialize data
  useEffect(() => {
    setMetrics(mockMetrics);
    setWidgets(mockWidgets);
    setReportTemplates(mockReportTemplates);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setWidgets(prev => prev.map(widget => ({
        ...widget,
        lastUpdated: new Date(),
        data: {
          ...widget.data,
          value: widget.type === 'metric' ? 
            Math.max(0, widget.data.value + Math.floor((Math.random() - 0.5) * 10)) :
            widget.data.value
        }
      })));
    }, 60000);

    return () => clearInterval(interval);
  }, [mockMetrics, mockWidgets, mockReportTemplates]);

  const getMetricTrendIcon = (trend: number) => {
    if (trend > 0) return '📈';
    if (trend < 0) return '📉';
    return '➡️';
  };

  const getMetricTrendColor = (trend: number) => {
    if (trend > 0) return '#28a745';
    if (trend < 0) return '#dc3545';
    return '#6c757d';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return '#17a2b8';
      case 'completed': return '#28a745';
      case 'in review': return '#ffc107';
      case 'pending': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleReportGenerate = useCallback(async (template: ReportTemplate) => {
    setIsGeneratingReport(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    onReportGenerate?.(template.id, reportParameters);
    setIsGeneratingReport(false);
    setSelectedReport(null);
  }, [reportParameters, onReportGenerate]);

  // Role-specific widgets filtering
  const visibleWidgets = useMemo(() => {
    return widgets.filter(widget => {
      if (userRole === 'executive') {
        return ['widget-001', 'widget-002', 'widget-003', 'widget-004'].includes(widget.id);
      }
      return widget.isVisible;
    });
  }, [widgets, userRole]);

  return (
    <div className={`enterprise-dashboard ${className}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: '0 0 4px 0' }}>
              📊 Enterprise Dashboard
            </h3>
            <div style={{ fontSize: '13px', color: '#666' }}>
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)} View • 
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              style={{ padding: '6px', fontSize: '13px', border: '1px solid var(--hairline)', borderRadius: '4px' }}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            
            {userRole !== 'analyst' && (
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  backgroundColor: isEditMode ? '#dc3545' : '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {isEditMode ? 'Exit Edit' : 'Customize'}
              </button>
            )}
          </div>
        </div>

        {/* View Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--hairline)' }}>
          {[
            { key: 'dashboard', label: '📊 Dashboard' },
            { key: 'reports', label: '📋 Reports' },
            { key: 'analytics', label: '📈 Analytics' },
            { key: 'settings', label: '⚙️ Settings' }
          ].filter(tab => userRole !== 'analyst' || tab.key !== 'settings').map(tab => (
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
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeView === 'dashboard' && (
          <div>
            {/* Executive Summary Cards */}
            {userRole === 'executive' && metrics && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '20px', border: '1px solid var(--hairline)', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: '#1a73e8', marginBottom: '8px' }}>
                    {formatCurrency(metrics.financial.costSavings)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Annual Cost Savings</div>
                  <div style={{ fontSize: '12px', color: '#28a745' }}>
                    ROI: {metrics.financial.roi}%
                  </div>
                </div>
                
                <div style={{ padding: '20px', border: '1px solid var(--hairline)', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: '#28a745', marginBottom: '8px' }}>
                    {metrics.investigations.successRate}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Investigation Success Rate</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {metrics.investigations.completed} completed cases
                  </div>
                </div>
                
                <div style={{ padding: '20px', border: '1px solid var(--hairline)', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: '#ffc107', marginBottom: '8px' }}>
                    {metrics.compliance.adherenceRate}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Compliance Adherence</div>
                  <div style={{ fontSize: '12px', color: metrics.compliance.violations > 0 ? '#dc3545' : '#28a745' }}>
                    {metrics.compliance.violations} active violation{metrics.compliance.violations !== 1 ? 's' : ''}
                  </div>
                </div>
                
                <div style={{ padding: '20px', border: '1px solid var(--hairline)', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: '#17a2b8', marginBottom: '8px' }}>
                    {metrics.threats.detected}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Threats Detected</div>
                  <div style={{ fontSize: '12px', color: metrics.threats.critical > 0 ? '#dc3545' : '#28a745' }}>
                    {metrics.threats.critical} critical threat{metrics.threats.critical !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}

            {/* Widget Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '16px',
              opacity: isEditMode ? 0.8 : 1
            }}>
              {visibleWidgets.map(widget => (
                <div
                  key={widget.id}
                  style={{
                    border: isEditMode ? '2px dashed #1a73e8' : '1px solid var(--hairline)',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    position: 'relative',
                    minHeight: widget.size === 'small' ? '120px' : 
                              widget.size === 'medium' ? '200px' : 
                              widget.size === 'large' ? '300px' : '400px'
                  }}
                >
                  {/* Widget Header */}
                  <div style={{ 
                    padding: '12px 16px', 
                    borderBottom: '1px solid var(--hairline)', 
                    backgroundColor: '#f8f9fa',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                      {widget.title}
                    </h5>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {widget.isLoading && <span style={{ fontSize: '12px', color: '#666' }}>⏳</span>}
                      <span style={{ fontSize: '11px', color: '#999' }}>
                        {widget.lastUpdated.toLocaleTimeString()}
                      </span>
                      {isEditMode && (
                        <button
                          style={{
                            padding: '2px 4px',
                            fontSize: '10px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '2px',
                            cursor: 'pointer'
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Widget Content */}
                  <div style={{ padding: '16px' }}>
                    {widget.type === 'metric' && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                          fontSize: '28px', 
                          fontWeight: '600', 
                          color: widget.data.value > (widget.configuration.thresholds?.warning || 0) ? '#dc3545' : '#28a745',
                          marginBottom: '8px' 
                        }}>
                          {widget.data.value}
                          {widget.data.unit && <span style={{ fontSize: '16px', marginLeft: '4px' }}>{widget.data.unit}</span>}
                        </div>
                        {widget.data.trend !== undefined && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: getMetricTrendColor(widget.data.trend),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}>
                            <span>{getMetricTrendIcon(widget.data.trend)}</span>
                            <span>{Math.abs(widget.data.trend)}%</span>
                          </div>
                        )}
                      </div>
                    )}

                    {widget.type === 'gauge' && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                          width: '100px', 
                          height: '100px', 
                          borderRadius: '50%',
                          background: `conic-gradient(#1a73e8 ${widget.data.value * 3.6}deg, #e9ecef 0deg)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 12px',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: '70px',
                            height: '70px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: '600'
                          }}>
                            {widget.data.value}{widget.data.unit}
                          </div>
                        </div>
                      </div>
                    )}

                    {widget.type === 'chart' && (
                      <div style={{ height: '120px', display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: '2px' }}>
                        {widget.data.series.slice(-20).map((value: number, index: number) => (
                          <div
                            key={index}
                            style={{
                              flex: 1,
                              height: `${(value / Math.max(...widget.data.series)) * 100}%`,
                              backgroundColor: '#1a73e8',
                              borderRadius: '2px 2px 0 0',
                              minHeight: '4px'
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {widget.type === 'table' && (
                      <div style={{ overflow: 'auto', maxHeight: '250px' }}>
                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              {widget.data.headers.map((header: string, index: number) => (
                                <th key={index} style={{ 
                                  padding: '4px 6px', 
                                  textAlign: 'left', 
                                  borderBottom: '1px solid #e9ecef',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: '#666'
                                }}>
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {widget.data.rows.slice(0, 5).map((row: any[], rowIndex: number) => (
                              <tr key={rowIndex}>
                                {row.map((cell: any, cellIndex: number) => (
                                  <td key={cellIndex} style={{ 
                                    padding: '4px 6px', 
                                    borderBottom: '1px solid #f8f9fa',
                                    color: cellIndex === 2 ? getPriorityColor(cell) : 
                                           cellIndex === 3 ? getStatusColor(cell) : 'inherit',
                                    fontWeight: cellIndex === 2 || cellIndex === 3 ? '500' : 'normal'
                                  }}>
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'reports' && (
          <div>
            {/* Report Templates List */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                Report Templates
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px' }}>
                {reportTemplates
                  .filter(template => 
                    userRole === 'executive' ? ['executive', 'compliance'].includes(template.category) :
                    userRole === 'compliance' ? ['compliance', 'operational'].includes(template.category) :
                    true
                  )
                  .map(template => (
                  <div
                    key={template.id}
                    style={{
                      border: '1px solid var(--hairline)',
                      borderRadius: '8px',
                      padding: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
                          {template.name}
                        </h5>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {template.category} • {template.audience} • {template.frequency}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '12px',
                            backgroundColor: template.isActive ? '#28a745' : '#6c757d',
                            color: 'white',
                            fontWeight: '600'
                          }}
                        >
                          {template.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                    </div>
                    
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px', lineHeight: '1.4' }}>
                      {template.description}
                    </p>
                    
                    <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                      <div><strong>Format:</strong> {template.format.toUpperCase()}</div>
                      <div><strong>Sections:</strong> {template.sections.length}</div>
                      {template.lastGenerated && (
                        <div><strong>Last Generated:</strong> {template.lastGenerated.toLocaleDateString()}</div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedReport(template)}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          fontSize: '12px',
                          backgroundColor: '#1a73e8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        📄 Generate
                      </button>
                      
                      {template.schedule?.enabled && (
                        <button
                          onClick={() => onReportSchedule?.(template.id, template.schedule)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          📅
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Report Generation Modal */}
            {selectedReport && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '24px',
                  maxWidth: '500px',
                  width: '90%',
                  maxHeight: '80%',
                  overflow: 'auto'
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                    Generate Report: {selectedReport.name}
                  </h4>
                  
                  <div style={{ marginBottom: '20px' }}>
                    {selectedReport.parameters.map(param => (
                      <div key={param.name} style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                          {param.name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          {param.required && <span style={{ color: '#dc3545' }}>*</span>}
                        </label>
                        
                        {param.type === 'select' ? (
                          <select
                            value={reportParameters[param.name] || param.defaultValue || ''}
                            onChange={(e) => setReportParameters(prev => ({ ...prev, [param.name]: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid var(--hairline)',
                              borderRadius: '4px',
                              fontSize: '13px'
                            }}
                          >
                            {param.options?.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : param.type === 'boolean' ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={reportParameters[param.name] || param.defaultValue || false}
                              onChange={(e) => setReportParameters(prev => ({ ...prev, [param.name]: e.target.checked }))}
                            />
                            <span style={{ fontSize: '13px' }}>Include in report</span>
                          </label>
                        ) : (
                          <input
                            type={param.type}
                            value={reportParameters[param.name] || param.defaultValue || ''}
                            onChange={(e) => setReportParameters(prev => ({ ...prev, [param.name]: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid var(--hairline)',
                              borderRadius: '4px',
                              fontSize: '13px'
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setSelectedReport(null)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={() => handleReportGenerate(selectedReport)}
                      disabled={isGeneratingReport}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        backgroundColor: isGeneratingReport ? '#6c757d' : '#1a73e8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isGeneratingReport ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isGeneratingReport ? '⏳ Generating...' : '📄 Generate Report'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'analytics' && (
          <div style={{ padding: '16px', border: '1px solid var(--hairline)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ padding: '40px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                📈 Advanced Analytics
              </h4>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
                Deep dive analytics with predictive modeling and advanced visualizations.
              </p>
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '13px', color: '#666' }}>
                🚧 Advanced analytics coming soon - will include:
                <ul style={{ textAlign: 'left', marginTop: '12px', marginLeft: '20px' }}>
                  <li>Predictive investigation outcome modeling</li>
                  <li>Resource optimization analytics</li>
                  <li>Cross-investigation pattern analysis</li>
                  <li>Performance trend forecasting</li>
                  <li>Custom KPI dashboard builder</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeView === 'settings' && userRole !== 'analyst' && (
          <div style={{ padding: '16px', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Dashboard Settings
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Display Options</h5>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <input type="checkbox" defaultChecked />
                    Show real-time updates
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <input type="checkbox" defaultChecked />
                    Enable widget animations
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <input type="checkbox" />
                    Dark theme
                  </label>
                </div>
              </div>
              
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Notifications</h5>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <input type="checkbox" defaultChecked />
                    Critical alerts
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <input type="checkbox" defaultChecked />
                    Investigation updates
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <input type="checkbox" />
                    Weekly summaries
                  </label>
                </div>
              </div>
              
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Report Scheduling</h5>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <div><strong>Default timezone:</strong> UTC</div>
                  <div><strong>Email format:</strong> PDF</div>
                  <div><strong>Retention period:</strong> 90 days</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseDashboard;