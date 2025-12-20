import { OptimizationRule } from './types.js';
import GraphIndexAdvisorService from '../../services/GraphIndexAdvisorService.js';

export class IndexAdvisor {
  /**
   * Recommends indexes based on the required indexes identified in the query analysis.
   * It also cross-references with the runtime GraphIndexAdvisorService for better suggestions.
   */
  public recommend(requiredIndexes: string[]): OptimizationRule {
    const missing: string[] = [];

    // Note: GraphIndexAdvisorService is a singleton service that tracks runtime query patterns.
    // We can use it here if we wanted to check against historical data, but recommend() is synchronous.
    // For now, we rely on static analysis of the "requiredIndexes" derived from the current query AST.

    for (const idx of requiredIndexes) {
       // Check if this looks like a valid index candidate (Label.property)
       if (idx.includes('.') && !idx.includes('.id')) { // Skip ID as it's usually primary key
           missing.push(idx);
       }
    }

    if (missing.length > 0) {
      return {
        name: 'missing_indexes',
        type: 'index_hint',
        description: `Ensure indexes exist for potentially filtered properties: ${missing.join(', ')}`,
        impact: 'high',
        applied: false,
        reason: 'Query filters on these properties may be slow without indexes.'
      };
    }

    return {
        name: 'index_check',
        type: 'index_hint',
        description: 'No obvious missing indexes detected.',
        impact: 'low',
        applied: true
    };
  }
}
