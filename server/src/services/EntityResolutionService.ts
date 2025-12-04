import { Session } from 'neo4j-driver';
import pino from 'pino';
import { getPostgresPool } from '../config/database';
import {
  BehavioralFingerprintService,
  BehavioralTelemetry,
  BehavioralFingerprint,
} from './BehavioralFingerprintService.js';
import { createHash } from 'node:crypto';
import { erMetrics } from './ERMetrics.js';

const log = pino({ name: 'EntityResolutionService' });

export interface EntityResolutionConfig {
  blocking: {
    enabled: boolean;
    strategies: ('exact' | 'token' | 'phonetic')[];
  };
  privacy: {
    saltedHash: boolean;
    salt?: string;
  };
  thresholds: {
    match: number; // 0.0 - 1.0
    possible: number; // 0.0 - 1.0
  };
}

export interface MatchExplanation {
  ruleId: string;
  score: number;
  features: Record<string, any>;
  description: string;
}

export interface ERResult {
  isMatch: boolean;
  score: number;
  explanation: MatchExplanation[];
  confidence: 'high' | 'medium' | 'low' | 'none';
}

interface NormalizedProperties {
  name?: string;
  email?: string;
  url?: string;
}

const DEFAULT_CONFIG: EntityResolutionConfig = {
  blocking: {
    enabled: true,
    strategies: ['exact'],
  },
  privacy: {
    saltedHash: false,
    salt: process.env.ER_PRIVACY_SALT, // Load from ENV, fallback handled in logic
  },
  thresholds: {
    match: 0.9,
    possible: 0.75,
  },
};

export class EntityResolutionService {
  private behavioralService = new BehavioralFingerprintService();
  private config: EntityResolutionConfig;

  constructor(config: Partial<EntityResolutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Safety Check for Privacy Mode
    if (this.config.privacy.saltedHash && !this.config.privacy.salt) {
        throw new Error('EntityResolutionService: Salt must be provided when saltedHash privacy mode is enabled.');
    }
  }

  /**
   * Normalizes entity properties for deterministic comparison.
   * Includes salted hash support for privacy-safe matching.
   */
  public normalizeEntityProperties(entity: any): NormalizedProperties {
    const normalized: NormalizedProperties = {};

    if (entity.name) {
      normalized.name = String(entity.name).trim().toLowerCase();
    }

    if (entity.email) {
      let email = String(entity.email).trim().toLowerCase();
      if (this.config.privacy.saltedHash && this.config.privacy.salt) {
        email = createHash('sha256')
          .update(email + this.config.privacy.salt)
          .digest('hex');
      }
      normalized.email = email;
    }

    if (entity.url) {
      try {
        const url = new URL(String(entity.url).trim().toLowerCase());
        normalized.url = url.hostname + url.pathname;
      } catch (e) {
        log.warn(`Invalid URL for normalization: ${entity.url}`);
      }
    }
    return normalized;
  }

  /**
   * Generates a canonical key for an entity based on its normalized properties.
   * This key is used to identify potential duplicates (blocking).
   */
  public generateCanonicalKey(normalizedProps: NormalizedProperties): string {
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
   * Evaluate match between two entities with explainability.
   * @param entityA Source entity
   * @param entityB Target entity
   */
  public evaluateMatch(entityA: any, entityB: any): ERResult {
    const normA = this.normalizeEntityProperties(entityA);
    const normB = this.normalizeEntityProperties(entityB);
    const explanation: MatchExplanation[] = [];
    let totalScore = 0;

    // Rule 1: Exact Email Match (High Weight)
    if (normA.email && normB.email && normA.email === normB.email) {
      const score = 1.0;
      totalScore = Math.max(totalScore, score);
      explanation.push({
        ruleId: 'email_exact',
        score,
        features: { email: normA.email },
        description: 'Exact match on normalized email',
      });
    }

    // Rule 2: Exact Name Match (Medium Weight)
    if (normA.name && normB.name && normA.name === normB.name) {
      const score = 0.8;
      totalScore = Math.max(totalScore, score); // Simple max aggregation for now
      explanation.push({
        ruleId: 'name_exact',
        score,
        features: { name: normA.name },
        description: 'Exact match on normalized name',
      });
    }

    // Determine confidence
    let confidence: ERResult['confidence'] = 'none';
    if (totalScore >= this.config.thresholds.match) confidence = 'high';
    else if (totalScore >= this.config.thresholds.possible) confidence = 'medium';
    else if (totalScore > 0) confidence = 'low';

    // Metric recording
    if (totalScore > 0) {
        erMetrics.recordMatch(confidence);
    }

    return {
      isMatch: totalScore >= this.config.thresholds.match,
      score: totalScore,
      explanation,
      confidence,
    };
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
    await session.run(
      `
      MATCH (e:Entity)
      WHERE e.id IN $allEntityIds
      SET e.canonicalId = $masterEntityId
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

    erMetrics.recordMerge();

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
}
