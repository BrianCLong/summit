import { EventEmitter } from 'events';
import { cacheService } from './cacheService';

export interface IOC {
  id: string;
  type: IOCType;
  value: string;
  description?: string;
  threatType: ThreatType;
  severity: Severity;
  confidence: number; // 0-1
  firstSeen: string;
  lastSeen: string;
  tags: string[];
  source: string;
  tlp: TLP; // Traffic Light Protocol
  isActive: boolean;
  falsePositive: boolean;
  context: IOCContext;
  relationships: IOCRelationship[];
  detections: Detection[];
  attribution: Attribution;
  metadata: any;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface IOCContext {
  campaign?: string;
  family?: string;
  country?: string;
  sector?: string[];
  killChain: KillChainPhase[];
  mitreTactics: string[];
  mitreTechniques: string[];
  references: Reference[];
}

export interface IOCRelationship {
  relatedIOC: string;
  relationshipType: IOCRelationshipType;
  confidence: number;
  context?: string;
}

export interface Detection {
  id: string;
  iocId: string;
  detectionTime: string;
  source: string;
  sourceIP?: string;
  destinationIP?: string;
  hostname?: string;
  username?: string;
  process?: string;
  commandLine?: string;
  filePath?: string;
  registry?: string;
  networkConnection?: NetworkConnection;
  severity: Severity;
  status: DetectionStatus;
  investigationId?: string;
  rawEvent: any;
  enrichment: DetectionEnrichment;
}

export interface NetworkConnection {
  protocol: string;
  sourcePort: number;
  destinationPort: number;
  bytes: number;
  packets: number;
  duration: number;
}

export interface DetectionEnrichment {
  geolocation?: Geolocation;
  reputation?: ReputationData;
  dns?: DNSRecord[];
  whois?: WhoisData;
  sandbox?: SandboxResult;
  threatIntel?: ThreatIntelligence[];
}

export interface ThreatIntelligence {
  source: string;
  category: string;
  score: number;
  details: any;
  lastUpdated: string;
}

export interface Geolocation {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  asn?: string;
  organization?: string;
}

export interface ReputationData {
  score: number; // 0-100
  category: ReputationCategory;
  sources: string[];
  details: any;
}

export interface DNSRecord {
  type: string;
  value: string;
  ttl: number;
  timestamp: string;
}

export interface WhoisData {
  domain: string;
  registrar: string;
  registrant: string;
  creationDate: string;
  expirationDate: string;
  nameservers: string[];
}

export interface SandboxResult {
  provider: string;
  verdict: SandboxVerdict;
  score: number;
  behaviors: string[];
  networkActivity: any[];
  fileActivity: any[];
  registryActivity: any[];
  screenshots: string[];
  reportUrl?: string;
}

export interface Reference {
  type: ReferenceType;
  url?: string;
  title?: string;
  description?: string;
}

export interface Attribution {
  actor?: string;
  group?: string;
  country?: string;
  confidence: number;
  reasoning: string[];
}

export interface ThreatHunt {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  huntType: HuntType;
  priority: Priority;
  status: HuntStatus;
  createdBy: string;
  assignedTo: string[];
  startDate: string;
  endDate?: string;
  queries: HuntQuery[];
  findings: HuntFinding[];
  iocs: string[]; // IOC IDs
  timeline: HuntTimelineEntry[];
  tags: string[];
  ttps: string[]; // MITRE ATT&CK techniques
  dataSource: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface HuntQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  queryType: QueryType;
  dataSource: string;
  timeRange: TimeRange;
  results: QueryResult[];
  executedAt?: string;
  executedBy?: string;
}

export interface QueryResult {
  timestamp: string;
  count: number;
  samples: any[];
  enrichment?: any;
}

export interface HuntFinding {
  id: string;
  huntId: string;
  title: string;
  description: string;
  severity: Severity;
  confidence: number;
  relatedQueries: string[];
  relatedIOCs: string[];
  evidence: Evidence[];
  recommendations: string[];
  status: FindingStatus;
  createdAt: string;
  createdBy: string;
}

export interface Evidence {
  type: EvidenceType;
  value: string;
  source: string;
  timestamp: string;
  context?: any;
}

export interface HuntTimelineEntry {
  timestamp: string;
  event: string;
  description: string;
  user: string;
  data?: any;
}

export interface TimeRange {
  start: string;
  end: string;
  timezone?: string;
}

export type IOCType = 
  | 'ip' 
  | 'domain' 
  | 'url' 
  | 'file_hash' 
  | 'email' 
  | 'user_agent' 
  | 'registry_key'
  | 'file_path' 
  | 'process_name' 
  | 'service_name' 
  | 'certificate_hash'
  | 'mutex' 
  | 'pipe_name' 
  | 'yara_rule';

export type ThreatType = 
  | 'malware' 
  | 'phishing' 
  | 'c2' 
  | 'exploit' 
  | 'reconnaissance'
  | 'lateral_movement' 
  | 'persistence' 
  | 'data_exfiltration' 
  | 'ransomware'
  | 'apt' 
  | 'insider_threat';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TLP = 'WHITE' | 'GREEN' | 'AMBER' | 'RED';

export type KillChainPhase = 
  | 'reconnaissance' 
  | 'weaponization' 
  | 'delivery' 
  | 'exploitation'
  | 'installation' 
  | 'command_control' 
  | 'actions_objectives';

export type IOCRelationshipType = 
  | 'related' 
  | 'variant' 
  | 'predecessor' 
  | 'successor' 
  | 'derived_from'
  | 'communicates_with' 
  | 'downloads' 
  | 'drops' 
  | 'uses';

export type DetectionStatus = 
  | 'NEW' 
  | 'INVESTIGATING' 
  | 'CONFIRMED' 
  | 'FALSE_POSITIVE' 
  | 'RESOLVED';

export type ReputationCategory = 
  | 'BENIGN' 
  | 'SUSPICIOUS' 
  | 'MALICIOUS' 
  | 'UNKNOWN';

export type SandboxVerdict = 
  | 'CLEAN' 
  | 'SUSPICIOUS' 
  | 'MALICIOUS' 
  | 'UNKNOWN' 
  | 'ERROR';

export type ReferenceType = 
  | 'report' 
  | 'article' 
  | 'blog' 
  | 'advisory' 
  | 'cve' 
  | 'signature';

export type HuntType = 
  | 'PROACTIVE' 
  | 'REACTIVE' 
  | 'RESEARCH' 
  | 'VALIDATION' 
  | 'BASELINE';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type HuntStatus = 
  | 'PLANNING' 
  | 'ACTIVE' 
  | 'ON_HOLD' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type QueryType = 
  | 'SPLUNK' 
  | 'ELASTICSEARCH' 
  | 'KUSTO' 
  | 'SQL' 
  | 'CYPHER' 
  | 'SIGMA';

export type FindingStatus = 
  | 'DRAFT' 
  | 'UNDER_REVIEW' 
  | 'CONFIRMED' 
  | 'FALSE_POSITIVE' 
  | 'RESOLVED';

export type EvidenceType = 
  | 'LOG_ENTRY' 
  | 'NETWORK_TRAFFIC' 
  | 'FILE_ANALYSIS' 
  | 'REGISTRY_CHANGE'
  | 'PROCESS_EXECUTION' 
  | 'DNS_QUERY' 
  | 'HTTP_REQUEST';

export class ThreatHuntingService extends EventEmitter {
  private iocs: Map<string, IOC> = new Map();
  private detections: Map<string, Detection> = new Map();
  private hunts: Map<string, ThreatHunt> = new Map();
  private feedSources: Map<string, ThreatIntelFeed> = new Map();

  constructor() {
    super();
    console.log('[THREAT_HUNTING] Advanced threat hunting service initialized');
    this.initializeThreatFeeds();
    this.initializeSampleIOCs();
    
    // Periodic tasks
    setInterval(() => {
      this.updateThreatFeeds();
      this.performAutomaticHunts();
      this.cleanupExpiredIOCs();
    }, 300000); // Every 5 minutes
  }

  private async initializeThreatFeeds(): Promise<void> {
    // Initialize threat intelligence feed configurations
    const feeds: ThreatIntelFeed[] = [
      {
        id: 'feed-misp',
        name: 'MISP Feed',
        type: 'MISP',
        url: 'https://misp.local/attributes/restSearch',
        format: 'json',
        isActive: true,
        updateInterval: 3600, // 1 hour
        lastUpdate: new Date().toISOString(),
        credentials: { apiKey: 'misp-api-key' }
      },
      {
        id: 'feed-alienvault',
        name: 'AlienVault OTX',
        type: 'OTX',
        url: 'https://otx.alienvault.com/api/v1/pulses/subscribed',
        format: 'json',
        isActive: true,
        updateInterval: 7200, // 2 hours
        lastUpdate: new Date().toISOString(),
        credentials: { apiKey: 'otx-api-key' }
      },
      {
        id: 'feed-virustotal',
        name: 'VirusTotal Intelligence',
        type: 'VT',
        url: 'https://www.virustotal.com/api/v3/',
        format: 'json',
        isActive: true,
        updateInterval: 1800, // 30 minutes
        lastUpdate: new Date().toISOString(),
        credentials: { apiKey: 'vt-api-key' }
      }
    ];

    feeds.forEach(feed => {
      this.feedSources.set(feed.id, feed);
    });

    console.log(`[THREAT_HUNTING] Initialized ${feeds.length} threat intelligence feeds`);
  }

  private async initializeSampleIOCs(): Promise<void> {
    const sampleIOCs: Omit<IOC, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        type: 'ip',
        value: '185.220.101.42',
        description: 'Known C2 server for banking trojan',
        threatType: 'c2',
        severity: 'HIGH',
        confidence: 0.9,
        firstSeen: '2025-08-20T10:00:00Z',
        lastSeen: '2025-08-26T15:30:00Z',
        tags: ['banking_trojan', 'c2_server', 'emotet'],
        source: 'MISP',
        tlp: 'AMBER',
        isActive: true,
        falsePositive: false,
        context: {
          campaign: 'Emotet Campaign 2025',
          family: 'Emotet',
          country: 'RU',
          sector: ['financial'],
          killChain: ['command_control'],
          mitreTactics: ['TA0011'],
          mitreTechniques: ['T1071.001'],
          references: [
            {
              type: 'report',
              url: 'https://threat-intel.com/emotet-2025',
              title: 'Emotet Banking Trojan Analysis 2025'
            }
          ]
        },
        relationships: [],
        detections: [],
        attribution: {
          group: 'TA542',
          country: 'RU',
          confidence: 0.8,
          reasoning: ['Infrastructure patterns', 'TTP overlap', 'Timing analysis']
        },
        metadata: { ports: [80, 443, 8080] },
        createdBy: 'threat-intel-feed'
      },
      {
        type: 'domain',
        value: 'evil-phishing-site.com',
        description: 'Phishing domain impersonating major bank',
        threatType: 'phishing',
        severity: 'CRITICAL',
        confidence: 0.95,
        firstSeen: '2025-08-25T08:00:00Z',
        lastSeen: '2025-08-26T17:00:00Z',
        tags: ['phishing', 'banking', 'credential_harvesting'],
        source: 'Anti-Phishing Working Group',
        tlp: 'WHITE',
        isActive: true,
        falsePositive: false,
        context: {
          campaign: 'Banking Phishing Q3 2025',
          country: 'CN',
          sector: ['financial'],
          killChain: ['delivery', 'exploitation'],
          mitreTactics: ['TA0001', 'TA0006'],
          mitreTechniques: ['T1566.002', 'T1078'],
          references: [
            {
              type: 'advisory',
              url: 'https://apwg.org/advisory/banking-phishing-2025',
              title: 'Banking Phishing Campaign Advisory'
            }
          ]
        },
        relationships: [],
        detections: [],
        attribution: {
          country: 'CN',
          confidence: 0.7,
          reasoning: ['Domain registration patterns', 'Hosting infrastructure']
        },
        metadata: { registrar: 'Suspicious Registrar LLC' },
        createdBy: 'phishing-analyst'
      },
      {
        type: 'file_hash',
        value: '44d88612fea8a8f36de82e1278abb02f',
        description: 'Ransomware payload (MD5)',
        threatType: 'ransomware',
        severity: 'CRITICAL',
        confidence: 1.0,
        firstSeen: '2025-08-24T12:00:00Z',
        lastSeen: '2025-08-26T16:45:00Z',
        tags: ['ransomware', 'lockbit', 'encryption'],
        source: 'VirusTotal',
        tlp: 'GREEN',
        isActive: true,
        falsePositive: false,
        context: {
          campaign: 'LockBit 3.0',
          family: 'LockBit',
          killChain: ['actions_objectives'],
          mitreTactics: ['TA0040'],
          mitreTechniques: ['T1486'],
          references: [
            {
              type: 'report',
              url: 'https://security-research.com/lockbit-analysis',
              title: 'LockBit 3.0 Technical Analysis'
            }
          ]
        },
        relationships: [],
        detections: [],
        attribution: {
          group: 'LockBit',
          confidence: 1.0,
          reasoning: ['Code signature analysis', 'Behavioral patterns']
        },
        metadata: { 
          fileSize: 2048576,
          fileType: 'PE32',
          firstSubmission: '2025-08-24T12:00:00Z'
        },
        createdBy: 'malware-analyst'
      }
    ];

    for (const iocData of sampleIOCs) {
      await this.createIOC(iocData, iocData.createdBy);
    }

    console.log(`[THREAT_HUNTING] Initialized ${sampleIOCs.length} sample IOCs`);
  }

  /**
   * Create a new IOC
   */
  async createIOC(iocData: Omit<IOC, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string): Promise<IOC> {
    const iocId = `ioc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const ioc: IOC = {
      ...iocData,
      id: iocId,
      createdBy,
      createdAt: now,
      updatedAt: now
    };

    this.iocs.set(iocId, ioc);
    await cacheService.set(`ioc:${iocId}`, ioc, 86400); // Cache for 24 hours

    // Trigger automatic detection searches
    this.searchForIOCDetections(ioc);

    this.emit('iocCreated', ioc);
    console.log(`[THREAT_HUNTING] Created IOC: ${ioc.type} - ${ioc.value}`);

    return ioc;
  }

  /**
   * Create a new threat hunt
   */
  async createThreatHunt(huntData: Omit<ThreatHunt, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string): Promise<ThreatHunt> {
    const huntId = `hunt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const hunt: ThreatHunt = {
      ...huntData,
      id: huntId,
      createdBy,
      createdAt: now,
      updatedAt: now,
      timeline: [{
        timestamp: now,
        event: 'HUNT_CREATED',
        description: `Threat hunt "${huntData.name}" created`,
        user: createdBy
      }]
    };

    this.hunts.set(huntId, hunt);
    await cacheService.set(`hunt:${huntId}`, hunt, 86400 * 30); // Cache for 30 days

    this.emit('huntCreated', hunt);
    console.log(`[THREAT_HUNTING] Created threat hunt: ${hunt.name}`);

    return hunt;
  }

  /**
   * Execute hunt queries
   */
  async executeHuntQuery(huntId: string, queryId: string, executedBy: string): Promise<QueryResult> {
    const hunt = this.hunts.get(huntId);
    if (!hunt) {
      throw new Error(`Hunt not found: ${huntId}`);
    }

    const query = hunt.queries.find(q => q.id === queryId);
    if (!query) {
      throw new Error(`Query not found: ${queryId}`);
    }

    // Simulate query execution (in real implementation, this would execute against actual data sources)
    const result = await this.simulateQueryExecution(query);
    
    query.results.push(result);
    query.executedAt = new Date().toISOString();
    query.executedBy = executedBy;

    hunt.updatedAt = new Date().toISOString();
    hunt.timeline.push({
      timestamp: new Date().toISOString(),
      event: 'QUERY_EXECUTED',
      description: `Query "${query.name}" executed`,
      user: executedBy,
      data: { queryId, resultCount: result.count }
    });

    this.hunts.set(huntId, hunt);
    await cacheService.set(`hunt:${huntId}`, hunt, 86400 * 30);

    this.emit('queryExecuted', { hunt, query, result });
    console.log(`[THREAT_HUNTING] Executed query ${query.name} for hunt ${hunt.name}: ${result.count} results`);

    return result;
  }

  /**
   * Search for IOC detections in historical data
   */
  private async searchForIOCDetections(ioc: IOC): Promise<Detection[]> {
    // Simulate detection search (in real implementation, this would search logs, SIEM, etc.)
    const detections: Detection[] = [];

    // Generate sample detections based on IOC type
    if (Math.random() > 0.7) { // 30% chance of finding detections
      const detectionCount = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < detectionCount; i++) {
        const detection = await this.generateSampleDetection(ioc);
        detections.push(detection);
        this.detections.set(detection.id, detection);
      }
    }

    return detections;
  }

  /**
   * Generate sample detection for demonstration
   */
  private async generateSampleDetection(ioc: IOC): Promise<Detection> {
    const detectionId = `det-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const detectionTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Within last 7 days

    const detection: Detection = {
      id: detectionId,
      iocId: ioc.id,
      detectionTime: detectionTime.toISOString(),
      source: 'SIEM_CORRELATION',
      sourceIP: this.generateRandomIP(),
      hostname: `host-${Math.floor(Math.random() * 100)}.company.local`,
      severity: ioc.severity,
      status: 'NEW',
      rawEvent: {
        timestamp: detectionTime.toISOString(),
        source: 'security_logs',
        event_type: ioc.type === 'ip' ? 'network_connection' : 'file_access',
        details: `Detection of IOC ${ioc.value}`
      },
      enrichment: await this.enrichDetection(ioc.value, ioc.type)
    };

    if (ioc.type === 'ip') {
      detection.networkConnection = {
        protocol: 'TCP',
        sourcePort: Math.floor(Math.random() * 65535),
        destinationPort: ioc.metadata?.ports?.[0] || 443,
        bytes: Math.floor(Math.random() * 100000),
        packets: Math.floor(Math.random() * 1000),
        duration: Math.floor(Math.random() * 3600)
      };
    }

    console.log(`[THREAT_HUNTING] Generated detection for IOC ${ioc.value}: ${detection.id}`);
    return detection;
  }

  /**
   * Enrich detection with additional context
   */
  private async enrichDetection(value: string, type: IOCType): Promise<DetectionEnrichment> {
    const enrichment: DetectionEnrichment = {};

    if (type === 'ip') {
      // Simulate geolocation lookup
      enrichment.geolocation = {
        country: ['US', 'RU', 'CN', 'DE', 'UK'][Math.floor(Math.random() * 5)],
        city: 'Unknown',
        asn: `AS${Math.floor(Math.random() * 65535)}`,
        organization: 'Unknown ISP'
      };

      // Simulate reputation lookup
      enrichment.reputation = {
        score: Math.floor(Math.random() * 100),
        category: Math.random() > 0.5 ? 'MALICIOUS' : 'SUSPICIOUS',
        sources: ['VirusTotal', 'AbuseIPDB', 'ThreatConnect'],
        details: { categories: ['malware', 'c2'] }
      };
    }

    if (type === 'domain') {
      // Simulate DNS records
      enrichment.dns = [
        {
          type: 'A',
          value: this.generateRandomIP(),
          ttl: 3600,
          timestamp: new Date().toISOString()
        }
      ];

      // Simulate WHOIS data
      enrichment.whois = {
        domain: value,
        registrar: 'Suspicious Registrar LLC',
        registrant: 'Privacy Protected',
        creationDate: '2025-08-01T00:00:00Z',
        expirationDate: '2026-08-01T00:00:00Z',
        nameservers: ['ns1.suspicious.com', 'ns2.suspicious.com']
      };
    }

    return enrichment;
  }

  /**
   * Simulate query execution for demonstration
   */
  private async simulateQueryExecution(query: HuntQuery): Promise<QueryResult> {
    // Simulate different result patterns based on query type
    const baseCount = Math.floor(Math.random() * 100);
    const samples = [];

    for (let i = 0; i < Math.min(baseCount, 10); i++) {
      samples.push({
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        source_ip: this.generateRandomIP(),
        event_type: query.queryType === 'SPLUNK' ? 'network_event' : 'security_alert',
        details: `Sample result ${i + 1} for query ${query.name}`
      });
    }

    const result: QueryResult = {
      timestamp: new Date().toISOString(),
      count: baseCount,
      samples,
      enrichment: {
        avgEventsPerHour: Math.floor(baseCount / 24),
        topSources: samples.map(s => s.source_ip).slice(0, 3),
        timeDistribution: { morning: 25, afternoon: 35, evening: 25, night: 15 }
      }
    };

    return result;
  }

  /**
   * Get all IOCs with optional filtering
   */
  getIOCs(filters?: {
    type?: IOCType;
    severity?: Severity;
    isActive?: boolean;
    tags?: string[];
  }): IOC[] {
    let iocs = Array.from(this.iocs.values());

    if (filters) {
      if (filters.type) {
        iocs = iocs.filter(ioc => ioc.type === filters.type);
      }
      if (filters.severity) {
        iocs = iocs.filter(ioc => ioc.severity === filters.severity);
      }
      if (filters.isActive !== undefined) {
        iocs = iocs.filter(ioc => ioc.isActive === filters.isActive);
      }
      if (filters.tags && filters.tags.length > 0) {
        iocs = iocs.filter(ioc => 
          filters.tags!.some(tag => ioc.tags.includes(tag))
        );
      }
    }

    return iocs.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  }

  /**
   * Get all threat hunts
   */
  getThreatHunts(status?: HuntStatus): ThreatHunt[] {
    let hunts = Array.from(this.hunts.values());

    if (status) {
      hunts = hunts.filter(hunt => hunt.status === status);
    }

    return hunts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get detections for an IOC
   */
  getDetections(iocId?: string): Detection[] {
    let detections = Array.from(this.detections.values());

    if (iocId) {
      detections = detections.filter(det => det.iocId === iocId);
    }

    return detections.sort((a, b) => 
      new Date(b.detectionTime).getTime() - new Date(a.detectionTime).getTime()
    );
  }

  /**
   * Get threat hunting statistics
   */
  getThreatHuntingStatistics() {
    const iocs = Array.from(this.iocs.values());
    const hunts = Array.from(this.hunts.values());
    const detections = Array.from(this.detections.values());

    const iocsByType = iocs.reduce((acc, ioc) => {
      acc[ioc.type] = (acc[ioc.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const iocsBySeverity = iocs.reduce((acc, ioc) => {
      acc[ioc.severity] = (acc[ioc.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const huntsByStatus = hunts.reduce((acc, hunt) => {
      acc[hunt.status] = (acc[hunt.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const detectionsByStatus = detections.reduce((acc, det) => {
      acc[det.status] = (acc[det.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      iocs: {
        total: iocs.length,
        active: iocs.filter(ioc => ioc.isActive).length,
        byType: iocsByType,
        bySeverity: iocsBySeverity,
        recentlyAdded: iocs.filter(ioc => 
          new Date(ioc.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
        ).length
      },
      hunts: {
        total: hunts.length,
        active: hunts.filter(hunt => hunt.status === 'ACTIVE').length,
        byStatus: huntsByStatus,
        avgDuration: this.calculateAverageHuntDuration(hunts)
      },
      detections: {
        total: detections.length,
        new: detections.filter(det => det.status === 'NEW').length,
        byStatus: detectionsByStatus,
        recent24h: detections.filter(det => 
          new Date(det.detectionTime).getTime() > Date.now() - 24 * 60 * 60 * 1000
        ).length
      },
      feeds: {
        total: this.feedSources.size,
        active: Array.from(this.feedSources.values()).filter(feed => feed.isActive).length,
        lastUpdate: Math.min(...Array.from(this.feedSources.values())
          .map(feed => new Date(feed.lastUpdate).getTime()))
      }
    };
  }

  // Helper methods
  private generateRandomIP(): string {
    return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }

  private calculateAverageHuntDuration(hunts: ThreatHunt[]): number {
    const completedHunts = hunts.filter(hunt => hunt.completedAt);
    if (completedHunts.length === 0) return 0;

    const totalDuration = completedHunts.reduce((sum, hunt) => {
      const start = new Date(hunt.startDate).getTime();
      const end = new Date(hunt.completedAt!).getTime();
      return sum + (end - start);
    }, 0);

    return Math.floor(totalDuration / completedHunts.length / (24 * 60 * 60 * 1000)); // Days
  }

  private async updateThreatFeeds(): Promise<void> {
    // Simulate threat feed updates
    console.log('[THREAT_HUNTING] Updating threat intelligence feeds...');
  }

  private async performAutomaticHunts(): Promise<void> {
    // Simulate automatic hunting based on new IOCs
    console.log('[THREAT_HUNTING] Performing automatic threat hunts...');
  }

  private cleanupExpiredIOCs(): void {
    const now = Date.now();
    let cleanedUp = 0;

    for (const [iocId, ioc] of this.iocs.entries()) {
      if (ioc.expiresAt && new Date(ioc.expiresAt).getTime() < now) {
        this.iocs.delete(iocId);
        cacheService.delete(`ioc:${iocId}`);
        cleanedUp++;
      }
    }

    if (cleanedUp > 0) {
      console.log(`[THREAT_HUNTING] Cleaned up ${cleanedUp} expired IOCs`);
    }
  }
}

interface ThreatIntelFeed {
  id: string;
  name: string;
  type: string;
  url: string;
  format: string;
  isActive: boolean;
  updateInterval: number;
  lastUpdate: string;
  credentials: any;
}

// Global threat hunting service instance
export const threatHuntingService = new ThreatHuntingService();