import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';

interface MetricData {
  timestamp: number;
  value: number;
  unit?: string;
  status?: 'healthy' | 'warning' | 'critical';
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'maintenance';
  uptime: number;
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  dependencies: string[];
  version: string;
  replicas?: {
    desired: number;
    ready: number;
    available: number;
  };
}

interface SystemAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
  service: string;
  title: string;
  description: string;
  metric: string;
  threshold: number;
  currentValue: number;
  status: 'active' | 'acknowledged' | 'resolved';
  assignedTo?: string;
  resolvedAt?: Date;
  tags: string[];
}

interface PerformanceMetrics {
  cpu: {
    usage: MetricData[];
    cores: number;
    load: number[];
  };
  memory: {
    usage: MetricData[];
    total: number;
    available: number;
    cached: number;
  };
  disk: {
    usage: MetricData[];
    total: number;
    free: number;
    iops: MetricData[];
  };
  network: {
    bytesIn: MetricData[];
    bytesOut: MetricData[];
    connections: number;
    latency: MetricData[];
  };
  database: {
    connections: MetricData[];
    queries: MetricData[];
    slowQueries: number;
    replication: {
      lag: number;
      status: 'healthy' | 'warning' | 'critical';
    };
  };
  cache: {
    hitRate: MetricData[];
    memory: MetricData[];
    evictions: MetricData[];
  };
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  service: string;
  message: string;
  metadata?: {
    userId?: string;
    requestId?: string;
    duration?: number;
    statusCode?: number;
    userAgent?: string;
  };
  stackTrace?: string;
}

interface SystemObservabilityDashboardProps {
  investigationId?: string;
  refreshInterval?: number;
  onAlertAcknowledge?: (alertId: string) => void;
  onMetricThresholdExceeded?: (
    metric: string,
    value: number,
    threshold: number,
  ) => void;
  className?: string;
}

const SystemObservabilityDashboard: React.FC<
  SystemObservabilityDashboardProps
> = ({
  investigationId,
  refreshInterval = 30000,
  onAlertAcknowledge,
  onMetricThresholdExceeded,
  className = '',
}) => {
  const [activeView, setActiveView] = useState<
    'overview' | 'metrics' | 'logs' | 'alerts' | 'services'
  >('overview');
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>([]);
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics | null>(null);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('1h');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [logFilter, setLogFilter] = useState<string>('');
  const [logLevel, setLogLevel] = useState<string>('all');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  const metricsRef = useRef<{ [key: string]: MetricData[] }>({});

  // Mock service health data
  const mockServiceHealth: ServiceHealth[] = useMemo(
    () => [
      {
        name: 'intelgraph-api',
        status: 'healthy',
        uptime: 99.97,
        lastCheck: new Date(),
        responseTime: 45,
        errorRate: 0.12,
        dependencies: ['postgres', 'neo4j', 'redis'],
        version: 'v2.7.1',
        replicas: { desired: 3, ready: 3, available: 3 },
      },
      {
        name: 'postgres',
        status: 'healthy',
        uptime: 99.99,
        lastCheck: new Date(Date.now() - 5000),
        responseTime: 12,
        errorRate: 0.01,
        dependencies: [],
        version: '14.5',
      },
      {
        name: 'neo4j',
        status: 'degraded',
        uptime: 98.45,
        lastCheck: new Date(Date.now() - 10000),
        responseTime: 125,
        errorRate: 2.34,
        dependencies: [],
        version: '5.3.0',
      },
      {
        name: 'redis',
        status: 'healthy',
        uptime: 99.95,
        lastCheck: new Date(Date.now() - 2000),
        responseTime: 1,
        errorRate: 0.0,
        dependencies: [],
        version: '7.0.5',
      },
      {
        name: 'elasticsearch',
        status: 'healthy',
        uptime: 99.89,
        lastCheck: new Date(Date.now() - 8000),
        responseTime: 78,
        errorRate: 0.45,
        dependencies: [],
        version: '8.6.2',
        replicas: { desired: 2, ready: 2, available: 2 },
      },
      {
        name: 'websocket-gateway',
        status: 'healthy',
        uptime: 99.92,
        lastCheck: new Date(Date.now() - 3000),
        responseTime: 23,
        errorRate: 0.08,
        dependencies: ['redis', 'intelgraph-api'],
        version: 'v1.4.2',
        replicas: { desired: 2, ready: 1, available: 1 },
      },
    ],
    [],
  );

  const mockAlerts: SystemAlert[] = useMemo(
    () => [
      {
        id: 'alert-001',
        timestamp: new Date(Date.now() - 300000),
        severity: 'critical',
        service: 'neo4j',
        title: 'High Query Response Time',
        description:
          'Graph database query response time exceeding SLA threshold',
        metric: 'response_time',
        threshold: 100,
        currentValue: 125,
        status: 'active',
        tags: ['performance', 'database', 'sla'],
      },
      {
        id: 'alert-002',
        timestamp: new Date(Date.now() - 600000),
        severity: 'warning',
        service: 'websocket-gateway',
        title: 'Reduced Replica Count',
        description: 'WebSocket gateway running with 1/2 desired replicas',
        metric: 'replica_count',
        threshold: 2,
        currentValue: 1,
        status: 'acknowledged',
        assignedTo: 'devops-team',
        tags: ['infrastructure', 'scaling'],
      },
      {
        id: 'alert-003',
        timestamp: new Date(Date.now() - 900000),
        severity: 'info',
        service: 'intelgraph-api',
        title: 'Deployment Completed',
        description: 'Successfully deployed version v2.7.1 to production',
        metric: 'deployment',
        threshold: 0,
        currentValue: 1,
        status: 'resolved',
        resolvedAt: new Date(Date.now() - 300000),
        tags: ['deployment', 'release'],
      },
    ],
    [],
  );

  const mockLogEntries: LogEntry[] = useMemo(
    () => [
      {
        id: 'log-001',
        timestamp: new Date(Date.now() - 120000),
        level: 'error',
        service: 'neo4j',
        message: 'Query execution timeout after 30 seconds',
        metadata: {
          userId: 'user-123',
          requestId: 'req-abc789',
          duration: 30000,
        },
      },
      {
        id: 'log-002',
        timestamp: new Date(Date.now() - 180000),
        level: 'warn',
        service: 'intelgraph-api',
        message: 'Rate limit approached for user session',
        metadata: {
          userId: 'user-456',
          requestId: 'req-def456',
          statusCode: 429,
          userAgent: 'Mozilla/5.0 Chrome/118.0',
        },
      },
      {
        id: 'log-003',
        timestamp: new Date(Date.now() - 240000),
        level: 'info',
        service: 'websocket-gateway',
        message: 'New client connection established',
        metadata: {
          userId: 'user-789',
          requestId: 'req-ghi123',
        },
      },
      {
        id: 'log-004',
        timestamp: new Date(Date.now() - 300000),
        level: 'fatal',
        service: 'postgres',
        message: 'Connection pool exhausted',
        stackTrace:
          'java.sql.SQLException: Cannot get connection, pool exhausted\n  at org.apache.tomcat.dbcp...',
        metadata: {
          requestId: 'req-jkl890',
        },
      },
    ],
    [],
  );

  // Generate mock performance metrics
  const generateMockMetrics = useCallback((): PerformanceMetrics => {
    const now = Date.now();
    const points = 50;
    const interval = 60000; // 1 minute intervals

    const generateSeries = (
      baseValue: number,
      variation: number,
    ): MetricData[] => {
      return Array.from({ length: points }, (_, i) => ({
        timestamp: now - (points - i - 1) * interval,
        value: Math.max(0, baseValue + (Math.random() - 0.5) * variation),
      }));
    };

    return {
      cpu: {
        usage: generateSeries(65, 30),
        cores: 8,
        load: [1.2, 0.8, 1.5],
      },
      memory: {
        usage: generateSeries(78, 20),
        total: 32 * 1024 * 1024 * 1024, // 32GB
        available: 7 * 1024 * 1024 * 1024, // 7GB
        cached: 5 * 1024 * 1024 * 1024, // 5GB
      },
      disk: {
        usage: generateSeries(45, 10),
        total: 1000 * 1024 * 1024 * 1024, // 1TB
        free: 550 * 1024 * 1024 * 1024, // 550GB
        iops: generateSeries(1200, 500),
      },
      network: {
        bytesIn: generateSeries(125000, 50000),
        bytesOut: generateSeries(95000, 40000),
        connections: 342,
        latency: generateSeries(15, 10),
      },
      database: {
        connections: generateSeries(45, 20),
        queries: generateSeries(850, 200),
        slowQueries: 12,
        replication: {
          lag: 0.5,
          status: 'healthy',
        },
      },
      cache: {
        hitRate: generateSeries(94, 5),
        memory: generateSeries(68, 15),
        evictions: generateSeries(5, 8),
      },
    };
  }, []);

  // Initialize data and real-time updates
  useEffect(() => {
    setServiceHealth(mockServiceHealth);
    setSystemAlerts(mockAlerts);
    setLogEntries(mockLogEntries);
    setPerformanceMetrics(generateMockMetrics());

    if (!isRealTimeEnabled) return;

    const interval = setInterval(() => {
      // Update service health
      setServiceHealth((prev) =>
        prev.map((service) => ({
          ...service,
          lastCheck: new Date(),
          responseTime: service.responseTime + (Math.random() - 0.5) * 20,
          errorRate: Math.max(
            0,
            service.errorRate + (Math.random() - 0.5) * 0.1,
          ),
        })),
      );

      // Add new log entries occasionally
      if (Math.random() < 0.3) {
        const levels: LogEntry['level'][] = ['info', 'warn', 'error', 'debug'];
        const services = ['intelgraph-api', 'postgres', 'neo4j', 'redis'];
        const messages = [
          'Request processed successfully',
          'Connection timeout detected',
          'Cache miss for key',
          'Database query completed',
          'User authentication verified',
        ];

        const newLog: LogEntry = {
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          level: levels[Math.floor(Math.random() * levels.length)],
          service: services[Math.floor(Math.random() * services.length)],
          message: messages[Math.floor(Math.random() * messages.length)],
          metadata: {
            requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
            duration: Math.floor(Math.random() * 1000),
          },
        };

        setLogEntries((prev) => [newLog, ...prev.slice(0, 99)]);
      }

      // Update performance metrics
      setPerformanceMetrics(generateMockMetrics());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [
    mockServiceHealth,
    mockAlerts,
    mockLogEntries,
    generateMockMetrics,
    refreshInterval,
    isRealTimeEnabled,
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#28a745';
      case 'degraded':
        return '#ffc107';
      case 'down':
        return '#dc3545';
      case 'maintenance':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '🟢';
      case 'degraded':
        return '🟡';
      case 'down':
        return '🔴';
      case 'maintenance':
        return '🔧';
      default:
        return '⚪';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      case 'info':
        return '#17a2b8';
      default:
        return '#6c757d';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'fatal':
        return '#dc3545';
      case 'error':
        return '#fd7e14';
      case 'warn':
        return '#ffc107';
      case 'info':
        return '#17a2b8';
      case 'debug':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const filteredLogs = useMemo(() => {
    let filtered = logEntries;

    if (selectedService !== 'all') {
      filtered = filtered.filter((log) => log.service === selectedService);
    }

    if (logLevel !== 'all') {
      filtered = filtered.filter((log) => log.level === logLevel);
    }

    if (logFilter) {
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(logFilter.toLowerCase()) ||
          log.service.toLowerCase().includes(logFilter.toLowerCase()),
      );
    }

    return filtered;
  }, [logEntries, selectedService, logLevel, logFilter]);

  const criticalAlerts = systemAlerts.filter(
    (alert) => alert.severity === 'critical' && alert.status === 'active',
  );
  const healthyServices = serviceHealth.filter(
    (service) => service.status === 'healthy',
  );

  return (
    <div
      className={`system-observability-dashboard ${className}`}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: 0 }}>
            📊 System Observability
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
              }}
            >
              <span>Real-time:</span>
              <button
                onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: isRealTimeEnabled ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                }}
              >
                {isRealTimeEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              style={{
                padding: '6px',
                fontSize: '12px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
              }}
            >
              <option value="5m">Last 5 minutes</option>
              <option value="1h">Last hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
            </select>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlerts.length > 0 && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#721c24',
                fontWeight: '600',
              }}
            >
              🚨 {criticalAlerts.length} Critical Alert
              {criticalAlerts.length > 1 ? 's' : ''} Active
              <button
                onClick={() => setActiveView('alerts')}
                style={{
                  marginLeft: 'auto',
                  padding: '4px 12px',
                  fontSize: '12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                View Details
              </button>
            </div>
          </div>
        )}

        {/* View Tabs */}
        <div
          style={{ display: 'flex', borderBottom: '1px solid var(--hairline)' }}
        >
          {[
            { key: 'overview', label: '🏠 Overview' },
            { key: 'metrics', label: '📈 Metrics' },
            { key: 'services', label: '⚙️ Services' },
            { key: 'logs', label: '📄 Logs' },
            { key: 'alerts', label: '🚨 Alerts' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              style={{
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom:
                  activeView === tab.key
                    ? '2px solid #1a73e8'
                    : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeView === tab.key ? '600' : '400',
                color: activeView === tab.key ? '#1a73e8' : '#666',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeView === 'overview' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* System Status Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
              }}
            >
              <div
                style={{
                  padding: '20px',
                  border: '1px solid var(--hairline)',
                  borderRadius: '8px',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#28a745',
                    marginBottom: '8px',
                  }}
                >
                  {healthyServices.length}/{serviceHealth.length}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Services Healthy
                </div>
              </div>

              <div
                style={{
                  padding: '20px',
                  border: '1px solid var(--hairline)',
                  borderRadius: '8px',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#dc3545',
                    marginBottom: '8px',
                  }}
                >
                  {criticalAlerts.length}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Critical Alerts
                </div>
              </div>

              <div
                style={{
                  padding: '20px',
                  border: '1px solid var(--hairline)',
                  borderRadius: '8px',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#1a73e8',
                    marginBottom: '8px',
                  }}
                >
                  {performanceMetrics?.cpu.usage[
                    performanceMetrics.cpu.usage.length - 1
                  ]?.value.toFixed(1) || 0}
                  %
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>CPU Usage</div>
              </div>

              <div
                style={{
                  padding: '20px',
                  border: '1px solid var(--hairline)',
                  borderRadius: '8px',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#1a73e8',
                    marginBottom: '8px',
                  }}
                >
                  {performanceMetrics?.memory.usage[
                    performanceMetrics.memory.usage.length - 1
                  ]?.value.toFixed(1) || 0}
                  %
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Memory Usage
                </div>
              </div>
            </div>

            {/* Service Status Overview */}
            <div
              style={{
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--hairline)',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                  Service Health Overview
                </h4>
              </div>

              <div style={{ padding: '16px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {serviceHealth.map((service) => (
                    <div
                      key={service.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        border: '1px solid #e9ecef',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ fontSize: '20px' }}>
                        {getStatusIcon(service.status)}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>
                          {service.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {service.uptime.toFixed(2)}% uptime •{' '}
                          {service.responseTime.toFixed(0)}ms avg
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          backgroundColor: getStatusColor(service.status),
                          color: 'white',
                          fontWeight: '600',
                        }}
                      >
                        {service.status.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'metrics' && performanceMetrics && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '24px',
              height: '100%',
              overflow: 'auto',
            }}
          >
            {/* CPU Metrics */}
            <div
              style={{
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--hairline)',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                  CPU Usage (
                  {performanceMetrics.cpu.usage[
                    performanceMetrics.cpu.usage.length - 1
                  ]?.value.toFixed(1)}
                  %)
                </h4>
              </div>
              <div
                style={{
                  padding: '16px',
                  height: '200px',
                  position: 'relative',
                  backgroundColor: '#fafafa',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#666',
                  }}
                >
                  <div>📊</div>
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>
                    CPU Usage Chart
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    {performanceMetrics.cpu.cores} cores • Load:{' '}
                    {performanceMetrics.cpu.load.join(', ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Memory Metrics */}
            <div
              style={{
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--hairline)',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                  Memory Usage (
                  {performanceMetrics.memory.usage[
                    performanceMetrics.memory.usage.length - 1
                  ]?.value.toFixed(1)}
                  %)
                </h4>
              </div>
              <div
                style={{
                  padding: '16px',
                  height: '200px',
                  position: 'relative',
                  backgroundColor: '#fafafa',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#666',
                  }}
                >
                  <div>💾</div>
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>
                    Memory Usage Chart
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    Total: {formatBytes(performanceMetrics.memory.total)} •
                    Available:{' '}
                    {formatBytes(performanceMetrics.memory.available)}
                  </div>
                </div>
              </div>
            </div>

            {/* Network Metrics */}
            <div
              style={{
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--hairline)',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                  Network I/O ({performanceMetrics.network.connections}{' '}
                  connections)
                </h4>
              </div>
              <div
                style={{
                  padding: '16px',
                  height: '200px',
                  position: 'relative',
                  backgroundColor: '#fafafa',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#666',
                  }}
                >
                  <div>🌐</div>
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>
                    Network Traffic Chart
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    Latency:{' '}
                    {performanceMetrics.network.latency[
                      performanceMetrics.network.latency.length - 1
                    ]?.value.toFixed(1)}
                    ms avg
                  </div>
                </div>
              </div>
            </div>

            {/* Database Metrics */}
            <div
              style={{
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--hairline)',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                  Database Performance (
                  {performanceMetrics.database.slowQueries} slow queries)
                </h4>
              </div>
              <div
                style={{
                  padding: '16px',
                  height: '200px',
                  position: 'relative',
                  backgroundColor: '#fafafa',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#666',
                  }}
                >
                  <div>🗄️</div>
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>
                    Database Metrics Chart
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    Replication lag:{' '}
                    {performanceMetrics.database.replication.lag}s • Status:{' '}
                    {performanceMetrics.database.replication.status}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'services' && (
          <div
            style={{
              overflow: 'auto',
              border: '1px solid var(--hairline)',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid var(--hairline)',
                backgroundColor: '#f8f9fa',
              }}
            >
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                Service Health Details
              </h4>
            </div>

            <div>
              {serviceHealth.map((service) => (
                <div
                  key={service.name}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div style={{ fontSize: '24px' }}>
                        {getStatusIcon(service.status)}
                      </div>
                      <div>
                        <h5
                          style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            margin: '0 0 4px 0',
                          }}
                        >
                          {service.name}
                        </h5>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Version {service.version} • Last check:{' '}
                          {service.lastCheck.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        backgroundColor: getStatusColor(service.status),
                        color: 'white',
                        fontWeight: '600',
                      }}
                    >
                      {service.status.toUpperCase()}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '16px',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Uptime
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>
                        {service.uptime.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Response Time
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>
                        {service.responseTime.toFixed(0)}ms
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Error Rate
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>
                        {service.errorRate.toFixed(2)}%
                      </div>
                    </div>
                    {service.replicas && (
                      <div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Replicas
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>
                          {service.replicas.ready}/{service.replicas.desired}
                        </div>
                      </div>
                    )}
                  </div>

                  {service.dependencies.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#666',
                          marginBottom: '4px',
                        }}
                      >
                        Dependencies
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px',
                        }}
                      >
                        {service.dependencies.map((dep) => (
                          <span
                            key={dep}
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              backgroundColor: '#e9ecef',
                              borderRadius: '12px',
                              color: '#495057',
                            }}
                          >
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'logs' && (
          <div
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {/* Log Filters */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                placeholder="Search logs..."
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--hairline)',
                  borderRadius: '4px',
                  flex: '1 1 200px',
                  fontSize: '14px',
                }}
              />

              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid var(--hairline)',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                <option value="all">All Services</option>
                {serviceHealth.map((service) => (
                  <option key={service.name} value={service.name}>
                    {service.name}
                  </option>
                ))}
              </select>

              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid var(--hairline)',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                <option value="all">All Levels</option>
                <option value="fatal">Fatal</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>

            {/* Log Entries */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
                fontFamily: 'monospace',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--hairline)',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                  Log Entries ({filteredLogs.length})
                </h4>
              </div>

              <div>
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f0f0f0',
                      fontSize: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        style={{
                          color: '#666',
                          minWidth: '140px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {log.timestamp.toISOString()}
                      </span>
                      <span
                        style={{
                          minWidth: '60px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: getLogLevelColor(log.level),
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: '600',
                          textAlign: 'center',
                        }}
                      >
                        {log.level.toUpperCase()}
                      </span>
                      <span style={{ minWidth: '120px', color: '#1a73e8' }}>
                        {log.service}
                      </span>
                      <span style={{ flex: 1 }}>{log.message}</span>
                    </div>

                    {log.metadata && (
                      <div
                        style={{
                          marginLeft: '156px',
                          color: '#666',
                          fontSize: '11px',
                        }}
                      >
                        {log.metadata.requestId &&
                          `Request: ${log.metadata.requestId} • `}
                        {log.metadata.userId &&
                          `User: ${log.metadata.userId} • `}
                        {log.metadata.duration &&
                          `Duration: ${log.metadata.duration}ms • `}
                        {log.metadata.statusCode &&
                          `Status: ${log.metadata.statusCode}`}
                      </div>
                    )}

                    {log.stackTrace && (
                      <details
                        style={{ marginLeft: '156px', marginTop: '8px' }}
                      >
                        <summary
                          style={{
                            cursor: 'pointer',
                            color: '#666',
                            fontSize: '11px',
                          }}
                        >
                          Stack Trace
                        </summary>
                        <pre
                          style={{
                            marginTop: '4px',
                            padding: '8px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                            fontSize: '10px',
                            overflow: 'auto',
                          }}
                        >
                          {log.stackTrace}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'alerts' && (
          <div
            style={{
              overflow: 'auto',
              border: '1px solid var(--hairline)',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid var(--hairline)',
                backgroundColor: '#f8f9fa',
              }}
            >
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                System Alerts ({systemAlerts.length})
              </h4>
            </div>

            <div>
              {systemAlerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor:
                      alert.status === 'active' ? '#fff8f0' : 'transparent',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '12px',
                            backgroundColor: getSeverityColor(alert.severity),
                            color: 'white',
                            fontWeight: '600',
                          }}
                        >
                          {alert.severity.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                          {alert.title}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#666',
                          marginBottom: '4px',
                        }}
                      >
                        {alert.service} • {alert.timestamp.toLocaleString()}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          backgroundColor:
                            alert.status === 'active'
                              ? '#dc3545'
                              : alert.status === 'acknowledged'
                                ? '#ffc107'
                                : '#28a745',
                          color: 'white',
                          fontWeight: '600',
                        }}
                      >
                        {alert.status.toUpperCase()}
                      </span>

                      {alert.status === 'active' && (
                        <button
                          onClick={() => onAlertAcknowledge?.(alert.id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                    {alert.description}
                  </div>

                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <strong>Metric:</strong> {alert.metric} •
                    <strong> Threshold:</strong> {alert.threshold} •
                    <strong> Current:</strong> {alert.currentValue}
                    {alert.assignedTo && (
                      <>
                        {' • '}
                        <strong>Assigned to:</strong> {alert.assignedTo}
                      </>
                    )}
                  </div>

                  {alert.tags.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        marginTop: '8px',
                      }}
                    >
                      {alert.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '12px',
                            color: '#495057',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemObservabilityDashboard;
