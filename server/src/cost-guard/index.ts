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
