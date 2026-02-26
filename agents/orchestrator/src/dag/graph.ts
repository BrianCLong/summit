import { DagEdge, DagNode, DagWorkflow } from './schema.js';

function edgeKey(edge: DagEdge): string {
  return `${edge.from}->${edge.to}:${edge.tool ?? ''}:${edge.id ?? ''}`;
}

export class DagValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DagValidationError';
  }
}

export class DagCycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DagCycleError';
  }
}

export class DagGraph {
  private readonly workflow: DagWorkflow;
  private readonly nodeById: Map<string, DagNode>;
  private readonly incomingByNode: Map<string, DagEdge[]>;
  private readonly outgoingByNode: Map<string, DagEdge[]>;

  constructor(workflow: DagWorkflow) {
    this.workflow = workflow;
    this.nodeById = new Map<string, DagNode>();
    this.incomingByNode = new Map<string, DagEdge[]>();
    this.outgoingByNode = new Map<string, DagEdge[]>();

    for (const node of workflow.nodes) {
      if (this.nodeById.has(node.id)) {
        throw new DagValidationError(`Duplicate node id: ${node.id}`);
      }
      this.nodeById.set(node.id, node);
      this.incomingByNode.set(node.id, []);
      this.outgoingByNode.set(node.id, []);
    }

    for (const edge of workflow.edges) {
      if (!this.nodeById.has(edge.from)) {
        throw new DagValidationError(`Edge source node does not exist: ${edge.from}`);
      }
      if (!this.nodeById.has(edge.to)) {
        throw new DagValidationError(`Edge destination node does not exist: ${edge.to}`);
      }

      this.incomingByNode.get(edge.to)?.push(edge);
      this.outgoingByNode.get(edge.from)?.push(edge);
    }

    for (const edges of this.incomingByNode.values()) {
      edges.sort((a, b) => edgeKey(a).localeCompare(edgeKey(b)));
    }
    for (const edges of this.outgoingByNode.values()) {
      edges.sort((a, b) => edgeKey(a).localeCompare(edgeKey(b)));
    }
  }

  getWorkflow(): DagWorkflow {
    return this.workflow;
  }

  getNode(nodeId: string): DagNode {
    const node = this.nodeById.get(nodeId);
    if (!node) {
      throw new DagValidationError(`Unknown node id: ${nodeId}`);
    }
    return node;
  }

  getIncomingEdges(nodeId: string): DagEdge[] {
    return this.incomingByNode.get(nodeId) ?? [];
  }

  getOutgoingEdges(nodeId: string): DagEdge[] {
    return this.outgoingByNode.get(nodeId) ?? [];
  }

  isAcyclic(): boolean {
    try {
      this.topologicalOrder();
      return true;
    } catch (error) {
      if (error instanceof DagCycleError) {
        return false;
      }
      throw error;
    }
  }

  assertAcyclic(): void {
    this.topologicalOrder();
  }

  topologicalOrder(): DagNode[] {
    const indegree = new Map<string, number>();

    for (const nodeId of this.nodeById.keys()) {
      indegree.set(nodeId, this.getIncomingEdges(nodeId).length);
    }

    const ready = Array.from(this.nodeById.keys())
      .filter((nodeId) => (indegree.get(nodeId) ?? 0) === 0)
      .sort((a, b) => a.localeCompare(b));

    const orderedIds: string[] = [];

    while (ready.length > 0) {
      const nodeId = ready.shift()!;
      orderedIds.push(nodeId);

      for (const edge of this.getOutgoingEdges(nodeId)) {
        const next = edge.to;
        const nextDegree = (indegree.get(next) ?? 0) - 1;
        indegree.set(next, nextDegree);
        if (nextDegree === 0) {
          ready.push(next);
          ready.sort((a, b) => a.localeCompare(b));
        }
      }
    }

    if (orderedIds.length !== this.nodeById.size) {
      throw new DagCycleError('Execution graph contains a cycle');
    }

    return orderedIds.map((id) => this.getNode(id));
  }
}
