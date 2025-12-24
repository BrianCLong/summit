// @ts-nocheck
import { QueryAnalysis, QueryIntent, OptimizationContext, QueryPlan, TraversalStrategy } from './types.js';
import { TraversalOptimizer } from './TraversalOptimizer.js';
import { QueryAnalyzer } from './QueryAnalyzer.js';
import { QueryRewriter } from './QueryRewriter.js';
import { QueryCostEstimator } from './QueryCostEstimator.js';

export class QueryPlanner {
  private traversalOptimizer = new TraversalOptimizer();
  private analyzer = new QueryAnalyzer();
  private rewriter = new QueryRewriter();
  private costEstimator = new QueryCostEstimator();

  /**
   * Generates a comprehensive execution plan.
   * If the query is a raw string, it analyzes it.
   * If the context specifies an intent, it generates a new query using TraversalOptimizer.
   */
  public plan(query: string, params: Record<string, unknown>, context: OptimizationContext): QueryPlan {
    // 1. Analyze the input query
    const analysis = this.analyzer.analyze(query, context);

    // 2. Determine Intent (if not provided in context, infer from analysis)
    const intent = context.intent || analysis.intent || 'read';

    // 3. Select Strategy based on Intent and Analysis
    const strategy = this.selectStrategy(intent, analysis, context);

    // 4. Optimize/Generate Query
    let optimizedQuery = query;
    const optimizations = [];

    // Apply basic rewrites first
    const rewriteResult = this.rewriter.rewrite(query, analysis);
    optimizedQuery = rewriteResult.optimizedQuery;
    optimizations.push(...rewriteResult.optimizations);

    if (context.intent && strategy) {
        // If specific intent is requested (e.g. via API), generate the query from scratch
        // This assumes 'query' might be a placeholder or empty if intent is explicit
        optimizedQuery = this.traversalOptimizer.optimize(strategy, params);
        optimizations.push({
            name: 'intent_based_generation',
            type: 'traversal_optimization',
            description: `Generated optimized query for intent: ${intent} using strategy: ${strategy.type}`,
            impact: 'high',
            applied: true
        });
    }

    // 5. Estimate Cost
    const cost = this.costEstimator.estimate(analysis);

    return {
      originalQuery: query,
      optimizedQuery,
      indexes: analysis.requiredIndexes,
      estimatedCost: cost.cost,
      estimatedRows: cost.rows,
      optimizations,
      traversalStrategy: strategy,
      executionHints: this.generateExecutionHints(strategy, cost.rows)
    };
  }

  private selectStrategy(intent: QueryIntent, analysis: QueryAnalysis, context: OptimizationContext): TraversalStrategy | undefined {
    switch (intent) {
        case 'path_finding':
            return {
                name: 'shortest_path_search',
                type: 'shortest_path',
                maxDepth: 5,
                limit: 1
            };
        case 'neighborhood':
            // Use APOC if available (could check context for feature flags)
            if (context.features?.includes('apoc')) {
                return {
                    name: 'apoc_expansion',
                    type: 'apoc_subgraph',
                    maxDepth: 2,
                    limit: 1000
                };
            }
            return {
                name: 'native_expansion',
                type: 'native_expansion',
                maxDepth: 2,
                limit: 500
            };
        case 'centrality':
             return {
                name: 'gds_centrality',
                type: 'gds',
                algorithmConfig: { name: 'pageRank' }
             };
        default:
            return undefined;
    }
  }

  private generateExecutionHints(strategy: TraversalStrategy | undefined, estimatedRows: number): Array<{ type: string; value: string; description: string }> {
      const hints = [];
      if (estimatedRows > 10000) {
          hints.push({
              type: 'memory',
              value: 'high',
              description: 'Result set is expected to be large.'
          });
      }
      if (strategy?.type === 'apoc_subgraph') {
           hints.push({
              type: 'concurrency',
              value: 'parallel',
              description: 'APOC subgraph procedures run in a single thread usually, but check server config.'
          });
      }
      return hints;
  }
}
