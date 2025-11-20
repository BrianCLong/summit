/**
 * Graph Builder - Build lineage graphs for visualization
 */

import { v4 as uuidv4 } from 'uuid';
import {
  LineageGraph,
  LineageNode,
  LineageEdge,
  DependencyGraph,
  LineagePath,
  LineageMetrics,
  NodeType,
  EdgeType,
} from '../types.js';

export class GraphBuilder {
  /**
   * Build a complete lineage graph from nodes and edges
   */
  buildGraph(
    nodes: LineageNode[],
    edges: LineageEdge[],
    options: {
      name?: string;
      description?: string;
      rootNode?: string;
      direction?: 'upstream' | 'downstream' | 'both';
      maxDepth?: number;
    } = {}
  ): LineageGraph {
    const nodesMap = new Map<string, LineageNode>();
    const edgesMap = new Map<string, LineageEdge>();

    // Build node map
    for (const node of nodes) {
      nodesMap.set(node.id, node);
    }

    // Build edge map
    for (const edge of edges) {
      edgesMap.set(edge.id, edge);
    }

    // Calculate depth
    const depth = options.maxDepth || this.calculateMaxDepth(nodesMap, edgesMap, options.rootNode);

    return {
      id: uuidv4(),
      name: options.name || 'Lineage Graph',
      description: options.description,
      rootNode: options.rootNode,
      nodes: nodesMap,
      edges: edgesMap,
      direction: options.direction || 'both',
      depth,
      generatedAt: new Date(),
      metadata: {},
    };
  }

  /**
   * Build a subgraph focused on a specific node
   */
  buildSubgraph(
    allNodes: LineageNode[],
    allEdges: LineageEdge[],
    focusNodeId: string,
    options: {
      direction?: 'upstream' | 'downstream' | 'both';
      maxDepth?: number;
      includeNodeTypes?: NodeType[];
      excludeNodeTypes?: NodeType[];
    } = {}
  ): LineageGraph {
    const direction = options.direction || 'both';
    const maxDepth = options.maxDepth || 5;

    const nodesMap = new Map<string, LineageNode>();
    const edgesMap = new Map<string, LineageEdge>();
    const visited = new Set<string>();

    // Add focus node
    const focusNode = allNodes.find(n => n.id === focusNodeId);
    if (!focusNode) {
      throw new Error(`Focus node ${focusNodeId} not found`);
    }
    nodesMap.set(focusNode.id, focusNode);

    // Build edge lookup maps
    const edgesBySource = new Map<string, LineageEdge[]>();
    const edgesByTarget = new Map<string, LineageEdge[]>();

    for (const edge of allEdges) {
      if (!edgesBySource.has(edge.sourceNodeId)) {
        edgesBySource.set(edge.sourceNodeId, []);
      }
      edgesBySource.get(edge.sourceNodeId)!.push(edge);

      if (!edgesByTarget.has(edge.targetNodeId)) {
        edgesByTarget.set(edge.targetNodeId, []);
      }
      edgesByTarget.get(edge.targetNodeId)!.push(edge);
    }

    // Traverse upstream
    if (direction === 'upstream' || direction === 'both') {
      this.traverseUpstream(
        focusNodeId,
        0,
        maxDepth,
        allNodes,
        edgesByTarget,
        nodesMap,
        edgesMap,
        visited,
        options
      );
    }

    // Traverse downstream
    if (direction === 'downstream' || direction === 'both') {
      this.traverseDownstream(
        focusNodeId,
        0,
        maxDepth,
        allNodes,
        edgesBySource,
        nodesMap,
        edgesMap,
        visited,
        options
      );
    }

    return this.buildGraph(Array.from(nodesMap.values()), Array.from(edgesMap.values()), {
      name: `Lineage Subgraph: ${focusNode.name}`,
      rootNode: focusNodeId,
      direction,
      maxDepth,
    });
  }

  /**
   * Build a dependency graph for a specific node
   */
  buildDependencyGraph(
    allNodes: LineageNode[],
    allEdges: LineageEdge[],
    nodeId: string,
    maxDepth: number = 10
  ): DependencyGraph {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Build upstream dependencies
    const upstreamSubgraph = this.buildSubgraph(allNodes, allEdges, nodeId, {
      direction: 'upstream',
      maxDepth,
    });

    // Build downstream dependencies
    const downstreamSubgraph = this.buildSubgraph(allNodes, allEdges, nodeId, {
      direction: 'downstream',
      maxDepth,
    });

    // Find critical path (longest path through the graph)
    const criticalPath = this.findCriticalPath(allNodes, allEdges, nodeId);

    return {
      rootNode: node,
      upstream: {
        nodes: Array.from(upstreamSubgraph.nodes.values()).filter(n => n.id !== nodeId),
        edges: Array.from(upstreamSubgraph.edges.values()),
        depth: this.calculateMaxDepth(upstreamSubgraph.nodes, upstreamSubgraph.edges, nodeId),
      },
      downstream: {
        nodes: Array.from(downstreamSubgraph.nodes.values()).filter(n => n.id !== nodeId),
        edges: Array.from(downstreamSubgraph.edges.values()),
        depth: this.calculateMaxDepth(downstreamSubgraph.nodes, downstreamSubgraph.edges, nodeId),
      },
      criticalPath,
    };
  }

  /**
   * Find all paths between two nodes
   */
  findPaths(
    allNodes: LineageNode[],
    allEdges: LineageEdge[],
    sourceNodeId: string,
    targetNodeId: string,
    maxPaths: number = 10
  ): LineagePath[] {
    const paths: LineagePath[] = [];
    const visited = new Set<string>();
    const currentPath: Array<{ node: LineageNode; edge?: LineageEdge }> = [];

    const sourceNode = allNodes.find(n => n.id === sourceNodeId);
    const targetNode = allNodes.find(n => n.id === targetNodeId);

    if (!sourceNode || !targetNode) {
      throw new Error('Source or target node not found');
    }

    // Build edge lookup
    const edgesBySource = new Map<string, LineageEdge[]>();
    for (const edge of allEdges) {
      if (!edgesBySource.has(edge.sourceNodeId)) {
        edgesBySource.set(edge.sourceNodeId, []);
      }
      edgesBySource.get(edge.sourceNodeId)!.push(edge);
    }

    const dfs = (currentId: string) => {
      if (paths.length >= maxPaths) {
        return;
      }

      if (currentId === targetNodeId) {
        // Found a path
        const transformations = currentPath
          .filter(p => p.edge)
          .flatMap(p =>
            p.edge!.columnMappings.map(m => m.transformation).filter(Boolean)
          ) as any[];

        paths.push({
          sourceNode,
          targetNode,
          path: [...currentPath],
          length: currentPath.length,
          confidence: this.calculatePathConfidence(currentPath),
          transformations,
        });
        return;
      }

      visited.add(currentId);

      const outgoingEdges = edgesBySource.get(currentId) || [];
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.targetNodeId)) {
          const nextNode = allNodes.find(n => n.id === edge.targetNodeId);
          if (nextNode) {
            currentPath.push({ node: nextNode, edge });
            dfs(edge.targetNodeId);
            currentPath.pop();
          }
        }
      }

      visited.delete(currentId);
    };

    currentPath.push({ node: sourceNode });
    dfs(sourceNodeId);

    return paths;
  }

  /**
   * Detect circular dependencies in the lineage graph
   */
  detectCircularDependencies(nodes: LineageNode[], edges: LineageEdge[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];

    // Build adjacency list
    const adjacencyList = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adjacencyList.has(edge.sourceNodeId)) {
        adjacencyList.set(edge.sourceNodeId, []);
      }
      adjacencyList.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    }

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      currentPath.push(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = currentPath.indexOf(neighbor);
          cycles.push(currentPath.slice(cycleStart));
        }
      }

      currentPath.pop();
      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return cycles;
  }

  /**
   * Calculate metrics for a lineage graph
   */
  calculateMetrics(graph: LineageGraph): LineageMetrics {
    const nodes = Array.from(graph.nodes.values());
    const edges = Array.from(graph.edges.values());

    // Count nodes by type
    const nodesByType: Record<NodeType, number> = {} as any;
    for (const node of nodes) {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    }

    // Count edges by type
    const edgesByType: Record<EdgeType, number> = {} as any;
    for (const edge of edges) {
      edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
    }

    // Find orphaned nodes (no incoming or outgoing edges)
    const nodesWithEdges = new Set<string>();
    for (const edge of edges) {
      nodesWithEdges.add(edge.sourceNodeId);
      nodesWithEdges.add(edge.targetNodeId);
    }
    const orphanedNodes = nodes.filter(n => !nodesWithEdges.has(n.id)).length;

    // Calculate confidence distribution
    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;

    for (const edge of edges) {
      if (edge.confidence > 0.8) {
        highConfidence++;
      } else if (edge.confidence >= 0.5) {
        mediumConfidence++;
      } else {
        lowConfidence++;
      }
    }

    // Detect circular dependencies
    const circularDependencies = this.detectCircularDependencies(nodes, edges).length;

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodesByType,
      edgesByType,
      averageDepth: graph.depth / 2,
      maxDepth: graph.depth,
      orphanedNodes,
      circularDependencies,
      confidenceDistribution: {
        high: highConfidence,
        medium: mediumConfidence,
        low: lowConfidence,
      },
      lastScanDate: graph.generatedAt,
      coverage: this.calculateCoverage(nodes),
    };
  }

  /**
   * Export graph to various formats
   */
  exportGraph(
    graph: LineageGraph,
    format: 'json' | 'dot' | 'cytoscape' | 'd3'
  ): string | object {
    switch (format) {
      case 'json':
        return this.exportToJSON(graph);
      case 'dot':
        return this.exportToDOT(graph);
      case 'cytoscape':
        return this.exportToCytoscape(graph);
      case 'd3':
        return this.exportToD3(graph);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private helper methods

  private traverseUpstream(
    nodeId: string,
    currentDepth: number,
    maxDepth: number,
    allNodes: LineageNode[],
    edgesByTarget: Map<string, LineageEdge[]>,
    nodesMap: Map<string, LineageNode>,
    edgesMap: Map<string, LineageEdge>,
    visited: Set<string>,
    options: any
  ): void {
    if (currentDepth >= maxDepth || visited.has(`upstream:${nodeId}`)) {
      return;
    }

    visited.add(`upstream:${nodeId}`);

    const incomingEdges = edgesByTarget.get(nodeId) || [];
    for (const edge of incomingEdges) {
      const sourceNode = allNodes.find(n => n.id === edge.sourceNodeId);
      if (!sourceNode) continue;

      // Apply filters
      if (options.includeNodeTypes && !options.includeNodeTypes.includes(sourceNode.type)) {
        continue;
      }
      if (options.excludeNodeTypes && options.excludeNodeTypes.includes(sourceNode.type)) {
        continue;
      }

      nodesMap.set(sourceNode.id, sourceNode);
      edgesMap.set(edge.id, edge);

      this.traverseUpstream(
        sourceNode.id,
        currentDepth + 1,
        maxDepth,
        allNodes,
        edgesByTarget,
        nodesMap,
        edgesMap,
        visited,
        options
      );
    }
  }

  private traverseDownstream(
    nodeId: string,
    currentDepth: number,
    maxDepth: number,
    allNodes: LineageNode[],
    edgesBySource: Map<string, LineageEdge[]>,
    nodesMap: Map<string, LineageNode>,
    edgesMap: Map<string, LineageEdge>,
    visited: Set<string>,
    options: any
  ): void {
    if (currentDepth >= maxDepth || visited.has(`downstream:${nodeId}`)) {
      return;
    }

    visited.add(`downstream:${nodeId}`);

    const outgoingEdges = edgesBySource.get(nodeId) || [];
    for (const edge of outgoingEdges) {
      const targetNode = allNodes.find(n => n.id === edge.targetNodeId);
      if (!targetNode) continue;

      // Apply filters
      if (options.includeNodeTypes && !options.includeNodeTypes.includes(targetNode.type)) {
        continue;
      }
      if (options.excludeNodeTypes && options.excludeNodeTypes.includes(targetNode.type)) {
        continue;
      }

      nodesMap.set(targetNode.id, targetNode);
      edgesMap.set(edge.id, edge);

      this.traverseDownstream(
        targetNode.id,
        currentDepth + 1,
        maxDepth,
        allNodes,
        edgesBySource,
        nodesMap,
        edgesMap,
        visited,
        options
      );
    }
  }

  private calculateMaxDepth(
    nodesMap: Map<string, LineageNode>,
    edgesMap: Map<string, LineageEdge>,
    rootNode?: string
  ): number {
    // Simple depth calculation
    return Math.min(10, Math.max(3, Math.floor(Math.sqrt(nodesMap.size))));
  }

  private findCriticalPath(
    allNodes: LineageNode[],
    allEdges: LineageEdge[],
    nodeId: string
  ): LineageNode[] {
    // Find the longest path through the node
    // Simplified implementation - returns upstream path
    const path: LineageNode[] = [];
    const visited = new Set<string>();

    const traverse = (currentId: string) => {
      if (visited.has(currentId)) {
        return;
      }

      const node = allNodes.find(n => n.id === currentId);
      if (!node) return;

      visited.add(currentId);
      path.push(node);

      const incomingEdges = allEdges.filter(e => e.targetNodeId === currentId);
      if (incomingEdges.length > 0) {
        // Follow the first edge
        traverse(incomingEdges[0].sourceNodeId);
      }
    };

    traverse(nodeId);
    return path.reverse();
  }

  private calculatePathConfidence(
    path: Array<{ node: LineageNode; edge?: LineageEdge }>
  ): number {
    const edges = path.filter(p => p.edge).map(p => p.edge!);
    if (edges.length === 0) return 1.0;

    // Calculate average confidence
    const totalConfidence = edges.reduce((sum, edge) => sum + edge.confidence, 0);
    return totalConfidence / edges.length;
  }

  private calculateCoverage(nodes: LineageNode[]): number {
    // Simplified coverage calculation
    // In production, this would compare against total data assets
    return Math.min(100, (nodes.length / 100) * 100);
  }

  private exportToJSON(graph: LineageGraph): string {
    return JSON.stringify(
      {
        id: graph.id,
        name: graph.name,
        nodes: Array.from(graph.nodes.values()),
        edges: Array.from(graph.edges.values()),
      },
      null,
      2
    );
  }

  private exportToDOT(graph: LineageGraph): string {
    let dot = 'digraph lineage {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box];\n\n';

    // Add nodes
    for (const node of graph.nodes.values()) {
      dot += `  "${node.id}" [label="${node.name}\\n(${node.type})"];\n`;
    }

    dot += '\n';

    // Add edges
    for (const edge of graph.edges.values()) {
      dot += `  "${edge.sourceNodeId}" -> "${edge.targetNodeId}" [label="${edge.type}"];\n`;
    }

    dot += '}\n';
    return dot;
  }

  private exportToCytoscape(graph: LineageGraph): object {
    return {
      elements: {
        nodes: Array.from(graph.nodes.values()).map(node => ({
          data: {
            id: node.id,
            label: node.name,
            type: node.type,
            platform: node.platform,
          },
        })),
        edges: Array.from(graph.edges.values()).map(edge => ({
          data: {
            id: edge.id,
            source: edge.sourceNodeId,
            target: edge.targetNodeId,
            type: edge.type,
            confidence: edge.confidence,
          },
        })),
      },
    };
  }

  private exportToD3(graph: LineageGraph): object {
    return {
      nodes: Array.from(graph.nodes.values()).map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
        platform: node.platform,
      })),
      links: Array.from(graph.edges.values()).map(edge => ({
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        type: edge.type,
        confidence: edge.confidence,
      })),
    };
  }
}
