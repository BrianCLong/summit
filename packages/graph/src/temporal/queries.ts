import { Neo4jClient } from '../neo4j-client.js';

export class TemporalGraphQueries {
  constructor(private neo4j: Neo4jClient) {}

  // Point-in-time query
  async getEntityAtTime(entityId: string, timestamp: Date) {
    return this.neo4j.run(`
      MATCH (e:Entity {id: $entityId})-[:HAS_VERSION]->(v:EntityVersion)
      WHERE v.valid_from <= datetime($timestamp)
        AND v.valid_to > datetime($timestamp)
      RETURN v.data as data, v.evidence_id as evidenceId
    `, { entityId, timestamp: timestamp.toISOString() });
  }

  // Time-travel relationship query
  async getRelationshipsAtTime(
    entityId: string,
    timestamp: Date,
    relType?: string
  ) {
    return this.neo4j.run(`
      MATCH (e1:Entity {id: $entityId})-[:HAS_VERSION]->(v1:EntityVersion)
      MATCH (v1)-[r:${relType || ''}]->(v2:EntityVersion)<-[:HAS_VERSION]-(e2:Entity)
      WHERE v1.valid_from <= datetime($timestamp)
        AND v1.valid_to > datetime($timestamp)
        AND v2.valid_from <= datetime($timestamp)
        AND v2.valid_to > datetime($timestamp)
      RETURN e2.id as targetId, type(r) as relType, r.properties as props
    `, { entityId, timestamp: timestamp.toISOString() });
  }

  // Temporal diff - what changed between two timestamps
  async getChangesBetween(
    entityId: string,
    startTime: Date,
    endTime: Date
  ) {
    return this.neo4j.run(`
      MATCH (e:Entity {id: $entityId})-[:HAS_VERSION]->(v:EntityVersion)
      WHERE v.valid_from > datetime($start)
        AND v.valid_from <= datetime($end)
      RETURN v ORDER BY v.valid_from
    `, {
      entityId,
      start: startTime.toISOString(),
      end: endTime.toISOString()
    });
  }
}
