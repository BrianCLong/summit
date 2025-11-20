/**
 * Graph traversal and path finding
 */

import neo4j from 'neo4j-driver';
import type {
  GraphNode,
  GraphRelationship,
  GraphPath,
  TraversalOptions,
  GraphSearchResult,
} from '../types.js';

export class GraphTraversal {
  private driver: any;

  constructor(uri: string, username: string, password: string) {
    this.driver = neo4j.driver(
      uri,
      neo4j.auth.basic(username, password),
    );
  }

  /**
   * Find all paths between two nodes
   */
  async findPaths(
    startNodeId: string,
    endNodeId: string,
    options: TraversalOptions = {},
  ): Promise<GraphPath[]> {
    const session = this.driver.session();

    try {
      const maxDepth = options.maxDepth || 5;
      const relationshipFilter = options.relationshipTypes
        ? `:${options.relationshipTypes.join('|')}`
        : '';

      const query = `
        MATCH path = (start)-[${relationshipFilter}*1..${maxDepth}]-(end)
        WHERE elementId(start) = $startId AND elementId(end) = $endId
        RETURN path
        ${options.limit ? `LIMIT ${options.limit}` : ''}
      `;

      const result = await session.run(query, {
        startId: startNodeId,
        endId: endNodeId,
      });

      const paths: GraphPath[] = [];

      for (const record of result.records) {
        const path = record.get('path');
        const nodes: GraphNode[] = path.segments.map((segment: any) => ({
          id: segment.start.elementId,
          labels: segment.start.labels,
          properties: segment.start.properties,
        }));

        // Add the end node
        const lastSegment = path.segments[path.segments.length - 1];
        nodes.push({
          id: lastSegment.end.elementId,
          labels: lastSegment.end.labels,
          properties: lastSegment.end.properties,
        });

        const relationships: GraphRelationship[] = path.segments.map(
          (segment: any) => ({
            id: segment.relationship.elementId,
            type: segment.relationship.type,
            startNode: segment.start.elementId,
            endNode: segment.end.elementId,
            properties: segment.relationship.properties,
          }),
        );

        paths.push({
          nodes,
          relationships,
          length: path.length,
        });
      }

      return paths;
    } finally {
      await session.close();
    }
  }

  /**
   * Find shortest path between two nodes
   */
  async shortestPath(
    startNodeId: string,
    endNodeId: string,
    options: TraversalOptions = {},
  ): Promise<GraphPath | null> {
    const session = this.driver.session();

    try {
      const maxDepth = options.maxDepth || 15;
      const relationshipFilter = options.relationshipTypes
        ? `:${options.relationshipTypes.join('|')}`
        : '';

      const query = `
        MATCH path = shortestPath((start)-[${relationshipFilter}*..${maxDepth}]-(end))
        WHERE elementId(start) = $startId AND elementId(end) = $endId
        RETURN path
      `;

      const result = await session.run(query, {
        startId: startNodeId,
        endId: endNodeId,
      });

      if (result.records.length === 0) {
        return null;
      }

      const path = result.records[0].get('path');
      const nodes: GraphNode[] = path.segments.map((segment: any) => ({
        id: segment.start.elementId,
        labels: segment.start.labels,
        properties: segment.start.properties,
      }));

      const lastSegment = path.segments[path.segments.length - 1];
      nodes.push({
        id: lastSegment.end.elementId,
        labels: lastSegment.end.labels,
        properties: lastSegment.end.properties,
      });

      const relationships: GraphRelationship[] = path.segments.map(
        (segment: any) => ({
          id: segment.relationship.elementId,
          type: segment.relationship.type,
          startNode: segment.start.elementId,
          endNode: segment.end.elementId,
          properties: segment.relationship.properties,
        }),
      );

      return {
        nodes,
        relationships,
        length: path.length,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Expand from a node (get neighborhood)
   */
  async expand(
    nodeId: string,
    options: TraversalOptions = {},
  ): Promise<GraphSearchResult> {
    const session = this.driver.session();

    try {
      const depth = options.maxDepth || 1;
      const direction = options.direction || 'both';
      const relationshipFilter = options.relationshipTypes
        ? `:${options.relationshipTypes.join('|')}`
        : '';

      let relationshipPattern = '';
      switch (direction) {
        case 'outgoing':
          relationshipPattern = `-[${relationshipFilter}*1..${depth}]->`;
          break;
        case 'incoming':
          relationshipPattern = `<-[${relationshipFilter}*1..${depth}]-`;
          break;
        case 'both':
        default:
          relationshipPattern = `-[${relationshipFilter}*1..${depth}]-`;
          break;
      }

      const query = `
        MATCH path = (start)${relationshipPattern}(connected)
        WHERE elementId(start) = $nodeId
        RETURN DISTINCT connected, relationships(path) AS rels
        ${options.limit ? `LIMIT ${options.limit}` : ''}
      `;

      const startTime = Date.now();
      const result = await session.run(query, { nodeId });

      const nodes: GraphNode[] = [];
      const relationships: GraphRelationship[] = [];
      const seenNodes = new Set<string>();
      const seenRels = new Set<string>();

      for (const record of result.records) {
        const node = record.get('connected');
        const rels = record.get('rels');

        const nodeId = node.elementId;
        if (!seenNodes.has(nodeId)) {
          nodes.push({
            id: nodeId,
            labels: node.labels,
            properties: node.properties,
          });
          seenNodes.add(nodeId);
        }

        for (const rel of rels) {
          const relId = rel.elementId;
          if (!seenRels.has(relId)) {
            relationships.push({
              id: relId,
              type: rel.type,
              startNode: rel.start.elementId,
              endNode: rel.end.elementId,
              properties: rel.properties,
            });
            seenRels.add(relId);
          }
        }
      }

      return {
        nodes,
        relationships,
        metadata: {
          executionTime: Date.now() - startTime,
          resultCount: nodes.length,
          queryType: 'expand',
        },
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Find nodes by pattern
   */
  async findNodesByPattern(
    pattern: {
      labels?: string[];
      properties?: Record<string, any>;
    },
    limit: number = 100,
  ): Promise<GraphNode[]> {
    const session = this.driver.session();

    try {
      const labelPattern = pattern.labels ? `:${pattern.labels.join(':')}` : '';
      const propConditions = pattern.properties
        ? Object.entries(pattern.properties)
            .map(([key, value]) => `n.${key} = $${key}`)
            .join(' AND ')
        : '';

      const query = `
        MATCH (n${labelPattern})
        ${propConditions ? `WHERE ${propConditions}` : ''}
        RETURN n
        LIMIT ${limit}
      `;

      const result = await session.run(query, pattern.properties || {});

      return result.records.map((record) => {
        const node = record.get('n');
        return {
          id: node.elementId,
          labels: node.labels,
          properties: node.properties,
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Close driver connection
   */
  async close(): Promise<void> {
    await this.driver.close();
  }
}
