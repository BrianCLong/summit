import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './IntelligenceFeedsEnrichment.css';

// Intelligence Feeds Interfaces
interface IntelligenceFeed {
  id: string;
  name: string;
  description: string;
  provider: string;
  type:
    | 'commercial'
    | 'open_source'
    | 'government'
    | 'community'
    | 'internal'
    | 'custom';
  category:
    | 'threat_intel'
    | 'ioc'
    | 'malware'
    | 'vulnerability'
    | 'geopolitical'
    | 'industry'
    | 'dark_web'
    | 'social_media';
  format: 'stix' | 'json' | 'csv' | 'xml' | 'rss' | 'api' | 'taxii';
  frequency:
    | 'real_time'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'on_demand';
  status: 'active' | 'paused' | 'error' | 'testing' | 'disabled';
  reliability: 'A' | 'B' | 'C' | 'D' | 'E'; // Source reliability scale
  confidence: number; // 0-100
  connection: {
    endpoint: string;
    authentication:
      | 'none'
      | 'api_key'
      | 'oauth'
      | 'certificate'
      | 'username_password';
    credentials?: Record<string, string>;
    proxy?: string;
    timeout: number;
    retries: number;
  };
  parsing: {
    fields: Record<string, string>;
    filters: Array<{
      field: string;
      operator: 'equals' | 'contains' | 'regex' | 'greater_than' | 'less_than';
      value: string;
    }>;
    transformations: Array<{
      field: string;
      action: 'normalize' | 'extract' | 'convert' | 'validate' | 'enrich';
      parameters: Record<string, any>;
    }>;
  };
  metrics: {
    totalRecords: number;
    lastSync: Date;
    nextSync?: Date;
    successRate: number; // 0-100
    avgLatency: number; // milliseconds
    errors: number;
    duplicates: number;
  };
  alerts: Array<{
    id: string;
    timestamp: Date;
    type: 'error' | 'warning' | 'info';
    message: string;
    resolved: boolean;
  }>;
  tags: string[];
  created: Date;
  updated: Date;
}

interface EnrichmentRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number; // 1-10, higher = more priority
  triggers: Array<{
    field: string;
    condition: 'new_data' | 'threshold' | 'pattern' | 'manual' | 'scheduled';
    parameters: Record<string, any>;
  }>;
  enrichments: Array<{
    type:
      | 'ip_geolocation'
      | 'domain_analysis'
      | 'hash_lookup'
      | 'reputation_check'
      | 'whois'
      | 'certificate'
      | 'social_media'
      | 'threat_intel'
      | 'custom_api';
    provider: string;
    endpoint: string;
    mapping: Record<string, string>; // input field -> output field
    cache_ttl: number; // seconds
    rate_limit?: number; // requests per minute
  }>;
  output: {
    format: 'merge' | 'append' | 'separate';
    destination: 'database' | 'file' | 'api' | 'queue';
    notify: boolean;
    retention: number; // days
  };
  metrics: {
    executions: number;
    successes: number;
    failures: number;
    avgDuration: number; // milliseconds
    lastRun?: Date;
    nextRun?: Date;
  };
  created: Date;
  updated: Date;
  author: string;
}

interface EnrichedEntity {
  id: string;
  original: Record<string, any>;
  enriched: Record<string, any>;
  enrichmentSources: Array<{
    provider: string;
    type: string;
    timestamp: Date;
    confidence: number;
    latency: number;
    status: 'success' | 'failure' | 'partial';
  }>;
  confidence: number; // Overall confidence score
  riskScore: number; // Calculated risk score
  lastEnriched: Date;
  version: number;
  tags: string[];
}

interface IntelligenceAlert {
  id: string;
  timestamp: Date;
  type:
    | 'high_confidence_threat'
    | 'new_ioc'
    | 'feed_anomaly'
    | 'enrichment_failure'
    | 'threshold_breach'
    | 'correlation_match';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  entities: string[]; // Referenced entity IDs
  recommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    rationale: string;
  }>;
  acknowledged: boolean;
  assignedTo?: string;
  investigationId?: string;
  metadata: Record<string, any>;
}

interface FeedCorrelation {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rules: Array<{
    feeds: string[]; // Feed IDs to correlate
    conditions: Array<{
      field1: string;
      operator: 'equals' | 'similar' | 'overlaps' | 'related';
      field2: string;
      threshold?: number;
    }>;
    timeWindow: number; // minutes
    minMatches: number;
  }>;
  actions: Array<{
    type:
      | 'create_alert'
      | 'enrich_entity'
      | 'create_case'
      | 'notify'
      | 'block_ip'
      | 'quarantine';
    parameters: Record<string, any>;
  }>;
  metrics: {
    correlations: number;
    alerts: number;
    lastMatch?: Date;
  };
  created: Date;
  updated: Date;
}

interface IntelligenceFeedsEnrichmentProps {
  investigationId?: string;
  onNewIntelligence?: (intelligence: any) => void;
  onEnrichmentComplete?: (entity: EnrichedEntity) => void;
  onAlert?: (alert: IntelligenceAlert) => void;
  onCorrelationMatch?: (correlation: any) => void;
}

const IntelligenceFeedsEnrichment: React.FC<
  IntelligenceFeedsEnrichmentProps
> = ({
  investigationId,
  onNewIntelligence,
  onEnrichmentComplete,
  onAlert,
  onCorrelationMatch,
}) => {
  // State Management
  const [feeds, setFeeds] = useState<IntelligenceFeed[]>([]);
  const [enrichmentRules, setEnrichmentRules] = useState<EnrichmentRule[]>([]);
  const [enrichedEntities, setEnrichedEntities] = useState<EnrichedEntity[]>(
    [],
  );
  const [alerts, setAlerts] = useState<IntelligenceAlert[]>([]);
  const [correlations, setCorrelations] = useState<FeedCorrelation[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<IntelligenceFeed | null>(
    null,
  );
  const [selectedEntity, setSelectedEntity] = useState<EnrichedEntity | null>(
    null,
  );

  // UI State
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'feeds'
    | 'enrichment'
    | 'entities'
    | 'alerts'
    | 'correlations'
  >('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [realTimeMode, setRealTimeMode] = useState(true);

  // Mock Data Generation
  const generateMockData = useCallback(() => {
    const mockFeeds: IntelligenceFeed[] = [
      {
        id: 'feed-001',
        name: 'VirusTotal Intelligence',
        description:
          'Real-time threat intelligence from VirusTotal including file hashes, URLs, and IP addresses',
        provider: 'VirusTotal',
        type: 'commercial',
        category: 'threat_intel',
        format: 'api',
        frequency: 'real_time',
        status: 'active',
        reliability: 'A',
        confidence: 95,
        connection: {
          endpoint: 'https://www.virustotal.com/api/v3/intelligence',
          authentication: 'api_key',
          credentials: { api_key: 'vt_api_key_***' },
          timeout: 30000,
          retries: 3,
        },
        parsing: {
          fields: {
            hash: 'sha256',
            detection_ratio: 'detections',
            scan_date: 'timestamp',
            permalink: 'url',
          },
          filters: [
            { field: 'detections', operator: 'greater_than', value: '5' },
          ],
          transformations: [
            {
              field: 'timestamp',
              action: 'convert',
              parameters: { format: 'iso8601' },
            },
            {
              field: 'hash',
              action: 'normalize',
              parameters: { case: 'lower' },
            },
          ],
        },
        metrics: {
          totalRecords: 15847,
          lastSync: new Date('2024-01-26T10:45:00'),
          nextSync: new Date('2024-01-26T11:00:00'),
          successRate: 99.2,
          avgLatency: 245,
          errors: 3,
          duplicates: 127,
        },
        alerts: [
          {
            id: 'alert-f001-1',
            timestamp: new Date('2024-01-26T09:30:00'),
            type: 'warning',
            message: 'API rate limit approaching (90% of quota used)',
            resolved: false,
          },
        ],
        tags: ['malware', 'hash', 'reputation', 'real_time'],
        created: new Date('2023-12-01'),
        updated: new Date('2024-01-25'),
      },
      {
        id: 'feed-002',
        name: 'MISP Threat Sharing',
        description:
          'MISP platform integration for threat intelligence sharing and collaboration',
        provider: 'MISP Community',
        type: 'community',
        category: 'threat_intel',
        format: 'stix',
        frequency: 'hourly',
        status: 'active',
        reliability: 'B',
        confidence: 85,
        connection: {
          endpoint: 'https://misp.example.org/events/restSearch',
          authentication: 'api_key',
          credentials: { api_key: 'misp_key_***' },
          timeout: 60000,
          retries: 2,
        },
        parsing: {
          fields: {
            'Event.info': 'title',
            'Event.threat_level_id': 'threat_level',
            'Event.published': 'published',
            'Event.Attribute': 'attributes',
          },
          filters: [
            { field: 'published', operator: 'equals', value: 'true' },
            { field: 'threat_level_id', operator: 'less_than', value: '3' },
          ],
          transformations: [
            {
              field: 'attributes',
              action: 'extract',
              parameters: { nested: 'value' },
            },
          ],
        },
        metrics: {
          totalRecords: 8934,
          lastSync: new Date('2024-01-26T10:00:00'),
          nextSync: new Date('2024-01-26T11:00:00'),
          successRate: 94.7,
          avgLatency: 1850,
          errors: 12,
          duplicates: 89,
        },
        alerts: [],
        tags: ['misp', 'community', 'threat_sharing', 'stix'],
        created: new Date('2023-11-15'),
        updated: new Date('2024-01-24'),
      },
      {
        id: 'feed-003',
        name: 'AlienVault OTX',
        description:
          'Open Threat Exchange providing IOCs and threat intelligence from global security community',
        provider: 'AT&T Cybersecurity',
        type: 'community',
        category: 'ioc',
        format: 'json',
        frequency: 'daily',
        status: 'active',
        reliability: 'B',
        confidence: 78,
        connection: {
          endpoint: 'https://otx.alienvault.com/api/v1/pulses/subscribed',
          authentication: 'api_key',
          credentials: { api_key: 'otx_key_***' },
          timeout: 45000,
          retries: 3,
        },
        parsing: {
          fields: {
            'pulse.name': 'title',
            'pulse.indicators': 'iocs',
            'pulse.created': 'timestamp',
            'pulse.tags': 'tags',
          },
          filters: [
            { field: 'indicators', operator: 'greater_than', value: '0' },
          ],
          transformations: [
            {
              field: 'iocs',
              action: 'extract',
              parameters: { fields: ['indicator', 'type'] },
            },
          ],
        },
        metrics: {
          totalRecords: 23567,
          lastSync: new Date('2024-01-26T08:00:00'),
          nextSync: new Date('2024-01-27T08:00:00'),
          successRate: 96.8,
          avgLatency: 3200,
          errors: 8,
          duplicates: 245,
        },
        alerts: [],
        tags: ['otx', 'ioc', 'community', 'global'],
        created: new Date('2023-10-20'),
        updated: new Date('2024-01-20'),
      },
    ];

    const mockEnrichmentRules: EnrichmentRule[] = [
      {
        id: 'rule-001',
        name: 'IP Address Geolocation & Reputation',
        description:
          'Enrich IP addresses with geolocation data and reputation scores from multiple sources',
        enabled: true,
        priority: 8,
        triggers: [
          { field: 'ip_address', condition: 'new_data', parameters: {} },
        ],
        enrichments: [
          {
            type: 'ip_geolocation',
            provider: 'MaxMind',
            endpoint: 'https://geoip.maxmind.com/v2.1/city',
            mapping: { ip: 'ip_address' },
            cache_ttl: 86400,
            rate_limit: 1000,
          },
          {
            type: 'reputation_check',
            provider: 'VirusTotal',
            endpoint: 'https://www.virustotal.com/api/v3/ip_addresses',
            mapping: { ip: 'ip_address' },
            cache_ttl: 3600,
            rate_limit: 500,
          },
          {
            type: 'reputation_check',
            provider: 'AbuseIPDB',
            endpoint: 'https://api.abuseipdb.com/api/v2/check',
            mapping: { ipAddress: 'ip_address' },
            cache_ttl: 3600,
            rate_limit: 1000,
          },
        ],
        output: {
          format: 'merge',
          destination: 'database',
          notify: true,
          retention: 90,
        },
        metrics: {
          executions: 2847,
          successes: 2789,
          failures: 58,
          avgDuration: 1250,
          lastRun: new Date('2024-01-26T10:42:00'),
          nextRun: new Date('2024-01-26T10:45:00'),
        },
        created: new Date('2024-01-10'),
        updated: new Date('2024-01-25'),
        author: 'Security Team',
      },
      {
        id: 'rule-002',
        name: 'Domain Analysis & Threat Intelligence',
        description:
          'Comprehensive domain analysis including DNS, SSL certificates, and threat intelligence',
        enabled: true,
        priority: 7,
        triggers: [{ field: 'domain', condition: 'new_data', parameters: {} }],
        enrichments: [
          {
            type: 'domain_analysis',
            provider: 'SecurityTrails',
            endpoint: 'https://api.securitytrails.com/v1/domain',
            mapping: { hostname: 'domain' },
            cache_ttl: 43200,
            rate_limit: 50,
          },
          {
            type: 'certificate',
            provider: 'crt.sh',
            endpoint: 'https://crt.sh/?q=',
            mapping: { domain: 'domain' },
            cache_ttl: 86400,
          },
          {
            type: 'threat_intel',
            provider: 'URLVoid',
            endpoint: 'https://api.urlvoid.com/v1/pay-as-you-go/',
            mapping: { host: 'domain' },
            cache_ttl: 7200,
            rate_limit: 1000,
          },
        ],
        output: {
          format: 'merge',
          destination: 'database',
          notify: false,
          retention: 60,
        },
        metrics: {
          executions: 1456,
          successes: 1398,
          failures: 58,
          avgDuration: 2340,
          lastRun: new Date('2024-01-26T10:38:00'),
        },
        created: new Date('2024-01-12'),
        updated: new Date('2024-01-22'),
        author: 'Threat Intelligence Team',
      },
    ];

    const mockEnrichedEntities: EnrichedEntity[] = [
      {
        id: 'entity-001',
        original: {
          ip_address: '185.225.19.42',
          source: 'firewall_logs',
          timestamp: '2024-01-26T10:30:00Z',
        },
        enriched: {
          ip_address: '185.225.19.42',
          geolocation: {
            country: 'Russia',
            city: 'Moscow',
            latitude: 55.7558,
            longitude: 37.6176,
            timezone: 'Europe/Moscow',
          },
          reputation: {
            malicious: 8,
            suspicious: 12,
            clean: 0,
            reputation_score: -75,
          },
          threat_intelligence: {
            first_seen: '2023-08-15',
            last_seen: '2024-01-26',
            threat_types: ['botnet', 'malware_c2'],
            campaigns: ['APT29_2024'],
          },
          network_info: {
            asn: 'AS12345',
            org: 'Example Hosting Ltd',
            isp: 'RU-NET',
          },
        },
        enrichmentSources: [
          {
            provider: 'MaxMind',
            type: 'ip_geolocation',
            timestamp: new Date('2024-01-26T10:31:00'),
            confidence: 95,
            latency: 245,
            status: 'success',
          },
          {
            provider: 'VirusTotal',
            type: 'reputation_check',
            timestamp: new Date('2024-01-26T10:31:15'),
            confidence: 92,
            latency: 580,
            status: 'success',
          },
          {
            provider: 'AbuseIPDB',
            type: 'reputation_check',
            timestamp: new Date('2024-01-26T10:31:30'),
            confidence: 88,
            latency: 1240,
            status: 'success',
          },
        ],
        confidence: 92,
        riskScore: 85,
        lastEnriched: new Date('2024-01-26T10:31:30'),
        version: 1,
        tags: ['high_risk', 'malicious_ip', 'russia', 'botnet'],
      },
      {
        id: 'entity-002',
        original: {
          domain: 'covidinfo-gov.com',
          source: 'dns_logs',
          timestamp: '2024-01-26T09:45:00Z',
        },
        enriched: {
          domain: 'covidinfo-gov.com',
          dns_analysis: {
            a_records: ['185.225.19.42'],
            creation_date: '2023-12-15',
            expiration_date: '2024-12-15',
            registrar: 'NameCheap Inc.',
            nameservers: ['ns1.example.com', 'ns2.example.com'],
          },
          ssl_certificate: {
            issuer: 'Lets Encrypt',
            valid_from: '2024-01-01',
            valid_to: '2024-04-01',
            subject: '*.covidinfo-gov.com',
            fingerprint: 'aa:bb:cc:dd:ee:ff',
          },
          reputation: {
            malicious: 15,
            suspicious: 8,
            clean: 2,
            reputation_score: -68,
          },
          threat_classification: {
            category: 'phishing',
            family: 'covid_themed',
            confidence: 87,
          },
        },
        enrichmentSources: [
          {
            provider: 'SecurityTrails',
            type: 'domain_analysis',
            timestamp: new Date('2024-01-26T09:46:00'),
            confidence: 90,
            latency: 1850,
            status: 'success',
          },
          {
            provider: 'URLVoid',
            type: 'threat_intel',
            timestamp: new Date('2024-01-26T09:46:30'),
            confidence: 85,
            latency: 2200,
            status: 'success',
          },
        ],
        confidence: 87,
        riskScore: 78,
        lastEnriched: new Date('2024-01-26T09:46:30'),
        version: 1,
        tags: ['phishing', 'covid_themed', 'suspicious_domain', 'lets_encrypt'],
      },
    ];

    const mockAlerts: IntelligenceAlert[] = [
      {
        id: 'alert-001',
        timestamp: new Date('2024-01-26T10:32:00'),
        type: 'high_confidence_threat',
        severity: 'high',
        title: 'High-Risk IP Address Detected in Network Traffic',
        description:
          'IP address 185.225.19.42 with reputation score -75 detected in firewall logs. This IP is associated with APT29 campaigns and botnet activity.',
        source: 'IP Enrichment Rule',
        entities: ['entity-001'],
        recommendations: [
          {
            action: 'Block IP address at firewall level',
            priority: 'high',
            rationale:
              'High malicious reputation score and association with known threat actors',
          },
          {
            action: 'Investigate all recent connections to this IP',
            priority: 'medium',
            rationale: 'Determine potential compromise or data exfiltration',
          },
          {
            action: 'Scan affected systems for malware',
            priority: 'high',
            rationale: 'IP is associated with malware command and control',
          },
        ],
        acknowledged: false,
        metadata: {
          reputation_score: -75,
          threat_types: ['botnet', 'malware_c2'],
          confidence: 92,
        },
      },
      {
        id: 'alert-002',
        timestamp: new Date('2024-01-26T09:47:00'),
        type: 'new_ioc',
        severity: 'medium',
        title: 'Suspicious Domain with COVID-19 Theme Detected',
        description:
          'Domain covidinfo-gov.com exhibits suspicious characteristics including recent registration and phishing classification.',
        source: 'Domain Analysis Rule',
        entities: ['entity-002'],
        recommendations: [
          {
            action: 'Add domain to DNS blacklist',
            priority: 'medium',
            rationale:
              'Prevent users from accessing potentially malicious domain',
          },
          {
            action: 'Monitor for email campaigns using this domain',
            priority: 'low',
            rationale: 'Domain may be used in phishing campaigns',
          },
        ],
        acknowledged: true,
        assignedTo: 'Security Analyst',
        metadata: {
          domain_age: 42,
          ssl_validity: 90,
          reputation_score: -68,
        },
      },
    ];

    const mockCorrelations: FeedCorrelation[] = [
      {
        id: 'corr-001',
        name: 'Multi-Source IP Reputation Correlation',
        description:
          'Correlate IP addresses appearing in multiple threat intelligence feeds within 24 hours',
        enabled: true,
        rules: [
          {
            feeds: ['feed-001', 'feed-002', 'feed-003'],
            conditions: [
              {
                field1: 'ip_address',
                operator: 'equals',
                field2: 'ip_address',
              },
            ],
            timeWindow: 1440, // 24 hours
            minMatches: 2,
          },
        ],
        actions: [
          {
            type: 'create_alert',
            parameters: {
              severity: 'high',
              title: 'IP Address Confirmed by Multiple Intelligence Sources',
            },
          },
        ],
        metrics: {
          correlations: 47,
          alerts: 23,
          lastMatch: new Date('2024-01-26T08:15:00'),
        },
        created: new Date('2024-01-15'),
        updated: new Date('2024-01-25'),
      },
    ];

    setFeeds(mockFeeds);
    setEnrichmentRules(mockEnrichmentRules);
    setEnrichedEntities(mockEnrichedEntities);
    setAlerts(mockAlerts);
    setCorrelations(mockCorrelations);
  }, []);

  // Initialize data
  useEffect(() => {
    if (feeds.length === 0) {
      generateMockData();
    }
  }, [generateMockData, feeds.length]);

  // Real-time updates simulation
  useEffect(() => {
    if (!realTimeMode) return;

    const interval = setInterval(() => {
      // Simulate new intelligence data
      const newData = {
        timestamp: new Date(),
        source: 'Real-time Feed',
        type: 'ioc_update',
        data: Math.floor(Math.random() * 100) + 1,
      };

      onNewIntelligence?.(newData);

      // Occasionally add new alerts
      if (Math.random() < 0.1) {
        const newAlert: IntelligenceAlert = {
          id: `alert-${Date.now()}`,
          timestamp: new Date(),
          type: 'new_ioc',
          severity: 'medium',
          title: 'New IOC detected in real-time feed',
          description: 'Automated detection of new indicator of compromise',
          source: 'Real-time Monitor',
          entities: [],
          recommendations: [
            {
              action: 'Review and assess new IOC',
              priority: 'medium',
              rationale: 'New IOC requires analysis for relevance',
            },
          ],
          acknowledged: false,
          metadata: { auto_generated: true },
        };

        setAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);
        onAlert?.(newAlert);
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [realTimeMode, onNewIntelligence, onAlert]);

  // Filtered data
  const filteredFeeds = useMemo(() => {
    return feeds.filter((feed) => {
      const matchesSearch =
        searchTerm === '' ||
        feed.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feed.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feed.provider.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        filterStatus === 'all' || feed.status === filterStatus;
      const matchesType = filterType === 'all' || feed.type === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [feeds, searchTerm, filterStatus, filterType]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch =
        searchTerm === '' ||
        alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [alerts, searchTerm]);

  return (
    <div className="intelligence-feeds-enrichment">
      {/* Header */}
      <div className="ife-header">
        <div className="header-main">
          <h2>🧠 Intelligence Feeds & Automated Enrichment</h2>
          <div className="header-stats">
            <span className="stat">
              <strong>
                {feeds.filter((f) => f.status === 'active').length}
              </strong>{' '}
              Active Feeds
            </span>
            <span className="stat">
              <strong>{enrichmentRules.filter((r) => r.enabled).length}</strong>{' '}
              Rules
            </span>
            <span className="stat">
              <strong>{enrichedEntities.length}</strong> Enriched
            </span>
            <span className="stat">
              <strong>{alerts.filter((a) => !a.acknowledged).length}</strong>{' '}
              New Alerts
            </span>
          </div>
        </div>

        <div className="header-controls">
          <input
            type="text"
            placeholder="Search feeds, entities, and alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="error">Error</option>
            <option value="disabled">Disabled</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="commercial">Commercial</option>
            <option value="open_source">Open Source</option>
            <option value="community">Community</option>
            <option value="government">Government</option>
          </select>
          <button
            className={`realtime-toggle ${realTimeMode ? 'active' : ''}`}
            onClick={() => setRealTimeMode(!realTimeMode)}
          >
            {realTimeMode ? '🔴 Real-time ON' : '⏸️ Real-time OFF'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="ife-tabs">
        <button
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`tab-button ${activeTab === 'feeds' ? 'active' : ''}`}
          onClick={() => setActiveTab('feeds')}
        >
          📡 Feeds
        </button>
        <button
          className={`tab-button ${activeTab === 'enrichment' ? 'active' : ''}`}
          onClick={() => setActiveTab('enrichment')}
        >
          ⚡ Enrichment
        </button>
        <button
          className={`tab-button ${activeTab === 'entities' ? 'active' : ''}`}
          onClick={() => setActiveTab('entities')}
        >
          🎯 Entities
        </button>
        <button
          className={`tab-button ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          🚨 Alerts
        </button>
        <button
          className={`tab-button ${activeTab === 'correlations' ? 'active' : ''}`}
          onClick={() => setActiveTab('correlations')}
        >
          🔗 Correlations
        </button>
      </div>

      <div className="ife-content">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            <div className="dashboard-overview">
              {/* Key Metrics */}
              <div className="metrics-section">
                <h3>📈 Real-time Intelligence Metrics</h3>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-icon">📡</div>
                    <div className="metric-content">
                      <div className="metric-value">{feeds.length}</div>
                      <div className="metric-label">Intelligence Feeds</div>
                      <div className="metric-detail">
                        {feeds.filter((f) => f.status === 'active').length}{' '}
                        active,
                        {feeds.filter((f) => f.status === 'error').length}{' '}
                        errors
                      </div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon">⚡</div>
                    <div className="metric-content">
                      <div className="metric-value">
                        {feeds
                          .reduce((acc, f) => acc + f.metrics.totalRecords, 0)
                          .toLocaleString()}
                      </div>
                      <div className="metric-label">Intelligence Records</div>
                      <div className="metric-detail">
                        Last 24 hours: +
                        {Math.floor(Math.random() * 5000) + 1000}
                      </div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon">🎯</div>
                    <div className="metric-content">
                      <div className="metric-value">
                        {enrichedEntities.length}
                      </div>
                      <div className="metric-label">Enriched Entities</div>
                      <div className="metric-detail">
                        Avg confidence:{' '}
                        {Math.round(
                          enrichedEntities.reduce(
                            (acc, e) => acc + e.confidence,
                            0,
                          ) / enrichedEntities.length,
                        )}
                        %
                      </div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon">🚨</div>
                    <div className="metric-content">
                      <div className="metric-value">
                        {alerts.filter((a) => !a.acknowledged).length}
                      </div>
                      <div className="metric-label">Active Alerts</div>
                      <div className="metric-detail">
                        {
                          alerts.filter(
                            (a) =>
                              a.severity === 'critical' ||
                              a.severity === 'high',
                          ).length
                        }{' '}
                        high priority
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="activity-section">
                <h3>🔥 Recent Intelligence Activity</h3>
                <div className="activity-stream">
                  {[
                    ...feeds.map((feed) => ({
                      type: 'feed_update',
                      timestamp: feed.metrics.lastSync,
                      title: `${feed.name} synchronized`,
                      description: `${feed.metrics.totalRecords} records processed`,
                      severity: 'info' as const,
                    })),
                    ...alerts.slice(0, 5).map((alert) => ({
                      type: 'alert',
                      timestamp: alert.timestamp,
                      title: alert.title,
                      description: alert.description,
                      severity: alert.severity,
                    })),
                  ]
                    .sort(
                      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
                    )
                    .slice(0, 10)
                    .map((activity, index) => (
                      <div
                        key={index}
                        className={`activity-item ${activity.severity}`}
                      >
                        <div className="activity-timestamp">
                          {activity.timestamp.toLocaleTimeString()}
                        </div>
                        <div className="activity-content">
                          <div className="activity-title">{activity.title}</div>
                          <div className="activity-description">
                            {activity.description}
                          </div>
                        </div>
                        <div
                          className={`activity-severity ${activity.severity}`}
                        >
                          {activity.severity}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Feed Performance */}
              <div className="performance-section">
                <h3>📊 Feed Performance Overview</h3>
                <div className="feeds-performance">
                  {feeds.map((feed) => (
                    <div key={feed.id} className="feed-performance-card">
                      <div className="feed-performance-header">
                        <span className="feed-name">{feed.name}</span>
                        <span className={`feed-status ${feed.status}`}>
                          {feed.status}
                        </span>
                      </div>

                      <div className="performance-metrics">
                        <div className="performance-metric">
                          <span className="metric-name">Success Rate</span>
                          <div className="metric-bar">
                            <div
                              className="metric-fill success"
                              style={{ width: `${feed.metrics.successRate}%` }}
                            ></div>
                          </div>
                          <span className="metric-value">
                            {feed.metrics.successRate.toFixed(1)}%
                          </span>
                        </div>

                        <div className="performance-metric">
                          <span className="metric-name">Avg Latency</span>
                          <span className="metric-value">
                            {feed.metrics.avgLatency}ms
                          </span>
                        </div>

                        <div className="performance-metric">
                          <span className="metric-name">Records</span>
                          <span className="metric-value">
                            {feed.metrics.totalRecords.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feeds Tab */}
        {activeTab === 'feeds' && (
          <div className="feeds-tab">
            <div className="tab-header">
              <h3>📡 Intelligence Feeds Configuration</h3>
              <button className="primary-button">+ Add Feed</button>
            </div>

            <div className="feeds-grid">
              {filteredFeeds.map((feed) => (
                <div
                  key={feed.id}
                  className={`feed-card ${selectedFeed?.id === feed.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFeed(feed)}
                >
                  <div className="feed-header">
                    <div className="feed-meta">
                      <span className={`feed-type ${feed.type}`}>
                        {feed.type.replace('_', ' ')}
                      </span>
                      <span
                        className={`reliability-badge ${feed.reliability.toLowerCase()}`}
                      >
                        Reliability: {feed.reliability}
                      </span>
                    </div>
                    <div className={`status-indicator ${feed.status}`}></div>
                  </div>

                  <div className="feed-title">{feed.name}</div>
                  <div className="feed-provider">Provider: {feed.provider}</div>
                  <div className="feed-description">{feed.description}</div>

                  <div className="feed-stats">
                    <div className="stat-row">
                      <span className="stat-label">Records:</span>
                      <span className="stat-value">
                        {feed.metrics.totalRecords.toLocaleString()}
                      </span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Success Rate:</span>
                      <span className="stat-value">
                        {feed.metrics.successRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Frequency:</span>
                      <span className="stat-value">
                        {feed.frequency.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Last Sync:</span>
                      <span className="stat-value">
                        {feed.metrics.lastSync.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="feed-confidence">
                    <span className="confidence-label">Confidence:</span>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{ width: `${feed.confidence}%` }}
                      ></div>
                    </div>
                    <span className="confidence-value">{feed.confidence}%</span>
                  </div>

                  <div className="feed-categories">
                    <span className={`category-badge ${feed.category}`}>
                      {feed.category.replace('_', ' ')}
                    </span>
                    <span className={`format-badge ${feed.format}`}>
                      {feed.format.toUpperCase()}
                    </span>
                  </div>

                  <div className="feed-tags">
                    {feed.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="feed-tag">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {feed.alerts.length > 0 && (
                    <div className="feed-alerts">
                      <strong>
                        ⚠️ {feed.alerts.filter((a) => !a.resolved).length}{' '}
                        Active Alerts
                      </strong>
                    </div>
                  )}

                  <div className="feed-actions">
                    <button className="action-button">⚙️ Configure</button>
                    <button className="action-button">📊 View Data</button>
                    <button className="action-button">🔄 Sync Now</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enrichment Tab */}
        {activeTab === 'enrichment' && (
          <div className="enrichment-tab">
            <div className="tab-header">
              <h3>⚡ Enrichment Rules</h3>
              <button className="primary-button">+ Add Rule</button>
            </div>

            <div className="enrichment-grid">
              {enrichmentRules.map((rule) => (
                <div key={rule.id} className="enrichment-card">
                  <div className="enrichment-header">
                    <div className="enrichment-meta">
                      <span className="priority-badge">
                        Priority: {rule.priority}
                      </span>
                      <span
                        className={`status-indicator ${rule.enabled ? 'enabled' : 'disabled'}`}
                      >
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  <div className="enrichment-title">{rule.name}</div>
                  <div className="enrichment-description">
                    {rule.description}
                  </div>

                  <div className="enrichment-stats">
                    <div className="stat-item">
                      <span className="stat-label">Executions:</span>
                      <span className="stat-value">
                        {rule.metrics.executions}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Success Rate:</span>
                      <span className="stat-value">
                        {(
                          (rule.metrics.successes / rule.metrics.executions) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Avg Duration:</span>
                      <span className="stat-value">
                        {rule.metrics.avgDuration}ms
                      </span>
                    </div>
                  </div>

                  <div className="enrichment-sources">
                    <strong>
                      Enrichment Sources ({rule.enrichments.length}):
                    </strong>
                    <div className="sources-list">
                      {rule.enrichments.map((enrichment, index) => (
                        <span
                          key={index}
                          className={`source-tag ${enrichment.type}`}
                        >
                          {enrichment.provider}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="enrichment-triggers">
                    <strong>Triggers:</strong>
                    {rule.triggers.map((trigger, index) => (
                      <div key={index} className="trigger-item">
                        {trigger.field} on {trigger.condition.replace('_', ' ')}
                      </div>
                    ))}
                  </div>

                  {rule.metrics.lastRun && (
                    <div className="enrichment-timing">
                      <div className="timing-item">
                        <strong>Last Run:</strong>{' '}
                        {rule.metrics.lastRun.toLocaleString()}
                      </div>
                      {rule.metrics.nextRun && (
                        <div className="timing-item">
                          <strong>Next Run:</strong>{' '}
                          {rule.metrics.nextRun.toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="enrichment-actions">
                    <button className="action-button">⚙️ Configure</button>
                    <button className="action-button">▶️ Run Now</button>
                    <button
                      className={`action-button ${rule.enabled ? 'disable' : 'enable'}`}
                    >
                      {rule.enabled ? '⏸️ Disable' : '▶️ Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entities Tab */}
        {activeTab === 'entities' && (
          <div className="entities-tab">
            <div className="tab-header">
              <h3>🎯 Enriched Entities</h3>
              <div className="header-actions">
                <button className="action-button">🔄 Refresh</button>
                <button className="action-button">📤 Export</button>
              </div>
            </div>

            <div className="entities-grid">
              {enrichedEntities.map((entity) => (
                <div
                  key={entity.id}
                  className={`entity-card ${selectedEntity?.id === entity.id ? 'selected' : ''}`}
                  onClick={() => setSelectedEntity(entity)}
                >
                  <div className="entity-header">
                    <div className="entity-scores">
                      <span
                        className={`confidence-score ${entity.confidence > 80 ? 'high' : entity.confidence > 60 ? 'medium' : 'low'}`}
                      >
                        Confidence: {entity.confidence}%
                      </span>
                      <span
                        className={`risk-score ${entity.riskScore > 70 ? 'high' : entity.riskScore > 40 ? 'medium' : 'low'}`}
                      >
                        Risk: {entity.riskScore}
                      </span>
                    </div>
                    <div className="entity-version">v{entity.version}</div>
                  </div>

                  <div className="entity-original">
                    <strong>Original Data:</strong>
                    <div className="data-preview">
                      {Object.entries(entity.original).map(([key, value]) => (
                        <div key={key} className="data-item">
                          <span className="data-key">{key}:</span>
                          <span className="data-value">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="entity-enrichment-summary">
                    <strong>
                      Enrichment Sources ({entity.enrichmentSources.length}):
                    </strong>
                    <div className="sources-grid">
                      {entity.enrichmentSources.map((source, index) => (
                        <div
                          key={index}
                          className={`source-item ${source.status}`}
                        >
                          <div className="source-provider">
                            {source.provider}
                          </div>
                          <div className="source-type">
                            {source.type.replace('_', ' ')}
                          </div>
                          <div className="source-metrics">
                            <span>Confidence: {source.confidence}%</span>
                            <span>Latency: {source.latency}ms</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="entity-enriched-preview">
                    <strong>Key Enriched Data:</strong>
                    <div className="enriched-highlights">
                      {Object.entries(entity.enriched)
                        .filter(
                          ([key]) => !['timestamp', 'source'].includes(key),
                        )
                        .slice(0, 3)
                        .map(([key, value]) => (
                          <div key={key} className="enriched-item">
                            <strong>{key.replace('_', ' ')}:</strong>
                            <span>
                              {typeof value === 'object'
                                ? JSON.stringify(value).substring(0, 50) + '...'
                                : String(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="entity-metadata">
                    <div className="metadata-item">
                      <strong>Last Enriched:</strong>{' '}
                      {entity.lastEnriched.toLocaleString()}
                    </div>
                  </div>

                  <div className="entity-tags">
                    {entity.tags.map((tag) => (
                      <span key={tag} className="entity-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Entity Details Panel */}
            {selectedEntity && (
              <div className="entity-details-panel">
                <div className="panel-header">
                  <h3>Entity Details</h3>
                  <div className="panel-actions">
                    <button className="action-button">🔄 Re-enrich</button>
                    <button className="action-button">📤 Export</button>
                    <button
                      className="close-button"
                      onClick={() => setSelectedEntity(null)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="panel-content">
                  <div className="entity-scores-detail">
                    <div className="score-item">
                      <span className="score-label">Confidence:</span>
                      <div className="score-bar">
                        <div
                          className="score-fill confidence"
                          style={{ width: `${selectedEntity.confidence}%` }}
                        ></div>
                      </div>
                      <span className="score-value">
                        {selectedEntity.confidence}%
                      </span>
                    </div>
                    <div className="score-item">
                      <span className="score-label">Risk Score:</span>
                      <div className="score-bar">
                        <div
                          className="score-fill risk"
                          style={{ width: `${selectedEntity.riskScore}%` }}
                        ></div>
                      </div>
                      <span className="score-value">
                        {selectedEntity.riskScore}
                      </span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Original Data</h4>
                    <div className="json-viewer">
                      <pre>
                        {JSON.stringify(selectedEntity.original, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Enriched Data</h4>
                    <div className="json-viewer">
                      <pre>
                        {JSON.stringify(selectedEntity.enriched, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Enrichment Sources</h4>
                    <div className="sources-detail">
                      {selectedEntity.enrichmentSources.map((source, index) => (
                        <div
                          key={index}
                          className={`source-detail ${source.status}`}
                        >
                          <div className="source-header">
                            <span className="source-provider">
                              {source.provider}
                            </span>
                            <span className={`source-status ${source.status}`}>
                              {source.status}
                            </span>
                          </div>
                          <div className="source-info">
                            <div className="info-item">
                              <strong>Type:</strong>{' '}
                              {source.type.replace('_', ' ')}
                            </div>
                            <div className="info-item">
                              <strong>Timestamp:</strong>{' '}
                              {source.timestamp.toLocaleString()}
                            </div>
                            <div className="info-item">
                              <strong>Confidence:</strong> {source.confidence}%
                            </div>
                            <div className="info-item">
                              <strong>Latency:</strong> {source.latency}ms
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="alerts-tab">
            <div className="tab-header">
              <h3>🚨 Intelligence Alerts</h3>
              <div className="header-actions">
                <button className="action-button">✓ Mark All Read</button>
                <button className="action-button">🔄 Refresh</button>
              </div>
            </div>

            <div className="alerts-list">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`alert-card ${alert.severity} ${alert.acknowledged ? 'acknowledged' : ''}`}
                >
                  <div className="alert-header">
                    <div className="alert-main">
                      <div className="alert-title">{alert.title}</div>
                      <div className="alert-meta">
                        <span className={`alert-type ${alert.type}`}>
                          {alert.type.replace('_', ' ')}
                        </span>
                        <span className="alert-source">{alert.source}</span>
                        <span className="alert-timestamp">
                          {alert.timestamp.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="alert-indicators">
                      <span className={`severity-indicator ${alert.severity}`}>
                        {alert.severity}
                      </span>
                      {alert.acknowledged && (
                        <span className="acknowledged-indicator">
                          Acknowledged
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="alert-description">{alert.description}</div>

                  {alert.recommendations.length > 0 && (
                    <div className="alert-recommendations">
                      <strong>Recommended Actions:</strong>
                      <div className="recommendations-list">
                        {alert.recommendations.map((rec, index) => (
                          <div
                            key={index}
                            className={`recommendation ${rec.priority}`}
                          >
                            <div className="recommendation-action">
                              <span
                                className={`priority-indicator ${rec.priority}`}
                              >
                                {rec.priority.toUpperCase()}
                              </span>
                              <span>{rec.action}</span>
                            </div>
                            <div className="recommendation-rationale">
                              {rec.rationale}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {alert.assignedTo && (
                    <div className="alert-assignment">
                      <strong>Assigned to:</strong> {alert.assignedTo}
                    </div>
                  )}

                  <div className="alert-actions">
                    {!alert.acknowledged && (
                      <button className="action-button primary">
                        ✓ Acknowledge
                      </button>
                    )}
                    <button className="action-button">🔍 Investigate</button>
                    <button className="action-button">📋 Create Case</button>
                    <button className="action-button">❌ Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Correlations Tab */}
        {activeTab === 'correlations' && (
          <div className="correlations-tab">
            <div className="tab-header">
              <h3>🔗 Feed Correlations</h3>
              <button className="primary-button">+ Add Correlation</button>
            </div>

            <div className="correlations-grid">
              {correlations.map((correlation) => (
                <div key={correlation.id} className="correlation-card">
                  <div className="correlation-header">
                    <div className="correlation-meta">
                      <span
                        className={`status-indicator ${correlation.enabled ? 'enabled' : 'disabled'}`}
                      >
                        {correlation.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  <div className="correlation-title">{correlation.name}</div>
                  <div className="correlation-description">
                    {correlation.description}
                  </div>

                  <div className="correlation-rules">
                    <strong>Correlation Rules:</strong>
                    {correlation.rules.map((rule, index) => (
                      <div key={index} className="rule-summary">
                        <div className="rule-feeds">
                          <strong>Feeds:</strong> {rule.feeds.length} feeds
                        </div>
                        <div className="rule-conditions">
                          <strong>Conditions:</strong> {rule.conditions.length}{' '}
                          conditions
                        </div>
                        <div className="rule-window">
                          <strong>Time Window:</strong> {rule.timeWindow}{' '}
                          minutes
                        </div>
                        <div className="rule-matches">
                          <strong>Min Matches:</strong> {rule.minMatches}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="correlation-metrics">
                    <div className="metric-item">
                      <span className="metric-label">Total Correlations:</span>
                      <span className="metric-value">
                        {correlation.metrics.correlations}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Alerts Generated:</span>
                      <span className="metric-value">
                        {correlation.metrics.alerts}
                      </span>
                    </div>
                    {correlation.metrics.lastMatch && (
                      <div className="metric-item">
                        <span className="metric-label">Last Match:</span>
                        <span className="metric-value">
                          {correlation.metrics.lastMatch.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="correlation-actions">
                    <div className="action-item">
                      <strong>Actions ({correlation.actions.length}):</strong>
                      {correlation.actions.map((action, index) => (
                        <span key={index} className="action-tag">
                          {action.type.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="correlation-controls">
                    <button className="action-button">⚙️ Configure</button>
                    <button className="action-button">📊 View Matches</button>
                    <button
                      className={`action-button ${correlation.enabled ? 'disable' : 'enable'}`}
                    >
                      {correlation.enabled ? '⏸️ Disable' : '▶️ Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligenceFeedsEnrichment;
