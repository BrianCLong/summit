import {
  GraphService,
  Entity,
  Edge,
  TenantId,
  EntityId,
  EdgeId,
  EntityQuery,
  EdgeQuery,
} from '../graph/types';
import { getDriver, runCypher } from '../graph/neo4j';
import logger from '../utils/logger';

// Helper to sanitize attribute keys to prevent injection
function sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_]/g, '');
}

// Helper to flatten attributes for storage
function flattenAttributes(attributes: Record<string, unknown>, prefix = 'attr_'): Record<string, any> {
    const flattened: Record<string, any> = {};
    for (const [k, v] of Object.entries(attributes)) {
        const safeKey = sanitizeKey(k);
        // Neo4j only stores primitives or arrays of primitives
        if (v === null || v === undefined) continue;
        if (typeof v === 'object' && !Array.isArray(v)) {
            // Nested objects stringified? or just ignored for MVP?
            // Let's stringify nested objects
            flattened[`${prefix}${safeKey}`] = JSON.stringify(v);
        } else {
             flattened[`${prefix}${safeKey}`] = v;
        }
    }
    return flattened;
}

// Helper to unflatten attributes from storage
function unflattenAttributes(properties: Record<string, any>, prefix = 'attr_'): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(properties)) {
        if (k.startsWith(prefix)) {
            const key = k.substring(prefix.length);
            // Try parse if string looks like JSON?
            // For now assuming primitive unless string starting with {
            if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
                try {
                    attributes[key] = JSON.parse(v);
                } catch {
                    attributes[key] = v;
                }
            } else {
                attributes[key] = v;
            }
        }
    }
    return attributes;
}

export class Neo4jGraphService implements GraphService {
  private static instance: Neo4jGraphService;

  public static getInstance(): Neo4jGraphService {
    if (!Neo4jGraphService.instance) {
      Neo4jGraphService.instance = new Neo4jGraphService();
    }
    return Neo4jGraphService.instance;
  }

  async getEntity(tenantId: TenantId, id: EntityId): Promise<Entity | null> {
    const cypher = `
      MATCH (n:Entity {id: $id, tenantId: $tenantId})
      RETURN n { .* } as entity
    `;
    const result = await runCypher<{ entity: any }>(cypher, {
      id,
      tenantId,
    });

    if (result.length === 0) return null;

    const raw = result[0].entity;
    return {
        ...raw,
        attributes: unflattenAttributes(raw),
        metadata: typeof raw.metadata === 'string' ? JSON.parse(raw.metadata) : raw.metadata || {}
    };
  }

  async findEntities(
    tenantId: TenantId,
    query: EntityQuery,
  ): Promise<Entity[]> {
    let cypher = `MATCH (n:Entity {tenantId: $tenantId})`;
    const params: any = { tenantId };

    if (query.ids && query.ids.length > 0) {
      cypher += ` WHERE n.id IN $ids`;
      params.ids = query.ids;
    }

    if (query.types && query.types.length > 0) {
      cypher += query.ids ? ` AND` : ` WHERE`;
      cypher += ` n.type IN $types`;
      params.types = query.types;
    }

    if (query.labelContains) {
      cypher +=
        query.ids || query.types ? ` AND` : ` WHERE`;
      cypher += ` n.label CONTAINS $labelContains`;
      params.labelContains = query.labelContains;
    }

    // Attribute filtering (flattened keys)
    if (query.attributes) {
      Object.entries(query.attributes).forEach(([key, value], index) => {
        const safeKey = sanitizeKey(key);
        cypher +=
          query.ids || query.types || query.labelContains || index > 0
            ? ` AND`
            : ` WHERE`;
        // Query against flattened key 'attr_key'
        cypher += ` n.attr_${safeKey} = $attr${index}`;
        params[`attr${index}`] = value;
      });
    }

    cypher += ` RETURN n { .* } as entity`;

    if (query.limit) {
      cypher += ` LIMIT toInteger($limit)`;
      params.limit = query.limit;
    }

    if (query.offset) {
      cypher += ` SKIP toInteger($offset)`;
      params.offset = query.offset;
    }

    const result = await runCypher<{ entity: any }>(cypher, params);
    return result.map((r: any) => ({
        ...r.entity,
        attributes: unflattenAttributes(r.entity),
        metadata: typeof r.entity.metadata === 'string' ? JSON.parse(r.entity.metadata) : r.entity.metadata || {}
    }));
  }

  async getEdges(tenantId: TenantId, query: EdgeQuery): Promise<Edge[]> {
    let cypher = `MATCH (a:Entity {tenantId: $tenantId})-[r]-(b:Entity {tenantId: $tenantId})`;
    const params: any = { tenantId };

    let whereClauses: string[] = [];

    if (query.ids && query.ids.length > 0) {
      whereClauses.push(`r.id IN $ids`);
      params.ids = query.ids;
    }

    if (query.types && query.types.length > 0) {
      whereClauses.push(`type(r) IN $types`);
      params.types = query.types;
    }

    if (query.fromEntityId) {
       cypher = `MATCH (a:Entity {id: $fromId, tenantId: $tenantId})-[r]->(b:Entity {tenantId: $tenantId})`;
       params.fromId = query.fromEntityId;
       if (query.toEntityId) {
          cypher = `MATCH (a:Entity {id: $fromId, tenantId: $tenantId})-[r]->(b:Entity {id: $toId, tenantId: $tenantId})`;
          params.toId = query.toEntityId;
       }
    } else if (query.toEntityId) {
        cypher = `MATCH (a:Entity {tenantId: $tenantId})-[r]->(b:Entity {id: $toId, tenantId: $tenantId})`;
        params.toId = query.toEntityId;
    }

    // Attribute filtering (flattened keys)
    if (query.attributes) {
      Object.entries(query.attributes).forEach(([key, value], index) => {
        const safeKey = sanitizeKey(key);
        whereClauses.push(`r.attr_${safeKey} = $attr${index}`);
        params[`attr${index}`] = value;
      });
    }

    if (whereClauses.length > 0) {
      cypher += ` WHERE ` + whereClauses.join(' AND ');
    }

    cypher += ` RETURN r { .*, fromEntityId: a.id, toEntityId: b.id, type: type(r) } as edge`;

    if (query.limit) {
        cypher += ` LIMIT toInteger($limit)`;
        params.limit = query.limit;
    }

    if (query.offset) {
        cypher += ` SKIP toInteger($offset)`;
        params.offset = query.offset;
    }

    const result = await runCypher<{ edge: any }>(cypher, params);
    return result.map((r: any) => ({
        ...r.edge,
        attributes: unflattenAttributes(r.edge),
        metadata: typeof r.edge.metadata === 'string' ? JSON.parse(r.edge.metadata) : r.edge.metadata || {}
    }));
  }

  async upsertEntity(
    tenantId: TenantId,
    entity: Partial<Entity>,
  ): Promise<Entity> {
    if (!entity.id || !entity.type || !entity.label) {
      throw new Error('Entity must have id, type, and label');
    }

    const flattenedAttrs = flattenAttributes(entity.attributes || {});

    // Use += operator to merge properties
    const cypher = `
      MERGE (n:Entity {id: $id, tenantId: $tenantId})
      SET n += $props,
          n.type = $type,
          n.label = $label,
          n.updatedAt = datetime(),
          n.metadata = $metadata,
          n.sensitivity = $sensitivity
      ON CREATE SET n.createdAt = datetime()
      RETURN n { .* } as entity
    `;

    const params = {
        id: entity.id,
        tenantId,
        type: entity.type,
        label: entity.label,
        props: flattenedAttrs, // Dynamically set flattened attributes
        metadata: JSON.stringify(entity.metadata || {}),
        sensitivity: entity.sensitivity || 'internal'
    };

    const result = await runCypher<{ entity: any }>(cypher, params);
    const raw = result[0].entity;
    return {
        ...raw,
        attributes: unflattenAttributes(raw),
        metadata: typeof raw.metadata === 'string' ? JSON.parse(raw.metadata) : raw.metadata || {}
    };
  }

  async upsertEdge(tenantId: TenantId, edge: Partial<Edge>): Promise<Edge> {
      if (!edge.id || !edge.fromEntityId || !edge.toEntityId || !edge.type) {
          throw new Error("Edge must have id, fromEntityId, toEntityId, and type");
      }

      const relType = sanitizeKey(edge.type); // Sanitize type name
      const flattenedAttrs = flattenAttributes(edge.attributes || {});

      const cypher = `
        MATCH (a:Entity {id: $fromId, tenantId: $tenantId})
        MATCH (b:Entity {id: $toId, tenantId: $tenantId})
        MERGE (a)-[r:${relType} {id: $id}]->(b)
        SET r += $props,
            r.updatedAt = datetime(),
            r.weight = $weight,
            r.metadata = $metadata,
            r.sensitivity = $sensitivity
        ON CREATE SET r.createdAt = datetime()
        RETURN r { .*, fromEntityId: a.id, toEntityId: b.id, type: type(r) } as edge
      `;

      const params = {
          id: edge.id,
          tenantId,
          fromId: edge.fromEntityId,
          toId: edge.toEntityId,
          weight: edge.weight || 1.0,
          props: flattenedAttrs,
          metadata: JSON.stringify(edge.metadata || {}),
          sensitivity: edge.sensitivity || 'internal'
      };

      const result = await runCypher<{ edge: any }>(cypher, params);
      const raw = result[0].edge;

      return {
          ...raw,
          attributes: unflattenAttributes(raw),
          metadata: typeof raw.metadata === 'string' ? JSON.parse(raw.metadata) : raw.metadata || {}
      };
  }

  async deleteEntity(tenantId: TenantId, id: EntityId): Promise<boolean> {
      const cypher = `
        MATCH (n:Entity {id: $id, tenantId: $tenantId})
        DETACH DELETE n
        RETURN count(n) as deletedCount
      `;
      const result = await runCypher<{ deletedCount: number }>(cypher, { id, tenantId });
      const count = result[0]?.deletedCount;
      // @ts-ignore
      return (typeof count === 'object' && count.toInt) ? count.toInt() > 0 : count > 0;
  }

  async deleteEdge(tenantId: TenantId, id: EdgeId): Promise<boolean> {
      const cypher = `
         MATCH ()-[r {id: $id}]->()
         WHERE r.tenantId = $tenantId OR (startNode(r).tenantId = $tenantId AND endNode(r).tenantId = $tenantId)
         DELETE r
         RETURN count(r) as deletedCount
      `;

      const result = await runCypher<{ deletedCount: number }>(cypher, { id, tenantId });
      const count = result[0]?.deletedCount;
       // @ts-ignore
      return (typeof count === 'object' && count.toInt) ? count.toInt() > 0 : count > 0;
  }
}
