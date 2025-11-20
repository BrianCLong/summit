/**
 * Summit Query Optimizer
 * 
 * Advanced query optimization with:
 * - Cost-based optimization
 * - Execution plan analysis
 * - Index recommendations
 * - Materialized view management
 * - Statistics collection
 * - Query rewriting
 */

export * from './planner/cost-optimizer';
export * from './executor/plan-executor';
export * from './rewriter/query-rewriter';
export * from './statistics/stats-collector';
export * from './materialized/mv-manager';
export * from './optimizer-manager';
