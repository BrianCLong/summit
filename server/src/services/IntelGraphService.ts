import { runCypher } from '../graph/neo4j.js';
import {
  SCHEMA_CONSTRAINTS,
  Entity,
  NodeLabel,
  EdgeType,
  NodeLabels,
  EdgeTypes,
  NATURAL_KEYS
} from '../graph/schema.js';
import { randomUUID } from 'crypto';

export class IntelGraphService {
  private static instance: IntelGraphService;

  private constructor() {}

  public static getInstance(): IntelGraphService {
    if (!IntelGraphService.instance) {
      IntelGraphService.instance = new IntelGraphService();
    }
    return IntelGraphService.instance;
  }

  public async initializeSchema(): Promise<void> {
    console.log('Initializing IntelGraph schema constraints...');
    for (const cypher of SCHEMA_CONSTRAINTS) {
      try {
        await runCypher(cypher);
      } catch (error) {
        console.error(`Failed to apply constraint: ${cypher}`, error);
      }
    }
    console.log('IntelGraph schema initialization complete.');
  }

  /**
   * Ensures a node exists in the graph (Idempotent / Upsert).
   * Uses MERGE based on natural keys if available, or CREATE if not.
   * If the node exists, it updates `updatedAt` and any provided properties.
   */
  public async ensureNode<T extends Entity>(
    tenantId: string,
    label: NodeLabel,
    properties: Omit<T, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'label'>
  ): Promise<T> {
    this.validateNodeLabel(label);

    const naturalKeys = NATURAL_KEYS[label];
    const hasNaturalKey = naturalKeys && naturalKeys.length > 0 && naturalKeys.every(k => (properties as any)[k] !== undefined);

    const id = randomUUID();
    const now = new Date().toISOString();

    let cypher: string;
    let params: any = {
      props: properties,
      id,
      tenantId,
      now,
    };

    if (hasNaturalKey) {
        // Construct MERGE clause
        // MERGE (n:Label { tenantId: $tenantId, key1: $val1, ... })
        const mergeProps = naturalKeys.map(k => `${k}: $${k}`).join(', ');
        // Extract natural key values into params
        naturalKeys.forEach(k => params[k] = (properties as any)[k]);

        // Remove natural keys from $props to avoid duplication in SET if we wanted,
        // but replacing $props is fine as long as we handle it.
        // Actually, we want to update other props.

        cypher = `
            MERGE (n:${label} { tenantId: $tenantId, ${mergeProps} })
            ON CREATE SET
                n = $props,
                n.id = $id,
                n.tenantId = $tenantId,
                n.createdAt = $now,
                n.updatedAt = $now
            ON MATCH SET
                n += $props,
                n.updatedAt = $now
            RETURN n
        `;
    } else {
        // Fallback to CREATE if no natural key definition (shouldn't happen for canonical entities)
        // or just treat as a new distinct entity
        cypher = `
            CREATE (n:${label})
            SET n = $props,
                n.id = $id,
                n.tenantId = $tenantId,
                n.createdAt = $now,
                n.updatedAt = $now
            RETURN n
        `;
    }

    const result = await runCypher(cypher, params);
    if (!result || result.length === 0) {
      throw new Error(`Failed to ensure node of type ${label}`);
    }

    return result[0]['n'] as T;
  }

  // Deprecated: use ensureNode for canonical correctness
  public async createNode<T extends Entity>(
    tenantId: string,
    label: NodeLabel,
    properties: Omit<T, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'label'>
  ): Promise<T> {
      return this.ensureNode(tenantId, label, properties);
  }

  public async createEdge(
    tenantId: string,
    fromId: string,
    toId: string,
    edgeType: EdgeType,
    properties: Record<string, any> = {}
  ): Promise<void> {
    this.validateEdgeType(edgeType);

    const cypher = `
      MATCH (a), (b)
      WHERE a.id = $fromId AND a.tenantId = $tenantId
        AND b.id = $toId AND b.tenantId = $tenantId
      MERGE (a)-[r:${edgeType}]->(b)
      ON CREATE SET r = $props, r.createdAt = $now
      ON MATCH SET r += $props
      RETURN r
    `;

    const params = {
      fromId,
      toId,
      tenantId,
      props: properties,
      now: new Date().toISOString(),
    };

    const result = await runCypher(cypher, params);
    if (!result || result.length === 0) {
      throw new Error(
        `Failed to create edge ${edgeType} between ${fromId} and ${toId}. Check IDs and tenant ownership.`
      );
    }
  }

  public async getNodeById<T extends Entity>(
    tenantId: string,
    id: string
  ): Promise<T | null> {
    const cypher = `
      MATCH (n)
      WHERE n.id = $id AND n.tenantId = $tenantId
      RETURN n
    `;

    const result = await runCypher(cypher, { id, tenantId });
    if (!result || result.length === 0) {
      return null;
    }
    return result[0]['n'] as T;
  }

  public async searchNodes<T extends Entity>(
    tenantId: string,
    label: NodeLabel,
    criteria: Record<string, any> = {},
    limit: number = 100
  ): Promise<T[]> {
    this.validateNodeLabel(label);

    let whereClause = 'n.tenantId = $tenantId';
    const params: any = { tenantId };

    Object.keys(criteria).forEach((key) => {
      if (!/^[a-zA-Z0-9_]+$/.test(key)) {
         throw new Error(`Invalid property key: ${key}`);
      }
      whereClause += ` AND n.${key} = $${key}`;
      params[key] = criteria[key];
    });

    const cypher = `
      MATCH (n:${label})
      WHERE ${whereClause}
      RETURN n
      LIMIT ${limit}
    `;

    const result = await runCypher(cypher, params);
    return result.map((r) => r['n'] as T);
  }

  private validateNodeLabel(label: string): void {
     if (!Object.values(NodeLabels).includes(label as NodeLabel)) {
         throw new Error(`Invalid node label: ${label}`);
     }
  }

  private validateEdgeType(type: string): void {
     if (!Object.values(EdgeTypes).includes(type as EdgeType)) {
         throw new Error(`Invalid edge type: ${type}`);
     }
  }
}
