import { Logger } from 'pino';
import { TenantId } from '../data-model/types.js';

export interface ConnectorContext {
  tenantId: TenantId;
  pipelineKey: string;
  correlationId?: string;
  logger: Logger;
  stateStore: StateStore;
}

export interface StateStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  getCursor(): Promise<string | null>;
  setCursor(cursor: string): Promise<void>;
}

export interface ConnectorResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed?: number;
  newCursor?: string | null;
  error?: Error;
}

export interface SourceConnector {
  fetchBatch(ctx: ConnectorContext, cursor?: string | null): Promise<{
    records: any[];
    nextCursor?: string | null;
  }>;
}

export interface SinkConnector {
  writeBatch(ctx: ConnectorContext, records: any[]): Promise<void>;
}
