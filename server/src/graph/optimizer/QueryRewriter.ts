import { OptimizationRule, QueryAnalysis } from './types.js';

export class QueryRewriter {
  public rewrite(query: string, analysis: QueryAnalysis): { optimizedQuery: string; optimizations: OptimizationRule[] } {
    const optimizations: OptimizationRule[] = [];
    let optimizedQuery = query;

    // 1. Cartesian Product Check
    if (analysis.nodeCount > 2 && analysis.relationshipCount === 0 && analysis.isRead) {
      optimizations.push({
        name: 'cartesian_product_warning',
        type: 'query_rewrite',
        description: 'Potential Cartesian product detected. Ensure relationships exist between matched nodes.',
        impact: 'high',
        applied: false,
        reason: 'Requires manual logical verification.',
      });
    }

    // 2. Add LIMIT to open-ended wildcard queries
    if (analysis.hasWildcard && !query.toLowerCase().includes('limit') && analysis.isRead) {
      optimizedQuery += ' LIMIT 1000';
      optimizations.push({
        name: 'add_limit',
        type: 'query_rewrite',
        description: 'Added LIMIT 1000 to prevent unbounded result sets.',
        impact: 'medium',
        applied: true,
      });
    }

    // 3. Early Filtering (Heuristic)
    const lowerQuery = query.toLowerCase();
    const matches = lowerQuery.match(/\bmatch\b/g);
    const wherePos = lowerQuery.indexOf('where');

    if (matches && matches.length > 2 && wherePos > -1 && wherePos > lowerQuery.lastIndexOf('match')) {
         optimizations.push({
            name: 'early_filtering_hint',
            type: 'query_rewrite',
            description: 'Consider moving WHERE clauses earlier in the MATCH chain to reduce cardinality.',
            impact: 'medium',
            applied: false,
            reason: 'Complex rewrite requires AST.',
        });
    }

    return { optimizedQuery, optimizations };
  }
}
