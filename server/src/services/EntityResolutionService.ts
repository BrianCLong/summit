import { Session } from 'neo4j-driver';
import pino from 'pino';
import natural from 'natural';
import { getPostgresPool } from '../config/database';
import {
  BehavioralFingerprintService,
  BehavioralTelemetry,
  BehavioralFingerprint,
} from './BehavioralFingerprintService.js';

const log = pino({ name: 'EntityResolutionService' });

interface NormalizedProperties {
  name?: string;
  email?: string;
  url?: string;
}

export class EntityResolutionService {
  private behavioralService = new BehavioralFingerprintService();

  /**
   * Normalizes entity properties for deterministic comparison.
   * @param entity The entity object, typically from Neo4j, with properties.
   * @returns Normalized properties.
   */
  private normalizeEntityProperties(entity: any): NormalizedProperties {
    const normalized: NormalizedProperties = {};
    if (entity.name) {
      normalized.name = String(entity.name).trim().toLowerCase();
    }
    if (entity.email) {
      normalized.email = String(entity.email).trim().toLowerCase();
    }
    if (entity.url) {
      try {
        const url = new URL(String(entity.url).trim().toLowerCase());
        normalized.url = url.hostname + url.pathname; // Basic normalization
      } catch (e) {
        log.warn(`Invalid URL for normalization: ${entity.url}`);
      }
    }
    return normalized;
  }

  /**
   * Generates a canonical key for an entity based on its normalized properties.
   * This key is used to identify potential duplicates.
   * @param normalizedProps Normalized entity properties.
   * @returns A canonical string key.
   */
  private generateCanonicalKey(normalizedProps: NormalizedProperties): string {
    const parts: string[] = [];
    if (normalizedProps.name) parts.push(`name:${normalizedProps.name}`);
    if (normalizedProps.email) parts.push(`email:${normalizedProps.email}`);
    if (normalizedProps.url) parts.push(`url:${normalizedProps.url}`);

    if (parts.length === 0) {
      return ''; // Cannot generate a canonical key without identifying properties
    }
    return parts.sort().join('|');
  }

  /**
   * Finds potential duplicate entities in Neo4j based on canonical keys.
   * @param session Neo4j session.
   * @returns A Map where keys are canonical keys and values are arrays of entity IDs.
   */
  public async findDuplicateEntities(
    session: Session,
  ): Promise<Map<string, string[]>> {
    const duplicates = new Map<string, string[]>();
    const result = await session.run(`
      MATCH (e:Entity)
      WHERE e.name IS NOT NULL OR e.email IS NOT NULL OR e.url IS NOT NULL
      RETURN e.id AS id, e.name AS name, e.email AS email, e.url AS url
    `);

    for (const record of result.records) {
      const entityId = record.get('id');
      const entityProps = {
        name: record.get('name'),
        email: record.get('email'),
        url: record.get('url'),
      };
      const normalized = this.normalizeEntityProperties(entityProps);
      const canonicalKey = this.generateCanonicalKey(normalized);

      if (canonicalKey) {
        if (!duplicates.has(canonicalKey)) {
          duplicates.set(canonicalKey, []);
        }
        duplicates.get(canonicalKey)!.push(entityId);
      }
    }

    // Filter out groups with only one entity (not duplicates)
    for (const [key, ids] of duplicates.entries()) {
      if (ids.length < 2) {
        duplicates.delete(key);
      }
    }

    return duplicates;
  }

  /**
   * Merges duplicate entities into a master entity.
   * All relationships from duplicate entities are re-pointed to the master.
   * Duplicate entities are then deleted.
   * @param session Neo4j session.
   * @param masterEntityId The ID of the entity to keep.
   * @param duplicateEntityIds An array of IDs of entities to merge into the master.
   */
  public async mergeEntities(
    session: Session,
    masterEntityId: string,
    duplicateEntityIds: string[],
  ): Promise<void> {
    if (duplicateEntityIds.includes(masterEntityId)) {
      throw new Error(
        'Master entity ID cannot be in the list of duplicate entity IDs.',
      );
    }

    const allEntityIds = [masterEntityId, ...duplicateEntityIds];

    // Update canonicalId for all entities being merged to point to the master's canonicalId
    // This assumes the master already has a canonicalId or will get one from the ER process
    await session.run(
      `
      MATCH (e:Entity)
      WHERE e.id IN $allEntityIds
      SET e.canonicalId = $masterEntityId // Set all to master's ID for now, actual canonical key will be set by ER worker
    `,
      { allEntityIds, masterEntityId },
    );

    // Re-point incoming relationships to the master entity
    await session.run(
      `
      MATCH (n)-[r]->(d:Entity)
      WHERE d.id IN $duplicateEntityIds
      MATCH (m:Entity {id: $masterEntityId})
      CREATE (n)-[newRel:RELATIONSHIP]->(m)
      SET newRel = r
      DELETE r
    `,
      { duplicateEntityIds, masterEntityId },
    );

    // Re-point outgoing relationships to the master entity
    await session.run(
      `
      MATCH (d:Entity)-[r]->(n)
      WHERE d.id IN $duplicateEntityIds
      MATCH (m:Entity {id: $masterEntityId})
      CREATE (m)-[newRel:RELATIONSHIP]->(n)
      SET newRel = r
      DELETE r
    `,
      { duplicateEntityIds, masterEntityId },
    );

    // Delete duplicate entities
    await session.run(
      `
      MATCH (d:Entity)
      WHERE d.id IN $duplicateEntityIds
      DETACH DELETE d
    `,
      { duplicateEntityIds },
    );

    log.info(
      `Merged entities: ${duplicateEntityIds.join(', ')} into ${masterEntityId}`,
    );

    // Log to audit_logs
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4)`,
      [
        'entity_merge',
        'Entity',
        masterEntityId,
        { merged_from: duplicateEntityIds },
      ],
    );
  }

  public fuseBehavioralFingerprint(telemetry: BehavioralTelemetry[]): {
    fingerprint: BehavioralFingerprint;
    score: number;
  } {
    const fingerprint = this.behavioralService.computeFingerprint(telemetry);
    const score = this.behavioralService.scoreFingerprint(fingerprint);
    return { fingerprint, score };
  }

  public clusterIdentitiesAcrossProjects(
    identities: { id: string; telemetry: BehavioralTelemetry[] }[],
  ): Map<string, string[]> {
    const items = identities.map((i) => ({
      id: i.id,
      fingerprint: this.behavioralService.computeFingerprint(i.telemetry),
    }));
    return this.behavioralService.clusterFingerprints(items);
  }

  /**
   * Calculates similarity score between two entities.
   * Uses Jaro-Winkler distance on normalized names.
   */
  public calculatePairSimilarity(entityA: any, entityB: any): number {
    const normA = this.normalizeEntityProperties(entityA);
    const normB = this.normalizeEntityProperties(entityB);

    if (!normA.name || !normB.name) return 0;

    return natural.JaroWinklerDistance(normA.name, normB.name, undefined);
  }

  /**
   * Adds a pair of entities to the review queue if uncertainty is high.
   */
  public async queueForReview(
    tenantId: string,
    entityAId: string,
    entityBId: string,
    score: number,
  ): Promise<void> {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO er_review_queue (tenant_id, entity_a_id, entity_b_id, similarity_score)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`, // Simplification: assume UUID is primary key and distinct pairs are unique enough or handled elsewhere
      [tenantId, entityAId, entityBId, score],
    );
  }

  /**
   * Retrieves pending review items for a tenant.
   */
  public async getReviewQueue(tenantId: string, limit: number = 20): Promise<any[]> {
    const pool = getPostgresPool();
    const res = await pool.query(
      `SELECT * FROM er_review_queue
       WHERE tenant_id = $1 AND status = 'pending'
       ORDER BY similarity_score DESC
       LIMIT $2`,
      [tenantId, limit],
    );
    return res.rows;
  }

  /**
   * Submits a review decision.
   */
  public async submitReviewDecision(
    reviewId: string,
    decision: 'merge' | 'distinct' | 'skipped',
    reviewerId: string,
    notes?: string,
  ): Promise<void> {
    const pool = getPostgresPool();
    await pool.query(
      `UPDATE er_review_queue
       SET status = $1, reviewer_id = $2, decision_notes = $3, updated_at = NOW()
       WHERE id = $4`,
      [decision === 'merge' ? 'resolved_merge' : decision === 'distinct' ? 'resolved_distinct' : 'skipped', reviewerId, notes, reviewId],
    );

    // Auto-tune hook: if we implemented auto-tuning, we would feed this result back into the model here.
    // e.g., updateThresholds(decision, score);
  }
}
