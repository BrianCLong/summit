import { ContextSegment, ContextSegmentId } from "../types";

export type ProvenanceNodeId = string;

export interface ProvenanceNode {
  id: ProvenanceNodeId;
  segment: ContextSegment;
  parents: ProvenanceNodeId[];
  children: ProvenanceNodeId[];
}

export interface ProvenanceEdge {
  from: ProvenanceNodeId;
  to: ProvenanceNodeId;
  relation: "derived" | "composed" | "copied";
}

export class ContextProvenanceGraph {
  private nodes: Map<ProvenanceNodeId, ProvenanceNode> = new Map();
  private edges: ProvenanceEdge[] = [];

  constructor(private readonly graphId: string) {}

  addSegment(segment: ContextSegment, parents: ContextSegmentId[] = []): ProvenanceNodeId {
    const nodeId: ProvenanceNodeId = segment.metadata.id;
    const node: ProvenanceNode = {
      id: nodeId,
      segment,
      parents: [...parents],
      children: [],
    };
    this.nodes.set(nodeId, node);

    parents.forEach((parentId) => {
      this.edges.push({ from: parentId, to: nodeId, relation: "derived" });
      const parentNode = this.nodes.get(parentId);
      if (parentNode) {
        parentNode.children.push(nodeId);
      }
    });

    return nodeId;
  }

  link(parentId: ProvenanceNodeId, childId: ProvenanceNodeId, relation: ProvenanceEdge["relation"]): void {
    if (!this.nodes.has(parentId) || !this.nodes.has(childId)) {
      throw new Error(`Cannot link unknown nodes: ${parentId} -> ${childId}`);
    }
    this.edges.push({ from: parentId, to: childId, relation });
    const parent = this.nodes.get(parentId);
    const child = this.nodes.get(childId);
    if (parent && !parent.children.includes(childId)) parent.children.push(childId);
    if (child && !child.parents.includes(parentId)) child.parents.push(parentId);
  }

  getNode(nodeId: ProvenanceNodeId): ProvenanceNode | undefined {
    return this.nodes.get(nodeId);
  }

  getLineage(nodeId: ProvenanceNodeId): ProvenanceNodeId[] {
    const visited = new Set<ProvenanceNodeId>();
    const lineage: ProvenanceNodeId[] = [];

    const traverse = (current: ProvenanceNodeId) => {
      if (visited.has(current)) return;
      visited.add(current);
      lineage.push(current);
      const node = this.nodes.get(current);
      node?.parents.forEach(traverse);
    };

    traverse(nodeId);
    return lineage;
  }

  getDescendants(nodeId: ProvenanceNodeId): ProvenanceNodeId[] {
    const visited = new Set<ProvenanceNodeId>();
    const descendants: ProvenanceNodeId[] = [];

    const traverse = (current: ProvenanceNodeId) => {
      if (visited.has(current)) return;
      visited.add(current);
      descendants.push(current);
      const node = this.nodes.get(current);
      node?.children.forEach(traverse);
    };

    traverse(nodeId);
    return descendants;
  }

  hasCycle(): boolean {
    const visiting = new Set<ProvenanceNodeId>();
    const visited = new Set<ProvenanceNodeId>();

    const visit = (nodeId: ProvenanceNodeId): boolean => {
      if (visiting.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      visiting.add(nodeId);
      const node = this.nodes.get(nodeId);
      const hasCycle = node?.children.some((child) => visit(child)) ?? false;
      visiting.delete(nodeId);
      visited.add(nodeId);
      return hasCycle;
    };

    return Array.from(this.nodes.keys()).some((nodeId) => visit(nodeId));
  }

  toJSON(): { id: string; nodes: ProvenanceNode[]; edges: ProvenanceEdge[] } {
    return {
      id: this.graphId,
      nodes: Array.from(this.nodes.values()),
      edges: [...this.edges],
    };
  }
}
