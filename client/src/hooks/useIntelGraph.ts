/**
 * Intelligence OS — IntelGraph integration hooks (Phase 8)
 *
 * Bridge between UI components and the IntelGraph knowledge graph backend.
 * Every Intelligence OS component connects to IntelGraph through these hooks.
 */
import { useCallback, useMemo, useState } from 'react';
import type {
  Entity,
  EntityId,
  IntelEvent,
  Relationship,
  Source,
} from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// useEntityLookup — resolve entity IDs to full Entity objects
// ---------------------------------------------------------------------------

export function useEntityLookup(entityMap: Map<EntityId, Entity>) {
  const resolve = useCallback(
    (id: EntityId): Entity | undefined => entityMap.get(id),
    [entityMap],
  );

  const resolveMany = useCallback(
    (ids: EntityId[]): Entity[] =>
      ids.map((id) => entityMap.get(id)).filter((e): e is Entity => e !== undefined),
    [entityMap],
  );

  return { resolve, resolveMany } as const;
}

// ---------------------------------------------------------------------------
// useGraphTraversal — traverse relationships from a starting entity
// ---------------------------------------------------------------------------

export function useGraphTraversal(
  relationships: Relationship[],
  entities: Entity[],
) {
  const adjacency = useMemo(() => {
    const adj = new Map<EntityId, { relationship: Relationship; targetId: EntityId }[]>();
    for (const r of relationships) {
      const list = adj.get(r.sourceId) ?? [];
      list.push({ relationship: r, targetId: r.targetId });
      adj.set(r.sourceId, list);

      // Bidirectional
      const rev = adj.get(r.targetId) ?? [];
      rev.push({ relationship: r, targetId: r.sourceId });
      adj.set(r.targetId, rev);
    }
    return adj;
  }, [relationships]);

  const neighbors = useCallback(
    (entityId: EntityId) => adjacency.get(entityId) ?? [],
    [adjacency],
  );

  const shortestPath = useCallback(
    (from: EntityId, to: EntityId): EntityId[] | null => {
      const visited = new Set<EntityId>();
      const queue: EntityId[][] = [[from]];
      while (queue.length > 0) {
        const path = queue.shift()!;
        const current = path[path.length - 1];
        if (current === to) return path;
        if (visited.has(current)) continue;
        visited.add(current);
        for (const { targetId } of adjacency.get(current) ?? []) {
          if (!visited.has(targetId)) queue.push([...path, targetId]);
        }
      }
      return null;
    },
    [adjacency],
  );

  return { neighbors, shortestPath } as const;
}

// ---------------------------------------------------------------------------
// useEventTimeline — sort and filter events for timeline rendering
// ---------------------------------------------------------------------------

export function useEventTimeline(events: IntelEvent[]) {
  const [filterType, setFilterType] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const base = filterType ? events.filter((e) => e.type === filterType) : events;
    return [...base].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [events, filterType]);

  const eventTypes = useMemo(() => [...new Set(events.map((e) => e.type))], [events]);

  return { filtered, eventTypes, filterType, setFilterType } as const;
}

// ---------------------------------------------------------------------------
// useSourceReliability — aggregate source reliability scoring
// ---------------------------------------------------------------------------

export function useSourceReliability(sources: Source[]) {
  const averageReliability = useMemo(() => {
    if (sources.length === 0) return 0;
    return sources.reduce((sum, s) => sum + s.reliability, 0) / sources.length;
  }, [sources]);

  const byReliability = useMemo(
    () => [...sources].sort((a, b) => b.reliability - a.reliability),
    [sources],
  );

  return { averageReliability, byReliability } as const;
}
