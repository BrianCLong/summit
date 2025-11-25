/**
 * Core type definitions for Admin CLI
 */

/**
 * Output format options
 */
export type OutputFormat = 'json' | 'table' | 'yaml';

/**
 * CLI global options
 */
export interface GlobalOptions {
  /** API endpoint URL */
  endpoint?: string;
  /** Authentication token */
  token?: string;
  /** Output format */
  format?: OutputFormat;
  /** Enable verbose output */
  verbose?: boolean;
  /** Disable color output */
  noColor?: boolean;
  /** Configuration profile */
  profile?: string;
  /** Dry-run mode (no changes) */
  dryRun?: boolean;
}

/**
 * Service health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Service health check result
 */
export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latency?: number;
  message?: string;
  lastChecked: string;
  details?: Record<string, unknown>;
}

/**
 * Environment status summary
 */
export interface EnvironmentStatus {
  environment: string;
  timestamp: string;
  services: ServiceHealth[];
  sloSummary: SLOSummary;
  overallStatus: HealthStatus;
}

/**
 * SLO Summary
 */
export interface SLOSummary {
  availability: number;
  errorRate: number;
  p99Latency: number;
  throughput: number;
}

/**
 * Tenant information
 */
export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  quotas?: TenantQuotas;
}

/**
 * Tenant quotas
 */
export interface TenantQuotas {
  maxUsers: number;
  maxEntities: number;
  maxStorage: number;
  apiRateLimit: number;
}

/**
 * Tenant creation options
 */
export interface TenantCreateOptions {
  name: string;
  adminEmail: string;
  plan?: string;
  quotas?: Partial<TenantQuotas>;
  metadata?: Record<string, unknown>;
}

/**
 * User information
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastActiveAt?: string;
}

/**
 * Audit event
 */
export interface AuditEvent {
  id: string;
  ts: string;
  action: string;
  userId?: string;
  userEmail?: string;
  details?: Record<string, unknown>;
  ip?: string;
  success: boolean;
}

/**
 * Data operation result
 */
export interface DataOperationResult {
  operationId: string;
  type: 'backfill' | 'reindex' | 'verify';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  progress?: number;
  recordsProcessed?: number;
  recordsTotal?: number;
  errors?: string[];
}

/**
 * Security key information
 */
export interface SecurityKey {
  id: string;
  type: 'jwt' | 'api' | 'encryption';
  createdAt: string;
  expiresAt?: string;
  rotatedAt?: string;
  status: 'active' | 'expired' | 'rotated';
}

/**
 * Policy check result
 */
export interface PolicyCheckResult {
  policy: string;
  compliant: boolean;
  violations: PolicyViolation[];
  checkedAt: string;
}

/**
 * Policy violation
 */
export interface PolicyViolation {
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  resource?: string;
  recommendation?: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * API error
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Graph service statistics
 */
export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  labelCounts: Record<string, number>;
  relationshipCounts: Record<string, number>;
  storageSize: number;
  cacheHitRate: number;
}

/**
 * Ingestion status
 */
export interface IngestionStatus {
  queueDepth: number;
  processedToday: number;
  failedToday: number;
  avgLatency: number;
  workers: {
    active: number;
    idle: number;
    total: number;
  };
}

/**
 * CLI command context
 */
export interface CommandContext {
  options: GlobalOptions;
  config: CLIConfig;
  apiClient: ApiClientInterface;
  logger: LoggerInterface;
  auditor: AuditorInterface;
}

/**
 * CLI configuration
 */
export interface CLIConfig {
  defaultEndpoint: string;
  defaultProfile: string;
  profiles: Record<string, ProfileConfig>;
}

/**
 * Profile configuration
 */
export interface ProfileConfig {
  endpoint: string;
  token?: string;
  defaultFormat?: OutputFormat;
}

/**
 * API client interface
 */
export interface ApiClientInterface {
  get<T>(path: string): Promise<ApiResponse<T>>;
  post<T>(path: string, body: unknown): Promise<ApiResponse<T>>;
  put<T>(path: string, body: unknown): Promise<ApiResponse<T>>;
  delete<T>(path: string): Promise<ApiResponse<T>>;
}

/**
 * Logger interface
 */
export interface LoggerInterface {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
  verbose(message: string, data?: Record<string, unknown>): void;
}

/**
 * Auditor interface for CLI audit logging
 */
export interface AuditorInterface {
  record(event: AuditRecord): Promise<void>;
}

/**
 * Audit record for CLI operations
 */
export interface AuditRecord {
  action: string;
  command: string;
  args: string[];
  options: Record<string, unknown>;
  userId: string;
  result: 'success' | 'failure' | 'cancelled';
  errorMessage?: string;
  durationMs?: number;
}

/**
 * Confirmation options for destructive operations
 */
export interface ConfirmationOptions {
  message: string;
  confirmText?: string;
  requireTypedConfirmation?: boolean;
  typedConfirmationPhrase?: string;
}

/**
 * Operation progress callback
 */
export type ProgressCallback = (current: number, total: number, message?: string) => void;
