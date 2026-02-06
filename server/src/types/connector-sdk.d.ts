declare module '@intelgraph/connector-sdk' {
  export type ConnectorEntity = Record<string, unknown>;

  export interface ConnectorManifest {
    id: string;
    name: string;
    version: string;
    description?: string;
    status?: string;
    category?: string;
    capabilities: string[];
    entityTypes?: string[];
    relationshipTypes?: string[];
    authentication?: string[];
    requiredSecrets?: string[];
    configSchema?: Record<string, unknown>;
    license?: string;
    maintainer?: string;
    rateLimit?: { requestsPerMinute: number; burstLimit: number };
  }

  export interface ConnectorConfig {
    tenantId: string;
    secrets: Record<string, string>;
    config: Record<string, unknown>;
  }

  export interface ConnectorStateStore {
    get<T = unknown>(key: string): Promise<T | undefined>;
    set<T = unknown>(key: string, value: T): Promise<void>;
    getCursor(): Promise<string | undefined>;
    setCursor(cursor: string): Promise<void>;
  }

  export interface ConnectorLogger {
    debug(message: string, meta?: unknown): void;
    info(message: string, meta?: unknown): void;
    warn(message: string, meta?: unknown): void;
    error(message: string, meta?: unknown): void;
  }

  export interface ConnectorContext {
    tenantId: string;
    signal: AbortSignal;
    stateStore: ConnectorStateStore;
    logger: ConnectorLogger;
    metrics?: Record<string, unknown>;
    emitter?: { emit: (event: string, payload?: unknown) => void };
    rateLimiter?: RateLimiter;
  }

  export interface ConnectorResult {
    success: boolean;
    entitiesProcessed: number;
    relationshipsProcessed: number;
    errorCount: number;
    durationMs: number;
    cursor?: string | null;
    errors?: string[];
  }

  export interface ConnectorAction {
    name: string;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    description?: string;
  }

  export interface RateLimiter {
    acquire(): Promise<void>;
    isLimited(): boolean;
    remaining(): number;
  }

  export class Connector {
    manifest: ConnectorManifest;
    getActions?(): Promise<ConnectorAction[]>;
    execute?(action: string, params: Record<string, unknown>, context: ConnectorContext): Promise<ConnectorResult>;
  }

  export class PullConnector extends Connector {
    protected config?: ConnectorConfig;
    protected ensureInitialized(): void;
    protected failureResult(
      error: Error,
      entitiesProcessed: number,
      relationshipsProcessed: number,
      durationMs: number,
    ): ConnectorResult;
  }
}
