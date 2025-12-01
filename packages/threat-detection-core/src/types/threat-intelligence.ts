/**
 * Threat intelligence types (STIX/TAXII)
 */

export interface STIXObject {
  type: string;
  id: string;
  created: Date;
  modified: Date;
  revoked?: boolean;
  confidence?: number;
  labels?: string[];
  external_references?: ExternalReference[];
}

export interface ExternalReference {
  source_name: string;
  description?: string;
  url?: string;
  external_id?: string;
}

export interface ThreatIntelFeed {
  id: string;
  name: string;
  type: 'stix' | 'taxii' | 'misp' | 'custom' | 'commercial';
  provider: string;

  // Connection
  endpoint: string;
  authentication?: {
    type: 'apikey' | 'oauth' | 'basic' | 'certificate';
    credentials: Record<string, string>;
  };

  // Configuration
  enabled: boolean;
  updateFrequency: number; // milliseconds

  // Filtering
  filters?: {
    types?: string[];
    confidence?: number;
    labels?: string[];
    dateRange?: {
      start?: Date;
      end?: Date;
    };
  };

  // Status
  lastSync?: Date;
  lastSuccessfulSync?: Date;
  syncStatus: 'active' | 'failed' | 'disabled';
  errorMessage?: string;

  // Statistics
  totalIndicators: number;
  recentIndicators: number;

  // Quality metrics
  qualityMetrics: {
    accuracy: number;
    coverage: number;
    timeliness: number;
    relevance: number;
  };
}

export interface ThreatIntelIndicator {
  id: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'file' | 'cve' | 'yara';
  value: string;

  // Context
  description?: string;
  tags: string[];
  tlp: 'white' | 'green' | 'amber' | 'red'; // Traffic Light Protocol

  // Threat classification
  threatType: string[];
  malwareFamily?: string;
  threatActor?: string;

  // Scoring
  confidence: number; // 0-100
  severity: number; // 0-10
  risk: 'low' | 'medium' | 'high' | 'critical';

  // Temporal
  firstSeen: Date;
  lastSeen: Date;
  validUntil?: Date;

  // Source
  sources: {
    feedId: string;
    feedName: string;
    originalId?: string;
    confidence: number;
  }[];

  // Relationships
  relatedIndicators?: string[];
  relatedCampaigns?: string[];

  // Enrichment
  enrichment?: {
    geolocation?: {
      country?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
    asn?: {
      number: number;
      organization: string;
    };
    reputation?: {
      score: number;
      category: string;
    };
    whois?: Record<string, any>;
  };

  // Action
  recommendedAction?: 'block' | 'alert' | 'monitor' | 'investigate';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface TAXIICollection {
  id: string;
  title: string;
  description?: string;
  canRead: boolean;
  canWrite: boolean;
  mediaTypes: string[];
}

export interface ThreatIntelQuery {
  // Indicator search
  indicatorType?: string[];
  indicatorValue?: string;

  // Threat context
  threatActor?: string;
  malwareFamily?: string;
  campaign?: string;

  // Scoring filters
  minConfidence?: number;
  minSeverity?: number;
  riskLevel?: string[];

  // Temporal filters
  firstSeenAfter?: Date;
  firstSeenBefore?: Date;
  lastSeenAfter?: Date;
  validOnly?: boolean;

  // Source filters
  sources?: string[];
  tlp?: string[];

  // Enrichment filters
  hasEnrichment?: boolean;
  country?: string;

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sortBy?: 'confidence' | 'severity' | 'firstSeen' | 'lastSeen';
  sortOrder?: 'asc' | 'desc';
}

export interface ThreatIntelEnrichment {
  indicatorId: string;
  enrichmentType: 'geolocation' | 'reputation' | 'whois' | 'dns' | 'ssl' | 'passive_dns';

  data: Record<string, any>;

  source: string;
  confidence: number;
  timestamp: Date;
  expiresAt?: Date;
}

export interface ThreatIntelMatch {
  indicatorId: string;
  indicator: ThreatIntelIndicator;

  // Match details
  matchedValue: string;
  matchType: 'exact' | 'partial' | 'fuzzy' | 'regex';
  matchConfidence: number;

  // Context
  eventId?: string;
  alertId?: string;

  // Recommendations
  recommendedActions: string[];

  timestamp: Date;
}

export interface OsintSource {
  id: string;
  name: string;
  type: 'twitter' | 'reddit' | 'github' | 'pastebin' | 'dark_web' | 'news' | 'blog' | 'forum';
  url: string;

  // Collection
  enabled: boolean;
  keywords: string[];
  collectionFrequency: number; // milliseconds

  // Processing
  extractIndicators: boolean;
  extractTtps: boolean;
  sentimentAnalysis: boolean;

  // Quality
  reliability: number; // 0-100

  lastCollected?: Date;
  itemsCollected: number;
}
