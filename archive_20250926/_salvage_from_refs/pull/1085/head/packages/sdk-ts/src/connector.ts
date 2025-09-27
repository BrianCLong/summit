import type { RunContext } from './types.js';

export interface ConnectorConfig { [k: string]: unknown }

export interface Connector<TIn = unknown, TOut = unknown> {
  init?: (ctx: RunContext) => Promise<void> | void;
  send: (ctx: RunContext, input: TIn, cfg?: ConnectorConfig) => Promise<TOut>;
}

export function defineConnector<TIn = unknown, TOut = unknown>(c: Connector<TIn, TOut>): Connector<TIn, TOut> {
  return c;
}
