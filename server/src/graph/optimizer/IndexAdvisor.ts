import { OptimizationRule } from './types.js';

export class IndexAdvisor {
  public recommend(requiredIndexes: string[]): OptimizationRule {
    const missing: string[] = [];

    for (const idx of requiredIndexes) {
       missing.push(idx);
    }

    if (missing.length > 0) {
      return {
        name: 'missing_indexes',
        type: 'index_hint',
        description: `Ensure indexes exist for: ${missing.join(', ')}`,
        impact: 'high',
        applied: false,
        reason: 'Performance depends on these indexes.'
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
