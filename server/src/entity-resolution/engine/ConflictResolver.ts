export interface MergeStrategy {
  name: string;
  resolve(entityA: any, entityB: any): any;
}

export type StrategyType = 'source_priority' | 'recency' | 'completeness' | 'manual';

export class ConflictResolver {
  private static SOURCE_PRIORITY: Record<string, number> = {
    'official_records': 100,
    'government': 90,
    'financial': 80,
    'osint_high_confidence': 70,
    'social_media': 10,
    'unknown': 0
  };

  /**
   * Merges two entities based on the selected strategy.
   */
  public static resolve(entityA: any, entityB: any, strategies: StrategyType[] = ['recency']): any {
    // Start with a base merge (A as base)
    let merged = { ...entityA, ...entityB };

    // Critical fields that should be merged carefully
    const criticalFields = ['name', 'address', 'phone', 'email', 'dateOfBirth'];

    for (const field of criticalFields) {
      const valA = entityA[field];
      const valB = entityB[field];

      if (valA && valB && valA !== valB) {
        // Conflict detected
        merged[field] = this.resolveField(field, valA, valB, entityA, entityB, strategies);
      } else if (valA) {
        merged[field] = valA;
      } else if (valB) {
        merged[field] = valB;
      }
    }

    // Merge arrays (contacts, etc.)
    // Assuming 'contacts' is an array of strings or objects.
    // This is a simplified array merge (union).
    const arrayFields = ['tags', 'aliases'];
    for (const field of arrayFields) {
        const arrA = Array.isArray(entityA[field]) ? entityA[field] : [];
        const arrB = Array.isArray(entityB[field]) ? entityB[field] : [];
        // distinct union
        merged[field] = [...new Set([...arrA, ...arrB])];
    }

    return merged;
  }

  private static resolveField(field: string, valA: any, valB: any, entityA: any, entityB: any, strategies: StrategyType[]): any {
    for (const strategy of strategies) {
      if (strategy === 'source_priority') {
        const scoreA = this.SOURCE_PRIORITY[entityA.source] || 0;
        const scoreB = this.SOURCE_PRIORITY[entityB.source] || 0;
        if (scoreA > scoreB) return valA;
        if (scoreB > scoreA) return valB;
      }

      if (strategy === 'recency') {
        const dateA = new Date(entityA.updatedAt || 0).getTime();
        const dateB = new Date(entityB.updatedAt || 0).getTime();
        if (dateA > dateB) return valA;
        if (dateB > dateA) return valB;
      }

      if (strategy === 'completeness') {
         // Simple heuristic: longer string is "more complete"
         if (String(valA).length > String(valB).length) return valA;
         if (String(valB).length > String(valA).length) return valB;
      }
    }

    // Default to A if no strategy decides
    return valA;
  }
}
