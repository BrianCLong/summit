export interface ConnectorContext {
  fetch: (url: string, init?: any) => Promise<Response>;
  enqueue: (job: string, payload: any) => Promise<void>;
  license: (sourceId: string) => Promise<{ allowIngest: boolean }>;
}

export interface RawItem {
  id: string; // stable id/hash
  title?: string;
  url?: string;
  publishedAt?: string;
  language?: string;
  body?: string;
  raw: any;
}

export abstract class BaseConnector {
  constructor(public sourceId: string, public url: string) {}
  abstract kind(): string;
  abstract buildRequests(): Generator<{ url: string }>;
  abstract parse(resp: string): RawItem[];
}

