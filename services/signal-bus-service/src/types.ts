/**
 * Signal Bus Service Types
 *
 * Internal type definitions for the signal bus service.
 *
 * @module types
 */

import type { SignalEnvelope, Alert, Rule, RuleEvaluationResult } from '@intelgraph/signal-contracts';

/**
 * Processing status for signals
 */
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

/**
 * Signal with processing metadata
 */
export interface ProcessingSignal {
  envelope: SignalEnvelope;
  status: ProcessingStatus;
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  error?: string;
  partition: number;
  offset: string;
}

/**
 * Batch of signals for processing
 */
export interface SignalBatch {
  signals: ProcessingSignal[];
  partition: number;
  startOffset: string;
  endOffset: string;
  receivedAt: number;
}

/**
 * Result of processing a single signal
 */
export interface SignalProcessingResult {
  signalId: string;
  success: boolean;
  error?: string;
  retryable: boolean;
  alerts: Alert[];
  downstreamEvents: unknown[];
  processingTimeMs: number;
}

/**
 * Result of processing a batch
 */
export interface BatchProcessingResult {
  batchId: string;
  partition: number;
  startOffset: string;
  endOffset: string;
  totalSignals: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  alerts: Alert[];
  processingTimeMs: number;
  results: SignalProcessingResult[];
}

/**
 * Validation result for a signal
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  normalizedPayload?: unknown;
}

/**
 * Validation error detail
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Enrichment result
 */
export interface EnrichmentResult {
  success: boolean;
  enrichments: {
    geoIp?: GeoIpEnrichment;
    deviceLookup?: DeviceLookupEnrichment;
    custom?: Record<string, unknown>;
  };
  errors: EnrichmentError[];
  durationMs: number;
}

/**
 * GeoIP enrichment data
 */
export interface GeoIpEnrichment {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  asn?: string;
  isVpn?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
  threatScore?: number;
}

/**
 * Device lookup enrichment data
 */
export interface DeviceLookupEnrichment {
  knownDevice: boolean;
  deviceProfile?: string;
  lastSeen?: number;
  associatedEntities?: string[];
  riskScore?: number;
}

/**
 * Enrichment error
 */
export interface EnrichmentError {
  enricherName: string;
  message: string;
  recoverable: boolean;
}

/**
 * Rule evaluation context
 */
export interface RuleEvaluationContext {
  signal: SignalEnvelope;
  tenantId: string;
  signalType: string;
  timestamp: number;
  previousSignals?: SignalEnvelope[];
  aggregations?: Map<string, number>;
}

/**
 * Alert with routing metadata
 */
export interface RoutedAlert {
  alert: Alert;
  routing: {
    topics: string[];
    partitionKey: string;
    priority: 'normal' | 'high';
  };
}

/**
 * Downstream event with routing metadata
 */
export interface RoutedDownstreamEvent {
  event: unknown;
  routing: {
    topic: string;
    partitionKey: string;
  };
}

/**
 * Lag metrics per partition
 */
export interface PartitionLag {
  topic: string;
  partition: number;
  currentOffset: string;
  highWaterMark: string;
  lag: number;
  lastUpdated: number;
}

/**
 * Tenant lag metrics
 */
export interface TenantLag {
  tenantId: string;
  totalLag: number;
  partitionLags: PartitionLag[];
  lastUpdated: number;
}

/**
 * Backpressure state
 */
export interface BackpressureState {
  active: boolean;
  queueSize: number;
  maxQueueSize: number;
  spilledToDisk: boolean;
  spilledCount: number;
  spilledBytes: number;
  pausedPartitions: number[];
  lastStateChange: number;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    duration?: number;
  }[];
  timestamp: number;
}

/**
 * Service metrics snapshot
 */
export interface MetricsSnapshot {
  timestamp: number;
  uptime: number;

  // Throughput
  signalsReceived: number;
  signalsProcessed: number;
  signalsFailed: number;
  signalsPerSecond: number;

  // Alerts
  alertsGenerated: number;
  alertsSuppressed: number;

  // Latency
  processingLatencyP50: number;
  processingLatencyP95: number;
  processingLatencyP99: number;

  // Backpressure
  backpressure: BackpressureState;

  // Consumer lag
  totalLag: number;
  lagByTenant: Map<string, number>;
}

/**
 * Rule store interface
 */
export interface RuleStore {
  getRulesForSignalType(signalType: string, tenantId: string): Promise<Rule[]>;
  getRule(ruleId: string): Promise<Rule | null>;
  addRule(rule: Rule): Promise<void>;
  updateRule(rule: Rule): Promise<void>;
  deleteRule(ruleId: string): Promise<void>;
  getAllRules(): Promise<Rule[]>;
}

/**
 * State store interface for stateful processing
 */
export interface StateStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  increment(key: string, amount?: number): Promise<number>;
  expire(key: string, ttlMs: number): Promise<void>;

  // Aggregation state
  addToWindow(windowKey: string, value: number, timestampMs: number): Promise<void>;
  getWindowAggregate(
    windowKey: string,
    windowStartMs: number,
    windowEndMs: number,
    aggregationType: 'count' | 'sum' | 'avg' | 'min' | 'max',
  ): Promise<number>;
  cleanupExpiredWindows(beforeMs: number): Promise<number>;
}

/**
 * Signal serializer interface
 */
export interface SignalSerializer {
  serialize(signal: SignalEnvelope): Buffer;
  deserialize(data: Buffer): SignalEnvelope;
}

/**
 * Connector status
 */
export interface ConnectorStatus {
  connectorId: string;
  connectorType: string;
  status: 'connected' | 'disconnected' | 'error';
  lastHeartbeat: number;
  signalsReceived: number;
  errorsCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * Processing pipeline stage
 */
export type PipelineStage =
  | 'receive'
  | 'validate'
  | 'normalize'
  | 'enrich'
  | 'evaluate'
  | 'route'
  | 'emit';

/**
 * Pipeline stage result
 */
export interface StageResult<T> {
  stage: PipelineStage;
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
}

/**
 * Full pipeline result
 */
export interface PipelineResult {
  signalId: string;
  stages: StageResult<unknown>[];
  finalStatus: 'success' | 'failure' | 'partial';
  totalDurationMs: number;
}
