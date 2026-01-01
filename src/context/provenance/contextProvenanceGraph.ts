import { AssembledContext, ContextSegment, ContextSegmentId } from "../types";

export type ProvenanceNodeId = string;

export interface ProvenanceNode {
  id: ProvenanceNodeId;
  segmentId: ContextSegmentId;
  parents: ProvenanceNodeId[];
  createdAt: Date;
  source: string;
}

export interface ProvenanceEdge {
  from: ProvenanceNodeId;
  to: ProvenanceNodeId;
  rationale?: string;
}

export class ContextProvenanceGraph {
  private nodes = new Map<ProvenanceNodeId, ProvenanceNode>();
  private edges: ProvenanceEdge[] = [];

  addSegment(segment: ContextSegment, parents: ProvenanceNodeId[] = []): ProvenanceNode {
    const node: ProvenanceNode = {
      id: segment.metadata.id,
      segmentId: segment.metadata.id,
      parents,
      createdAt: segment.metadata.createdAt,
      source: segment.metadata.source
    };
    this.nodes.set(node.id, node);
    parents.forEach((parent) => {
      this.edges.push({ from: parent, to: node.id, rationale: "derived" });
    });
    return node;
  }

  link(parent: ProvenanceNodeId, child: ProvenanceNodeId, rationale?: string): void {
    this.edges.push({ from: parent, to: child, rationale });
  }

  getLineage(segmentId: ContextSegmentId): ProvenanceNode[] {
    const visited = new Set<ProvenanceNodeId>();
    const lineage: ProvenanceNode[] = [];

    const traverse = (nodeId: ProvenanceNodeId) => {
      if (visited.has(nodeId)) return;
      const node = this.nodes.get(nodeId);
      if (!node) return;
      visited.add(nodeId);
      lineage.push(node);
      node.parents.forEach(traverse);
    };

    traverse(segmentId);
    return lineage;
  }

  attachToContext(context: AssembledContext): ProvenanceEdge[] {
    context.segments.forEach((segment) => {
      if (!this.nodes.has(segment.metadata.id)) {
        this.addSegment(segment);
      }
    });
    return this.edges;
  }
}
