export type AdapterAction = 'deny' | 'redact' | 'transform' | 'allow';

export interface QueryContext {
  tenantId: string;
  query: string;
  selectors: string[];
  selectorStats?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

export type ReadonlyQueryContext = Readonly<{
  tenantId: string;
  query: string;
  selectors: ReadonlyArray<string>;
  selectorStats?: Readonly<Record<string, number>>;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export interface RoutingDecision {
  action: AdapterAction;
  explanation: string;
  adapter: string;
  transformedQuery?: string;
  sanitizedSelectors?: string[];
  redactedQuery?: string;
  redactedSelectors?: string[];
  metadata?: Record<string, unknown>;
}

export interface AdapterEvaluation {
  action: AdapterAction;
  explanation: string;
  transformedQuery?: string;
  sanitizedSelectors?: string[];
  redactedQuery?: string;
  redactedSelectors?: string[];
  metadata?: Record<string, unknown>;
}

export interface PolicyAdapter {
  readonly name: string;
  evaluate(context: ReadonlyQueryContext): Promise<AdapterEvaluation | null>;
}
