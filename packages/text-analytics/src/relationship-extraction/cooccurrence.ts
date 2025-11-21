/**
 * Co-occurrence analysis
 */

export class CooccurrenceAnalyzer {
  /**
   * Analyze entity co-occurrence
   */
  analyzeCooccurrence(
    documents: string[],
    entities: string[]
  ): Map<string, Map<string, number>> {
    const cooccurrence = new Map<string, Map<string, number>>();

    for (const entity of entities) {
      cooccurrence.set(entity, new Map());
    }

    for (const doc of documents) {
      const presentEntities = entities.filter((e) => doc.includes(e));

      for (let i = 0; i < presentEntities.length; i++) {
        for (let j = i + 1; j < presentEntities.length; j++) {
          const entity1 = presentEntities[i];
          const entity2 = presentEntities[j];

          const map1 = cooccurrence.get(entity1)!;
          map1.set(entity2, (map1.get(entity2) || 0) + 1);

          const map2 = cooccurrence.get(entity2)!;
          map2.set(entity1, (map2.get(entity1) || 0) + 1);
        }
      }
    }

    return cooccurrence;
  }
}
