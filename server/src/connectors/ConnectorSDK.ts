import fetch from 'node-fetch';

export type ConnectorContext = {
  tenantId: string;
  allowlist: string[];
  secrets: Record<string, string>;
  log: (event: string, meta?: Record<string, any>) => void;
  http: (url: string, opts?: any) => Promise<any>;
  rateLimit: (key: string, perMin: number) => Promise<void>;
};

export type NormalizedObservation = {
  type: 'Indicator' | 'Observation' | 'Sighting';
  source: string;
  confidence: number;
  license?: string;
  seenAt: string;
  entities: any;
  edges: any;
  provenance: { feed: string; itemId: string; fetchedAt: string };
};

export interface Connector {
  name: string;
  version: string;
  schedule: 'cron' | 'interval';
  intervalMs?: number;
  cronExpr?: string;
  run(ctx: ConnectorContext): AsyncGenerator<NormalizedObservation>;
}

export function createContext(opts: {
  tenantId: string;
  allowlist: string[];
  secrets?: Record<string, string>;
}): ConnectorContext {
  return {
    tenantId: opts.tenantId,
    allowlist: opts.allowlist,
    secrets: opts.secrets || {},
    log: () => {},
    rateLimit: async () => {
      return;
    },
    http: async (url: string, opts2: any = {}) => {
      const host = new URL(url).host;
      if (!opts.allowlist.includes(host)) {
        throw new Error('egress blocked');
      }
      return fetch(url, opts2);
    },
  };
}
