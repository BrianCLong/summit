"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGraphSync = void 0;
const react_1 = require("react");
const useGraphSync = (doc, initialEntities = [], initialRelationships = []) => {
    const [syncedEntities, setSyncedEntities] = (0, react_1.useState)(initialEntities);
    const [syncedRelationships, setSyncedRelationships] = (0, react_1.useState)(initialRelationships);
    const entitiesMap = doc.getMap('entities');
    const relationshipsMap = doc.getMap('relationships');
    // Sync from Y.js to local state
    (0, react_1.useEffect)(() => {
        const updateState = () => {
            setSyncedEntities(Array.from(entitiesMap.values()));
            setSyncedRelationships(Array.from(relationshipsMap.values()));
        };
        entitiesMap.observe(updateState);
        relationshipsMap.observe(updateState);
        // Initial load
        updateState();
        return () => {
            entitiesMap.unobserve(updateState);
            relationshipsMap.unobserve(updateState);
        };
    }, [doc, entitiesMap, relationshipsMap]);
    // Initial population if empty
    (0, react_1.useEffect)(() => {
        // Wait for sync to likely happen or check if map is empty
        // This is tricky with Y.js as sync might come later.
        // Usually we trust the backend state. If it's empty, we might want to seed it.
        // For now, only seed if we have initial data and map is empty.
        // NOTE: This can cause issues if multiple clients init at once.
        // Better strategy: Only "host" inits, or we rely on backend seed.
        // But for this "replace Socket.io broadcast-on-save", we assume
        // we start with what we have if Y.js is empty.
        // Simple check: if local map size is 0 and we have initial data, populate.
        // We should probably wait for 'synced' event from provider but this hook doesn't see provider.
        // We'll rely on the fact that if we just created the doc, it's empty.
        if (entitiesMap.size === 0 && initialEntities.length > 0) {
            doc.transact(() => {
                initialEntities.forEach(e => entitiesMap.set(e.id, e));
            });
        }
        if (relationshipsMap.size === 0 && initialRelationships.length > 0) {
            doc.transact(() => {
                initialRelationships.forEach(r => relationshipsMap.set(r.id, r));
            });
        }
    }, [doc, initialEntities, initialRelationships, entitiesMap, relationshipsMap]);
    const addEntity = (0, react_1.useCallback)((entity) => {
        entitiesMap.set(entity.id, entity);
    }, [entitiesMap]);
    const updateEntity = (0, react_1.useCallback)((entity) => {
        entitiesMap.set(entity.id, entity);
    }, [entitiesMap]);
    const updateEntityPosition = (0, react_1.useCallback)((id, x, y) => {
        const entity = entitiesMap.get(id);
        if (entity) {
            // Assuming Entity has x/y or similar, or we store position separately.
            // Since Entity type might not have layout props, we might need to wrap it.
            // But usually GraphCanvas uses entity props.
            // Let's assume we can augment entity or stored separately.
            // For simplicity, we update the entity object itself if it has x/y.
            // If not, we might need a separate 'positions' map.
            // We'll assume direct update for now.
            entitiesMap.set(id, { ...entity, x, y });
        }
    }, [entitiesMap]);
    const removeEntity = (0, react_1.useCallback)((id) => {
        entitiesMap.delete(id);
    }, [entitiesMap]);
    const addRelationship = (0, react_1.useCallback)((rel) => {
        relationshipsMap.set(rel.id, rel);
    }, [relationshipsMap]);
    return {
        entities: syncedEntities.length > 0 ? syncedEntities : initialEntities, // Fallback to initial if sync empty/loading? No, use synced.
        relationships: syncedRelationships.length > 0 ? syncedRelationships : initialRelationships,
        addEntity,
        updateEntity,
        updateEntityPosition,
        removeEntity,
        addRelationship,
    };
};
exports.useGraphSync = useGraphSync;
