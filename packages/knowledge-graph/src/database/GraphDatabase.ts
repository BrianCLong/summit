/**
 * Core graph database implementation with support for multiple backends
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import { GraphDatabaseConfig, GraphNode, GraphEdge, GraphQuery, QueryResult } from '../types.js';
import { Logger } from '../utils/Logger.js';

export class GraphDatabase {
  private driver: Driver | null = null;
  private config: GraphDatabaseConfig;
  private logger: Logger;

  constructor(config: GraphDatabaseConfig) {
    this.config = config;
    this.logger = new Logger('GraphDatabase');
  }

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    try {
      if (this.config.type === 'neo4j') {
        this.driver = neo4j.driver(
          this.config.uri || 'bolt://localhost:7687',
          neo4j.auth.basic(
            this.config.auth?.username || 'neo4j',
            this.config.auth?.password || 'password'
          ),
          {
            maxConnectionPoolSize: this.config.maxConnectionPoolSize || 50,
            connectionTimeout: this.config.connectionTimeout || 30000,
            encrypted: this.config.encrypted !== false ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF'
          }
        );

        // Verify connectivity
        await this.driver.verifyConnectivity();
        this.logger.info('Successfully connected to Neo4j database');
      } else {
        throw new Error(`Database type ${this.config.type} not yet implemented`);
      }
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.logger.info('Disconnected from database');
    }
  }

  /**
   * Get a new session
   */
  private getSession(): Session {
    if (!this.driver) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.driver.session({
      database: this.config.database || 'neo4j'
    });
  }

  /**
   * Add a node to the graph
   */
  async addNode(node: GraphNode): Promise<string> {
    const session = this.getSession();
    try {
      const labels = node.labels?.join(':') || node.type;
      const query = `
        CREATE (n:${labels} $properties)
        RETURN elementId(n) as id
      `;

      const result = await session.run(query, {
        properties: {
          ...node.properties,
          nodeId: node.id,
          createdAt: node.metadata?.createdAt?.toISOString() || new Date().toISOString()
        }
      });

      return result.records[0].get('id');
    } finally {
      await session.close();
    }
  }

  /**
   * Add an edge to the graph
   */
  async addEdge(edge: GraphEdge): Promise<string> {
    const session = this.getSession();
    try {
      const query = `
        MATCH (from), (to)
        WHERE from.nodeId = $fromId AND to.nodeId = $toId
        CREATE (from)-[r:${edge.type} $properties]->(to)
        RETURN elementId(r) as id
      `;

      const result = await session.run(query, {
        fromId: edge.from,
        toId: edge.to,
        properties: {
          ...edge.properties,
          weight: edge.weight || 1.0,
          createdAt: edge.metadata?.createdAt?.toISOString() || new Date().toISOString()
        }
      });

      return result.records[0].get('id');
    } finally {
      await session.close();
    }
  }

  /**
   * Get a node by ID
   */
  async getNode(id: string): Promise<GraphNode | null> {
    const session = this.getSession();
    try {
      const query = `
        MATCH (n)
        WHERE n.nodeId = $id
        RETURN n, labels(n) as labels
      `;

      const result = await session.run(query, { id });

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const node = record.get('n');
      const labels = record.get('labels');

      return {
        id: node.properties.nodeId,
        type: labels[0] || 'Node',
        labels,
        properties: node.properties,
        metadata: {
          createdAt: new Date(node.properties.createdAt),
          updatedAt: node.properties.updatedAt ? new Date(node.properties.updatedAt) : undefined
        }
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Update a node
   */
  async updateNode(id: string, properties: Record<string, any>): Promise<void> {
    const session = this.getSession();
    try {
      const query = `
        MATCH (n)
        WHERE n.nodeId = $id
        SET n += $properties, n.updatedAt = datetime()
      `;

      await session.run(query, { id, properties });
    } finally {
      await session.close();
    }
  }

  /**
   * Delete a node
   */
  async deleteNode(id: string): Promise<void> {
    const session = this.getSession();
    try {
      const query = `
        MATCH (n)
        WHERE n.nodeId = $id
        DETACH DELETE n
      `;

      await session.run(query, { id });
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a Cypher query
   */
  async query<T = any>(query: string, params?: Record<string, any>): Promise<QueryResult<T>> {
    const session = this.getSession();
    const startTime = Date.now();

    try {
      const result = await session.run(query, params);
      const executionTime = Date.now() - startTime;

      const data = result.records.map(record => {
        const obj: any = {};
        record.keys.forEach(key => {
          const value = record.get(key);
          obj[key] = this.convertNeo4jValue(value);
        });
        return obj;
      });

      return {
        data,
        metadata: {
          count: data.length,
          executionTime,
          cached: false
        }
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a structured query
   */
  async executeQuery(graphQuery: GraphQuery): Promise<QueryResult> {
    // Convert structured query to Cypher
    const cypher = this.buildCypherQuery(graphQuery);
    return this.query(cypher);
  }

  /**
   * Build Cypher query from structured query
   */
  private buildCypherQuery(graphQuery: GraphQuery): string {
    const parts: string[] = [];

    // MATCH clause
    if (graphQuery.match) {
      if (typeof graphQuery.match === 'string') {
        parts.push(`MATCH ${graphQuery.match}`);
      } else {
        // Build from pattern
        const pattern = this.buildPattern(graphQuery.match);
        parts.push(`MATCH ${pattern}`);
      }
    }

    // WHERE clause
    if (graphQuery.where) {
      const conditions = Object.entries(graphQuery.where)
        .map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            return this.buildCondition(key, value);
          }
          return `${key} = ${JSON.stringify(value)}`;
        });
      parts.push(`WHERE ${conditions.join(' AND ')}`);
    }

    // RETURN clause
    if (graphQuery.return) {
      parts.push(`RETURN ${graphQuery.return.join(', ')}`);
    }

    // ORDER BY clause
    if (graphQuery.orderBy) {
      const orderClauses = graphQuery.orderBy
        .map(o => `${o.field} ${o.direction}`)
        .join(', ');
      parts.push(`ORDER BY ${orderClauses}`);
    }

    // SKIP clause
    if (graphQuery.skip !== undefined) {
      parts.push(`SKIP ${graphQuery.skip}`);
    }

    // LIMIT clause
    if (graphQuery.limit !== undefined) {
      parts.push(`LIMIT ${graphQuery.limit}`);
    }

    return parts.join('\n');
  }

  /**
   * Build graph pattern for Cypher
   */
  private buildPattern(pattern: any): string {
    // Simplified pattern building
    return '(n)';
  }

  /**
   * Build condition for WHERE clause
   */
  private buildCondition(field: string, condition: any): string {
    if (condition.$gt !== undefined) {
      return `${field} > ${condition.$gt}`;
    }
    if (condition.$lt !== undefined) {
      return `${field} < ${condition.$lt}`;
    }
    if (condition.$gte !== undefined) {
      return `${field} >= ${condition.$gte}`;
    }
    if (condition.$lte !== undefined) {
      return `${field} <= ${condition.$lte}`;
    }
    if (condition.$in !== undefined) {
      return `${field} IN [${condition.$in.map((v: any) => JSON.stringify(v)).join(', ')}]`;
    }
    return `${field} = ${JSON.stringify(condition)}`;
  }

  /**
   * Convert Neo4j values to JavaScript
   */
  private convertNeo4jValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (neo4j.isInt(value)) {
      return value.toNumber();
    }

    if (value instanceof neo4j.types.Node) {
      return {
        id: value.elementId,
        labels: value.labels,
        properties: value.properties
      };
    }

    if (value instanceof neo4j.types.Relationship) {
      return {
        id: value.elementId,
        type: value.type,
        properties: value.properties,
        startNodeElementId: value.startNodeElementId,
        endNodeElementId: value.endNodeElementId
      };
    }

    if (Array.isArray(value)) {
      return value.map(v => this.convertNeo4jValue(v));
    }

    if (typeof value === 'object') {
      const converted: any = {};
      for (const [k, v] of Object.entries(value)) {
        converted[k] = this.convertNeo4jValue(v);
      }
      return converted;
    }

    return value;
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<any> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->()
        RETURN
          count(DISTINCT n) as nodeCount,
          count(r) as edgeCount,
          collect(DISTINCT labels(n)) as nodeTypes,
          collect(DISTINCT type(r)) as edgeTypes
      `);

      const record = result.records[0];
      return {
        nodeCount: record.get('nodeCount').toNumber(),
        edgeCount: record.get('edgeCount').toNumber(),
        nodeTypes: record.get('nodeTypes'),
        edgeTypes: record.get('edgeTypes')
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Create an index
   */
  async createIndex(label: string, properties: string[]): Promise<void> {
    const session = this.getSession();
    try {
      const indexName = `idx_${label}_${properties.join('_')}`;
      const query = `
        CREATE INDEX ${indexName} IF NOT EXISTS
        FOR (n:${label})
        ON (${properties.map(p => `n.${p}`).join(', ')})
      `;

      await session.run(query);
      this.logger.info(`Created index ${indexName}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.driver) {
        return false;
      }
      await this.driver.verifyConnectivity();
      return true;
    } catch {
      return false;
    }
  }
}
