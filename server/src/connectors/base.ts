import { Logger } from 'pino';
import { ConnectorContext, SourceConnector, StateStore } from './types.js';

export abstract class BaseSourceConnector implements SourceConnector {
  abstract fetchBatch(
    ctx: ConnectorContext,
    cursor?: string | null,
  ): Promise<{
    records: any[];
    nextCursor?: string | null;
  }>;

  protected handleError(ctx: ConnectorContext, error: unknown) {
    ctx.logger.error({ err: error }, 'Connector error');
    // Basic error normalization could happen here
  }
}

export class InMemoryStateStore implements StateStore {
  private store = new Map<string, any>();
  private cursor: string | null = null;

  async get<T>(key: string): Promise<T | null> {
    return this.store.get(key) || null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async getCursor(): Promise<string | null> {
    return this.cursor;
  }

  async setCursor(cursor: string): Promise<void> {
    this.cursor = cursor;
  }
}
