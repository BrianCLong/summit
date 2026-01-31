import { ProvenanceEntry, provenanceLedger } from './ledger';

export interface LineageNode {
  id: string;
  type: string;
  label: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface LineageEdge {
  sourceId: string;
  targetId: string;
  relation: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  generatedAt: Date;
  tenantId: string;
}

export class DataLineageGraph {

  async buildGraph(tenantId: string): Promise<LineageGraph> {
    const entries = await provenanceLedger.getEntries(tenantId, { limit: 10000 });

    const nodes = new Map<string, LineageNode>();
    const edges: LineageEdge[] = [];

    for (const entry of entries) {
      // Process Nodes
      const nodeId = `${entry.resourceType}:${entry.resourceId}`;

      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          type: entry.resourceType,
          label: entry.resourceId,
          createdAt: entry.timestamp,
          updatedAt: entry.timestamp,
          metadata: {}
        });
      } else {
        const node = nodes.get(nodeId)!;
        node.updatedAt = entry.timestamp;
      }

      // Process Edges from payload metadata
      // Expecting metadata to optionally contain 'derivedFrom', 'dependsOn', or 'parent'
      // which are IDs or arrays of IDs
      const relations = ['derivedFrom', 'dependsOn', 'parent', 'inputs'];

      for (const rel of relations) {
        if (entry.metadata && entry.metadata[rel]) {
          const targets = Array.isArray(entry.metadata[rel])
            ? entry.metadata[rel]
            : [entry.metadata[rel]];

          for (const target of targets) {
             // target might be just ID or "Type:ID"
             let targetId = target;
             if (!target.includes(':')) {
               // infer type if possible, or just use as is
               // For simplicity, assume target string is full ID or we default to same type
               targetId = `${entry.resourceType}:${target}`;
             }

             edges.push({
               sourceId: targetId, // derivedFrom means Target -> Source dependency usually? Or Source -> Target?
               // If A is derived from B, then B -> A (flow of data)
               targetId: nodeId,
               relation: rel,
               timestamp: entry.timestamp,
               metadata: { entryId: entry.id }
             });
          }
        }
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
      generatedAt: new Date(),
      tenantId
    };
  }

  serialize(graph: LineageGraph): string {
    return JSON.stringify(graph, null, 2);
  }

  deserialize(json: string): LineageGraph {
    const graph = JSON.parse(json);
    // Restore dates
    graph.generatedAt = new Date(graph.generatedAt);
    graph.nodes.forEach((n: any) => {
      n.createdAt = new Date(n.createdAt);
      n.updatedAt = new Date(n.updatedAt);
    });
    graph.edges.forEach((e: any) => {
      e.timestamp = new Date(e.timestamp);
    });
    return graph;
  }
}

export const lineageGraph = new DataLineageGraph();
