/**
 * Data lineage and provenance tracking system
 */

import { Logger } from 'winston';

export interface LineageNode {
  id: string;
  type: 'source' | 'transformation' | 'target';
  name: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface LineageEdge {
  from: string;
  to: string;
  transformationType: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export interface ColumnLineage {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  transformations: string[];
  timestamp: Date;
}

export class LineageTracker {
  private logger: Logger;
  private lineageGraph: LineageGraph;

  constructor(logger: Logger) {
    this.logger = logger;
    this.lineageGraph = {
      nodes: [],
      edges: []
    };
  }

  /**
   * Track data source
   */
  trackSource(sourceId: string, sourceName: string, metadata: Record<string, any>): void {
    const node: LineageNode = {
      id: sourceId,
      type: 'source',
      name: sourceName,
      metadata,
      timestamp: new Date()
    };

    this.lineageGraph.nodes.push(node);
    this.logger.debug(`Tracked data source: ${sourceName}`);
  }

  /**
   * Track transformation
   */
  trackTransformation(
    transformationId: string,
    transformationName: string,
    sourceId: string,
    metadata: Record<string, any>
  ): void {
    const node: LineageNode = {
      id: transformationId,
      type: 'transformation',
      name: transformationName,
      metadata,
      timestamp: new Date()
    };

    const edge: LineageEdge = {
      from: sourceId,
      to: transformationId,
      transformationType: transformationName,
      metadata,
      timestamp: new Date()
    };

    this.lineageGraph.nodes.push(node);
    this.lineageGraph.edges.push(edge);

    this.logger.debug(`Tracked transformation: ${transformationName}`);
  }

  /**
   * Track target
   */
  trackTarget(
    targetId: string,
    targetName: string,
    sourceId: string,
    metadata: Record<string, any>
  ): void {
    const node: LineageNode = {
      id: targetId,
      type: 'target',
      name: targetName,
      metadata,
      timestamp: new Date()
    };

    const edge: LineageEdge = {
      from: sourceId,
      to: targetId,
      transformationType: 'load',
      metadata,
      timestamp: new Date()
    };

    this.lineageGraph.nodes.push(node);
    this.lineageGraph.edges.push(edge);

    this.logger.debug(`Tracked target: ${targetName}`);
  }

  /**
   * Track column-level lineage
   */
  trackColumnLineage(columnLineage: ColumnLineage): void {
    this.logger.debug(
      `Tracked column lineage: ${columnLineage.sourceTable}.${columnLineage.sourceColumn} -> ${columnLineage.targetTable}.${columnLineage.targetColumn}`
    );
  }

  /**
   * Get lineage graph
   */
  getLineageGraph(): LineageGraph {
    return { ...this.lineageGraph };
  }

  /**
   * Get upstream lineage (sources)
   */
  getUpstreamLineage(nodeId: string): LineageNode[] {
    const upstream: LineageNode[] = [];
    const visited = new Set<string>();

    const traverse = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const incomingEdges = this.lineageGraph.edges.filter(edge => edge.to === currentId);

      for (const edge of incomingEdges) {
        const node = this.lineageGraph.nodes.find(n => n.id === edge.from);
        if (node) {
          upstream.push(node);
          traverse(edge.from);
        }
      }
    };

    traverse(nodeId);
    return upstream;
  }

  /**
   * Get downstream lineage (targets)
   */
  getDownstreamLineage(nodeId: string): LineageNode[] {
    const downstream: LineageNode[] = [];
    const visited = new Set<string>();

    const traverse = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const outgoingEdges = this.lineageGraph.edges.filter(edge => edge.from === currentId);

      for (const edge of outgoingEdges) {
        const node = this.lineageGraph.nodes.find(n => n.id === edge.to);
        if (node) {
          downstream.push(node);
          traverse(edge.to);
        }
      }
    };

    traverse(nodeId);
    return downstream;
  }

  /**
   * Get impact analysis - what would be affected if this node changes
   */
  getImpactAnalysis(nodeId: string): {
    affectedNodes: LineageNode[];
    affectedCount: number;
  } {
    const downstream = this.getDownstreamLineage(nodeId);

    return {
      affectedNodes: downstream,
      affectedCount: downstream.length
    };
  }

  /**
   * Persist lineage to database (Neo4j or PostgreSQL)
   */
  async persistLineage(): Promise<void> {
    // Would implement persistence to graph database (Neo4j) or relational database
    this.logger.info('Lineage persistence not yet implemented');
  }

  /**
   * Clear lineage graph
   */
  clear(): void {
    this.lineageGraph = {
      nodes: [],
      edges: []
    };
  }
}
