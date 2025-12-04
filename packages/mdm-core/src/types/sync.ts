/**
 * Multi-Source Data Synchronization Types
 */

export interface SyncConfiguration {
  id: string;
  name: string;
  description: string;
  domain: string;
  syncType: SyncType;
  direction: SyncDirection;
  sources: SyncSource[];
  targets: SyncTarget[];
  schedule: SyncSchedule;
  conflictResolution: ConflictResolutionStrategy;
  transformations: DataTransformation[];
  status: SyncStatus;
  metadata: SyncMetadata;
}

export type SyncType = 'real_time' | 'batch' | 'scheduled' | 'event_driven' | 'hybrid';

export type SyncDirection = 'unidirectional' | 'bidirectional' | 'multi_directional';

export type SyncStatus = 'active' | 'paused' | 'stopped' | 'error' | 'configuring';

export interface SyncSource {
  id: string;
  name: string;
  sourceType: SourceType;
  connectionConfig: ConnectionConfig;
  dataMapping: FieldMapping[];
  filters: DataFilter[];
  priority: number;
  readOnly: boolean;
}

export type SourceType =
  | 'database'
  | 'api'
  | 'file'
  | 'stream'
  | 'message_queue'
  | 'custom';

export interface ConnectionConfig {
  protocol: string;
  host?: string;
  port?: number;
  database?: string;
  endpoint?: string;
  credentials?: Record<string, string>;
  options: Record<string, unknown>;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformations?: Transformation[];
  required: boolean;
  defaultValue?: unknown;
}

export interface Transformation {
  type: TransformationType;
  config: Record<string, unknown>;
  order: number;
}

export type TransformationType =
  | 'mapping'
  | 'conversion'
  | 'calculation'
  | 'concatenation'
  | 'split'
  | 'lookup'
  | 'custom';

export interface DataFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
}

export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'starts_with';

export interface SyncTarget {
  id: string;
  name: string;
  targetType: TargetType;
  connectionConfig: ConnectionConfig;
  dataMapping: FieldMapping[];
  writeMode: WriteMode;
}

export type TargetType = 'database' | 'api' | 'file' | 'message_queue' | 'custom';

export type WriteMode = 'insert' | 'update' | 'upsert' | 'delete' | 'merge';

export interface SyncSchedule {
  scheduleType: ScheduleType;
  cronExpression?: string;
  interval?: number;
  intervalUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
  startTime?: Date;
  endTime?: Date;
  timezone?: string;
  enabled: boolean;
}

export type ScheduleType = 'cron' | 'interval' | 'event_based' | 'manual';

export interface ConflictResolutionStrategy {
  strategy: ConflictStrategy;
  priorityRules: PriorityRule[];
  customLogic?: string;
  notifyOnConflict: boolean;
  autoResolve: boolean;
}

export type ConflictStrategy =
  | 'source_priority'
  | 'target_wins'
  | 'most_recent'
  | 'highest_quality'
  | 'manual_resolution'
  | 'custom';

export interface PriorityRule {
  sourceId: string;
  priority: number;
  conditions?: Record<string, unknown>;
}

export interface DataTransformation {
  id: string;
  name: string;
  transformationType: TransformationType;
  sourceFields: string[];
  targetFields: string[];
  logic: string;
  order: number;
  active: boolean;
}

export interface SyncMetadata {
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
}

export interface SyncJob {
  id: string;
  syncConfigId: string;
  status: SyncJobStatus;
  startTime: Date;
  endTime?: Date;
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  errors: SyncError[];
  conflicts: SyncConflict[];
  statistics: SyncStatistics;
}

export type SyncJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'partial';

export interface SyncError {
  recordId?: string;
  sourceSystem: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface SyncConflict {
  recordId: string;
  fieldName: string;
  sourceValue: unknown;
  targetValue: unknown;
  conflictType: ConflictType;
  resolution?: ConflictResolution;
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export type ConflictType =
  | 'value_mismatch'
  | 'concurrent_update'
  | 'delete_conflict'
  | 'version_conflict'
  | 'schema_mismatch';

export interface ConflictResolution {
  strategy: string;
  resolvedValue: unknown;
  reason: string;
  automatic: boolean;
}

export interface SyncStatistics {
  duration: number;
  throughput: number;
  errorRate: number;
  conflictRate: number;
  averageLatency: number;
  peakThroughput: number;
  dataVolumeBytes: number;
}

export interface DeltaChange {
  changeId: string;
  recordId: string;
  changeType: ChangeType;
  fieldChanges: FieldChange[];
  sourceSystem: string;
  timestamp: Date;
  version: number;
  checksum?: string;
}

export type ChangeType = 'insert' | 'update' | 'delete' | 'merge';

export interface FieldChange {
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  changeReason?: string;
}

export interface PublishSubscribeConfig {
  topic: string;
  publishers: Publisher[];
  subscribers: Subscriber[];
  messageFormat: 'json' | 'xml' | 'avro' | 'protobuf' | 'custom';
  qos: QualityOfService;
}

export interface Publisher {
  id: string;
  name: string;
  sourceSystem: string;
  eventTypes: string[];
  publishRate: number;
}

export interface Subscriber {
  id: string;
  name: string;
  targetSystem: string;
  eventTypes: string[];
  filterCriteria?: Record<string, unknown>;
  deliveryMode: 'push' | 'pull';
}

export type QualityOfService = 'at_most_once' | 'at_least_once' | 'exactly_once';

export interface SyncMonitor {
  configId: string;
  healthStatus: HealthStatus;
  currentLoad: number;
  queueDepth: number;
  lagTime: number;
  alerts: SyncAlert[];
  metrics: MonitoringMetrics;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface SyncAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  alertType: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export interface MonitoringMetrics {
  avgSyncDuration: number;
  peakSyncDuration: number;
  successRate: number;
  errorRate: number;
  conflictRate: number;
  throughput: number;
  uptime: number;
}
