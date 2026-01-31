/**
 * @intelgraph/threat-detection-core
 * Core types and interfaces for advanced threat detection system
 */

// Event types
export * from './types/events';
export * from './types/threats';
export * from './types/alerts';
export * from './types/ml';
export * from './types/threat-intelligence';
export * from './types/hunting';

// Interfaces
export * from './interfaces/detector';

// Utilities
export * from './utils/scoring';
export * from './utils/validators';
export * from './utils/correlation';

// Utility types
export interface ThreatDetectionConfig {
  // General
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Data retention
  eventRetentionDays: number;
  alertRetentionDays: number;

  // Processing
  batchSize: number;
  processingInterval: number; // milliseconds

  // ML Models
  mlModelsEnabled: boolean;
  mlModelEndpoint?: string;

  // Threat Intelligence
  threatIntelEnabled: boolean;
  threatIntelFeeds: string[];

  // Alerting
  alertingEnabled: boolean;
  alertChannels: string[];

  // Response
  autoResponseEnabled: boolean;
  requireApprovalForActions: boolean;
}

export interface DatabaseConfig {
  // TimescaleDB for events
  timescale: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };

  // Redis for caching and profiles
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };

  // Neo4j for relationships
  neo4j: {
    uri: string;
    user: string;
    password: string;
  };

  // PostgreSQL for general data
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
}

export interface MetricsCollector {
  recordEvent(metric: string, value: number, tags?: Record<string, string>): void;
  incrementCounter(metric: string, tags?: Record<string, string>): void;
  recordHistogram(metric: string, value: number, tags?: Record<string, string>): void;
  recordGauge(metric: string, value: number, tags?: Record<string, string>): void;
}

export interface Logger {
  debug(message: string, context?: any): void;
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, error?: Error, context?: any): void;
}

// Constants
export const DEFAULT_CONFIG: ThreatDetectionConfig = {
  enabled: true,
  logLevel: 'info',
  eventRetentionDays: 90,
  alertRetentionDays: 365,
  batchSize: 1000,
  processingInterval: 5000,
  mlModelsEnabled: true,
  threatIntelEnabled: true,
  threatIntelFeeds: [],
  alertingEnabled: true,
  alertChannels: [],
  autoResponseEnabled: false,
  requireApprovalForActions: true
};

export const THREAT_SCORE_THRESHOLDS = {
  CRITICAL: 0.9,
  HIGH: 0.7,
  MEDIUM: 0.5,
  LOW: 0.3,
  INFO: 0.0
};

export const MITRE_ATTACK_TACTICS = [
  'reconnaissance',
  'resource-development',
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact'
];
