export default class EntityCorrelationEngine {
  groupSimilarEntities(entities: any[]) {
    const grouped = new Map<string, any[]>();
    for (const entity of entities) {
      const key = String(entity?.label ?? entity?.id ?? 'unknown');
      const bucket = grouped.get(key) ?? [];
      bucket.push(entity);
      grouped.set(key, bucket);
    }
    return Array.from(grouped.values());
  }

  mergeEntities(cluster: any[]) {
    if (!cluster.length) return null;
    const base = { ...cluster[0] };
    return { ...base, mergedFrom: cluster.map((e) => e.id) };
  }
}
