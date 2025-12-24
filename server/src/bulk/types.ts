// import { PoolClient } from 'pg'; // Type import fails in specific test environments

// Defining a local interface for PoolClient to avoid import issues in test environment
// This matches the minimal interface we need from pg's PoolClient
export interface PoolClient {
  query(text: string, values?: any[]): Promise<any>;
  query(config: any): Promise<any>;
  release(err?: boolean | Error): void;
  connect(): Promise<void>;
  on(event: string, listener: (...args: any[]) => void): this;
}

export interface BulkItemResult {
  itemId: string;
  status: 'success' | 'failure' | 'ignored';
  code?: string;
  message?: string;
  retry?: boolean;
}

export interface BulkItemInput {
  id: string;
  idempotencyKey?: string;
}

export interface BulkOperationPayload {
  items: BulkItemInput[];
  requestId: string;
  dryRun?: boolean;
  atomic?: boolean;
  operationType: string;
  params: Record<string, any>;
}

export interface BulkOperationResponse {
  requestId: string;
  summary: {
    total: number;
    success: number;
    failed: number;
    ignored: number;
  };
  results: BulkItemResult[];
}

export interface BulkContext {
  tenantId: string;
  userId: string;
  requestId: string;
  auditContext?: any;
  txClient?: PoolClient; // Transaction client for atomic operations
  pgPool?: any; // Kept for backward compat or direct use if needed
}

export interface BulkHandler {
  validate(params: any): Promise<void>;
  execute(items: BulkItemInput[], params: any, context: BulkContext): Promise<BulkItemResult[]>;
}
