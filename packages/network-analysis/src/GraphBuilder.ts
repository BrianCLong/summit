/**
 * Graph construction and manipulation utilities
 */

import type { Graph, Node, Edge, BipartiteGraph, HeterogeneousGraph, NetworkSnapshot, TemporalNetwork } from './types.js';

export class GraphBuilder {
  private graph: Graph;

  constructor(directed = false, weighted = false) {
    this.graph = {
      nodes: new Map(),
      edges: [],
      directed,
      weighted,
      metadata: {}
    };
  }

  /**
   * Add a node to the graph
   */
  addNode(node: Node): void {
    this.graph.nodes.set(node.id, node);
  }

  /**
   * Add multiple nodes to the graph
   */
  addNodes(nodes: Node[]): void {
    nodes.forEach(node => this.addNode(node));
  }

  /**
   * Add an edge to the graph
   */
  addEdge(edge: Edge): void {
    // Ensure both nodes exist
    if (!this.graph.nodes.has(edge.source)) {
      this.addNode({ id: edge.source });
    }
    if (!this.graph.nodes.has(edge.target)) {
      this.addNode({ id: edge.target });
    }

    this.graph.edges.push({
      ...edge,
      directed: edge.directed ?? this.graph.directed,
      weight: edge.weight ?? 1
    });
  }

  /**
   * Add multiple edges to the graph
   */
  addEdges(edges: Edge[]): void {
    edges.forEach(edge => this.addEdge(edge));
  }

  /**
   * Remove a node and all its connected edges
   */
  removeNode(nodeId: string): void {
    this.graph.nodes.delete(nodeId);
    this.graph.edges = this.graph.edges.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    );
  }

  /**
   * Remove an edge from the graph
   */
  removeEdge(source: string, target: string): void {
    this.graph.edges = this.graph.edges.filter(
      edge => !(edge.source === source && edge.target === target)
    );
  }

  /**
   * Get the adjacency list representation
   */
  getAdjacencyList(): Map<string, Set<string>> {
    const adjList = new Map<string, Set<string>>();

    // Initialize adjacency list for all nodes
    this.graph.nodes.forEach((_, nodeId) => {
      adjList.set(nodeId, new Set());
    });

    // Populate adjacency list
    this.graph.edges.forEach(edge => {
      adjList.get(edge.source)?.add(edge.target);
      if (!this.graph.directed) {
        adjList.get(edge.target)?.add(edge.source);
      }
    });

    return adjList;
  }

  /**
   * Get the adjacency matrix representation
   */
  getAdjacencyMatrix(): number[][] {
    const nodeIds = Array.from(this.graph.nodes.keys());
    const n = nodeIds.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    const nodeIndexMap = new Map(nodeIds.map((id, idx) => [id, idx]));

    this.graph.edges.forEach(edge => {
      const i = nodeIndexMap.get(edge.source);
      const j = nodeIndexMap.get(edge.target);
      if (i !== undefined && j !== undefined) {
        matrix[i][j] = edge.weight ?? 1;
        if (!this.graph.directed) {
          matrix[j][i] = edge.weight ?? 1;
        }
      }
    });

    return matrix;
  }

  /**
   * Get neighbors of a node
   */
  getNeighbors(nodeId: string): Set<string> {
    const neighbors = new Set<string>();

    this.graph.edges.forEach(edge => {
      if (edge.source === nodeId) {
        neighbors.add(edge.target);
      }
      if (!this.graph.directed && edge.target === nodeId) {
        neighbors.add(edge.source);
      }
    });

    return neighbors;
  }

  /**
   * Get the degree of a node
   */
  getDegree(nodeId: string): number {
    return this.getNeighbors(nodeId).size;
  }

  /**
   * Get in-degree for directed graphs
   */
  getInDegree(nodeId: string): number {
    if (!this.graph.directed) {
      return this.getDegree(nodeId);
    }

    return this.graph.edges.filter(edge => edge.target === nodeId).length;
  }

  /**
   * Get out-degree for directed graphs
   */
  getOutDegree(nodeId: string): number {
    if (!this.graph.directed) {
      return this.getDegree(nodeId);
    }

    return this.graph.edges.filter(edge => edge.source === nodeId).length;
  }

  /**
   * Create a subgraph from a set of nodes
   */
  createSubgraph(nodeIds: Set<string>): Graph {
    const subgraph: Graph = {
      nodes: new Map(),
      edges: [],
      directed: this.graph.directed,
      weighted: this.graph.weighted,
      metadata: { ...this.graph.metadata, isSubgraph: true }
    };

    // Add nodes
    nodeIds.forEach(id => {
      const node = this.graph.nodes.get(id);
      if (node) {
        subgraph.nodes.set(id, { ...node });
      }
    });

    // Add edges that connect nodes within the subgraph
    this.graph.edges.forEach(edge => {
      if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
        subgraph.edges.push({ ...edge });
      }
    });

    return subgraph;
  }

  /**
   * Build the graph
   */
  build(): Graph {
    return this.graph;
  }

  /**
   * Create a graph from entity relationships
   */
  static fromEntityRelationships(
    entities: Array<{ id: string; attributes?: Record<string, any> }>,
    relationships: Array<{ source: string; target: string; type?: string; weight?: number }>
  ): Graph {
    const builder = new GraphBuilder(true, true);

    // Add entities as nodes
    entities.forEach(entity => {
      builder.addNode({
        id: entity.id,
        attributes: entity.attributes
      });
    });

    // Add relationships as edges
    relationships.forEach(rel => {
      builder.addEdge({
        source: rel.source,
        target: rel.target,
        weight: rel.weight,
        attributes: { type: rel.type }
      });
    });

    return builder.build();
  }

  /**
   * Create a bipartite graph
   */
  static createBipartiteGraph(
    leftNodes: Node[],
    rightNodes: Node[],
    edges: Edge[]
  ): BipartiteGraph {
    return {
      leftNodes: new Set(leftNodes.map(n => n.id)),
      rightNodes: new Set(rightNodes.map(n => n.id)),
      edges
    };
  }

  /**
   * Create a heterogeneous graph with multiple node and edge types
   */
  static createHeterogeneousGraph(
    nodes: Array<Node & { type: string }>,
    edges: Array<Edge & { type: string }>
  ): HeterogeneousGraph {
    const nodeTypes = new Map(nodes.map(n => [n.id, n.type]));
    const edgeTypes = new Map(
      edges.map((e, idx) => [`${e.source}-${e.target}-${idx}`, e.type])
    );

    return {
      nodeTypes,
      edgeTypes,
      nodes: new Map(nodes.map(n => [n.id, n])),
      edges
    };
  }

  /**
   * Create a network snapshot for temporal analysis
   */
  static createSnapshot(graph: Graph, timestamp: Date, version: string): NetworkSnapshot {
    return {
      timestamp,
      graph,
      version
    };
  }

  /**
   * Build a temporal network from snapshots
   */
  static buildTemporalNetwork(snapshots: NetworkSnapshot[]): TemporalNetwork {
    const sortedSnapshots = snapshots.sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    return {
      snapshots: sortedSnapshots,
      startTime: sortedSnapshots[0]?.timestamp || new Date(),
      endTime: sortedSnapshots[sortedSnapshots.length - 1]?.timestamp || new Date()
    };
  }

  /**
   * Merge multiple graphs into one
   */
  static mergeGraphs(graphs: Graph[]): Graph {
    const builder = new GraphBuilder(
      graphs.some(g => g.directed),
      graphs.some(g => g.weighted)
    );

    graphs.forEach(graph => {
      graph.nodes.forEach(node => {
        if (!builder.graph.nodes.has(node.id)) {
          builder.addNode(node);
        }
      });

      graph.edges.forEach(edge => {
        builder.addEdge(edge);
      });
    });

    return builder.build();
  }
}
