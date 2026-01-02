// @ts-nocheck
import { neo4jDriver } from '../db/neo4j.js';
import { randomUUID } from 'crypto';
import type { PolicyLabels } from '../canonical/types.js';
import { provenanceLedger } from '../provenance/ledger.js';

/**
 * GraphCoreService
 *
 * Manages the graph database interactions for Canonical Entities.
 * Enforces policy labels and temporal validity.
 */
export class GraphCoreService {
  private static instance: GraphCoreService;

  private constructor() {}

  public static getInstance(): GraphCoreService {
    if (!GraphCoreService.instance) {
      GraphCoreService.instance = new GraphCoreService();
    }
    return GraphCoreService.instance;
  }

  /**
   * Create or Update an entity in the graph.
   * Handles bitemporal versioning:
   * - If an entity with the same ID exists, it invalidates the current version (sets validTo = now)
   *   and creates a new node with validFrom = now.
   * - If new, creates a new node.
   * - Copies active relationships from the old node to the new node.
   */
  async saveEntity(
    tenantId: string,
    entityType: string,
    data: Record<string, unknown>,
    policyLabels: PolicyLabels,
    actorId: string
  ): Promise<unknown> {
    const session = neo4jDriver.session();
    const id = data.id || randomUUID();
    const now = new Date();

    // Add standard fields
    const entityData = {
      ...data,
      id,
      tenantId,
      entityType,
      validFrom: now.toISOString(),
      validTo: null,
      observedAt: now.toISOString(),
      recordedAt: now.toISOString(),
      policyLabels: JSON.stringify(policyLabels), // Store as JSON string or properties
      // Flatten policy labels for property access control if needed
      _sensitivity: policyLabels.sensitivity,
      _clearance: policyLabels.clearance,
      _origin: policyLabels.origin,
    };

    try {
      const result = await session.executeWrite(async (tx: any) => {
        // 1. Find existing current version
        const findQuery = `
          MATCH (e:CanonicalEntity {id: $id, tenantId: $tenantId})
          WHERE e.validTo IS NULL
          RETURN e
        `;
        const existingRes = await tx.run(findQuery, { id, tenantId });
        const existingNode = existingRes.records.length > 0 ? existingRes.records[0].get('e') : null;

        if (existingNode) {
          // Terminate old version
          await tx.run(
            `
            MATCH (e:CanonicalEntity {id: $id, tenantId: $tenantId})
            WHERE e.validTo IS NULL
            SET e.validTo = $now
            `,
            { id, tenantId, now: now.toISOString() }
          );
        }

        // 2. Create new version
        const createQuery = `
          CREATE (e:CanonicalEntity:${entityType} $props)
          RETURN e
        `;

        const res = await tx.run(createQuery, { props: entityData });
        const newNode = res.records[0].get('e');

        // 3. Migrate relationships if updating
        if (existingNode) {
            // Copy relationships using APOC for safe dynamic type handling
            const migrateRelsQuery = `
                MATCH (old:CanonicalEntity {id: $id, tenantId: $tenantId})
                WHERE old.validTo = $now
                MATCH (new:CanonicalEntity {id: $id, tenantId: $tenantId})
                WHERE new.validTo IS NULL

                WITH old, new
                MATCH (old)-[r]-(other)
                WHERE r.validTo IS NULL

                WITH old, new, r, other, type(r) as type, startNode(r) = old as isOutgoing

                CALL apoc.do.case([
                    isOutgoing,
                    'CALL apoc.create.relationship(new, type, properties(r), other) YIELD rel RETURN rel',
                    NOT isOutgoing,
                    'CALL apoc.create.relationship(other, type, properties(r), new) YIELD rel RETURN rel'
                ], '', {new:new, other:other, type:type, r:r}) YIELD value

                RETURN count(*)
            `;

            await tx.run(migrateRelsQuery, { id, tenantId, now: now.toISOString() });
        }

        return res.records[0].get('e').properties;
      });

      // 4. Register in Provenance Ledger
      await provenanceLedger.appendEntry({
        tenantId,
        actionType: 'CREATE_UPDATE_ENTITY',
        resourceType: entityType,
        resourceId: id,
        actorId,
        actorType: 'user',
        timestamp: now,
        payload: {
          entityId: id,
          entityType,
          operation: 'save',
          policyLabels
        },
        metadata: {
          purpose: 'Create/Update Entity',
          classification: [policyLabels.sensitivity]
        }
      });

      return this.parseNodeProperties(result);
    } finally {
      await session.close();
    }
  }

  /**
   * Get an entity by ID, respecting temporal validity and tenant isolation.
   * Default is snapshot at current time (validTo IS NULL).
   */
  async getEntity(
    tenantId: string,
    id: string,
    asOf?: Date
  ): Promise<unknown | null> {
    const session = neo4jDriver.session();
    try {
      let query = `
        MATCH (e:CanonicalEntity {id: $id, tenantId: $tenantId})
      `;

      const params: Record<string, unknown> = { id, tenantId };

      if (asOf) {
        query += `
          WHERE e.validFrom <= $asOf AND (e.validTo IS NULL OR e.validTo > $asOf)
        `;
        params.asOf = asOf.toISOString();
      } else {
        query += `
          WHERE e.validTo IS NULL
        `;
      }

      query += ` RETURN e LIMIT 1`;

      const result = await session.executeRead((tx: any) => tx.run(query, params));

      if (result.records.length === 0) {
        return null;
      }

      return this.parseNodeProperties(result.records[0].get('e').properties);
    } finally {
      await session.close();
    }
  }

  /**
   * Create a relationship between two entities.
   * Also bitemporal.
   */
  async createRelationship(
    tenantId: string,
    fromId: string,
    toId: string,
    relationType: string,
    properties: Record<string, unknown> = {},
    actorId: string
  ): Promise<unknown> {
    const session = neo4jDriver.session();
    const now = new Date();

    try {
      const result = await session.executeWrite(async (tx: any) => {
        // Ensure both nodes exist and are current (or at least exist)
        // For relationships, we typically link the currently valid nodes.

        const query = `
          MATCH (from:CanonicalEntity {id: $fromId, tenantId: $tenantId})
          WHERE from.validTo IS NULL
          MATCH (to:CanonicalEntity {id: $toId, tenantId: $tenantId})
          WHERE to.validTo IS NULL

          MERGE (from)-[r:${relationType}]->(to)
          ON CREATE SET
            r = $props,
            r.created = $now,
            r.validFrom = $now,
            r.tenantId = $tenantId
          RETURN r
        `;

        const res = await tx.run(query, {
          fromId,
          toId,
          tenantId,
          now: now.toISOString(),
          props: {
            ...properties,
            tenantId, // Ensure tenantId on edge too
            validFrom: now.toISOString(),
            validTo: null
          }
        });

        if (res.records.length === 0) {
          throw new Error(`Could not create relationship. Check if nodes exist and are active.`);
        }

        return res.records[0].get('r').properties;
      });

      // Register in Provenance Ledger
      await provenanceLedger.appendEntry({
        tenantId,
        actionType: 'CREATE_RELATIONSHIP',
        resourceType: 'Relationship',
        resourceId: `${fromId}->${toId}`,
        actorId,
        actorType: 'user',
        timestamp: now,
        payload: {
          fromId,
          toId,
          relationType,
          properties
        },
        metadata: {}
      });

      return result;
    } finally {
      await session.close();
    }
  }

  /**
   * Link Evidence to a Claim.
   * Special case of createRelationship.
   */
  async linkEvidenceToClaim(
    tenantId: string,
    claimId: string,
    evidenceId: string,
    weight: number,
    description: string,
    actorId: string
  ): Promise<unknown> {
    return this.createRelationship(
      tenantId,
      evidenceId, // Evidence supports Claim? Or Claim supported by Evidence? Usually Evidence -> SUPPORTS -> Claim
      claimId,
      'SUPPORTS',
      { weight, description },
      actorId
    );
  }

  private parseNodeProperties(props: unknown): unknown {
    const p = { ...(props as Record<string, unknown>) };
    if (p.policyLabels && typeof p.policyLabels === 'string') {
      try {
        p.policyLabels = JSON.parse(p.policyLabels);
      } catch (e: any) {
        // keep as string if parse fails
      }
    }
    return p;
  }
}

export const graphCore = GraphCoreService.getInstance();
