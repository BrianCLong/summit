import { BasePolicyAdapter } from './base.js';
import type { AdapterEvaluation, ReadonlyQueryContext } from '../types.js';

export interface KAnonymityFilterOptions {
  k: number;
  fallbackSelector?: string;
}

export class KAnonymityFilterAdapter extends BasePolicyAdapter {
  readonly name = 'k-anonymity-filter';
  private readonly k: number;
  private readonly fallbackSelector?: string;

  constructor(options: KAnonymityFilterOptions) {
    super();
    if (options.k < 1) {
      throw new Error('k must be >= 1');
    }
    this.k = options.k;
    this.fallbackSelector = options.fallbackSelector;
  }

  protected shouldApply(context: ReadonlyQueryContext): boolean {
    if (!context.selectorStats) {
      return false;
    }
    return context.selectors.some((selector) => {
      const population = context.selectorStats?.[selector] ?? 0;
      return population > 0 && population < this.k;
    });
  }

  protected apply(context: ReadonlyQueryContext): AdapterEvaluation {
    if (!context.selectorStats) {
      return {
        action: 'allow',
        explanation: 'No selector statistics were supplied; k-anonymity filter skipped.',
      };
    }

    const sanitizedSelectors = context.selectors.filter((selector) => {
      const population = context.selectorStats?.[selector] ?? 0;
      return population >= this.k;
    });

    if (sanitizedSelectors.length > 0) {
      return {
        action: 'transform',
        explanation: `Selectors were pruned to satisfy k=${this.k} anonymity.`,
        sanitizedSelectors,
      };
    }

    const fallback = this.fallbackSelector ?? '*';
    return {
      action: 'transform',
      explanation: `All selectors violated k=${this.k}; replaced with fallback selector.`,
      sanitizedSelectors: [fallback],
      metadata: {
        originalSelectors: [...context.selectors],
      },
    };
  }
}

export default KAnonymityFilterAdapter;
