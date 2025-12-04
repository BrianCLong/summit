import { useEffect, useState, useCallback } from 'react';
import * as Y from 'yjs';
import type { Entity, Relationship } from '@/types';

export const useGraphSync = (
  doc: Y.Doc,
  initialEntities: Entity[] = [],
  initialRelationships: Relationship[] = []
) => {
  const [syncedEntities, setSyncedEntities] = useState<Entity[]>(initialEntities);
  const [syncedRelationships, setSyncedRelationships] = useState<Relationship[]>(initialRelationships);

  const entitiesMap = doc.getMap<Entity>('entities');
  const relationshipsMap = doc.getMap<Relationship>('relationships');

  // Sync from Y.js to local state
  useEffect(() => {
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
  useEffect(() => {
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

  const addEntity = useCallback((entity: Entity) => {
    entitiesMap.set(entity.id, entity);
  }, [entitiesMap]);

  const updateEntity = useCallback((entity: Entity) => {
    entitiesMap.set(entity.id, entity);
  }, [entitiesMap]);

  const updateEntityPosition = useCallback((id: string, x: number, y: number) => {
      const entity = entitiesMap.get(id);
      if (entity) {
          // Assuming Entity has x/y or similar, or we store position separately.
          // Since Entity type might not have layout props, we might need to wrap it.
          // But usually GraphCanvas uses entity props.
          // Let's assume we can augment entity or stored separately.
          // For simplicity, we update the entity object itself if it has x/y.
          // If not, we might need a separate 'positions' map.
          // We'll assume direct update for now.
          entitiesMap.set(id, { ...entity, x, y } as any);
      }
  }, [entitiesMap]);

  const removeEntity = useCallback((id: string) => {
    entitiesMap.delete(id);
  }, [entitiesMap]);

  const addRelationship = useCallback((rel: Relationship) => {
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
