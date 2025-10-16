import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'database' | 'file' | 'stream' | 'webhook' | 'cloud';
  category:
    | 'threat_intel'
    | 'logs'
    | 'metrics'
    | 'osint'
    | 'forensics'
    | 'financial'
    | 'social'
    | 'geo';
  provider: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending' | 'configuring';
  lastSync: Date;
  nextSync?: Date;
  syncFrequency:
    | 'realtime'
    | '1min'
    | '5min'
    | '15min'
    | '1hour'
    | '6hour'
    | '24hour'
    | 'manual';
  recordsImported: number;
  errorCount: number;
  configuration: {
    endpoint?: string;
    apiKey?: string;
    credentials?: any;
    filters?: any;
    mappings?: any;
    rateLimits?: {
      requestsPerMinute: number;
      requestsPerHour: number;
      requestsPerDay: number;
    };
  };
  dataFlow: {
    ingestion: {
      totalRecords: number;
      lastHour: number;
      errors: number;
      avgProcessingTime: number;
    };
    transformation: {
      rulesApplied: number;
      enrichments: number;
      validationErrors: number;
    };
    storage: {
      entitiesCreated: number;
      relationshipsCreated: number;
      duplicatesDetected: number;
    };
  };
  healthMetrics: {
    availability: number;
    responseTime: number;
    dataQuality: number;
    throughput: number;
  };
}

interface ConnectorTemplate {
  id: string;
  name: string;
  description: string;
  provider: string;
  category: string;
  type: 'api' | 'database' | 'file' | 'stream';
  icon: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  estimatedSetupTime: string;
  capabilities: string[];
  requirements: string[];
  configurationSchema: any;
  isPopular: boolean;
  documentation: {
    setupGuide: string;
    apiReference: string;
    examples: string;
  };
}

interface TransformationRule {
  id: string;
  name: string;
  description: string;
  sourceConnectorId: string;
  isActive: boolean;
  type: 'mapping' | 'enrichment' | 'validation' | 'filtering' | 'aggregation';
  configuration: {
    inputSchema: any;
    outputSchema: any;
    transformations: any[];
    conditions: any[];
  };
  performance: {
    recordsProcessed: number;
    successRate: number;
    avgProcessingTime: number;
    lastRun: Date;
  };
}

interface DataConnectorsDashboardProps {
  investigationId?: string;
  onConnectorAdd?: (connector: DataSource) => void;
  onConnectorRemove?: (connectorId: string) => void;
  onDataImported?: (connectorId: string, recordCount: number) => void;
  className?: string;
}

const DataConnectorsDashboard: React.FC<DataConnectorsDashboardProps> = ({
  investigationId,
  onConnectorAdd,
  onConnectorRemove,
  onDataImported,
  className = '',
}) => {
  const [activeView, setActiveView] = useState<
    'connectors' | 'templates' | 'transformations' | 'monitoring'
  >('connectors');
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [connectorTemplates, setConnectorTemplates] = useState<
    ConnectorTemplate[]
  >([]);
  const [transformationRules, setTransformationRules] = useState<
    TransformationRule[]
  >([]);
  const [selectedConnector, setSelectedConnector] = useState<DataSource | null>(
    null,
  );
  const [showAddConnector, setShowAddConnector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data sources
  const mockDataSources: DataSource[] = useMemo(
    () => [
      {
        id: 'virustotal-api',
        name: 'VirusTotal API',
        type: 'api',
        category: 'threat_intel',
        provider: 'VirusTotal',
        status: 'connected',
        lastSync: new Date(Date.now() - 300000),
        nextSync: new Date(Date.now() + 3300000),
        syncFrequency: '1hour',
        recordsImported: 15847,
        errorCount: 3,
        configuration: {
          endpoint: 'https://www.virustotal.com/vtapi/v2/',
          rateLimits: {
            requestsPerMinute: 4,
            requestsPerHour: 240,
            requestsPerDay: 5760,
          },
        },
        dataFlow: {
          ingestion: {
            totalRecords: 15847,
            lastHour: 23,
            errors: 3,
            avgProcessingTime: 1250,
          },
          transformation: {
            rulesApplied: 12,
            enrichments: 5432,
            validationErrors: 12,
          },
          storage: {
            entitiesCreated: 3421,
            relationshipsCreated: 8903,
            duplicatesDetected: 67,
          },
        },
        healthMetrics: {
          availability: 99.2,
          responseTime: 850,
          dataQuality: 94.5,
          throughput: 23.5,
        },
      },
      {
        id: 'misp-feed',
        name: 'MISP Threat Feed',
        type: 'api',
        category: 'threat_intel',
        provider: 'MISP',
        status: 'connected',
        lastSync: new Date(Date.now() - 600000),
        nextSync: new Date(Date.now() + 900000),
        syncFrequency: '15min',
        recordsImported: 8923,
        errorCount: 1,
        configuration: {
          endpoint: 'https://misp.local/attributes/restSearch/',
          filters: {
            category: ['Payload delivery', 'Network activity'],
            type: ['ip-dst', 'domain', 'url', 'md5', 'sha256'],
          },
        },
        dataFlow: {
          ingestion: {
            totalRecords: 8923,
            lastHour: 45,
            errors: 1,
            avgProcessingTime: 650,
          },
          transformation: {
            rulesApplied: 8,
            enrichments: 2341,
            validationErrors: 5,
          },
          storage: {
            entitiesCreated: 1892,
            relationshipsCreated: 4567,
            duplicatesDetected: 23,
          },
        },
        healthMetrics: {
          availability: 98.7,
          responseTime: 650,
          dataQuality: 96.2,
          throughput: 45.0,
        },
      },
      {
        id: 'splunk-logs',
        name: 'Splunk Enterprise',
        type: 'api',
        category: 'logs',
        provider: 'Splunk',
        status: 'error',
        lastSync: new Date(Date.now() - 7200000),
        syncFrequency: '5min',
        recordsImported: 234567,
        errorCount: 45,
        configuration: {
          endpoint: 'https://splunk.local:8089/',
          filters: {
            index: 'security',
            sourcetype: 'firewall',
          },
        },
        dataFlow: {
          ingestion: {
            totalRecords: 234567,
            lastHour: 0,
            errors: 45,
            avgProcessingTime: 2100,
          },
          transformation: {
            rulesApplied: 15,
            enrichments: 45678,
            validationErrors: 123,
          },
          storage: {
            entitiesCreated: 12345,
            relationshipsCreated: 34567,
            duplicatesDetected: 456,
          },
        },
        healthMetrics: {
          availability: 85.3,
          responseTime: 2100,
          dataQuality: 89.1,
          throughput: 0.0,
        },
      },
      {
        id: 'shodan-api',
        name: 'Shodan Intelligence',
        type: 'api',
        category: 'osint',
        provider: 'Shodan',
        status: 'connected',
        lastSync: new Date(Date.now() - 1800000),
        nextSync: new Date(Date.now() + 21600000),
        syncFrequency: '6hour',
        recordsImported: 5432,
        errorCount: 0,
        configuration: {
          endpoint: 'https://api.shodan.io/',
          filters: {
            facets: ['port', 'country', 'org'],
            query: 'product:"Apache httpd"',
          },
          rateLimits: {
            requestsPerMinute: 1,
            requestsPerHour: 60,
            requestsPerDay: 1440,
          },
        },
        dataFlow: {
          ingestion: {
            totalRecords: 5432,
            lastHour: 0,
            errors: 0,
            avgProcessingTime: 3200,
          },
          transformation: {
            rulesApplied: 6,
            enrichments: 1234,
            validationErrors: 0,
          },
          storage: {
            entitiesCreated: 987,
            relationshipsCreated: 2145,
            duplicatesDetected: 12,
          },
        },
        healthMetrics: {
          availability: 99.8,
          responseTime: 3200,
          dataQuality: 97.3,
          throughput: 0.9,
        },
      },
    ],
    [],
  );

  // Mock connector templates
  const mockConnectorTemplates: ConnectorTemplate[] = useMemo(
    () => [
      {
        id: 'template-virustotal',
        name: 'VirusTotal',
        description:
          'Connect to VirusTotal API for malware analysis and threat intelligence',
        provider: 'VirusTotal',
        category: 'threat_intel',
        type: 'api',
        icon: '🛡️',
        difficulty: 'easy',
        estimatedSetupTime: '5 minutes',
        capabilities: [
          'File hash analysis',
          'URL scanning',
          'IP reputation',
          'Domain analysis',
          'Real-time detection',
        ],
        requirements: ['VirusTotal API key', 'Rate limit compliance'],
        isPopular: true,
        configurationSchema: {},
        documentation: {
          setupGuide: '/docs/connectors/virustotal',
          apiReference: 'https://developers.virustotal.com/reference',
          examples: '/docs/examples/virustotal',
        },
      },
      {
        id: 'template-misp',
        name: 'MISP',
        description:
          'Malware Information Sharing Platform for threat intelligence sharing',
        provider: 'MISP Project',
        category: 'threat_intel',
        type: 'api',
        icon: '🔗',
        difficulty: 'medium',
        estimatedSetupTime: '15 minutes',
        capabilities: [
          'IOC sharing',
          'Threat events',
          'Attribute correlation',
          'Galaxy clusters',
          'Sighting data',
        ],
        requirements: [
          'MISP instance URL',
          'API authentication key',
          'SSL certificate validation',
        ],
        isPopular: true,
        configurationSchema: {},
        documentation: {
          setupGuide: '/docs/connectors/misp',
          apiReference: 'https://misp.gitbooks.io/misp-book/',
          examples: '/docs/examples/misp',
        },
      },
      {
        id: 'template-elasticsearch',
        name: 'Elasticsearch',
        description:
          'Connect to Elasticsearch clusters for log analysis and search',
        provider: 'Elastic',
        category: 'logs',
        type: 'database',
        icon: '🔍',
        difficulty: 'medium',
        estimatedSetupTime: '10 minutes',
        capabilities: [
          'Full-text search',
          'Log aggregation',
          'Real-time analytics',
          'Index patterns',
          'Field mapping',
        ],
        requirements: [
          'Elasticsearch endpoint',
          'Authentication credentials',
          'Index permissions',
        ],
        isPopular: false,
        configurationSchema: {},
        documentation: {
          setupGuide: '/docs/connectors/elasticsearch',
          apiReference:
            'https://www.elastic.co/guide/en/elasticsearch/reference/',
          examples: '/docs/examples/elasticsearch',
        },
      },
      {
        id: 'template-shodan',
        name: 'Shodan',
        description:
          'Search engine for Internet-connected devices and services',
        provider: 'Shodan',
        category: 'osint',
        type: 'api',
        icon: '🌐',
        difficulty: 'easy',
        estimatedSetupTime: '5 minutes',
        capabilities: [
          'Device discovery',
          'Service fingerprinting',
          'Vulnerability scanning',
          'Geographic mapping',
          'Historical data',
        ],
        requirements: ['Shodan API key', 'Query credits'],
        isPopular: true,
        configurationSchema: {},
        documentation: {
          setupGuide: '/docs/connectors/shodan',
          apiReference: 'https://developer.shodan.io/',
          examples: '/docs/examples/shodan',
        },
      },
      {
        id: 'template-twitter',
        name: 'Twitter/X API',
        description: 'Social media intelligence from Twitter/X platform',
        provider: 'Twitter/X',
        category: 'social',
        type: 'api',
        icon: '🐦',
        difficulty: 'medium',
        estimatedSetupTime: '20 minutes',
        capabilities: [
          'Tweet collection',
          'User profiling',
          'Trend analysis',
          'Sentiment analysis',
          'Network mapping',
        ],
        requirements: [
          'Twitter API v2 access',
          'Bearer token',
          'Rate limit compliance',
        ],
        isPopular: false,
        configurationSchema: {},
        documentation: {
          setupGuide: '/docs/connectors/twitter',
          apiReference: 'https://developer.twitter.com/en/docs',
          examples: '/docs/examples/twitter',
        },
      },
      {
        id: 'template-maxmind',
        name: 'MaxMind GeoIP',
        description: 'IP geolocation and threat intelligence database',
        provider: 'MaxMind',
        category: 'geo',
        type: 'database',
        icon: '🗺️',
        difficulty: 'easy',
        estimatedSetupTime: '8 minutes',
        capabilities: [
          'IP geolocation',
          'ASN mapping',
          'ISP identification',
          'Proxy detection',
          'Anonymous IP detection',
        ],
        requirements: [
          'MaxMind license key',
          'Database downloads',
          'Regular updates',
        ],
        isPopular: true,
        configurationSchema: {},
        documentation: {
          setupGuide: '/docs/connectors/maxmind',
          apiReference: 'https://dev.maxmind.com/geoip/docs/',
          examples: '/docs/examples/maxmind',
        },
      },
    ],
    [],
  );

  // Initialize data
  useEffect(() => {
    setDataSources(mockDataSources);
    setConnectorTemplates(mockConnectorTemplates);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setDataSources((prev) =>
        prev.map((source) => ({
          ...source,
          lastSync:
            source.status === 'connected' ? new Date() : source.lastSync,
          healthMetrics: {
            ...source.healthMetrics,
            responseTime:
              source.healthMetrics.responseTime + (Math.random() - 0.5) * 200,
            throughput: Math.max(
              0,
              source.healthMetrics.throughput + (Math.random() - 0.5) * 10,
            ),
          },
        })),
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [mockDataSources, mockConnectorTemplates]);

  // Filtered data sources
  const filteredDataSources = useMemo(() => {
    let filtered = dataSources;

    if (searchQuery) {
      filtered = filtered.filter(
        (source) =>
          source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          source.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
          source.category.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(
        (source) => source.category === categoryFilter,
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((source) => source.status === statusFilter);
    }

    return filtered;
  }, [dataSources, searchQuery, categoryFilter, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return '#28a745';
      case 'disconnected':
        return '#6c757d';
      case 'error':
        return '#dc3545';
      case 'pending':
        return '#ffc107';
      case 'configuring':
        return '#17a2b8';
      default:
        return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return '🟢';
      case 'disconnected':
        return '⚫';
      case 'error':
        return '🔴';
      case 'pending':
        return '🟡';
      case 'configuring':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'threat_intel':
        return '🛡️';
      case 'logs':
        return '📄';
      case 'metrics':
        return '📊';
      case 'osint':
        return '🕵️';
      case 'forensics':
        return '🔬';
      case 'financial':
        return '💰';
      case 'social':
        return '👥';
      case 'geo':
        return '🗺️';
      default:
        return '📡';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div
      className={`data-connectors-dashboard ${className}`}
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
            🔌 Data Connectors & Integrations
          </h3>

          <button
            onClick={() => setShowAddConnector(true)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#1a73e8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            + Add Connector
          </button>
        </div>

        {/* Stats Overview */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--hairline)',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa',
            }}
          >
            <div
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#28a745',
                marginBottom: '4px',
              }}
            >
              {dataSources.filter((s) => s.status === 'connected').length}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Active Connectors
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              border: '1px solid var(--hairline)',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa',
            }}
          >
            <div
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1a73e8',
                marginBottom: '4px',
              }}
            >
              {formatNumber(
                dataSources.reduce((sum, s) => sum + s.recordsImported, 0),
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Records Imported
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              border: '1px solid var(--hairline)',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa',
            }}
          >
            <div
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#dc3545',
                marginBottom: '4px',
              }}
            >
              {dataSources.filter((s) => s.status === 'error').length}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Connection Errors
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              border: '1px solid var(--hairline)',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa',
            }}
          >
            <div
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#ffc107',
                marginBottom: '4px',
              }}
            >
              {Math.round(
                dataSources.reduce(
                  (sum, s) => sum + s.healthMetrics.availability,
                  0,
                ) / dataSources.length,
              )}
              %
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Avg Availability
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--hairline)',
            marginBottom: '16px',
          }}
        >
          {[
            {
              key: 'connectors',
              label: '🔌 My Connectors',
              count: dataSources.length,
            },
            {
              key: 'templates',
              label: '📦 Templates',
              count: connectorTemplates.length,
            },
            { key: 'transformations', label: '⚙️ Transformations', count: 0 },
            { key: 'monitoring', label: '📊 Monitoring', count: 0 },
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
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Filters */}
        {(activeView === 'connectors' || activeView === 'templates') && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              placeholder={`Search ${activeView === 'connectors' ? 'connectors' : 'templates'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                flex: '1 1 250px',
                fontSize: '14px',
              }}
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '8px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="all">All Categories</option>
              <option value="threat_intel">Threat Intelligence</option>
              <option value="logs">Logs & Events</option>
              <option value="osint">OSINT</option>
              <option value="social">Social Media</option>
              <option value="geo">Geolocation</option>
              <option value="forensics">Digital Forensics</option>
            </select>

            {activeView === 'connectors' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid var(--hairline)',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                <option value="all">All Status</option>
                <option value="connected">Connected</option>
                <option value="disconnected">Disconnected</option>
                <option value="error">Error</option>
                <option value="pending">Pending</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeView === 'connectors' && (
          <div
            style={{
              height: '100%',
              display: 'grid',
              gridTemplateColumns: selectedConnector ? '1fr 1fr' : '1fr',
              gap: '16px',
            }}
          >
            {/* Connectors List */}
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
                  Active Connectors ({filteredDataSources.length})
                </h4>
              </div>

              <div>
                {filteredDataSources.map((source) => (
                  <div
                    key={source.id}
                    onClick={() => setSelectedConnector(source)}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      backgroundColor:
                        selectedConnector?.id === source.id
                          ? '#e3f2fd'
                          : 'transparent',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedConnector?.id !== source.id) {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedConnector?.id !== source.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
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
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div style={{ fontSize: '20px' }}>
                          {getCategoryIcon(source.category)}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600' }}>
                            {source.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {source.provider} • {source.type}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginBottom: '2px',
                          }}
                        >
                          <span style={{ fontSize: '12px' }}>
                            {getStatusIcon(source.status)}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '12px',
                              backgroundColor: getStatusColor(source.status),
                              color: 'white',
                              fontWeight: '600',
                            }}
                          >
                            {source.status.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {formatTimeAgo(source.lastSync)}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <div style={{ color: '#666' }}>Records</div>
                        <div style={{ fontWeight: '600' }}>
                          {formatNumber(source.recordsImported)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#666' }}>Uptime</div>
                        <div style={{ fontWeight: '600' }}>
                          {source.healthMetrics.availability.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#666' }}>Response</div>
                        <div style={{ fontWeight: '600' }}>
                          {source.healthMetrics.responseTime.toFixed(0)}ms
                        </div>
                      </div>
                    </div>

                    {source.errorCount > 0 && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '4px 8px',
                          backgroundColor: '#f8d7da',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: '#721c24',
                        }}
                      >
                        ⚠️ {source.errorCount} error
                        {source.errorCount > 1 ? 's' : ''} in last sync
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Connector Details */}
            {selectedConnector && (
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
                  <h4
                    style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}
                  >
                    Connector Details
                  </h4>
                </div>

                <div style={{ padding: '16px' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ fontSize: '32px' }}>
                        {getCategoryIcon(selectedConnector.category)}
                      </div>
                      <div>
                        <h5
                          style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            margin: '0 0 4px 0',
                          }}
                        >
                          {selectedConnector.name}
                        </h5>
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          {selectedConnector.provider} •{' '}
                          {selectedConnector.category.replace('_', ' ')} •{' '}
                          {selectedConnector.type}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h6
                      style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '12px',
                      }}
                    >
                      Data Flow Performance
                    </h6>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '16px',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          padding: '12px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '6px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#666',
                            marginBottom: '4px',
                          }}
                        >
                          Ingestion
                        </div>
                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            marginBottom: '4px',
                          }}
                        >
                          {formatNumber(
                            selectedConnector.dataFlow.ingestion.totalRecords,
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          Last hour:{' '}
                          {selectedConnector.dataFlow.ingestion.lastHour} •
                          Errors: {selectedConnector.dataFlow.ingestion.errors}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '12px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '6px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#666',
                            marginBottom: '4px',
                          }}
                        >
                          Transformation
                        </div>
                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            marginBottom: '4px',
                          }}
                        >
                          {
                            selectedConnector.dataFlow.transformation
                              .rulesApplied
                          }
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          Enrichments:{' '}
                          {formatNumber(
                            selectedConnector.dataFlow.transformation
                              .enrichments,
                          )}{' '}
                          • Errors:{' '}
                          {
                            selectedConnector.dataFlow.transformation
                              .validationErrors
                          }
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '12px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '6px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#666',
                            marginBottom: '4px',
                          }}
                        >
                          Storage
                        </div>
                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            marginBottom: '4px',
                          }}
                        >
                          {formatNumber(
                            selectedConnector.dataFlow.storage.entitiesCreated,
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          Entities • Rels:{' '}
                          {formatNumber(
                            selectedConnector.dataFlow.storage
                              .relationshipsCreated,
                          )}{' '}
                          • Dupes:{' '}
                          {
                            selectedConnector.dataFlow.storage
                              .duplicatesDetected
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h6
                      style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '12px',
                      }}
                    >
                      Health Metrics
                    </h6>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '4px',
                          }}
                        >
                          <span style={{ fontSize: '12px' }}>Availability</span>
                          <span style={{ fontSize: '12px', fontWeight: '600' }}>
                            {selectedConnector.healthMetrics.availability.toFixed(
                              1,
                            )}
                            %
                          </span>
                        </div>
                        <div
                          style={{
                            height: '6px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '3px',
                          }}
                        >
                          <div
                            style={{
                              width: `${selectedConnector.healthMetrics.availability}%`,
                              height: '100%',
                              backgroundColor:
                                selectedConnector.healthMetrics.availability >
                                95
                                  ? '#28a745'
                                  : selectedConnector.healthMetrics
                                        .availability > 90
                                    ? '#ffc107'
                                    : '#dc3545',
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '4px',
                          }}
                        >
                          <span style={{ fontSize: '12px' }}>Data Quality</span>
                          <span style={{ fontSize: '12px', fontWeight: '600' }}>
                            {selectedConnector.healthMetrics.dataQuality.toFixed(
                              1,
                            )}
                            %
                          </span>
                        </div>
                        <div
                          style={{
                            height: '6px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '3px',
                          }}
                        >
                          <div
                            style={{
                              width: `${selectedConnector.healthMetrics.dataQuality}%`,
                              height: '100%',
                              backgroundColor:
                                selectedConnector.healthMetrics.dataQuality > 95
                                  ? '#28a745'
                                  : selectedConnector.healthMetrics
                                        .dataQuality > 90
                                    ? '#ffc107'
                                    : '#dc3545',
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: '12px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        fontSize: '13px',
                      }}
                    >
                      <div>
                        <strong>Response Time:</strong>{' '}
                        {selectedConnector.healthMetrics.responseTime.toFixed(
                          0,
                        )}
                        ms
                      </div>
                      <div>
                        <strong>Throughput:</strong>{' '}
                        {selectedConnector.healthMetrics.throughput.toFixed(1)}{' '}
                        rec/s
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h6
                      style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '8px',
                      }}
                    >
                      Sync Configuration
                    </h6>
                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                      <div>
                        <strong>Frequency:</strong>{' '}
                        {selectedConnector.syncFrequency}
                      </div>
                      <div>
                        <strong>Last Sync:</strong>{' '}
                        {selectedConnector.lastSync.toLocaleString()}
                      </div>
                      {selectedConnector.nextSync && (
                        <div>
                          <strong>Next Sync:</strong>{' '}
                          {selectedConnector.nextSync.toLocaleString()}
                        </div>
                      )}
                      {selectedConnector.configuration.rateLimits && (
                        <div style={{ marginTop: '8px' }}>
                          <strong>Rate Limits:</strong>
                          <div
                            style={{
                              marginLeft: '12px',
                              fontSize: '12px',
                              color: '#666',
                            }}
                          >
                            {
                              selectedConnector.configuration.rateLimits
                                .requestsPerMinute
                            }
                            /min •
                            {
                              selectedConnector.configuration.rateLimits
                                .requestsPerHour
                            }
                            /hour •
                            {
                              selectedConnector.configuration.rateLimits
                                .requestsPerDay
                            }
                            /day
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          backgroundColor:
                            selectedConnector.status === 'connected'
                              ? '#dc3545'
                              : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        {selectedConnector.status === 'connected'
                          ? 'Disconnect'
                          : 'Connect'}
                      </button>

                      <button
                        style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Configure
                      </button>

                      <button
                        style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          backgroundColor: '#ffc107',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Test Connection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'templates' && (
          <div style={{ overflow: 'auto', padding: '16px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '24px',
              }}
            >
              {connectorTemplates
                .filter(
                  (template) =>
                    (searchQuery === '' ||
                      template.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      template.provider
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      template.description
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())) &&
                    (categoryFilter === 'all' ||
                      template.category === categoryFilter),
                )
                .map((template) => (
                  <div
                    key={template.id}
                    style={{
                      border: '1px solid var(--hairline)',
                      borderRadius: '8px',
                      padding: '20px',
                      position: 'relative',
                    }}
                  >
                    {template.isPopular && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          fontSize: '11px',
                          padding: '2px 8px',
                          backgroundColor: '#1a73e8',
                          color: 'white',
                          borderRadius: '12px',
                          fontWeight: '600',
                        }}
                      >
                        POPULAR
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ fontSize: '32px' }}>{template.icon}</div>
                      <div>
                        <h5
                          style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            margin: '0 0 4px 0',
                          }}
                        >
                          {template.name}
                        </h5>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {template.provider} • {template.type}
                        </div>
                      </div>
                    </div>

                    <p
                      style={{
                        fontSize: '13px',
                        color: '#666',
                        marginBottom: '16px',
                        lineHeight: '1.4',
                      }}
                    >
                      {template.description}
                    </p>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                        <strong>Capabilities:</strong>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px',
                        }}
                      >
                        {template.capabilities.slice(0, 3).map((capability) => (
                          <span
                            key={capability}
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              backgroundColor: '#e9ecef',
                              borderRadius: '12px',
                              color: '#495057',
                            }}
                          >
                            {capability}
                          </span>
                        ))}
                        {template.capabilities.length > 3 && (
                          <span style={{ fontSize: '11px', color: '#666' }}>
                            +{template.capabilities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '12px',
                            backgroundColor:
                              template.difficulty === 'easy'
                                ? '#d4edda'
                                : template.difficulty === 'medium'
                                  ? '#fff3cd'
                                  : '#f8d7da',
                            color:
                              template.difficulty === 'easy'
                                ? '#155724'
                                : template.difficulty === 'medium'
                                  ? '#856404'
                                  : '#721c24',
                            fontWeight: '500',
                          }}
                        >
                          {template.difficulty.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ color: '#666' }}>
                        ⏱️ {template.estimatedSetupTime}
                      </div>
                    </div>

                    <button
                      onClick={() => onConnectorAdd?.(template as any)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        fontSize: '14px',
                        backgroundColor: '#1a73e8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                    >
                      Add Connector
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeView === 'transformations' && (
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--hairline)',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ padding: '40px' }}>
              <h4
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '16px',
                }}
              >
                ⚙️ Data Transformation Engine
              </h4>
              <p
                style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '24px',
                }}
              >
                Advanced data transformation, mapping, and enrichment rules for
                connector pipelines.
              </p>
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#666',
                }}
              >
                🚧 Transformation engine coming soon - will include:
                <ul
                  style={{
                    textAlign: 'left',
                    marginTop: '12px',
                    marginLeft: '20px',
                  }}
                >
                  <li>Visual data mapping interface</li>
                  <li>Field transformation rules</li>
                  <li>Data enrichment pipelines</li>
                  <li>Validation and quality checks</li>
                  <li>Custom transformation scripts</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeView === 'monitoring' && (
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--hairline)',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ padding: '40px' }}>
              <h4
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '16px',
                }}
              >
                📊 Connector Monitoring
              </h4>
              <p
                style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '24px',
                }}
              >
                Real-time monitoring, alerting, and performance analytics for
                all data connectors.
              </p>
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#666',
                }}
              >
                🚧 Advanced monitoring coming soon - will include:
                <ul
                  style={{
                    textAlign: 'left',
                    marginTop: '12px',
                    marginLeft: '20px',
                  }}
                >
                  <li>Real-time performance dashboards</li>
                  <li>SLA monitoring and alerting</li>
                  <li>Data quality metrics</li>
                  <li>Historical trend analysis</li>
                  <li>Automated health checks</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataConnectorsDashboard;
