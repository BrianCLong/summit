/**
 * Cost Guard Module
 *
 * Provides cost budgeting and rate limiting infrastructure that can be
 * dropped into any service without modifying business logic.
 *
 * Features:
 * - Per-tenant budget tracking (daily/monthly)
 * - Query complexity-based cost calculation
 * - Rate limiting based on cost thresholds
 * - Automatic cost recording and reporting
 * - Clear error messages when budgets exceeded
 *
 * @module cost-guard
 */

export {
  costGuardMiddleware,
  costRecordingMiddleware,
  withCostGuard,
  withCostGuardResolver,
  withCostGuardDB,
  withCostGuardExport,
  costGuard,
  CostGuardError,
  CostGuardService,
} from './middleware';

export type { CostGuardContext, CostGuardOptions } from './middleware';

// Stub for slow query killer
export function killSlowQueries(thresholdMs: number = 30000): Promise<number> {
  // In a real implementation, this would query pg_stat_activity and terminate backends
  // or use Neo4j's dbms.listQueries and dbms.killQuery
  console.log(`[CostGuard] Scanning for queries slower than ${thresholdMs}ms...`);
  // Mock finding 0 queries
  return Promise.resolve(0);
}
