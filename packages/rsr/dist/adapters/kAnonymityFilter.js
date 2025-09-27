 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { BasePolicyAdapter } from './base.js';







export class KAnonymityFilterAdapter extends BasePolicyAdapter {
   __init() {this.name = 'k-anonymity-filter'}
  
  

  constructor(options) {
    super();KAnonymityFilterAdapter.prototype.__init.call(this);;
    if (options.k < 1) {
      throw new Error('k must be >= 1');
    }
    this.k = options.k;
    this.fallbackSelector = options.fallbackSelector;
  }

   shouldApply(context) {
    if (!context.selectorStats) {
      return false;
    }
    return context.selectors.some((selector) => {
      const population = _nullishCoalesce(_optionalChain([context, 'access', _ => _.selectorStats, 'optionalAccess', _2 => _2[selector]]), () => ( 0));
      return population > 0 && population < this.k;
    });
  }

   apply(context) {
    if (!context.selectorStats) {
      return {
        action: 'allow',
        explanation: 'No selector statistics were supplied; k-anonymity filter skipped.',
      };
    }

    const sanitizedSelectors = context.selectors.filter((selector) => {
      const population = _nullishCoalesce(_optionalChain([context, 'access', _3 => _3.selectorStats, 'optionalAccess', _4 => _4[selector]]), () => ( 0));
      return population >= this.k;
    });

    if (sanitizedSelectors.length > 0) {
      return {
        action: 'transform',
        explanation: `Selectors were pruned to satisfy k=${this.k} anonymity.`,
        sanitizedSelectors,
      };
    }

    const fallback = _nullishCoalesce(this.fallbackSelector, () => ( '*'));
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
