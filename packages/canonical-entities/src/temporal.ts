/**
 * Temporal and Bitemporal Query Helpers
 *
 * Provides functions for querying entities and edges across time dimensions:
 * - Valid time: When facts were true in the real world
 * - Transaction/recorded time: When facts were recorded in the system
 *
 * @module canonical-entities/temporal
 */

import { BitemporalFields } from './types';
import { GraphEdge, GraphSnapshot } from './edges';

// -----------------------------------------------------------------------------
// Temporal Types
// -----------------------------------------------------------------------------

/**
 * Temporal object with validity window
 */
export interface Temporal {
  validFrom?: Date | null;
  validTo?: Date | null;
}

/**
 * Bitemporal object with validity and transaction time
 */
export interface Bitemporal extends Temporal {
  observedAt?: Date | null;
  recordedAt?: Date | null;
}

// -----------------------------------------------------------------------------
// Validity Helpers
// -----------------------------------------------------------------------------

/**
 * Check if a temporal object is valid at a specific point in time
 *
 * @param temporal - Object with validFrom/validTo fields
 * @param at - The point in time to check (ISO string or Date)
 * @returns true if the object was valid at the specified time
 *
 * @example
 * ```ts
 * const entity = { validFrom: new Date('2020-01-01'), validTo: new Date('2021-01-01') };
 * isValidAt(entity, new Date('2020-06-01')); // true
 * isValidAt(entity, new Date('2022-01-01')); // false
 * ```
 */
export function isValidAt(
  temporal: { validFrom?: Date | null; validTo?: Date | null },
  at: Date | string,
): boolean {
  const checkDate = typeof at === 'string' ? new Date(at) : at;
  const { validFrom, validTo } = temporal;

  // If validFrom is set and checkDate is before it, not valid
  if (validFrom && checkDate < validFrom) {
    return false;
  }

  // If validTo is set and checkDate is after it, not valid
  if (validTo && checkDate > validTo) {
    return false;
  }

  return true;
}

/**
 * Check if two validity windows overlap
 *
 * @param a - First temporal object
 * @param b - Second temporal object
 * @returns true if the validity windows overlap
 */
export function validityOverlaps(
  a: { validFrom?: Date | null; validTo?: Date | null },
  b: { validFrom?: Date | null; validTo?: Date | null },
): boolean {
  // Get effective bounds (null means infinity)
  const aStart = a.validFrom ? a.validFrom.getTime() : -Infinity;
  const aEnd = a.validTo ? a.validTo.getTime() : Infinity;
  const bStart = b.validFrom ? b.validFrom.getTime() : -Infinity;
  const bEnd = b.validTo ? b.validTo.getTime() : Infinity;

  // Check for overlap: a starts before b ends AND b starts before a ends
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Check if an object is currently valid (as of now)
 *
 * @param temporal - Object with validFrom/validTo fields
 * @returns true if the object is currently valid
 */
export function isCurrent(temporal: { validFrom?: Date | null; validTo?: Date | null }): boolean {
  return isValidAt(temporal, new Date());
}

// -----------------------------------------------------------------------------
// Bitemporal Helpers
// -----------------------------------------------------------------------------

/**
 * Check if a bitemporal object is valid according to both valid time and transaction time
 *
 * @param obj - Bitemporal object
 * @param validAt - Point in valid time (when the fact was true)
 * @param recordedAt - Optional point in transaction time (when we knew about it)
 * @returns true if the object satisfies both time constraints
 *
 * @example
 * ```ts
 * const entity = {
 *   validFrom: new Date('2020-01-01'),
 *   validTo: new Date('2021-01-01'),
 *   recordedAt: new Date('2020-06-01')
 * };
 * // Check if entity was valid in 2020 and we knew about it by mid-2020
 * isBitemporallyValid(entity, '2020-06-15', '2020-07-01'); // true
 * ```
 */
export function isBitemporallyValid(
  obj: Bitemporal,
  validAt: Date | string,
  recordedAt?: Date | string,
): boolean {
  // Check valid time dimension
  if (!isValidAt(obj, validAt)) {
    return false;
  }

  // If recordedAt is specified, check transaction time dimension
  if (recordedAt) {
    const recordedCheck = typeof recordedAt === 'string' ? new Date(recordedAt) : recordedAt;
    const objRecordedAt = obj.recordedAt;

    // The fact must have been recorded by the recordedAt time
    if (objRecordedAt && objRecordedAt > recordedCheck) {
      return false;
    }
  }

  return true;
}

// -----------------------------------------------------------------------------
// Filtering Functions
// -----------------------------------------------------------------------------

/**
 * Filter a collection of entities to those valid at a specific point in time
 *
 * @param entities - Array of entities with temporal fields
 * @param at - Point in time to filter for
 * @returns Filtered array of entities
 *
 * @example
 * ```ts
 * const entities = [
 *   { id: '1', validFrom: new Date('2020-01-01'), validTo: new Date('2021-01-01') },
 *   { id: '2', validFrom: new Date('2021-01-01'), validTo: null }
 * ];
 * const asOf2020 = filterEntitiesAsOf(entities, new Date('2020-06-01'));
 * // Returns only entity 1
 * ```
 */
export function filterEntitiesAsOf<T extends { validFrom?: Date | null; validTo?: Date | null }>(
  entities: T[],
  at: Date | string,
): T[] {
  return entities.filter((entity) => isValidAt(entity, at));
}

/**
 * Filter a collection of edges to those valid at a specific point in time
 *
 * @param edges - Array of edges with temporal fields
 * @param at - Point in time to filter for
 * @returns Filtered array of edges
 */
export function filterEdgesAsOf<T extends { validFrom?: Date | null; validTo?: Date | null }>(
  edges: T[],
  at: Date | string,
): T[] {
  return edges.filter((edge) => isValidAt(edge, at));
}

/**
 * Filter entities using bitemporal criteria
 *
 * @param entities - Array of entities with bitemporal fields
 * @param validAt - Point in valid time
 * @param recordedAt - Optional point in transaction time
 * @returns Filtered array of entities
 */
export function filterEntitiesBitemporal<T extends Bitemporal>(
  entities: T[],
  validAt: Date | string,
  recordedAt?: Date | string,
): T[] {
  return entities.filter((entity) => isBitemporallyValid(entity, validAt, recordedAt));
}

// -----------------------------------------------------------------------------
// Graph Snapshot Functions
// -----------------------------------------------------------------------------

/**
 * Build a graph snapshot at a specific point in time
 *
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @param at - Point in time for the snapshot
 * @returns GraphSnapshot containing only valid nodes and edges at that time
 *
 * @example
 * ```ts
 * const snapshot = buildGraphSnapshotAtTime(allNodes, allEdges, new Date('2020-01-01'));
 * console.log(`Snapshot has ${snapshot.nodes.length} nodes and ${snapshot.edges.length} edges`);
 * ```
 */
export function buildGraphSnapshotAtTime(
  nodes: Array<{ id: string; validFrom?: Date | null; validTo?: Date | null; [key: string]: unknown }>,
  edges: GraphEdge[],
  at: Date | string,
): GraphSnapshot {
  const checkDate = typeof at === 'string' ? new Date(at) : at;

  const filteredNodes = filterEntitiesAsOf(nodes, checkDate);
  const filteredEdges = filterEdgesAsOf(edges, checkDate);

  // Get the set of valid node IDs
  const validNodeIds = new Set(filteredNodes.map((n) => n.id));

  // Filter edges to only include those connecting valid nodes
  const validEdges = filteredEdges.filter(
    (edge) => validNodeIds.has(edge.fromId) && validNodeIds.has(edge.toId),
  );

  return {
    asOf: checkDate,
    nodes: filteredNodes,
    edges: validEdges,
    metadata: {
      nodeCount: filteredNodes.length,
      edgeCount: validEdges.length,
      generatedAt: new Date(),
    },
  };
}

/**
 * Build a bitemporal graph snapshot
 *
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @param validAt - Point in valid time
 * @param recordedAt - Point in transaction time
 * @returns GraphSnapshot with bitemporal filtering applied
 */
export function buildBitemporalGraphSnapshot(
  nodes: Array<{ id: string; [key: string]: unknown } & Bitemporal>,
  edges: GraphEdge[],
  validAt: Date | string,
  recordedAt: Date | string,
): GraphSnapshot {
  const validDate = typeof validAt === 'string' ? new Date(validAt) : validAt;
  const recordedDate = typeof recordedAt === 'string' ? new Date(recordedAt) : recordedAt;

  const filteredNodes = filterEntitiesBitemporal(nodes, validDate, recordedDate);
  const filteredEdges = filterEntitiesBitemporal(
    edges as (GraphEdge & Bitemporal)[],
    validDate,
    recordedDate,
  );

  const validNodeIds = new Set(filteredNodes.map((n) => n.id));
  const validEdges = filteredEdges.filter(
    (edge) => validNodeIds.has(edge.fromId) && validNodeIds.has(edge.toId),
  );

  return {
    asOf: validDate,
    nodes: filteredNodes,
    edges: validEdges,
    metadata: {
      nodeCount: filteredNodes.length,
      edgeCount: validEdges.length,
      generatedAt: new Date(),
      queryParams: {
        validAt: validDate.toISOString(),
        recordedAt: recordedDate.toISOString(),
      },
    },
  };
}

// -----------------------------------------------------------------------------
// Temporal Query Helpers
// -----------------------------------------------------------------------------

/**
 * Get all versions of an entity across its validity periods
 *
 * @param entities - Collection of entity versions (same canonical ID)
 * @returns Sorted array of entity versions (oldest to newest)
 */
export function getEntityVersions<T extends { validFrom?: Date | null; validTo?: Date | null }>(
  entities: T[],
): T[] {
  return [...entities].sort((a, b) => {
    const aTime = a.validFrom?.getTime() ?? -Infinity;
    const bTime = b.validFrom?.getTime() ?? -Infinity;
    return aTime - bTime;
  });
}

/**
 * Get the most recent version of an entity valid at a specific time
 *
 * @param entities - Collection of entity versions
 * @param at - Point in time to check
 * @returns The most recent valid version, or undefined if none found
 */
export function getLatestVersionAt<T extends { validFrom?: Date | null; validTo?: Date | null }>(
  entities: T[],
  at: Date | string,
): T | undefined {
  const validVersions = filterEntitiesAsOf(entities, at);
  return validVersions.sort((a, b) => {
    const aTime = a.validFrom?.getTime() ?? -Infinity;
    const bTime = b.validFrom?.getTime() ?? -Infinity;
    return bTime - aTime; // Descending order
  })[0];
}

/**
 * Get the validity period of an entity (earliest validFrom to latest validTo)
 *
 * @param entity - Entity with temporal fields
 * @returns Object with start and end dates
 */
export function getValidityPeriod(entity: {
  validFrom?: Date | null;
  validTo?: Date | null;
}): { start: Date | null; end: Date | null } {
  return {
    start: entity.validFrom || null,
    end: entity.validTo || null,
  };
}

/**
 * Calculate the duration of validity in milliseconds
 *
 * @param entity - Entity with temporal fields
 * @returns Duration in milliseconds, or null if unbounded
 */
export function getValidityDuration(entity: {
  validFrom?: Date | null;
  validTo?: Date | null;
}): number | null {
  if (!entity.validFrom || !entity.validTo) {
    return null; // Unbounded
  }
  return entity.validTo.getTime() - entity.validFrom.getTime();
}
