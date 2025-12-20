import { QueryAnalyzer } from './QueryAnalyzer.js';
import { QueryRewriter } from './QueryRewriter.js';
import { QueryCache } from './QueryCache.js';
import { QueryCostEstimator } from './QueryCostEstimator.js';
import { IndexAdvisor } from './IndexAdvisor.js';
import { OptimizationContext, QueryPlan } from './types.js';
import neo4j from 'neo4j-driver';
import { telemetry } from '../../lib/telemetry/comprehensive-telemetry.js';
import { BatchQueryExecutor } from './BatchQueryExecutor.js';

export class GraphOptimizer {
  private analyzer = new QueryAnalyzer();
  private rewriter = new QueryRewriter();
  private cache = new QueryCache();
  private costEstimator = new QueryCostEstimator();
  private indexAdvisor = new IndexAdvisor();
  private batchExecutor = new BatchQueryExecutor();

  public async optimize(query: string, params: any, context: OptimizationContext): Promise<QueryPlan> {
    const analysis = this.analyzer.analyze(query, context);
    const { optimizedQuery, optimizations } = this.rewriter.rewrite(query, analysis);

    const cost = this.costEstimator.estimate(analysis);
    const indexRecommendation = this.indexAdvisor.recommend(analysis.requiredIndexes);
    if (indexRecommendation.name === 'missing_indexes') {
        optimizations.push(indexRecommendation);
    }

    const cacheStrategy = this.cache.generateStrategy(analysis, context);

    return {
      originalQuery: query,
      optimizedQuery,
      indexes: analysis.requiredIndexes,
      estimatedCost: cost.cost,
      estimatedRows: cost.rows,
      optimizations,
      cacheStrategy,
      executionHints: [] // Populate with heuristics if needed
    };
  }

  public async executeCached(
      query: string,
      params: any,
      context: OptimizationContext,
      executeFn: (q: string, p: any) => Promise<any>
  ): Promise<any> {
      // 1. Optimize
      const plan = await this.optimize(query, params, context);

      // 2. Check Cache
      if (plan.cacheStrategy?.enabled) {
          const key = this.cache.generateKey(query, params, context);
          const cached = await this.cache.get(key);
          if (cached) {
              // telemetry.subsystems.database.cache.hits.add(1);
              return cached;
          }
          // telemetry.subsystems.database.cache.misses.add(1);
      }

      // 3. Execute
      const start = Date.now();
      const rawResult = await executeFn(plan.optimizedQuery, params);
      const duration = Date.now() - start;

      // 4. Normalize
      const normalized = this.transformNeo4jIntegers(rawResult);

      // 5. Write Cache
      if (plan.cacheStrategy?.enabled) {
          const key = this.cache.generateKey(query, params, context);
          // Fire and forget
          this.cache.set(key, normalized, plan.cacheStrategy.ttl).catch(() => {});
      }

      return normalized;
  }

  public executeBatch(query: string, params: any): Promise<any> {
    return this.batchExecutor.execute(query, params);
  }

  public async invalidate(tenantId: string, labels: string[]) {
      await this.cache.invalidate(tenantId, labels);
  }

  private transformNeo4jIntegers(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (neo4j.isInt(obj)) return obj.inSafeRange() ? obj.toNumber() : obj.toString();
    if (Array.isArray(obj)) return obj.map(v => this.transformNeo4jIntegers(v));
    if (typeof obj === 'object') {
      const newObj: any = {};
      for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
            // Check if it's a Neo4j Record-like object
            if (typeof obj.toObject === 'function') {
                return this.transformNeo4jIntegers(obj.toObject());
            }
            newObj[k] = this.transformNeo4jIntegers(obj[k]);
        }
      }
      return newObj;
    }
    return obj;
  }
}

export const graphOptimizer = new GraphOptimizer();
