/**
 * Temporal Knowledge Graph Support
 */

import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';

export interface TemporalEntity {
  entityId: string;
  validFrom: string;
  validTo?: string;
  properties: Record<string, any>;
  version: number;
}

export interface TemporalRelationship {
  relationshipId: string;
  sourceId: string;
  targetId: string;
  type: string;
  validFrom: string;
  validTo?: string;
  properties: Record<string, any>;
}

export class TemporalKnowledgeGraph {
  constructor(private driver: Driver) {}

  /**
   * Create a temporal snapshot of an entity
   */
  async createTemporalSnapshot(
    entityId: string,
    validFrom: string,
    properties: Record<string, any>,
    validTo?: string,
  ): Promise<TemporalEntity> {
    const session = this.driver.session();
    try {
      // Get current version
      const versionResult = await session.run(
        `
        MATCH (e {id: $entityId})-[:HAS_SNAPSHOT]->(s:TemporalSnapshot)
        RETURN max(s.version) as maxVersion
        `,
        { entityId },
      );

      const maxVersion = versionResult.records[0]?.get('maxVersion') || 0;
      const newVersion = maxVersion + 1;

      // Create new snapshot
      await session.run(
        `
        MATCH (e {id: $entityId})
        CREATE (e)-[:HAS_SNAPSHOT]->(s:TemporalSnapshot {
          id: $snapshotId,
          validFrom: datetime($validFrom),
          validTo: $validTo,
          properties: $properties,
          version: $version,
          createdAt: datetime()
        })
        `,
        {
          entityId,
          snapshotId: uuidv4(),
          validFrom,
          validTo: validTo ? `datetime(${validTo})` : null,
          properties: JSON.stringify(properties),
          version: newVersion,
        },
      );

      return {
        entityId,
        validFrom,
        validTo,
        properties,
        version: newVersion,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Query entity state at a specific point in time
   */
  async getEntityAtTime(entityId: string, timestamp: string): Promise<TemporalEntity | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e {id: $entityId})-[:HAS_SNAPSHOT]->(s:TemporalSnapshot)
        WHERE s.validFrom <= datetime($timestamp)
          AND (s.validTo IS NULL OR s.validTo > datetime($timestamp))
        RETURN s
        ORDER BY s.version DESC
        LIMIT 1
        `,
        { entityId, timestamp },
      );

      if (result.records.length === 0) {
        return null;
      }

      const snapshot = result.records[0].get('s').properties;

      return {
        entityId,
        validFrom: snapshot.validFrom.toString(),
        validTo: snapshot.validTo?.toString(),
        properties: JSON.parse(snapshot.properties),
        version: snapshot.version.toNumber(),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get entity history (all snapshots)
   */
  async getEntityHistory(entityId: string): Promise<TemporalEntity[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e {id: $entityId})-[:HAS_SNAPSHOT]->(s:TemporalSnapshot)
        RETURN s
        ORDER BY s.version ASC
        `,
        { entityId },
      );

      return result.records.map((record) => {
        const snapshot = record.get('s').properties;
        return {
          entityId,
          validFrom: snapshot.validFrom.toString(),
          validTo: snapshot.validTo?.toString(),
          properties: JSON.parse(snapshot.properties),
          version: snapshot.version.toNumber(),
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Create temporal relationship
   */
  async createTemporalRelationship(
    sourceId: string,
    targetId: string,
    type: string,
    validFrom: string,
    properties: Record<string, any>,
    validTo?: string,
  ): Promise<TemporalRelationship> {
    const session = this.driver.session();
    try {
      const relationshipId = uuidv4();

      await session.run(
        `
        MATCH (source {id: $sourceId})
        MATCH (target {id: $targetId})
        CREATE (source)-[r:${type.toUpperCase().replace(/[^A-Z0-9_]/g, '_')} {
          id: $relationshipId,
          validFrom: datetime($validFrom),
          validTo: $validTo,
          properties: $properties,
          temporal: true,
          createdAt: datetime()
        }]->(target)
        `,
        {
          sourceId,
          targetId,
          relationshipId,
          validFrom,
          validTo: validTo ? `datetime(${validTo})` : null,
          properties: JSON.stringify(properties),
        },
      );

      return {
        relationshipId,
        sourceId,
        targetId,
        type,
        validFrom,
        validTo,
        properties,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Query relationships valid at a specific time
   */
  async getRelationshipsAtTime(
    entityId: string,
    timestamp: string,
  ): Promise<TemporalRelationship[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e {id: $entityId})-[r]-(other)
        WHERE r.temporal = true
          AND r.validFrom <= datetime($timestamp)
          AND (r.validTo IS NULL OR r.validTo > datetime($timestamp))
        RETURN r, type(r) as relType,
               startNode(r).id as sourceId,
               endNode(r).id as targetId
        `,
        { entityId, timestamp },
      );

      return result.records.map((record) => {
        const rel = record.get('r').properties;
        return {
          relationshipId: rel.id,
          sourceId: record.get('sourceId'),
          targetId: record.get('targetId'),
          type: record.get('relType'),
          validFrom: rel.validFrom.toString(),
          validTo: rel.validTo?.toString(),
          properties: JSON.parse(rel.properties),
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Query entities that changed within a time range
   */
  async getChangesInTimeRange(
    startTime: string,
    endTime: string,
  ): Promise<TemporalEntity[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e)-[:HAS_SNAPSHOT]->(s:TemporalSnapshot)
        WHERE s.validFrom >= datetime($startTime)
          AND s.validFrom <= datetime($endTime)
        RETURN e.id as entityId, s
        ORDER BY s.validFrom DESC
        `,
        { startTime, endTime },
      );

      return result.records.map((record) => {
        const snapshot = record.get('s').properties;
        return {
          entityId: record.get('entityId'),
          validFrom: snapshot.validFrom.toString(),
          validTo: snapshot.validTo?.toString(),
          properties: JSON.parse(snapshot.properties),
          version: snapshot.version.toNumber(),
        };
      });
    } finally {
      await session.close();
    }
  }
}
