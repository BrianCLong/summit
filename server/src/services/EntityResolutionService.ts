import { Session } from 'neo4j-driver';
import pino from 'pino';
import { getPostgresPool, getNeo4jDriver } from '../config/database';
import {
  BehavioralFingerprintService,
  BehavioralTelemetry,
  BehavioralFingerprint,
} from './BehavioralFingerprintService.js';

const logger = pino({ name: 'EntityResolutionService' });

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
        logger.warn(`Invalid URL for normalization: ${entity.url}`);
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

    logger.info(
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
   * Evaluates the current ER model against a golden set of ground truth data.
   * @param goldenSet An array of expected duplicate pairs.
   * @returns Metrics including precision, recall, and F1 score.
   */
  public async evaluateModel(
    goldenSet: { id1: string; id2: string; isMatch: boolean }[]
  ): Promise<{ precision: number; recall: number; f1: number; drift: boolean }> {
    // In a real implementation, we would run the resolution logic against the entities in the golden set
    // For this implementation, we simulate the logic or assume we can check current graph state

    // Placeholder logic for the sprint deliverable
    // We assume 'goldenSet' contains pairs we KNOW are duplicates (isMatch=true) or NOT (isMatch=false)
    // We check if the current model (or graph state) considers them duplicates.

    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    const session = getNeo4jDriver().session();
    try {
      for (const pair of goldenSet) {
        // Check if they are linked to the same canonical ID
        const result = await session.run(`
          MATCH (a:Entity {id: $id1}), (b:Entity {id: $id2})
          RETURN a.canonicalId as c1, b.canonicalId as c2
        `, { id1: pair.id1, id2: pair.id2 });

        const record = result.records[0];
        const isLinked = record && record.get('c1') === record.get('c2') && record.get('c1') != null;

        if (pair.isMatch) {
          if (isLinked) truePositives++;
          else falseNegatives++;
        } else {
          if (isLinked) falsePositives++;
        }
      }
    } finally {
      await session.close();
    }

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1 = 2 * (precision * recall) / (precision + recall) || 0;

    // Drift detection: simplistic threshold
    // In production, we'd compare against historical baseline
    const DRIFT_THRESHOLD_F1 = 0.85;
    const drift = f1 < DRIFT_THRESHOLD_F1;

    if (drift) {
      logger.warn({ precision, recall, f1 }, "ER Model Drift Detected: F1 score below threshold");
      // Trigger alert logic here (e.g. via Prometheus or EventBus)

      // Auto-suggest thresholds (Sprint 31 E2 S3)
      this.suggestThresholds({ precision, recall, f1 });
    }

    return { precision, recall, f1, drift };
  }

  /**
   * Analyzes metrics and logs suggested threshold adjustments.
   * In a future iteration, this could automatically apply changes.
   */
  private suggestThresholds(metrics: { precision: number; recall: number; f1: number }) {
      const { precision, recall } = metrics;

      let suggestion = "No change";
      if (precision < 0.9 && recall > 0.95) {
          suggestion = "Increase similarity threshold (reduce false positives)";
      } else if (precision > 0.95 && recall < 0.8) {
          suggestion = "Decrease similarity threshold (reduce false negatives)";
      }

      logger.info({ metrics, suggestion }, "ER Threshold Auto-Suggestion");
      return suggestion;
  }
}
