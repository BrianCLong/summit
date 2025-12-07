import { getDriver, runCypher } from './neo4j.js';
import { GraphEntity, GraphEdge, EntityType, EdgeType, EpistemicMetadata, SourceReference } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export class GraphStore {
  /**
   * Upsert a node in the graph.
   * Handles tenant isolation and time-travel versioning implicitly (simplified: current state).
   */
  async upsertNode(node: Partial<GraphEntity> & { globalId: string, tenantId: string, entityType: EntityType }): Promise<void> {
    const query = `
      MERGE (n:GraphNode { globalId: $globalId })
      ON CREATE SET
        n.createdAt = datetime(),
        n.validFrom = datetime(),
        n.tenantId = $tenantId,
        n.entityType = $entityType
      ON MATCH SET
        n.updatedAt = datetime()

      SET n += $attributes
      SET n.epistemic = $epistemicStr
      SET n.sourceRefs = $sourceRefsStr

      // Add specific label dynamically
      WITH n
      CALL apoc.create.addLabels(n, [$entityType]) YIELD node
      RETURN node
    `;

    const params = {
      globalId: node.globalId,
      tenantId: node.tenantId,
      entityType: node.entityType,
      attributes: node.attributes || {},
      epistemicStr: JSON.stringify(node.epistemic || {}),
      sourceRefsStr: JSON.stringify(node.sourceRefs || [])
    };

    await runCypher(query, params);
  }

  /**
   * Upsert an edge between two nodes.
   */
  async upsertEdge(edge: Partial<GraphEdge> & { sourceId: string, targetId: string, edgeType: EdgeType, tenantId: string }): Promise<void> {
    const query = `
      MATCH (s:GraphNode { globalId: $sourceId, tenantId: $tenantId })
      MATCH (t:GraphNode { globalId: $targetId, tenantId: $tenantId })
      MERGE (s)-[r:${edge.edgeType}]->(t)
      ON CREATE SET
        r.id = $edgeId,
        r.createdAt = datetime(),
        r.validFrom = datetime(),
        r.tenantId = $tenantId
      ON MATCH SET
        r.updatedAt = datetime()

      SET r += $attributes
      SET r.epistemic = $epistemicStr
      SET r.sourceRefs = $sourceRefsStr
    `;

    const params = {
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      edgeType: edge.edgeType,
      tenantId: edge.tenantId,
      edgeId: edge.id || uuidv4(),
      attributes: edge.attributes || {},
      epistemicStr: JSON.stringify(edge.epistemic || {}),
      sourceRefsStr: JSON.stringify(edge.sourceRefs || [])
    };

    await runCypher(query, params);
  }

  /**
   * Fetch a node by ID.
   */
  async getNode(globalId: string, tenantId: string): Promise<GraphEntity | null> {
    const query = `
      MATCH (n:GraphNode { globalId: $globalId, tenantId: $tenantId })
      RETURN n
    `;
    const results = await runCypher(query, { globalId, tenantId });
    if (results.length === 0) return null;

    const record = results[0].n.properties;
    return this.mapNeo4jToEntity(record);
  }

  /**
   * Helper to deserialize Neo4j props back to TS object
   */
  private mapNeo4jToEntity(props: any): GraphEntity {
    return {
      globalId: props.globalId,
      tenantId: props.tenantId,
      entityType: props.entityType,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      validFrom: props.validFrom,
      validTo: props.validTo,
      sourceRefs: props.sourceRefs ? JSON.parse(props.sourceRefs) : [],
      epistemic: props.epistemic ? JSON.parse(props.epistemic) : {},
      attributes: Object.keys(props).reduce((acc, key) => {
        if (!['globalId', 'tenantId', 'entityType', 'createdAt', 'updatedAt', 'validFrom', 'validTo', 'sourceRefs', 'epistemic'].includes(key)) {
          acc[key] = props[key];
        }
        return acc;
      }, {} as any)
    };
  }

  /**
   * Query neighbors
   */
  async getNeighbors(globalId: string, tenantId: string, edgeTypes: EdgeType[] = [], depth: number = 1): Promise<any[]> {
    const typeClause = edgeTypes.length > 0 ? `:${edgeTypes.join('|')}` : '';
    const query = `
      MATCH (n:GraphNode { globalId: $globalId, tenantId: $tenantId })-[r${typeClause}*1..${depth}]-(m)
      RETURN m, r
    `;
    return await runCypher(query, { globalId, tenantId });
  }

  /**
   * Find a node by a specific attribute.
   * Useful for Entity Resolution.
   */
  async findNodeByAttribute(tenantId: string, attribute: string, value: string): Promise<GraphEntity | null> {
    // Only allow specific safe attributes or validate input
    if (!['name', 'email', 'externalId'].includes(attribute) && !attribute.startsWith('source_')) {
        throw new Error(`Attribute lookup not allowed for: ${attribute}`);
    }

    const query = `
      MATCH (n:GraphNode { tenantId: $tenantId })
      WHERE n.attributes.${attribute} = $value
      RETURN n
    `;
    const results = await runCypher(query, { tenantId, value });
    if (results.length === 0) return null;
    return this.mapNeo4jToEntity(results[0].n.properties);
  }

  /**
   * Expose raw Cypher execution for internal engines like CKP.
   */
  async runCypher<T = any>(cypher: string, params: Record<string, any>): Promise<T[]> {
    return runCypher<T>(cypher, params);
  }
}
