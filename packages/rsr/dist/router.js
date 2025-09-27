

function deepFreeze(obj) {
  if (obj && typeof obj === 'object') {
    Object.freeze(obj);
    for (const key of Object.keys(obj )) {
      const value = (obj )[key];
      if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        deepFreeze(value);
      }
    }
  }
  return obj;
}

export class RetrievalSafetyRouter {
  
  

  constructor(adapters, fallback) {
    this.adapters = adapters;
    this.fallback = fallback;
  }

  async route(context) {
    const immutableContext = deepFreeze({
      tenantId: context.tenantId,
      query: context.query,
      selectors: [...context.selectors],
      selectorStats: context.selectorStats ? { ...context.selectorStats } : undefined,
      metadata: context.metadata ? { ...context.metadata } : undefined,
    }) ;

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
