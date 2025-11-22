import { Entity, Relationship } from '../schema';
import { v4 as uuid } from 'uuid';

/**
 * In-memory store for managing entities and relationships in the graph.
 * Provides temporal querying capabilities for time-based entity retrieval.
 * Uses Map data structures for efficient lookups and updates.
 */
class Store {
  /** Map of entity IDs to Entity objects */
  entities = new Map<string, Entity>();
  /** Map of relationship IDs to Relationship objects */
  relationships = new Map<string, Relationship>();

  /**
   * Creates or updates an entity in the store.
   * If the entity has an ID and exists, merges the new data with existing data.
   * If no ID is provided, generates a new UUID.
   *
   * @param data - The entity data to upsert
   * @returns The created or updated entity with its ID
   */
  upsertEntity(data: Entity) {
    const id = data.id || uuid();
    const existing = this.entities.get(id);
    const entity = { ...existing, ...data, id } as Entity;
    this.entities.set(id, entity);
    return entity;
  }

  /**
   * Creates or updates a relationship in the store.
   * If the relationship has an ID and exists, merges the new data with existing data.
   * If no ID is provided, generates a new UUID.
   *
   * @param data - The relationship data to upsert
   * @returns The created or updated relationship with its ID
   */
  upsertRelationship(data: Relationship) {
    const id = data.id || uuid();
    const existing = this.relationships.get(id);
    const rel = { ...existing, ...data, id } as Relationship;
    this.relationships.set(id, rel);
    return rel;
  }

  /**
   * Retrieves an entity by its ID.
   *
   * @param id - The unique identifier of the entity
   * @returns The entity if found, undefined otherwise
   */
  getEntity(id: string) {
    return this.entities.get(id);
  }

  /**
   * Retrieves an entity as it existed at a specific point in time.
   * Checks the entity's validFrom and validTo timestamps to determine
   * if it was valid at the specified time.
   *
   * @param id - The unique identifier of the entity
   * @param time - The timestamp to query (ISO 8601 format or parseable date string)
   * @returns The entity if it was valid at the specified time, undefined otherwise
   */
  getEntityAt(id: string, time: string) {
    const e = this.entities.get(id);
    if (!e) return undefined;
    const t = new Date(time).toISOString();
    if (e.validFrom && e.validFrom > t) return undefined;
    if (e.validTo && e.validTo <= t) return undefined;
    return e;
  }
}

/**
 * Singleton instance of the graph store for global access.
 * Use this instance for all entity and relationship operations.
 */
export const store = new Store();
