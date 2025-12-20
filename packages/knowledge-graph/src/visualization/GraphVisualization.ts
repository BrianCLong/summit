/**
 * Knowledge Graph Visualization
 */

import { Driver } from 'neo4j-driver';

export interface VisualizationOptions {
  maxNodes?: number;
  maxDepth?: number;
  includeLabels?: boolean;
  layout?: 'force' | 'hierarchical' | 'circular' | 'radial';
  nodeSize?: (node: any) => number;
  edgeWeight?: (edge: any) => number;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    properties: Record<string, any>;
    group?: string;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label: string;
    type: string;
    properties: Record<string, any>;
  }>;
  clusters?: Array<{
    id: string;
    nodes: string[];
    label: string;
  }>;
}

export class GraphVisualization {
  constructor(private driver: Driver) {}

  /**
   * Extract subgraph for visualization
   */
  async extractSubgraph(
    startNodeId: string,
    options: VisualizationOptions = {},
  ): Promise<GraphData> {
    const maxNodes = options.maxNodes || 100;
    const maxDepth = options.maxDepth || 2;

    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH path = (start {id: $startNodeId})-[*1..${maxDepth}]-(connected)
        WITH collect(path) as paths
        CALL apoc.convert.toTree(paths) YIELD value
        RETURN value
        LIMIT $maxNodes
        `,
        { startNodeId, maxNodes },
      );

      // Fallback if apoc is not available
      const nodesResult = await session.run(
        `
        MATCH (start {id: $startNodeId})
        MATCH path = (start)-[*1..${maxDepth}]-(connected)
        WITH start, connected, relationships(path) as rels
        RETURN DISTINCT start, connected, rels
        LIMIT $maxNodes
        `,
        { startNodeId, maxNodes },
      );

      const nodes = new Map<string, any>();
      const edges: GraphData['edges'] = [];

      for (const record of nodesResult.records) {
        // Add start node
        const startNode = record.get('start');
        if (!nodes.has(startNode.properties.id)) {
          nodes.set(startNode.properties.id, {
            id: startNode.properties.id,
            label: this.getNodeLabel(startNode),
            type: startNode.labels[0] || 'Unknown',
            properties: startNode.properties,
          });
        }

        // Add connected node
        const connectedNode = record.get('connected');
        if (!nodes.has(connectedNode.properties.id)) {
          nodes.set(connectedNode.properties.id, {
            id: connectedNode.properties.id,
            label: this.getNodeLabel(connectedNode),
            type: connectedNode.labels[0] || 'Unknown',
            properties: connectedNode.properties,
          });
        }

        // Add edges
        const rels = record.get('rels');
        for (const rel of rels) {
          edges.push({
            id: rel.properties.id || `${rel.start}-${rel.type}-${rel.end}`,
            source: rel.start.toString(),
            target: rel.end.toString(),
            label: rel.type,
            type: rel.type,
            properties: rel.properties,
          });
        }
      }

      return {
        nodes: Array.from(nodes.values()),
        edges,
      };
    } catch (error) {
      console.error('Subgraph extraction error:', error);
      return { nodes: [], edges: [] };
    } finally {
      await session.close();
    }
  }

  /**
   * Find paths between two nodes
   */
  async findPaths(
    sourceId: string,
    targetId: string,
    maxLength = 5,
  ): Promise<GraphData> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH path = shortestPath((source {id: $sourceId})-[*..${maxLength}]-(target {id: $targetId}))
        RETURN path
        `,
        { sourceId, targetId, maxLength },
      );

      const nodes = new Map<string, any>();
      const edges: GraphData['edges'] = [];

      for (const record of result.records) {
        const path = record.get('path');

        // Extract nodes from path
        for (const node of path.segments.flatMap((s: any) => [s.start, s.end])) {
          if (!nodes.has(node.properties.id)) {
            nodes.set(node.properties.id, {
              id: node.properties.id,
              label: this.getNodeLabel(node),
              type: node.labels[0] || 'Unknown',
              properties: node.properties,
            });
          }
        }

        // Extract relationships from path
        for (const segment of path.segments) {
          edges.push({
            id: segment.relationship.properties.id || `edge-${edges.length}`,
            source: segment.start.properties.id,
            target: segment.end.properties.id,
            label: segment.relationship.type,
            type: segment.relationship.type,
            properties: segment.relationship.properties,
          });
        }
      }

      return {
        nodes: Array.from(nodes.values()),
        edges,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Detect and visualize clusters
   */
  async detectClusters(algorithm: 'louvain' | 'label_propagation' = 'louvain'): Promise<GraphData> {
    const session = this.driver.session();
    try {
      // This requires Neo4j Graph Data Science library
      // Create projection
      await session.run(`
        CALL gds.graph.project(
          'clustersGraph',
          '*',
          '*'
        )
      `);

      // Run clustering algorithm
      const algoQuery =
        algorithm === 'louvain'
          ? `CALL gds.louvain.stream('clustersGraph')`
          : `CALL gds.labelPropagation.stream('clustersGraph')`;

      const result = await session.run(`
        ${algoQuery}
        YIELD nodeId, communityId
        MATCH (n) WHERE id(n) = nodeId
        RETURN n.id as nodeId, communityId
        LIMIT 1000
      `);

      const communities = new Map<number, string[]>();

      for (const record of result.records) {
        const nodeId = record.get('nodeId');
        const communityId = record.get('communityId').toNumber();

        if (!communities.has(communityId)) {
          communities.set(communityId, []);
        }
        communities.get(communityId)!.push(nodeId);
      }

      // Drop projection
      await session.run(`CALL gds.graph.drop('clustersGraph')`);

      const clusters = Array.from(communities.entries()).map(([id, nodes]) => ({
        id: `cluster-${id}`,
        nodes,
        label: `Cluster ${id}`,
      }));

      return {
        nodes: [],
        edges: [],
        clusters,
      };
    } catch (error) {
      console.error('Cluster detection error:', error);
      return { nodes: [], edges: [] };
    } finally {
      await session.close();
    }
  }

  /**
   * Export graph data in various formats
   */
  async exportGraph(
    format: 'json' | 'cytoscape' | 'd3' | 'graphml',
    graphData: GraphData,
  ): Promise<any> {
    switch (format) {
      case 'json':
        return JSON.stringify(graphData, null, 2);

      case 'cytoscape':
        return {
          elements: {
            nodes: graphData.nodes.map((n) => ({ data: n })),
            edges: graphData.edges.map((e) => ({ data: e })),
          },
        };

      case 'd3':
        return {
          nodes: graphData.nodes,
          links: graphData.edges.map((e) => ({
            source: e.source,
            target: e.target,
            ...e,
          })),
        };

      case 'graphml':
        // Generate GraphML XML
        let graphml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        graphml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
        graphml += '  <graph id="G" edgedefault="directed">\n';

        for (const node of graphData.nodes) {
          graphml += `    <node id="${node.id}"/>\n`;
        }

        for (const edge of graphData.edges) {
          graphml += `    <edge source="${edge.source}" target="${edge.target}"/>\n`;
        }

        graphml += '  </graph>\n';
        graphml += '</graphml>';

        return graphml;

      default:
        return graphData;
    }
  }

  /**
   * Get node label for display
   */
  private getNodeLabel(node: any): string {
    const props = node.properties;
    return props.name || props.label || props.id || 'Unknown';
  }
}
