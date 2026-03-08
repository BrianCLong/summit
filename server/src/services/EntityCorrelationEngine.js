"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EntityCorrelationEngine {
    groupSimilarEntities(entities) {
        const grouped = new Map();
        for (const entity of entities) {
            const key = String(entity?.label ?? entity?.id ?? 'unknown');
            const bucket = grouped.get(key) ?? [];
            bucket.push(entity);
            grouped.set(key, bucket);
        }
        return Array.from(grouped.values());
    }
    mergeEntities(cluster) {
        if (!cluster.length)
            return null;
        const base = { ...cluster[0] };
        return { ...base, mergedFrom: cluster.map((e) => e.id) };
    }
}
exports.default = EntityCorrelationEngine;
