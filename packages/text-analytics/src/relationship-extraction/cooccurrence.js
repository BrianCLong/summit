"use strict";
/**
 * Co-occurrence analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CooccurrenceAnalyzer = void 0;
class CooccurrenceAnalyzer {
    /**
     * Analyze entity co-occurrence
     */
    analyzeCooccurrence(documents, entities) {
        const cooccurrence = new Map();
        for (const entity of entities) {
            cooccurrence.set(entity, new Map());
        }
        for (const doc of documents) {
            const presentEntities = entities.filter((e) => doc.includes(e));
            for (let i = 0; i < presentEntities.length; i++) {
                for (let j = i + 1; j < presentEntities.length; j++) {
                    const entity1 = presentEntities[i];
                    const entity2 = presentEntities[j];
                    const map1 = cooccurrence.get(entity1);
                    map1.set(entity2, (map1.get(entity2) || 0) + 1);
                    const map2 = cooccurrence.get(entity2);
                    map2.set(entity1, (map2.get(entity1) || 0) + 1);
                }
            }
        }
        return cooccurrence;
    }
}
exports.CooccurrenceAnalyzer = CooccurrenceAnalyzer;
