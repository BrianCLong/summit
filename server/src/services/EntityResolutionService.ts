import { Session } from 'neo4j-driver';
import pino from 'pino';
import { getPostgresPool } from '../config/database';
import {
  BehavioralFingerprintService,
  BehavioralTelemetry,
  BehavioralFingerprint,
} from './BehavioralFingerprintService.js';
import { Histogram, Counter } from 'prom-client';

const log = pino({ name: 'EntityResolutionService' });

const erLatency = new Histogram({
  name: 'er_rule_latency_seconds',
  help: 'Latency of ER rules execution',
  labelNames: ['rule'],
});

const erF1Score = new Counter({
  name: 'er_f1_score_total',
  help: 'Cumulative F1 score for ER (simulated)',
  labelNames: ['rule'],
});

interface NormalizedProperties {
  name?: string;
  email?: string;
  url?: string;
}

interface ERRuleConfig {
  latencyBudgetMs: number;
  similarityThreshold: number;
}

export class EntityResolutionService {
  private behavioralService = new BehavioralFingerprintService();
  private ruleConfigs: Map<string, ERRuleConfig> = new Map([
    ['basic', { latencyBudgetMs: 100, similarityThreshold: 0.9 }],
    ['fuzzy', { latencyBudgetMs: 500, similarityThreshold: 0.85 }],
  ]);

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
   * Adaptive Thresholds Logic:
   * Adjusts the similarity threshold dynamically based on recent system load or precision feedback.
   * (Simulated here)
   */
  private getAdaptiveThreshold(rule: string): number {
    const config = this.ruleConfigs.get(rule) || { similarityThreshold: 0.9 };
    // In a real system, we might query a metric or state store here.
    return config.similarityThreshold;
  }

  /**
   * Checks if the rule execution is within budget.
   */
  private checkLatencyBudget(rule: string, startTime: number) {
    const duration = Date.now() - startTime;
    const config = this.ruleConfigs.get(rule);
    erLatency.observe({ rule }, duration / 1000);

    if (config && duration > config.latencyBudgetMs) {
      log.warn({ rule, duration, budget: config.latencyBudgetMs }, 'ER Rule exceeded latency budget');
    }
  }

  /**
   * Finds potential duplicate entities in Neo4j based on canonical keys.
   * @param session Neo4j session.
   * @returns A Map where keys are canonical keys and values are arrays of entity IDs.
   */
  public async findDuplicateEntities(
    session: Session,
  ): Promise<Map<string, string[]>> {
    const startTime = Date.now();
    const rule = 'basic';

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

    this.checkLatencyBudget(rule, startTime);
    return duplicates;
  }

  /**
   * Biased Sampling Evaluation
   * Evaluates a subset of potential matches to estimate precision/recall without full scan.
   *
   * @param matches A map of canonical keys to arrays of entity objects (properties need to be available).
   * Note: The input type changes here slightly to support logic, assuming matches contains metadata.
   * If strictly IDs, we can't check precision without fetching.
   * For this implementation, we assume the caller provides enough info or we fetch it.
   * BUT, `findDuplicateEntities` returns IDs.
   * So we will assume we accept normalized properties in the map for evaluation, or we simulate "checking".
   *
   * Let's refine: We accept the duplicate map. We can't check precision on IDs alone.
   * We will implement a heuristic: "Matches are precise if the canonical key has > 1 component".
   * E.g. "name:john|email:john@doe" is high precision. "name:john" is low.
   */
  public evaluateWithSampling(
    matches: Map<string, string[]>
  ): { precision: number; sampledCount: number } {
     const entries = Array.from(matches.entries());
     if (entries.length === 0) return { precision: 1, sampledCount: 0 };

     // Sample 10% or at least 5 items
     const sampleSize = Math.max(5, Math.floor(entries.length * 0.1));
     const sample = entries.slice(0, sampleSize);

     let preciseMatches = 0;
     for (const [key, _ids] of sample) {
         // Heuristic: Higher precision if key matches on multiple attributes
         // Canonical key format: "email:foo|name:bar"
         const attributesMatched = key.split('|').length;
         if (attributesMatched >= 2) {
             preciseMatches++;
         } else {
             // If only 1 attribute (e.g. just name), treat as potentially imprecise (0.5 weight)
             // unless it's a strong identifier like email or url
             if (key.startsWith('email:') || key.startsWith('url:')) {
                 preciseMatches += 0.9;
             } else {
                 preciseMatches += 0.4; // Just name is weak
             }
         }
     }

     const calculatedPrecision = sample.length > 0 ? preciseMatches / sample.length : 1;

     // Update telemetry
     erF1Score.inc({ rule: 'sampling' }, calculatedPrecision);

     return { precision: calculatedPrecision, sampledCount: sample.length };
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
    const startTime = Date.now();
    const rule = 'merge';

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
    this.checkLatencyBudget(rule, startTime);
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
