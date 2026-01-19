import { trace } from '@opentelemetry/api';
import type {
  HighlightRequest,
  HighlightResponse,
  PruningPolicy,
} from './types.js';

const tracer = trace.getTracer('context-pruner-client');

export class ContextPrunerClient {
  private endpoint: string;
  private timeoutMs: number;

  constructor(endpoint: string, timeoutMs = 4000) {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  async highlight(request: HighlightRequest): Promise<HighlightResponse> {
    return tracer.startActiveSpan('context_pruner_request', async (span) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(`${this.endpoint}/highlight`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Context pruner failed: ${response.status}`);
        }
        return (await response.json()) as HighlightResponse;
      } finally {
        clearTimeout(timeout);
        span.end();
      }
    });
  }
}

export function applyPolicy(
  request: HighlightRequest,
  policy?: PruningPolicy,
): HighlightRequest {
  if (!policy) {
    return request;
  }
  return {
    ...request,
    budget: policy.maxContextTokens ?? request.budget,
    keep_at_least_sources:
      policy.minEvidenceSources ?? request.keep_at_least_sources,
    strict_mode: policy.strictMode ?? request.strict_mode,
  };
}
