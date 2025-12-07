import { ConnectorContext } from '../data-model/types';

export interface SourceConnector {
  fetchBatch(ctx: ConnectorContext, cursor?: string | null): Promise<{
    records: any[];
    nextCursor?: string | null;
  }>;
}

export interface SinkConnector {
  writeBatch(
    ctx: ConnectorContext,
    records: any[],
  ): Promise<void>;
}
