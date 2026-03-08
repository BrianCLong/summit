/**
 * Relationship Factory
 *
 * Generates test relationship data for graph operations
 */

import { randomUUID } from 'crypto';

export interface TestRelationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelationshipFactoryOptions {
  id?: string;
  type?: string;
  sourceId?: string;
  targetId?: string;
  properties?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create a test relationship with optional overrides
 */
export function relationshipFactory(options: RelationshipFactoryOptions = {}): TestRelationship {
  const id = options.id || randomUUID();
  const type = options.type || 'RELATED_TO';
  const sourceId = options.sourceId || randomUUID();
  const targetId = options.targetId || randomUUID();
  const now = new Date();

  return {
    id,
    type,
    sourceId,
    targetId,
    properties: options.properties || {},
    createdAt: options.createdAt || now,
    updatedAt: options.updatedAt || now,
  };
}

/**
 * Create multiple test relationships
 */
export function relationshipFactoryBatch(
  count: number,
  options: RelationshipFactoryOptions = {}
): TestRelationship[] {
  return Array.from({ length: count }, () => relationshipFactory(options));
}

/**
 * Create a relationship between two entities
 */
export function relationshipBetween(
  sourceId: string,
  targetId: string,
  type: string = 'RELATED_TO',
  properties: Record<string, any> = {}
): TestRelationship {
  return relationshipFactory({ sourceId, targetId, type, properties });
}
