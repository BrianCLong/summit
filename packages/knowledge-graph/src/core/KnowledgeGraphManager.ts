/**
 * Core Knowledge Graph Management
 */

import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import { KGEntity, KGEntitySchema, KGRelationship, KGRelationshipSchema } from '../types/entity.js';

export class KnowledgeGraphManager {
  constructor(private driver: Driver) {}

  /**
   * Create a new entity in the knowledge graph
   */
  async createEntity(entity: Omit<KGEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<KGEntity> {
    const now = new Date().toISOString();
    const fullEntity: KGEntity = {
      ...entity,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    const validated = KGEntitySchema.parse(fullEntity);

    const session = this.driver.session();
    try {
      const labels = validated.labels.map((l) => `:${l}`).join('');
      await session.run(
        `
        CREATE (e${labels} {
          id: $id,
          type: $type,
          namespace: $namespace,
          properties: $properties,
          confidence: $confidence,
          provenance: $provenance,
          temporalInfo: $temporalInfo,
          metadata: $metadata,
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt)
        })
        RETURN e
        `,
        {
          id: validated.id,
          type: validated.type,
          namespace: validated.namespace,
          properties: JSON.stringify(validated.properties),
          confidence: validated.confidence,
          provenance: JSON.stringify(validated.provenance),
          temporalInfo: JSON.stringify(validated.temporalInfo || null),
          metadata: JSON.stringify(validated.metadata || {}),
          createdAt: validated.createdAt,
          updatedAt: validated.updatedAt,
        },
      );

      return validated;
    } finally {
      await session.close();
    }
  }

  /**
   * Get an entity by ID
   */
  async getEntity(entityId: string): Promise<KGEntity | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e {id: $entityId})
        RETURN e, labels(e) as labels
        `,
        { entityId },
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const props = record.get('e').properties;
      const labels = record.get('labels');

      return KGEntitySchema.parse({
        ...props,
        labels,
        properties: JSON.parse(props.properties),
        provenance: JSON.parse(props.provenance),
        temporalInfo: props.temporalInfo ? JSON.parse(props.temporalInfo) : null,
        metadata: JSON.parse(props.metadata || '{}'),
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Update an entity
   */
  async updateEntity(entityId: string, updates: Partial<KGEntity>): Promise<KGEntity> {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const setters = [];
      const params: Record<string, any> = { entityId, updatedAt: now };

      if (updates.properties) {
        setters.push('e.properties = $properties');
        params.properties = JSON.stringify(updates.properties);
      }
      if (updates.confidence !== undefined) {
        setters.push('e.confidence = $confidence');
        params.confidence = updates.confidence;
      }
      if (updates.metadata) {
        setters.push('e.metadata = $metadata');
        params.metadata = JSON.stringify(updates.metadata);
      }

      setters.push('e.updatedAt = datetime($updatedAt)');

      const result = await session.run(
        `
        MATCH (e {id: $entityId})
        SET ${setters.join(', ')}
        RETURN e, labels(e) as labels
        `,
        params,
      );

      if (result.records.length === 0) {
        throw new Error(`Entity not found: ${entityId}`);
      }

      const record = result.records[0];
      const props = record.get('e').properties;
      const labels = record.get('labels');

      return KGEntitySchema.parse({
        ...props,
        labels,
        properties: JSON.parse(props.properties),
        provenance: JSON.parse(props.provenance),
        temporalInfo: props.temporalInfo ? JSON.parse(props.temporalInfo) : null,
        metadata: JSON.parse(props.metadata || '{}'),
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Create a relationship between two entities
   */
  async createRelationship(
    relationship: Omit<KGRelationship, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<KGRelationship> {
    const now = new Date().toISOString();
    const fullRelationship: KGRelationship = {
      ...relationship,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    const validated = KGRelationshipSchema.parse(fullRelationship);

    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (source {id: $sourceId})
        MATCH (target {id: $targetId})
        CREATE (source)-[r:${validated.type.toUpperCase().replace(/[^A-Z0-9_]/g, '_')} {
          id: $id,
          type: $type,
          namespace: $namespace,
          properties: $properties,
          confidence: $confidence,
          weight: $weight,
          provenance: $provenance,
          temporalInfo: $temporalInfo,
          metadata: $metadata,
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt)
        }]->(target)
        RETURN r
        `,
        {
          id: validated.id,
          type: validated.type,
          namespace: validated.namespace,
          sourceId: validated.sourceId,
          targetId: validated.targetId,
          properties: JSON.stringify(validated.properties),
          confidence: validated.confidence,
          weight: validated.weight || null,
          provenance: JSON.stringify(validated.provenance),
          temporalInfo: JSON.stringify(validated.temporalInfo || null),
          metadata: JSON.stringify(validated.metadata || {}),
          createdAt: validated.createdAt,
          updatedAt: validated.updatedAt,
        },
      );

      return validated;
    } finally {
      await session.close();
    }
  }

  /**
   * Find entities by type
   */
  async findEntitiesByType(
    type: string,
    limit = 100,
    offset = 0,
  ): Promise<KGEntity[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e {type: $type})
        RETURN e, labels(e) as labels
        ORDER BY e.createdAt DESC
        SKIP $offset
        LIMIT $limit
        `,
        { type, offset, limit },
      );

      return result.records.map((record) => {
        const props = record.get('e').properties;
        const labels = record.get('labels');
        return KGEntitySchema.parse({
          ...props,
          labels,
          properties: JSON.parse(props.properties),
          provenance: JSON.parse(props.provenance),
          temporalInfo: props.temporalInfo ? JSON.parse(props.temporalInfo) : null,
          metadata: JSON.parse(props.metadata || '{}'),
        });
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Find relationships between entities
   */
  async findRelationships(
    sourceId?: string,
    targetId?: string,
    type?: string,
    limit = 100,
  ): Promise<KGRelationship[]> {
    const session = this.driver.session();
    try {
      let cypher = 'MATCH (source)-[r]->(target)';
      const params: Record<string, any> = { limit };
      const whereClauses: string[] = [];

      if (sourceId) {
        whereClauses.push('source.id = $sourceId');
        params.sourceId = sourceId;
      }
      if (targetId) {
        whereClauses.push('target.id = $targetId');
        params.targetId = targetId;
      }
      if (type) {
        whereClauses.push('r.type = $type');
        params.type = type;
      }

      if (whereClauses.length > 0) {
        cypher += ' WHERE ' + whereClauses.join(' AND ');
      }

      cypher += ' RETURN r, source.id as sourceId, target.id as targetId LIMIT $limit';

      const result = await session.run(cypher, params);

      return result.records.map((record) => {
        const props = record.get('r').properties;
        return KGRelationshipSchema.parse({
          ...props,
          sourceId: record.get('sourceId'),
          targetId: record.get('targetId'),
          properties: JSON.parse(props.properties),
          provenance: JSON.parse(props.provenance),
          temporalInfo: props.temporalInfo ? JSON.parse(props.temporalInfo) : null,
          metadata: JSON.parse(props.metadata || '{}'),
        });
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Delete an entity and all its relationships
   */
  async deleteEntity(entityId: string): Promise<boolean> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e {id: $entityId})
        DETACH DELETE e
        RETURN count(e) as deleted
        `,
        { entityId },
      );

      return result.records[0].get('deleted').toNumber() > 0;
    } finally {
      await session.close();
    }
  }

  /**
   * Get entity neighborhood (entities connected to this entity)
   */
  async getEntityNeighborhood(
    entityId: string,
    depth = 1,
    relationshipTypes?: string[],
  ): Promise<{
    entity: KGEntity;
    relationships: KGRelationship[];
    neighbors: KGEntity[];
  }> {
    const session = this.driver.session();
    try {
      const relTypeFilter = relationshipTypes
        ? `:${relationshipTypes.join('|')}`
        : '';

      const result = await session.run(
        `
        MATCH (e {id: $entityId})
        OPTIONAL MATCH path = (e)-[r${relTypeFilter}*1..${depth}]-(n)
        RETURN e, labels(e) as eLabels,
               collect(DISTINCT r) as relationships,
               collect(DISTINCT {node: n, labels: labels(n)}) as neighbors
        `,
        { entityId },
      );

      if (result.records.length === 0) {
        throw new Error(`Entity not found: ${entityId}`);
      }

      const record = result.records[0];
      const entityProps = record.get('e').properties;
      const entityLabels = record.get('eLabels');

      const entity = KGEntitySchema.parse({
        ...entityProps,
        labels: entityLabels,
        properties: JSON.parse(entityProps.properties),
        provenance: JSON.parse(entityProps.provenance),
        temporalInfo: entityProps.temporalInfo
          ? JSON.parse(entityProps.temporalInfo)
          : null,
        metadata: JSON.parse(entityProps.metadata || '{}'),
      });

      const relationships: KGRelationship[] = [];
      const neighbors: KGEntity[] = [];

      // Process relationships and neighbors
      // This is a simplified version - full implementation would extract all details

      return { entity, relationships, neighbors };
    } finally {
      await session.close();
    }
  }
}
