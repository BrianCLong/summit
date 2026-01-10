export interface ConnectorError {
  code: string;
  status: number;
  message: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<TItem> {
  items: TItem[];
  nextCursor?: string | null;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export interface ConformanceConnector<TResource = Record<string, unknown>> {
  reset(): Promise<void>;
  performIdempotentWrite(payload: TResource): Promise<{
    id: string;
    checksum: string;
    data: TResource;
  }>;
  performIdempotentRead(id: string): Promise<TResource>;
  simulateTransientFailure(attempt: number): Promise<{ success: boolean; error?: ConnectorError }>;
  fetchPage(cursor?: string | null, pageSize?: number): Promise<PaginatedResponse<TResource>>;
  invokeWithRateLimit(): Promise<{ success: boolean; rateLimitInfo: RateLimitInfo }>;
  mapError(code: string): Promise<ConnectorError>;
  collectEvidence(): Promise<{
    timestamp: string;
    operations: string[];
    coverage: Record<string, boolean>;
    [key: string]: unknown;
  }>;
  redactSecrets(record: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface ConformanceTestResult {
  name: string;
  passed: boolean;
  details?: string;
}

export interface ConformanceReport {
  connectorName: string;
  passed: boolean;
  results: ConformanceTestResult[];
  failures: ConformanceTestResult[];
}
