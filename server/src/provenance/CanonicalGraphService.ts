
import { neo } from '../db/neo4j';
import * as crypto from 'crypto';
import {
  ProvenanceEntry,
  CanonicalNode,
  CanonicalEdge,
  InputNode,
  DecisionNode,
  ActionNode,
  OutcomeNode,
  ProvenanceNodeType
} from './types';

export class CanonicalGraphService {
  private static instance: CanonicalGraphService;

  private constructor() { }

  public static getInstance(): CanonicalGraphService {
    if (!CanonicalGraphService.instance) {
      CanonicalGraphService.instance = new CanonicalGraphService();
    }
    return CanonicalGraphService.instance;
  }

  // Ensure indices exist
  static async initializeIndices(): Promise<void> {
    // In a real app this would be in a migration script
    const session = neo.session();
    try {
      await session.run(`CREATE INDEX canonical_id IF NOT EXISTS FOR (n:CanonicalNode) ON (n.id)`);
      await session.run(`CREATE INDEX canonical_tenant IF NOT EXISTS FOR (n:CanonicalNode) ON (n.tenantId)`);
    } catch (e: any) {
      console.warn('Failed to create indices', e);
    } finally {
      await session.close();
    }
  }

  /**
   * Projects a raw ProvenanceEntry from the Ledger into the Canonical Graph.
   * This is an idempotent operation.
   */
  async projectEntry(entry: ProvenanceEntry): Promise<void> {
    const nodeType = this.determineNodeType(entry);
    if (!nodeType) return; // Skip non-canonical entries

    const session = neo.session();
    try {
      // 1. Create the Node
      await session.run(`
        MERGE (n:CanonicalNode {id: $id})
        SET n.tenantId = $tenantId,
            n.nodeType = $nodeType,
            n.subType = $subType,
            n.label = $label,
            n.timestamp = $timestamp,
            n.metadata = $metadata,
            n.properties = $properties,
            n.hash = $hash,
            n.sourceEntryId = $entryId

        WITH n
        CALL apoc.create.addLabels(n, [$nodeType]) YIELD node
        RETURN node
      `, {
        id: entry.resourceId,
        tenantId: entry.tenantId,
        nodeType: nodeType,
        subType: entry.resourceType,
        label: `${entry.resourceType}:${entry.resourceId}`,
        timestamp: entry.timestamp.toISOString(),
        metadata: JSON.stringify(entry.metadata || {}),
        properties: JSON.stringify(this.extractProperties(entry, nodeType)),
        hash: entry.currentHash,
        entryId: entry.id
      });

      // 2. Create Relationships
      const sourceIds = this.extractSourceIds(entry);
      if (sourceIds.length > 0) {
        for (const sourceId of sourceIds) {
          // We need to fetch source node type to determine relationship type
          const sourceNodeResult = await session.run(`MATCH (n:CanonicalNode {id: $id}) RETURN n.nodeType as type`, { id: sourceId });

          let relationType = 'DERIVED_FROM'; // Default Fallback

          if (sourceNodeResult.records.length > 0) {
            const sourceType = sourceNodeResult.records[0].get('type');
            relationType = this.determineRelationType(sourceType, nodeType);
          }

          // Create Edge: Source -> Current (Data Flow direction)
          // Use MERGE for source to avoid dropping edge if source missing (late arrival)
          // Default type 'Unknown' if not exists, will be updated when source arrives.
          await session.run(`
            MERGE (source:CanonicalNode {id: $sourceId, tenantId: $tenantId})
            ON CREATE SET source.nodeType = 'Unknown', source.label = 'Unknown:' + $sourceId, source.timestamp = $timestamp

            MATCH (target:CanonicalNode {id: $targetId})
            WHERE source.tenantId = target.tenantId // Tenant Isolation Check
            MERGE (source)-[r:${relationType} {timestamp: $timestamp}]->(target)
            SET r.isTentative = ${relationType === 'DERIVED_FROM' ? 'true' : 'false'}
           `, {
            sourceId,
            targetId: entry.resourceId,
            timestamp: entry.timestamp.toISOString(),
            tenantId: entry.tenantId
          });
        }
      }

      // 3. Edge Repair: Check for outgoing generic edges that can be upgraded now that we exist
      // Current node is 'entry.resourceId' (let's call it A).
      // Find edges A -> B where type(edge) is DERIVED_FROM and isTentative=true.
      // We know A's type (nodeType).
      // We need to know B's type to determine correct relation.

      const outgoingResult = await session.run(`
        MATCH (a:CanonicalNode {id: $id})-[r:DERIVED_FROM]->(b:CanonicalNode)
        WHERE a.tenantId = $tenantId AND r.isTentative = true
        RETURN b.id as targetId, b.nodeType as targetType
      `, { id: entry.resourceId, tenantId: entry.tenantId });

      for (const rec of outgoingResult.records) {
        const targetType = rec.get('targetType');
        const targetId = rec.get('targetId');
        // If target type is 'Unknown', we can't upgrade yet. Wait for target to arrive (it will repair incoming edges? No, we need bidirectional repair or wait).
        // But if A -> B exists, B must exist (created by MERGE in step 2 when B was processed).
        // If B was processed first, B created A (Unknown).
        // Now A arrives. B exists. B might be 'Unknown' if B was also created speculatively? No, B was the entry being processed.
        // So B must be known type unless B was also speculative.

        if (targetType && targetType !== 'Unknown') {
          const correctRelation = this.determineRelationType(nodeType, targetType as ProvenanceNodeType);

          if (correctRelation !== 'DERIVED_FROM') {
            // Upgrade edge: Create new, delete old
            // Neo4j doesn't allow renaming types. Must create new rel.
            await session.run(`
                    MATCH (a:CanonicalNode {id: $id})-[old:DERIVED_FROM]->(b:CanonicalNode {id: $targetId})
                    WHERE a.tenantId = $tenantId
                    MERGE (a)-[new:${correctRelation}]->(b)
                    SET new = old
                    SET new.isTentative = false
                    DELETE old
                  `, { id: entry.resourceId, tenantId: entry.tenantId, targetId });
          }
        }
      }

    } catch (error: any) {
      console.error('Failed to project provenance entry to graph', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Explains the causality of a node by tracing back to Inputs.
   */
  async explainCausality(nodeId: string, tenantId: string, depth: number = 5): Promise<{ nodes: CanonicalNode[], edges: CanonicalEdge[] }> {
    const maxDepth = Math.min(depth || 5, 20); // Safety Cap
    const session = neo.session();
    try {
      // Trace backwards from Outcome/Action to Inputs.
      const result = await session.run(`
        MATCH path = (start:CanonicalNode)-[*1..${maxDepth}]->(end:CanonicalNode {id: $nodeId, tenantId: $tenantId})
        RETURN path
      `, { nodeId, tenantId });

      const nodes: CanonicalNode[] = [];
      const edges: CanonicalEdge[] = [];
      const seenNodes = new Set<string>();

      result.records.forEach((record: any) => {
        const path = record.get('path');

        path.segments.forEach((segment: any) => {
          // Process Start Node
          if (!seenNodes.has(segment.start.properties.id)) {
            nodes.push(this.mapNeo4jNode(segment.start.properties));
            seenNodes.add(segment.start.properties.id);
          }
          // Process End Node
          if (!seenNodes.has(segment.end.properties.id)) {
            nodes.push(this.mapNeo4jNode(segment.end.properties));
            seenNodes.add(segment.end.properties.id);
          }
          // Process Edge
          edges.push({
            sourceId: segment.start.properties.id,
            targetId: segment.end.properties.id,
            relation: segment.relationship.type as any,
            timestamp: segment.relationship.properties.timestamp,
            properties: segment.relationship.properties
          });
        });
      });

      return { nodes, edges };
    } finally {
      await session.close();
    }
  }

  /**
   * Calculates the diff between two nodes.
   */
  async getGraphDiff(startNodeId: string, endNodeId: string, tenantId: string): Promise<{
    additions: CanonicalNode[],
    deletions: CanonicalNode[],
    modifications: { nodeId: string, field: string, oldValue: any, newValue: any }[]
  }> {
    const startGraph = await this.explainCausality(startNodeId, tenantId, 1);
    const endGraph = await this.explainCausality(endNodeId, tenantId, 1);

    const startNodesMap = new Map(startGraph.nodes.map(n => [n.id, n]));
    const endNodesMap = new Map(endGraph.nodes.map(n => [n.id, n]));

    const additions: CanonicalNode[] = [];
    const deletions: CanonicalNode[] = [];
    const modifications: { nodeId: string, field: string, oldValue: any, newValue: any }[] = [];

    endGraph.nodes.forEach(node => {
      if (!startNodesMap.has(node.id)) {
        additions.push(node);
      }
    });

    startGraph.nodes.forEach(node => {
      if (!endNodesMap.has(node.id)) {
        deletions.push(node);
      } else {
        // Node exists in both, check for modifications
        const endNode = endNodesMap.get(node.id)!;
        const diffs = this.compareNodeProperties(node, endNode);
        modifications.push(...diffs);
      }
    });

    return { additions, deletions, modifications };
  }

  private compareNodeProperties(startNode: CanonicalNode, endNode: CanonicalNode): { nodeId: string, field: string, oldValue: any, newValue: any }[] {
    const changes: { nodeId: string, field: string, oldValue: any, newValue: any }[] = [];

    // Compare specific properties
    const startProps = (startNode as any).properties || {};
    const endProps = (endNode as any).properties || {};

    const allKeys = new Set([...Object.keys(startProps), ...Object.keys(endProps)]);

    allKeys.forEach(key => {
      const val1 = startProps[key];
      const val2 = endProps[key];

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes.push({
          nodeId: startNode.id,
          field: key,
          oldValue: val1,
          newValue: val2
        });
      }
    });

    // Also check top-level properties if they differ from what's in 'properties' blob
    // MapNeo4jNode merges them, but raw checking avoids assumptions
    const systemFields = new Set(['id', 'tenantId', 'nodeType', 'subType', 'label', 'timestamp', 'metadata', 'hash', 'sourceEntryId']);

    Object.keys(startNode).forEach(key => {
      if (systemFields.has(key)) return;

      const val1 = (startNode as any)[key];
      const val2 = (endNode as any)[key];

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        if (!changes.some(c => c.field === key)) {
          changes.push({
            nodeId: startNode.id,
            field: key,
            oldValue: val1,
            newValue: val2
          });
        }
      }
    });

    return changes;
  }

  /**
   * Export the full provenance graph for a tenant.
   */
  async exportGraph(tenantId: string, options: { from?: Date, to?: Date } = {}): Promise<any> {
    const session = neo.session();
    try {
      let query = `MATCH (n:CanonicalNode {tenantId: $tenantId})`;
      const params: any = { tenantId };

      if (options.from) {
        query += ` WHERE datetime(n.timestamp) >= datetime($from)`;
        params.from = options.from.toISOString();
      }
      if (options.to) {
        query += options.from ? ` AND ` : ` WHERE `;
        query += ` datetime(n.timestamp) <= datetime($to)`;
        params.to = options.to.toISOString();
      }

      query += ` OPTIONAL MATCH (n)-[r]->(m) RETURN n, r, m`;

      const result = await session.run(query, params);

      const nodes = new Map<string, CanonicalNode>();
      const edges: CanonicalEdge[] = [];

      result.records.forEach((rec: any) => {
        const nProps = rec.get('n').properties;
        nodes.set(nProps.id, this.mapNeo4jNode(nProps));

        const m = rec.get('m');
        const r = rec.get('r');

        if (m && r) {
          const mProps = m.properties;
          nodes.set(mProps.id, this.mapNeo4jNode(mProps));

          edges.push({
            sourceId: nProps.id,
            targetId: mProps.id,
            relation: r.type as any,
            timestamp: r.properties.timestamp,
            properties: r.properties
          });
        }
      });

      const exportData = {
        nodes: Array.from(nodes.values()),
        edges: edges,
        generatedAt: new Date().toISOString()
      };

      const sortedNodes = exportData.nodes.sort((a, b) => a.id.localeCompare(b.id));
      const sortedEdges = exportData.edges.sort((a, b) =>
        (a.sourceId + a.targetId + a.relation + a.timestamp).localeCompare(b.sourceId + b.targetId + b.relation + b.timestamp)
      );

      const checksum = crypto.createHash('sha256')
        .update(JSON.stringify({ nodes: sortedNodes, edges: sortedEdges }))
        .digest('hex');

      return {
        ...exportData,
        checksum: `sha256:${checksum}`
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Integrity Check: Finds nodes with no incoming or outgoing relationships.
   */
  async checkIntegrity(tenantId: string): Promise<{ orphans: string[], crossTenantViolations: number }> {
    const session = neo.session();
    try {
      const orphansResult = await session.run(`
        MATCH (n:CanonicalNode {tenantId: $tenantId})
        WHERE NOT (n)--() AND n.nodeType <> 'Input'
        RETURN n.id as id
      `, { tenantId });

      const orphans = orphansResult.records.map((r: any) => r.get('id'));

      const crossTenantResult = await session.run(`
        MATCH (a:CanonicalNode)-[r]-(b:CanonicalNode)
        WHERE a.tenantId <> b.tenantId
        RETURN count(r) as violations
      `);

      const crossTenantViolations = crossTenantResult.records[0].get('violations').toNumber();

      return { orphans, crossTenantViolations };
    } finally {
      await session.close();
    }
  }

  private mapNeo4jNode(props: any): CanonicalNode {
    const baseNode: CanonicalNode = {
      id: props.id,
      tenantId: props.tenantId,
      nodeType: props.nodeType,
      subType: props.subType,
      label: props.label,
      timestamp: props.timestamp,
      metadata: props.metadata ? JSON.parse(props.metadata) : {},
      hash: props.hash,
      sourceEntryId: props.sourceEntryId
    };

    if (props.properties) {
      const extraProps = JSON.parse(props.properties);
      return { ...baseNode, ...extraProps };
    }

    return baseNode;
  }

  private determineNodeType(entry: ProvenanceEntry): ProvenanceNodeType | null {
    const type = entry.resourceType.toLowerCase();

    if (['document', 'configuration', 'policy', 'prompt'].includes(type)) return 'Input';
    if (['evaluation', 'approval', 'decision', 'prediction'].includes(type)) return 'Decision';
    if (['run', 'job', 'task', 'action', 'ingest'].includes(type)) return 'Action';
    if (['metric', 'alert', 'report', 'state', 'outcome'].includes(type)) return 'Outcome';

    if (entry.actionType === 'EVALUATE') return 'Decision';
    if (entry.actionType === 'EXECUTE') return 'Action';

    return null;
  }

  private extractSourceIds(entry: ProvenanceEntry): string[] {
    const ids: string[] = [];
    const payload = entry.payload as any;

    if (payload.sourceId) ids.push(payload.sourceId);
    if (Array.isArray(payload.sourceIds)) ids.push(...payload.sourceIds);
    if (payload.previousState?.id) ids.push(payload.previousState.id);

    if (entry.metadata?.derivedFrom) {
      if (Array.isArray(entry.metadata.derivedFrom)) {
        ids.push(...entry.metadata.derivedFrom);
      } else {
        ids.push(entry.metadata.derivedFrom);
      }
    }

    return ids;
  }

  private determineRelationType(sourceType: ProvenanceNodeType, targetType: ProvenanceNodeType): string {
    // Input -> Decision: FED_INTO
    // Input -> Action: USED_BY
    // Decision -> Action: TRIGGERED
    // Action -> Outcome: PRODUCED
    // Outcome -> Decision: AFFECTED (Feedback)

    if (sourceType === 'Input' && targetType === 'Decision') return 'FED_INTO';
    if (sourceType === 'Input' && targetType === 'Action') return 'USED_BY';
    if (sourceType === 'Decision' && targetType === 'Action') return 'TRIGGERED';
    if (sourceType === 'Action' && targetType === 'Outcome') return 'PRODUCED';
    if (sourceType === 'Outcome' && targetType === 'Decision') return 'AFFECTED';
    if (sourceType === 'Action' && targetType === 'Input') return 'GENERATED';

    return 'DERIVED_FROM';
  }

  private extractProperties(entry: ProvenanceEntry, nodeType: ProvenanceNodeType): Record<string, any> {
    const payload = entry.payload as any;
    const props: Record<string, any> = {};

    if (nodeType === 'Decision') {
      if (payload.result) props.result = payload.result;
      if (payload.confidence) props.confidence = payload.confidence;
      if (payload.evaluator) props.evaluator = payload.evaluator;
      if (payload.outcome && !props.result) props.result = payload.outcome;
    }

    if (nodeType === 'Action') {
      if (payload.status) props.status = payload.status;
      if (payload.durationMs) props.durationMs = payload.durationMs;
      if (payload.startedAt) props.startedAt = payload.startedAt;
      if (payload.completedAt) props.completedAt = payload.completedAt;
    }

    if (nodeType === 'Input') {
      if (payload.uri) props.uri = payload.uri;
      if (payload.version) props.version = payload.version;
      if (payload.path) props.uri = payload.path;
    }

    if (nodeType === 'Outcome') {
      if (payload.value) props.value = payload.value;
      if (payload.dimension) props.dimension = payload.dimension;
    }

    return props;
  }
}
