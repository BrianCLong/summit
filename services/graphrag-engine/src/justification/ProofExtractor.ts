import { Record as Neo4jRecord } from 'neo4j-driver';

export interface ProofNode {
  id: string;
  labels: string[];
  properties: { [key: string]: any };
  provenance?: string;
}

export interface ProofEdge {
  type: string;
  sourceId: string;
  targetId: string;
  properties: { [key: string]: any };
}

export interface ProofSubgraph {
  nodes: ProofNode[];
  edges: ProofEdge[];
}

export class ProofExtractor {
  static extract(records: Neo4jRecord[]): ProofSubgraph {
    const nodes = new Map<string, ProofNode>();
    const edges: ProofEdge[] = [];

    for (const record of records) {
      record.forEach((value) => {
        if (this.isNode(value)) {
          this.addNode(value, nodes);
        } else if (this.isRelationship(value)) {
          this.addEdge(value, edges, nodes);
        }
      });
    }

    return {
      nodes: Array.from(nodes.values()).sort((a, b) => a.id.localeCompare(b.id)),
      edges: edges.sort((a, b) => {
        const sourceComp = a.sourceId.localeCompare(b.sourceId);
        if (sourceComp !== 0) return sourceComp;
        return a.targetId.localeCompare(b.targetId);
      })
    };
  }

  private static isNode(obj: any): obj is any {
    return obj && typeof obj === 'object' && 'labels' in obj && 'properties' in obj;
  }

  private static isRelationship(obj: any): obj is any {
    return obj && typeof obj === 'object' && 'type' in obj && 'start' in obj && 'end' in obj;
  }

  private static addNode(node: any, map: Map<string, ProofNode>) {
    const id = node.properties.id || node.identity?.toString() || 'unknown';
    if (!map.has(id)) {
      map.set(id, {
        id,
        labels: node.labels,
        properties: node.properties,
        provenance: node.properties.evidence_id
      });
    }
  }

  private static addEdge(rel: any, edges: ProofEdge[], nodes: Map<string, ProofNode>) {
    edges.push({
      type: rel.type,
      sourceId: rel.start.toString(),
      targetId: rel.end.toString(),
      properties: rel.properties
    });
  }
}
