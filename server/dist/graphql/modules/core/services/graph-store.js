export function createGraphStore() {
    const entities = [];
    const relationships = [];
    return {
        async getEntities(filters) {
            const { limit } = filters || {};
            return typeof limit === 'number' ? entities.slice(0, limit) : entities;
        },
        async getRelationships(entityId) {
            return relationships.filter((r) => r.source === entityId || r.target === entityId);
        },
        async upsertEntity(input) {
            const index = entities.findIndex((e) => e.id === input.id);
            if (index >= 0) {
                entities[index] = { ...entities[index], ...input };
                return entities[index];
            }
            const id = input.id || String(entities.length + 1);
            const entity = { id, ...input };
            entities.push(entity);
            return entity;
        },
    };
}
//# sourceMappingURL=graph-store.js.map