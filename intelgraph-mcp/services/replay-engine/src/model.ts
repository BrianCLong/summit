export type IOChannel = 'jsonrpc' | 'sse' | 'stdio' | 'net' | 'env';

export type IOEvent = {
  t: number;
  dir: 'in' | 'out';
  channel: IOChannel;
  payload: unknown;
  hash: string;
};

export type Recording = {
  id: string;
  sessionId: string;
  seed: string;
  events: IOEvent[];
  version: string;
  meta?: Record<string, unknown>;
  startedAt: string;
};

export type ReplayResult = {
  id: string;
  sessionId: string;
  divergence?: { at: number; expected: unknown; got: unknown };
};
