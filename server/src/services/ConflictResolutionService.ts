// @ts-nocheck
import pino from 'pino';

const logger = (pino as any)({ name: 'ConflictResolutionService' });

export enum ConflictResolutionStrategy {
  LATEST_WINS = 'LATEST_WINS',
  SOURCE_PRIORITY = 'SOURCE_PRIORITY',
  MANUAL = 'MANUAL',
}

interface Entity {
  [key: string]: unknown;
}

export class ConflictResolutionService {
  /**
   * Resolves conflicts between two entities based on the provided strategy.
   * Merges properties from source into target.
   *
   * @param target The base entity (master).
   * @param source The entity being merged (duplicate).
   * @param strategy The conflict resolution strategy.
   * @param sourcePriority Optional list of sources in order of priority (for SOURCE_PRIORITY strategy).
   * @returns The merged entity.
   */
  public resolveConflicts(
    target: Entity,
    source: Entity,
    strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.LATEST_WINS,
    sourcePriority: string[] = []
  ): Entity {
    const merged: Entity = { ...target };

    // Identify all keys from both entities
    const allKeys = new Set([...Object.keys(target), ...Object.keys(source)]);

    for (const key of allKeys) {
      const targetVal = target[key];
      const sourceVal = source[key];

      // Skip internal fields or ID fields that shouldn't be merged arbitrarily
      if (['id', 'canonicalId', 'uuid'].includes(key)) {
        continue;
      }

      // 1. Handling Arrays: Union strategy (always merge arrays to preserve data)
      if (Array.isArray(targetVal) || Array.isArray(sourceVal)) {
        const tArr = Array.isArray(targetVal) ? targetVal : (targetVal ? [targetVal] : []);
        const sArr = Array.isArray(sourceVal) ? sourceVal : (sourceVal ? [sourceVal] : []);

        // Simple deduplication for primitives
        merged[key] = Array.from(new Set([...tArr, ...sArr]));
        continue;
      }

      // 2. Handling Scalars
      if (sourceVal !== undefined && sourceVal !== null) {
        if (targetVal === undefined || targetVal === null) {
          // If target is empty, take source
          merged[key] = sourceVal;
        } else if (targetVal !== sourceVal) {
          // Conflict detected
          merged[key] = this.applyStrategy(key, targetVal, sourceVal, target, source, strategy, sourcePriority);
        }
      }
    }

    return merged;
  }

  private applyStrategy(
    key: string,
    valA: unknown,
    valB: unknown,
    entityA: Entity,
    entityB: Entity,
    strategy: ConflictResolutionStrategy,
    sourcePriority: string[]
  ): unknown {
    switch (strategy) {
      case ConflictResolutionStrategy.LATEST_WINS:
        // Assume there is a 'updatedAt' or 'lastSeen' field. If not, default to existing (A).
        const timeA = new Date(entityA.updatedAt || entityA.lastSeen || 0).getTime();
        const timeB = new Date(entityB.updatedAt || entityB.lastSeen || 0).getTime();
        return timeB > timeA ? valB : valA;

      case ConflictResolutionStrategy.SOURCE_PRIORITY:
        const sourceA = entityA.source || 'unknown';
        const sourceB = entityB.source || 'unknown';
        const idxA = sourcePriority.indexOf(sourceA);
        const idxB = sourcePriority.indexOf(sourceB);

        // If both are found, lower index wins (higher priority)
        // If one is not found, the found one wins
        // If neither found, default to A
        if (idxA !== -1 && idxB !== -1) return idxA < idxB ? valA : valB;
        if (idxA !== -1) return valA;
        if (idxB !== -1) return valB;
        return valA;

      case ConflictResolutionStrategy.MANUAL:
        // For manual, we might default to A but flag it?
        // Or keep both in a special field?
        // For now, default to A (target) but log warning.
        logger.warn({ key, valA, valB }, 'Manual conflict resolution required. Defaulting to target value.');
        return valA;

      default:
        return valA;
    }
  }
}
