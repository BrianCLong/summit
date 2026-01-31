declare module '@intelgraph/connector-sdk' {
  export type ConnectorAction = {
    name: string;
    inputSchema?: Record<string, unknown>;
  };

  export type ConnectorResult = Record<string, unknown>;

  export type RateLimiter = {
    acquire(): Promise<void>;
    isLimited(): boolean;
    remaining(): number;
  };

  export type ConnectorContext = {
    logger?: unknown;
    metrics?: unknown;
    rateLimiter?: RateLimiter;
    stateStore?: unknown;
    emitter?: unknown;
    signal?: AbortSignal;
  };

  export type Connector = {
    manifest: {
      id: string;
      capabilities: string[];
      rateLimit?: {
        requestsPerMinute: number;
        burstLimit: number;
      };
    };
    getActions?: () => Promise<ConnectorAction[]>;
    execute?: (
      actionName: string,
      params: Record<string, unknown>,
      context: ConnectorContext
    ) => Promise<ConnectorResult>;
  };
}
