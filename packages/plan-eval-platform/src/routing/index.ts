export { BaseRouter, createCandidatesFromScenario } from './base-router.js';
export { RandomRouter, createRandomRouter } from './random-router.js';
export {
  GreedyCostRouter,
  createGreedyCostRouter,
} from './greedy-cost-router.js';
export { AdaptiveRouter, createAdaptiveRouter } from './adaptive-router.js';

import type { RoutingConfig, RouterType } from '../types.js';
import { RandomRouter } from './random-router.js';
import { GreedyCostRouter } from './greedy-cost-router.js';
import { AdaptiveRouter } from './adaptive-router.js';
import { BaseRouter } from './base-router.js';

/**
 * Factory function to create routers by type
 */
export function createRouter(
  type: RouterType,
  config?: Partial<RoutingConfig>,
): BaseRouter {
  switch (type) {
    case 'random':
      return new RandomRouter(config);
    case 'greedy_cost':
      return new GreedyCostRouter(config);
    case 'adaptive':
      return new AdaptiveRouter(config);
    case 'quality_first':
      return new GreedyCostRouter({ costWeight: 0, ...config });
    default:
      throw new Error(`Unknown router type: ${type}`);
  }
}
