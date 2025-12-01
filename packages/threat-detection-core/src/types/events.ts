/**
 * Core event types for threat detection system
 */

export enum ThreatSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

export enum ThreatCategory {
  // Network threats
  NETWORK_ATTACK = 'NETWORK_ATTACK',
  DDOS = 'DDOS',
  PORT_SCAN = 'PORT_SCAN',
  C2_COMMUNICATION = 'C2_COMMUNICATION',
  DATA_EXFILTRATION = 'DATA_EXFILTRATION',
  DNS_TUNNELING = 'DNS_TUNNELING',

  // Behavioral threats
  ANOMALOUS_BEHAVIOR = 'ANOMALOUS_BEHAVIOR',
  INSIDER_THREAT = 'INSIDER_THREAT',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  CREDENTIAL_ABUSE = 'CREDENTIAL_ABUSE',

  // Advanced persistent threats
  APT = 'APT',
  LATERAL_MOVEMENT = 'LATERAL_MOVEMENT',
  RECONNAISSANCE = 'RECONNAISSANCE',

  // Data threats
  DATA_POISONING = 'DATA_POISONING',
  DATA_MANIPULATION = 'DATA_MANIPULATION',
  INJECTION_ATTACK = 'INJECTION_ATTACK',

  // Malware
  MALWARE = 'MALWARE',
  FILELESS_MALWARE = 'FILELESS_MALWARE',
  PROCESS_INJECTION = 'PROCESS_INJECTION',
  CREDENTIAL_DUMPING = 'CREDENTIAL_DUMPING',

  // Other
  ZERO_DAY = 'ZERO_DAY',
  UNKNOWN = 'UNKNOWN'
}

export enum EventSource {
  NETWORK = 'NETWORK',
  APPLICATION = 'APPLICATION',
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  API = 'API',
  DATABASE = 'DATABASE',
  EXTERNAL = 'EXTERNAL'
}

export interface ThreatEvent {
  id: string;
  timestamp: Date;
  source: EventSource;
  category: ThreatCategory;
  severity: ThreatSeverity;

  // Entity information
  userId?: string;
  entityId?: string;
  sourceIp?: string;
  destinationIp?: string;

  // Threat details
  threatScore: number; // 0-1 normalized score
  confidenceScore: number; // 0-1 confidence in detection
  indicators: string[]; // IOCs

  // Context
  description: string;
  rawData: Record<string, any>;
  metadata: Record<string, any>;

  // MITRE ATT&CK mapping
  mitreAttackTactics?: string[];
  mitreAttackTechniques?: string[];

  // Correlation
  correlationId?: string;
  relatedEvents?: string[];

  // Response
  responded: boolean;
  responseActions?: string[];
}

export interface AnomalyScore {
  score: number; // 0-1 normalized anomaly score
  zScore?: number;
  iqrScore?: number;
  isolationScore?: number;
  method: 'zscore' | 'iqr' | 'isolation_forest' | 'autoencoder' | 'ensemble';
  features: Record<string, number>;
  explanation?: string;
}

export interface BehaviorProfile {
  entityId: string;
  entityType: 'user' | 'system' | 'application';

  // Baseline statistics
  baselineMetrics: {
    avgRequestsPerHour: number;
    avgDataTransferred: number;
    commonAccessPatterns: string[];
    typicalAccessTimes: number[]; // Hours of day (0-23)
    geographicLocations: string[];
    commonUserAgents?: string[];
    commonEndpoints?: string[];
  };

  // Temporal patterns
  activityPattern: {
    hourly: number[]; // 24 values
    daily: number[]; // 7 values
    weekly: number[]; // 52 values (optional)
  };

  // Learning period
  learningStartDate: Date;
  lastUpdated: Date;
  sampleSize: number;

  // Adaptive thresholds
  thresholds: {
    requestRateThreshold: number;
    dataTransferThreshold: number;
    locationChangeThreshold: number;
    anomalyScoreThreshold: number;
  };
}

export interface NetworkEvent {
  timestamp: Date;
  sourceIp: string;
  destinationIp: string;
  sourcePort?: number;
  destinationPort?: number;
  protocol: string;
  bytesTransferred: number;
  packetsCount: number;
  duration?: number;
  flags?: string[];
  tlsVersion?: string;
  dnsQuery?: string;
  httpMethod?: string;
  httpStatusCode?: number;
  httpUserAgent?: string;
}
