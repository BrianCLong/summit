/**
 * Simple Graph implementation for DAG operations
 * Replaces graphlib for better portability
 */

export interface Edge {
  v: string;
  w: string;
}

export class Graph {
  private nodes: Map<string, any> = new Map();
  private edges: Map<string, Set<string>> = new Map();
  private reverseEdges: Map<string, Set<string>> = new Map();
  private edgeData: Map<string, any> = new Map();
  private directed: boolean;

  constructor(options?: { directed?: boolean }) {
    this.directed = options?.directed ?? true;
  }

  setNode(name: string, value?: any): this {
    this.nodes.set(name, value);
    if (!this.edges.has(name)) {
      this.edges.set(name, new Set());
    }
    if (!this.reverseEdges.has(name)) {
      this.reverseEdges.set(name, new Set());
    }
    return this;
  }

  setEdge(v: string, w: string, value?: any): this {
    if (!this.nodes.has(v)) this.setNode(v);
    if (!this.nodes.has(w)) this.setNode(w);

    this.edges.get(v)!.add(w);
    this.reverseEdges.get(w)!.add(v);
    this.edgeData.set(`${v}->${w}`, value);
    return this;
  }

  removeEdge(v: string, w: string): this {
    this.edges.get(v)?.delete(w);
    this.reverseEdges.get(w)?.delete(v);
    this.edgeData.delete(`${v}->${w}`);
    return this;
  }

  hasNode(name: string): boolean {
    return this.nodes.has(name);
  }

  node(name: string): any {
    return this.nodes.get(name);
  }

  nodeList(): string[] {
    return Array.from(this.nodes.keys());
  }

  edgeList(): Edge[] {
    const result: Edge[] = [];
    this.edges.forEach((targets, source) => {
      targets.forEach(target => {
        result.push({ v: source, w: target });
      });
    });
    return result;
  }

  inEdges(v: string): Edge[] | undefined {
    const sources = this.reverseEdges.get(v);
    if (!sources) return undefined;
    return Array.from(sources).map(source => ({ v: source, w: v }));
  }

  outEdges(v: string): Edge[] | undefined {
    const targets = this.edges.get(v);
    if (!targets) return undefined;
    return Array.from(targets).map(target => ({ v, w: target }));
  }

  predecessors(v: string): string[] | undefined {
    const sources = this.reverseEdges.get(v);
    return sources ? Array.from(sources) : undefined;
  }

  successors(v: string): string[] | undefined {
    const targets = this.edges.get(v);
    return targets ? Array.from(targets) : undefined;
  }

  nodeCount(): number {
    return this.nodes.size;
  }

  edgeCount(): number {
    let count = 0;
    this.edges.forEach(set => count += set.size);
    return count;
  }
}

/**
 * Graph algorithms
 */
export const alg = {
  /**
   * Check if graph is acyclic using DFS
   */
  isAcyclic(g: Graph): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const successors = g.successors(node) || [];
      for (const successor of successors) {
        if (!visited.has(successor)) {
          if (hasCycle(successor)) return true;
        } else if (recStack.has(successor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of g.nodeList()) {
      if (!visited.has(node)) {
        if (hasCycle(node)) return false;
      }
    }

    return true;
  },

  /**
   * Topological sort using Kahn's algorithm
   */
  topsort(g: Graph): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Initialize in-degree
    for (const node of g.nodeList()) {
      const preds = g.predecessors(node);
      inDegree.set(node, preds?.length || 0);
      if (!preds || preds.length === 0) {
        queue.push(node);
      }
    }

    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      const successors = g.successors(node) || [];
      for (const successor of successors) {
        const degree = inDegree.get(successor)! - 1;
        inDegree.set(successor, degree);
        if (degree === 0) {
          queue.push(successor);
        }
      }
    }

    if (result.length !== g.nodeCount()) {
      throw new Error('Graph has a cycle');
    }

    return result;
  },
};
