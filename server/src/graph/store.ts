// @ts-nocheck
import { getDriver, runCypher } from './neo4j.js';
import { GraphEntity, GraphEdge, EntityType, EdgeType, EpistemicMetadata, SourceReference } from './types.js';
import { v4 as uuidv4 } from 'uuid';
import { CypherBuilder } from './queryBuilder.js';
import { validateGraphEntity, validateGraphEdge } from './schema.js';

export class GraphStore {
  /**
   * Upsert a node in the graph.
   * Handles tenant isolation and time-travel versioning implicitly (simplified: current state).
   */
    async upsertNode(node: Partial<GraphEntity> & { globalId: string, tenantId: string, entityType: EntityType }): Promise<void> {
    const validated = validateGraphEntity(node);
    const builder = new CypherBuilder()
      .merge('(n:GraphNode { globalId: $globalId })')
      .onCreateSet('n', {
        createdAt: 'datetime()',
        validFrom: validated.validFrom || 'datetime()',
        validTo: validated.validTo || null,
        tenantId: validated.tenantId,
        entityType: validated.entityType
      })
      .onMatchSet('n', {
        updatedAt: 'datetime()',
        validTo: validated.validTo || null
      })
      .setProperties('n', validated.attributes || {})
      .set('n', 'epistemic', JSON.stringify(validated.epistemic || {}))
      .set('n', 'sourceRefs', JSON.stringify(validated.sourceRefs || []))
      .with('n')
      .raw('CALL apoc.create.addLabels(n, [$entityType]) YIELD node')
      .return('node');

    const params = {
      globalId: validated.globalId,
      tenantId: validated.tenantId,
      entityType: validated.entityType
    };

    const { query, params: builtParams } = builder.build();
    await runCypher(query, { ...params, ...builtParams }, {
      tenantId: validated.tenantId,
      caseId: (node as Record<string, unknown>)?.caseId as string | undefined,
      write: true,
    });
  }



  /**
   * Upsert an edge between two nodes.
   */

  /**
   * Upsert a batch of nodes in the graph to prevent N+1 issues.
   */
  async upsertNodesBatch(nodes: (Partial<GraphEntity> & { globalId: string, tenantId: string, entityType: EntityType })[]): Promise<void> {
    if (nodes.length === 0) return;
    const tenantId = nodes[0].tenantId;

    // Ensure consistent tenant
    const safeNodes = nodes.map(n => {
      if (n.tenantId !== tenantId) throw new Error("Cross-tenant batching not allowed");
      return validateGraphEntity(n);
    });

    const builder = new CypherBuilder()
      .unwind('$batch', 'node')
      .merge('(n:GraphNode { globalId: node.globalId })')
      .onCreateSet('n', {
        createdAt: 'datetime()',
        validFrom: 'coalesce(node.validFrom, datetime())',
        validTo: 'node.validTo',
        tenantId: 'node.tenantId',
        entityType: 'node.entityType'
      })
      .onMatchSet('n', {
        updatedAt: 'datetime()',
        validTo: 'node.validTo'
      })
      .setProperties('n', 'node.attributes')
      .set('n', 'epistemic', 'apoc.convert.toJson(node.epistemic)')
      .set('n', 'sourceRefs', 'apoc.convert.toJson(node.sourceRefs)')
      .with('n, node')
      .raw('CALL apoc.create.addLabels(n, [node.entityType]) YIELD node AS added');

    const { query, params } = builder.build();

    // Pass batch explicitly
    await runCypher(query, { ...params, batch: safeNodes }, {
      tenantId,
      write: true,
    });
  }

  /**
   * Fetch a batch of nodes by ID to prevent N+1 issues.
   */
  async getNodesBatch(globalIds: string[], tenantId: string): Promise<GraphEntity[]> {
    if (globalIds.length === 0) return [];
    const builder = new CypherBuilder()
      .unwind('$ids', 'id')
      .match('(n:GraphNode { globalId: id, tenantId: $tenantId })')
      .return('n');

    const { query, params } = builder.build();
    const results = await runCypher(query, { ...params, ids: globalIds, tenantId }, { tenantId });
    return results.map(r => this.mapNeo4jToEntity(r.n.properties));
  }

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

    await runCypher(query, params, {
      tenantId: edge.tenantId,
      caseId: (edge as Record<string, unknown>)?.caseId as string | undefined,
      write: true,
    });
  }

  /**
   * Fetch a node by ID.
   */
  async getNode(globalId: string, tenantId: string): Promise<GraphEntity | null> {
    const query = `
      MATCH (n:GraphNode { globalId: $globalId, tenantId: $tenantId })
      RETURN n
    `;
    const results = await runCypher(query, { globalId, tenantId }, { tenantId });
    if (results.length === 0) return null;

    const record = results[0].n.properties;
    return this.mapNeo4jToEntity(record);
  }

  /**
   * Helper to deserialize Neo4j props back to TS object
   */
  private mapNeo4jToEntity(props: Record<string, unknown>): GraphEntity {
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
      }, {} as Record<string, unknown>)
    };
  }

  /**
   * Query neighbors
   */
  async getNeighbors(globalId: string, tenantId: string, edgeTypes: EdgeType[] = [], depth: number = 1): Promise<unknown[]> {
    const typeClause = edgeTypes.length > 0 ? `:${edgeTypes.join('|')}` : '';
    const query = `
      MATCH (n:GraphNode { globalId: $globalId, tenantId: $tenantId })-[r${typeClause}*1..${depth}]-(m)
      RETURN m, r
    `;
    return await runCypher(query, { globalId, tenantId }, { tenantId });
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
    const results = await runCypher(query, { tenantId, value }, { tenantId });
    if (results.length === 0) return null;
    return this.mapNeo4jToEntity(results[0].n.properties);
  }

  /**
   * Expose raw Cypher execution for internal engines like CKP.
   */
  async runCypher<T = unknown>(
    cypher: string,
    params: Record<string, unknown>,
    options: { tenantId?: string; caseId?: string; permissionsHash?: string; cacheTtlSeconds?: number; bypassCache?: boolean; write?: boolean } = {},
  ): Promise<T[]> {
    return runCypher<T>(cypher, params, options);
  }
}
