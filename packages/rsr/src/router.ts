import { PolicyAdapter, QueryContext, ReadonlyQueryContext, RoutingDecision } from './types.js';

function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object') {
    Object.freeze(obj);
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const value = (obj as Record<string, unknown>)[key];
      if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        deepFreeze(value);
      }
    }
  }
  return obj;
}

export class RetrievalSafetyRouter {
  private readonly adapters: PolicyAdapter[];
  private readonly fallback?: PolicyAdapter;

  constructor(adapters: PolicyAdapter[], fallback?: PolicyAdapter) {
    this.adapters = adapters;
    this.fallback = fallback;
  }

  async route(context: QueryContext): Promise<RoutingDecision> {
    const immutableContext = deepFreeze({
      tenantId: context.tenantId,
      query: context.query,
      selectors: [...context.selectors],
      selectorStats: context.selectorStats ? { ...context.selectorStats } : undefined,
      metadata: context.metadata ? { ...context.metadata } : undefined,
    }) as ReadonlyQueryContext;

    for (const adapter of this.adapters) {
      const result = await adapter.evaluate(immutableContext);
      if (result) {
        return { adapter: adapter.name, ...result };
      }
    }

    if (this.fallback) {
      const result = await this.fallback.evaluate(immutableContext);
      if (result) {
        return { adapter: this.fallback.name, ...result };
      }
    }

    return {
      adapter: 'implicit-allow',
      action: 'allow',
      explanation: 'No adapters provided a decision; default allow applied.',
    };
  }
}

export default RetrievalSafetyRouter;
