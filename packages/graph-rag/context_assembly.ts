import neo4j, { Driver, Session } from 'neo4j-driver';

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface GraphRelationship {
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, any>;
}

export interface GraphContext {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

/**
 * ContextAssembler handles the conversion of raw Neo4j results into
 * a deterministic text format suitable for LLM consumption.
 */
export class ContextAssembler {
  /**
   * Serializes a GraphContext into a structured markdown format.
   * Ensures deterministic ordering by ID to maintain cache hits.
   */
  static serialize(context: GraphContext): string {
    const lines: string[] = [];

    lines.push('### Knowledge Graph Context');

    // Sort nodes by ID for determinism
    const sortedNodes = [...context.nodes].sort((a, b) => a.id.localeCompare(b.id));

    lines.push('#### Entities');
    for (const node of sortedNodes) {
      const labels = node.labels.join(', ');
      const evidenceId = node.properties.evidence_id || 'N/A';
      lines.push(`- **[${node.id}]** (${labels})`);
      lines.push(`  - Evidence ID: \`${evidenceId}\``);

      // Filter out internal properties
      const props = Object.entries(node.properties)
        .filter(([key]) => !['id', 'evidence_id'].includes(key))
        .map(([key, val]) => `${key}: ${JSON.stringify(val)}`)
        .join(', ');

      if (props) {
        lines.push(`  - Attributes: ${props}`);
      }
    }

    lines.push('\n#### Relationships');
    // Sort relationships by startNodeId then endNodeId
    const sortedRels = [...context.relationships].sort((a, b) => {
      const startComp = a.startNodeId.localeCompare(b.startNodeId);
      if (startComp !== 0) return startComp;
      return a.endNodeId.localeCompare(b.endNodeId);
    });

    for (const rel of sortedRels) {
      lines.push(`- **[${rel.startNodeId}]** --[:${rel.type}]--> **[${rel.endNodeId}]**`);
    }

    return lines.join('\n');
  }

  /**
   * Processes raw Neo4j result records into a GraphContext object.
   */
  static fromRawResult(records: any[]): GraphContext {
    const nodesMap = new Map<string, GraphNode>();
    const relationshipsMap = new Map<string, GraphRelationship>();

    for (const record of records) {
      // Logic to extract nodes and relationships from Neo4j Record
      // Supporting results from common Summit Cypher patterns
      const keys = ['seed', 'relatedEntities', 'control', 'evidence', 'narrative', 'e'];

      for (const key of keys) {
        if (record.has(key)) {
          const val = record.get(key);
          if (Array.isArray(val)) {
            val.forEach(item => this.addNodeToMap(item, nodesMap));
          } else {
            this.addNodeToMap(val, nodesMap);
          }
        }
      }

      const paths = record.get('paths');
      if (paths && Array.isArray(paths)) {
        paths.forEach(path => {
          path.segments.forEach((seg: any) => {
            this.addNodeToMap(seg.start, nodesMap);
            this.addNodeToMap(seg.end, nodesMap);

            const relId = `${seg.start.properties.id}-${seg.relationship.type}-${seg.end.properties.id}`;
            if (!relationshipsMap.has(relId)) {
              relationshipsMap.set(relId, {
                type: seg.relationship.type,
                startNodeId: seg.start.properties.id,
                endNodeId: seg.end.properties.id,
                properties: seg.relationship.properties
              });
            }
          });
        });
      }
    }

    return {
      nodes: Array.from(nodesMap.values()),
      relationships: Array.from(relationshipsMap.values())
    };
  }

  private static addNodeToMap(node: any, map: Map<string, GraphNode>) {
    const id = node.properties.id;
    if (!id) return;
    if (!map.has(id)) {
      map.set(id, {
        id,
        labels: node.labels,
        properties: node.properties
      });
    }
  }
}
