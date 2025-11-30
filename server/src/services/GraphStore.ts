import { Driver, Node, Relationship as Neo4jRelationship } from 'neo4j-driver';
import { getNeo4jDriver } from '../db/neo4j';
import { provLedgerClient } from '../lib/prov-ledger.js';
import logger from '../utils/logger.js';

export interface Entity {
  id: string;
  type: string;
  value: string;
  label?: string;
  provenanceId?: string;
}

export interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  since?: string;
  until?: string;
  provenanceId?: string;
}

export interface GraphStore {
  getEntities(
    filters: Partial<{ type: string; q: string; limit: number }>,
  ): Promise<Entity[]>;
  getRelationships(entityId: string): Promise<Relationship[]>;
  upsertEntity(e: Entity): Promise<Entity>;
  upsertRelationship(r: Relationship): Promise<Relationship>;
  deleteEntity(id: string): Promise<void>;
  deleteRelationship(id: string): Promise<void>;
}

function nodeToEntity(node: Node): Entity {
  const props: any = node.properties;
  return {
    id: props.id,
    type: props.type,
    value: props.value,
    label: props.label,
    provenanceId: props.provenanceId,
  };
}

function relToRelationship(rel: Neo4jRelationship): Relationship {
  const props: any = rel.properties;
  return {
    id: props.id,
    fromId: props.fromId,
    toId: props.toId,
    type: props.type,
    since: props.since,
    until: props.until,
    provenanceId: props.provenanceId,
  };
}

export function createGraphStore(
  driver: Driver = getNeo4jDriver(),
): GraphStore {
  return {
    async getEntities(filters = {}) {
      const session = driver.session();
      const { type = null, q = null, limit = 25 } = filters;
      try {
        if (q) {
          const res = await session.run(
            `CALL db.index.fulltext.queryNodes('entity_fulltext', $q) YIELD node WHERE $type IS NULL OR node.type = $type RETURN node LIMIT $limit`,
            { q, type, limit },
          );
          return res.records.map((r) => nodeToEntity(r.get('node')));
        }
        const res = await session.run(
          `MATCH (e:Entity) WHERE $type IS NULL OR e.type = $type RETURN e LIMIT $limit`,
          { type, limit },
        );
        return res.records.map((r) => nodeToEntity(r.get('e')));
      } finally {
        await session.close();
      }
    },

    async getRelationships(entityId: string) {
      const session = driver.session();
      try {
        const res = await session.run(
          `MATCH (:Entity {id: $id})-[r:RELATIONSHIP]-(:Entity) RETURN r`,
          { id: entityId },
        );
        return res.records.map((r) => relToRelationship(r.get('r')));
      } finally {
        await session.close();
      }
    },

    async upsertEntity(e: Entity) {
      const session = driver.session();
      let provenanceId = e.provenanceId;

      if (!provenanceId) {
        try {
          const claim = await provLedgerClient.createClaim({
            content: {
              type: e.type,
              value: e.value,
              label: e.label,
              entityId: e.id,
            },
            metadata: {
              source: 'GraphStore.upsertEntity',
            },
          });
          provenanceId = claim.id;
        } catch (err) {
          logger.error('Failed to create claim for entity', { error: err, entityId: e.id });
          // Fallback: proceed without provenance ID if ledger is down (or should we block?)
          // For RC, we should probably proceed but log.
        }
      }

      const entityWithProv = { ...e, provenanceId };

      try {
        const res = await session.writeTransaction((tx) =>
          tx.run(
            `MERGE (n:Entity {id: $id})
             ON CREATE SET n.type=$type, n.value=$value, n.label=$label, n.provenanceId=$provenanceId, n.createdAt=timestamp()
             ON MATCH SET n.type=$type, n.value=$value, n.label=$label, n.provenanceId=$provenanceId, n.updatedAt=timestamp()
             RETURN n`,
            entityWithProv,
          ),
        );
        return nodeToEntity(res.records[0].get('n'));
      } finally {
        await session.close();
      }
    },

    async upsertRelationship(r: Relationship) {
      const session = driver.session();
      let provenanceId = r.provenanceId;

      if (!provenanceId) {
        try {
          const claim = await provLedgerClient.createClaim({
            content: {
              type: r.type,
              fromId: r.fromId,
              toId: r.toId,
              relationshipId: r.id,
            },
            metadata: {
              source: 'GraphStore.upsertRelationship',
            },
          });
          provenanceId = claim.id;
        } catch (err) {
          logger.error('Failed to create claim for relationship', { error: err, relId: r.id });
        }
      }

      const relWithProv = { ...r, provenanceId };

      try {
        const res = await session.writeTransaction((tx) =>
          tx.run(
            `MATCH (a:Entity {id: $fromId}), (b:Entity {id: $toId})
             MERGE (a)-[rel:RELATIONSHIP {id: $id}]->(b)
             ON CREATE SET rel.type=$type, rel.fromId=$fromId, rel.toId=$toId, rel.since=$since, rel.until=$until, rel.provenanceId=$provenanceId, rel.createdAt=timestamp()
             ON MATCH SET rel.type=$type, rel.since=$since, rel.until=$until, rel.provenanceId=$provenanceId, rel.updatedAt=timestamp()
             RETURN rel`,
            relWithProv,
          ),
        );
        return relToRelationship(res.records[0].get('rel'));
      } finally {
        await session.close();
      }
    },

    async deleteEntity(id: string) {
      const session = driver.session();
      try {
        await session.writeTransaction((tx) =>
          tx.run(`MATCH (n:Entity {id: $id}) DETACH DELETE n`, { id }),
        );
      } finally {
        await session.close();
      }
    },

    async deleteRelationship(id: string) {
      const session = driver.session();
      try {
        await session.writeTransaction((tx) =>
          tx.run(`MATCH ()-[r:RELATIONSHIP {id: $id}]-() DELETE r`, { id }),
        );
      } finally {
        await session.close();
      }
    },
  };
}
