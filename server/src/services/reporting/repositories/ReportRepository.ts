/**
 * Report Repository
 * Data access layer for report-related Neo4j queries
 */

import type { Report, ReportSection } from '../types/index.js';

interface Neo4jSession {
  run(query: string, params?: Record<string, any>): Promise<any>;
  close(): Promise<void>;
}

interface Neo4jDriver {
  session(): Neo4jSession;
}

interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug?(message: string, ...args: any[]): void;
}

export class ReportRepository {
  constructor(
    private neo4jDriver: Neo4jDriver,
    private logger: Logger = { info: () => {}, error: () => {}, warn: () => {} },
  ) {}

  /**
   * Get investigation data for reports
   */
  async getInvestigation(investigationId: string): Promise<any> {
    const session = this.neo4jDriver.session();
    try {
      const query = `
        MATCH (i:Investigation {id: $investigationId})
        RETURN i
      `;
      const result = await session.run(query, { investigationId });
      const record = result.records[0];
      return record ? record.get('i').properties : null;
    } catch (error) {
      this.logger.error(`Failed to get investigation: ${investigationId}`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Get entity counts for investigation
   */
  async getEntityCounts(investigationId: string): Promise<{ totalEntities: number; entityTypes: number }> {
    const session = this.neo4jDriver.session();
    try {
      const query = `
        MATCH (e:MultimodalEntity {investigationId: $investigationId})
        RETURN count(e) as totalEntities,
               count(DISTINCT e.type) as entityTypes
      `;
      const result = await session.run(query, { investigationId });
      const record = result.records[0];
      return {
        totalEntities: record?.get('totalEntities')?.toNumber?.() || 0,
        entityTypes: record?.get('entityTypes')?.toNumber?.() || 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get relationship counts for investigation
   */
  async getRelationshipCounts(investigationId: string): Promise<{ totalRelationships: number; relationshipTypes: number }> {
    const session = this.neo4jDriver.session();
    try {
      const query = `
        MATCH (a:MultimodalEntity {investigationId: $investigationId})-[r]-(b:MultimodalEntity)
        RETURN count(r) as totalRelationships,
               count(DISTINCT type(r)) as relationshipTypes
      `;
      const result = await session.run(query, { investigationId });
      const record = result.records[0];
      return {
        totalRelationships: record?.get('totalRelationships')?.toNumber?.() || 0,
        relationshipTypes: record?.get('relationshipTypes')?.toNumber?.() || 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get key entities for investigation (ordered by connection count)
   */
  async getKeyEntities(
    investigationId: string,
    limit: number = 20,
  ): Promise<any[]> {
    const session = this.neo4jDriver.session();
    try {
      const query = `
        MATCH (e:MultimodalEntity {investigationId: $investigationId})
        OPTIONAL MATCH (e)-[r]-()
        WITH e, count(r) as connectionCount
        ORDER BY connectionCount DESC
        LIMIT $limit
        RETURN e, connectionCount
      `;
      const result = await session.run(query, { investigationId, limit });
      return result.records.map((record: any) => ({
        ...record.get('e').properties,
        connectionCount: record.get('connectionCount').toNumber?.() || 0,
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Get timeline events for investigation
   */
  async getTimelineEvents(
    investigationId: string,
    options?: { startDate?: Date; endDate?: Date; limit?: number },
  ): Promise<any[]> {
    const session = this.neo4jDriver.session();
    try {
      let timeFilter = '';
      const params: Record<string, any> = { investigationId };

      if (options?.startDate) {
        timeFilter += ' AND e.createdAt >= $startDate';
        params.startDate = options.startDate.toISOString();
      }
      if (options?.endDate) {
        timeFilter += ' AND e.createdAt <= $endDate';
        params.endDate = options.endDate.toISOString();
      }

      const limit = options?.limit || 100;
      params.limit = limit;

      const query = `
        MATCH (e:MultimodalEntity {investigationId: $investigationId})
        WHERE e.createdAt IS NOT NULL ${timeFilter}
        WITH e
        ORDER BY e.createdAt ASC
        LIMIT $limit
        RETURN
          e.createdAt as timestamp,
          e.id as entityId,
          e.label as entityLabel,
          e.type as entityType,
          'ENTITY_CREATED' as eventType
      `;

      const result = await session.run(query, params);
      return result.records.map((record: any) => ({
        timestamp: record.get('timestamp'),
        entityId: record.get('entityId'),
        entityLabel: record.get('entityLabel'),
        entityType: record.get('entityType'),
        eventType: record.get('eventType'),
        description: `${record.get('entityType')} entity "${record.get('entityLabel')}" was created`,
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Get entity connections
   */
  async getEntityConnections(entityId: string, limit: number = 10): Promise<any[]> {
    const session = this.neo4jDriver.session();
    try {
      const query = `
        MATCH (e:MultimodalEntity {id: $entityId})-[r]-(connected)
        RETURN type(r) as relationshipType,
               r as relationship,
               connected as connectedEntity
        LIMIT $limit
      `;
      const result = await session.run(query, { entityId, limit });
      return result.records.map((record: any) => ({
        relationshipType: record.get('relationshipType'),
        relationship: record.get('relationship')?.properties,
        connectedEntity: record.get('connectedEntity')?.properties,
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Get entity by ID
   */
  async getEntity(entityId: string): Promise<any> {
    const session = this.neo4jDriver.session();
    try {
      const query = `
        MATCH (e:MultimodalEntity {id: $entityId})
        RETURN e
      `;
      const result = await session.run(query, { entityId });
      const record = result.records[0];
      return record ? record.get('e').properties : null;
    } finally {
      await session.close();
    }
  }

  /**
   * Get network analysis data
   */
  async getNetworkData(investigationId: string): Promise<{ nodes: any[]; edges: any[] }> {
    const session = this.neo4jDriver.session();
    try {
      // Get nodes
      const nodesQuery = `
        MATCH (e:MultimodalEntity {investigationId: $investigationId})
        OPTIONAL MATCH (e)-[r]-()
        WITH e, count(r) as connectionCount
        RETURN e as node, connectionCount
      `;
      const nodesResult = await session.run(nodesQuery, { investigationId });
      const nodes = nodesResult.records.map((record: any) => ({
        ...record.get('node').properties,
        connections: record.get('connectionCount').toNumber?.() || 0,
      }));

      // Get edges
      const edgesQuery = `
        MATCH (a:MultimodalEntity {investigationId: $investigationId})-[r]-(b:MultimodalEntity)
        WHERE id(a) < id(b)
        RETURN a.id as source, b.id as target, type(r) as type, r.weight as weight
      `;
      const edgesResult = await session.run(edgesQuery, { investigationId });
      const edges = edgesResult.records.map((record: any) => ({
        source: record.get('source'),
        target: record.get('target'),
        type: record.get('type'),
        weight: record.get('weight') || 1,
      }));

      return { nodes, edges };
    } finally {
      await session.close();
    }
  }

  /**
   * Perform a health check query
   */
  async healthCheck(): Promise<boolean> {
    const session = this.neo4jDriver.session();
    try {
      await session.run('RETURN 1');
      return true;
    } catch {
      return false;
    } finally {
      await session.close();
    }
  }
}
