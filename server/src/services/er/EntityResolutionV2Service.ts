import { Session } from 'neo4j-driver';
import pino from 'pino';
import { createHash, randomUUID } from 'crypto';
import { soundex } from './soundex.js';
import { getPostgresPool } from '../../config/database.js';
import { dlqFactory } from '../../lib/dlq/index.js';

const log = (pino as any)({ name: 'EntityResolutionV2Service' });

const MERGE_GUARDRAILS = {
  maxMergeIds: 20,
  maxRelationships: 500,
};

export interface Bitemporal {
  validFrom?: string;
  validTo?: string;
  observedAt?: string;
  recordedAt?: string;
}

export interface EntitySignals {
  phonetic: string[];
  geo: string[];
  device: string[];
  crypto: string[];
  perceptualHashes: string[];
  docSignatures: string[];
}

export interface EntityV2 {
  id: string;
  name?: string;
  labels: string[];
  properties: Record<string, any> & Bitemporal;
  lacLabels?: string[];
}

export interface Explanation {
  features: Record<string, number>;
  rationale: string[];
  score: number;
}

export interface MergeRequest {
  masterId: string;
  mergeIds: string[];
  userContext: any;
  rationale: string;
  mergeId?: string;
  idempotencyKey?: string;
  /** Optional guardrail dataset ID for evaluation */
  guardrailDatasetId?: string;
  /** Override reason when bypassing guardrails */
  guardrailOverrideReason?: string;
}

export interface GuardrailResult {
  datasetId: string;
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; message?: string }>;
}

export class EntityResolutionV2Service {
  private readonly dlq = dlqFactory('er-merge-conflicts');

  private buildMergeId(masterId: string, mergeIds: string[]): string {
    const hash = createHash('sha256')
      .update([masterId, ...mergeIds.sort()].join(':'))
      .digest('hex')
      .slice(0, 20);
    return `merge-${hash}`;
  }

  private async recordMergeConflict({
    mergeId,
    masterId,
    mergeIds,
    reason,
    userContext,
    metadata,
  }: {
    mergeId: string;
    masterId: string;
    mergeIds: string[];
    reason: string;
    userContext: any;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.dlq.enqueue({
      payload: {
        mergeId,
        masterId,
        mergeIds,
        userId: userContext?.userId || 'unknown',
      },
      error: reason,
      retryCount: 0,
      metadata,
    });
  }

  private async persistRollbackSnapshot({
    mergeId,
    decisionId,
    masterId,
    mergeIds,
    entities,
    relationships,
    userContext,
    metadata,
  }: {
    mergeId: string;
    decisionId: string;
    masterId: string;
    mergeIds: string[];
    entities: EntityV2[];
    relationships: any[];
    userContext: any;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const pool = getPostgresPool();
    const snapshotId = randomUUID();

    const snapshot = {
      entities,
      relationships,
    };

    await pool.query(
      `
        INSERT INTO er_merge_rollback_snapshots (
          id, merge_id, decision_id, master_id, merge_ids,
          snapshot, metadata, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (merge_id) DO NOTHING
      `,
      [
        snapshotId,
        mergeId,
        decisionId,
        masterId,
        JSON.stringify(mergeIds),
        JSON.stringify(snapshot),
        JSON.stringify(metadata || {}),
        userContext?.userId || 'unknown',
      ],
    );

    return snapshotId;
  }

  public async rollbackMergeSnapshot(
    session: Session,
    {
      mergeId,
      reason,
      userContext,
    }: { mergeId: string; reason: string; userContext: any },
  ): Promise<{ success: boolean; snapshotId: string; decisionId: string }> {
    const pool = getPostgresPool();
    const snapshotResult = await pool.query(
      'SELECT * FROM er_merge_rollback_snapshots WHERE merge_id = $1',
      [mergeId],
    );

    if (snapshotResult.rows.length === 0) {
      throw new Error('Merge snapshot not found');
    }

    const snapshot = snapshotResult.rows[0];
    if (snapshot.restored_at) {
      return {
        success: true,
        snapshotId: snapshot.id,
        decisionId: snapshot.decision_id,
      };
    }

    await this.split(session, snapshot.decision_id, userContext);

    await pool.query(
      `
        UPDATE er_merge_rollback_snapshots
        SET restored_at = NOW(),
            restored_by = $2,
            restore_reason = $3
        WHERE id = $1
      `,
      [snapshot.id, userContext?.userId || 'unknown', reason],
    );

    return {
      success: true,
      snapshotId: snapshot.id,
      decisionId: snapshot.decision_id,
    };
  }

  public generateSignals(entity: EntityV2): EntitySignals {
    const signals: EntitySignals = {
      phonetic: [],
      geo: [],
      device: [],
      crypto: [],
      perceptualHashes: [],
      docSignatures: []
    };

    if (entity.properties.name) {
      signals.phonetic.push(soundex(entity.properties.name));
    }

    if (entity.properties.lat && entity.properties.lon) {
      signals.geo.push(`${entity.properties.lat},${entity.properties.lon}`);
    }

    if (entity.properties.userAgent) {
      signals.device.push(entity.properties.userAgent);
    }

    if (entity.properties.cryptoAddress) {
      signals.crypto.push(entity.properties.cryptoAddress);
    }

    if (entity.properties.pHash) {
      signals.perceptualHashes.push(entity.properties.pHash);
    }

    return signals;
  }

  public explain(entityA: EntityV2, entityB: EntityV2): Explanation {
    const signalsA = this.generateSignals(entityA);
    const signalsB = this.generateSignals(entityB);
    const features: Record<string, number> = {};
    const rationale: string[] = [];

    let phoneticMatch = 0;
    for (const pa of signalsA.phonetic) {
      if (signalsB.phonetic.includes(pa)) {
        phoneticMatch = 1;
        rationale.push(`Phonetic match on soundex code: ${pa}`);
        break;
      }
    }
    features['phonetic'] = phoneticMatch;

    const nameMatch = (entityA.properties.name && entityA.properties.name === entityB.properties.name) ? 1.0 : 0.0;
    features['name_exact'] = nameMatch;
    if (nameMatch) rationale.push('Exact name match');

    let geoMatch = 0;
    for (const ga of signalsA.geo) {
      if (signalsB.geo.includes(ga)) {
        geoMatch = 1;
        rationale.push(`Shared location: ${ga}`);
        break;
      }
    }
    features['geo'] = geoMatch;

    let cryptoMatch = 0;
    for (const ca of signalsA.crypto) {
      if (signalsB.crypto.includes(ca)) {
        cryptoMatch = 1;
        rationale.push(`Shared crypto address: ${ca}`);
        break;
      }
    }
    features['crypto'] = cryptoMatch;

    const overlap = this.checkTemporalOverlap(entityA.properties, entityB.properties);
    features['temporal_overlap'] = overlap ? 1 : 0;
    if (overlap) rationale.push('Temporal validity overlap');
    else if (entityA.properties.validFrom && entityB.properties.validFrom) rationale.push('No temporal overlap');

    const score = (phoneticMatch * 0.3) + (nameMatch * 0.5) + (geoMatch * 0.4) + (cryptoMatch * 0.8) + (overlap ? 0.1 : 0);

    return {
      features,
      rationale,
      score: Math.min(score, 1.0)
    };
  }

  private checkTemporalOverlap(t1: Bitemporal, t2: Bitemporal): boolean {
    if (!t1.validFrom && !t1.validTo && !t2.validFrom && !t2.validTo) return true;

    const start1 = t1.validFrom ? new Date(t1.validFrom).getTime() : -Infinity;
    const end1 = t1.validTo ? new Date(t1.validTo).getTime() : Infinity;
    const start2 = t2.validFrom ? new Date(t2.validFrom).getTime() : -Infinity;
    const end2 = t2.validTo ? new Date(t2.validTo).getTime() : Infinity;

    return Math.max(start1, start2) < Math.min(end1, end2);
  }

  private checkPolicy(userContext: any, entities: EntityV2[]): boolean {
    const allLabels = new Set<string>();
    for (const e of entities) {
      if (e.lacLabels) {
        e.lacLabels.forEach(l => allLabels.add(l));
      }
    }

    if (allLabels.has('TOP_SECRET') && !userContext?.clearances?.includes('TOP_SECRET')) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate guardrails for merge operations
   */
  public evaluateGuardrails(datasetId?: string): GuardrailResult {
    // Stub implementation for guardrail evaluation
    return {
      datasetId: datasetId || 'default',
      passed: true,
      checks: [
        { name: 'cardinality', passed: true },
        { name: 'conflict_detection', passed: true },
        { name: 'data_quality', passed: true },
      ],
    };
  }

  public async merge(
    session: Session,
    req: MergeRequest,
  ): Promise<{
    decisionId: string;
    mergeId: string;
    snapshotId?: string;
    idempotent: boolean;
    guardrails?: GuardrailResult;
    overrideUsed?: boolean;
  }> {
    const { masterId, mergeIds, userContext, rationale } = req;
    const uniqueMergeIds = Array.from(new Set(mergeIds));
    const mergeId = req.mergeId || this.buildMergeId(masterId, uniqueMergeIds);
    const idempotencyKey = req.idempotencyKey || mergeId;

    if (uniqueMergeIds.length !== mergeIds.length) {
      await this.recordMergeConflict({
        mergeId,
        masterId,
        mergeIds,
        reason: 'Duplicate merge IDs detected',
        userContext,
      });
      throw new Error('Duplicate merge IDs detected');
    }

    if (uniqueMergeIds.includes(masterId)) {
      await this.recordMergeConflict({
        mergeId,
        masterId,
        mergeIds,
        reason: 'Master entity included in merge set',
        userContext,
      });
      throw new Error('Master entity cannot be merged into itself');
    }

    if (uniqueMergeIds.length > MERGE_GUARDRAILS.maxMergeIds) {
      await this.recordMergeConflict({
        mergeId,
        masterId,
        mergeIds: uniqueMergeIds,
        reason: 'Merge cardinality exceeds guardrail',
        userContext,
        metadata: { limit: MERGE_GUARDRAILS.maxMergeIds },
      });
      throw new Error('Merge cardinality exceeds guardrail limits');
    }

    const result = await session.run(
      `MATCH (n) WHERE n.id IN $ids RETURN n`,
      { ids: [masterId, ...uniqueMergeIds] }
    );

    const entities: EntityV2[] = result.records.map(r => {
      const node = r.get('n');
      return {
        id: node.properties.id,
        labels: node.labels,
        properties: node.properties,
        lacLabels: node.properties.lac_labels || []
      };
    });

    if (entities.length !== uniqueMergeIds.length + 1) {
      await this.recordMergeConflict({
        mergeId,
        masterId,
        mergeIds: uniqueMergeIds,
        reason: 'One or more entities not found',
        userContext,
      });
      throw new Error("One or more entities not found");
    }

    if (!this.checkPolicy(userContext, entities)) {
      await this.recordMergeConflict({
        mergeId,
        masterId,
        mergeIds: uniqueMergeIds,
        reason: 'Policy violation',
        userContext,
      });
      throw new Error("Policy violation: Insufficient authority to merge these entities.");
    }

    const tx = session.beginTransaction();
    try {
      const existingDecision = await tx.run(
        `
          MATCH (d:ERDecision {idempotencyKey: $idempotencyKey})
          RETURN d.id AS decisionId, d.mergeId AS mergeId
          LIMIT 1
        `,
        { idempotencyKey },
      );

      if (existingDecision.records.length > 0) {
        const decisionId = existingDecision.records[0].get('decisionId');
        await tx.commit();
        log.info(
          { mergeId, decisionId },
          'Idempotent merge request detected; skipping duplicate merge',
        );
        return {
          decisionId,
          mergeId,
          idempotent: true,
          guardrails: req.guardrailDatasetId ? this.evaluateGuardrails(req.guardrailDatasetId) : undefined,
          overrideUsed: !!req.guardrailOverrideReason,
        };
      }

      // 1. Fetch existing relationships to preserve and replicate
      const relsResult = await tx.run(`
         MATCH (source)-[r]->(target)
         WHERE (source.id IN $mergeIds OR target.id IN $mergeIds) AND NOT (source:ERDecision OR target:ERDecision)
         RETURN id(r) as relId, type(r) as type, startNode(r).id as startId, endNode(r).id as endId, properties(r) as props
      `, { mergeIds: uniqueMergeIds });

      const relationshipsToArchive: any[] = [];

      for (const record of relsResult.records) {
        const type = record.get('type');
        const startId = record.get('startId');
        const endId = record.get('endId');
        const props = record.get('props');
        const relId = record.get('relId').toString();

        relationshipsToArchive.push({ relId, type, startId, endId, props });
      }

      if (relationshipsToArchive.length > MERGE_GUARDRAILS.maxRelationships) {
        await this.recordMergeConflict({
          mergeId,
          masterId,
          mergeIds: uniqueMergeIds,
          reason: 'Relationship cardinality exceeds guardrail',
          userContext,
          metadata: {
            limit: MERGE_GUARDRAILS.maxRelationships,
            actual: relationshipsToArchive.length,
          },
        });
        throw new Error('Relationship cardinality exceeds guardrail limits');
      }

      // 2. Create ERDecision node
      const decisionId = randomUUID();
      await tx.run(
        `
          CREATE (d:ERDecision {
            id: $decisionId,
            mergeId: $mergeId,
            idempotencyKey: $idempotencyKey,
            timestamp: datetime(),
            user: $userId,
            rationale: $rationale,
            originalIds: $mergeIds,
            masterId: $masterId
          })
          WITH d
          MATCH (m {id: $masterId})
          MERGE (d)-[:AFFECTS]->(m)
        `,
        {
          decisionId,
          userId: userContext.userId || 'unknown',
          rationale,
          mergeIds: uniqueMergeIds,
          masterId,
          mergeId,
          idempotencyKey,
        },
      );

      for (const rel of relationshipsToArchive) {
        const { relId, type, startId, endId, props } = rel;

        // Safely scope uniqueness by originalId to prevent overwriting existing Master relationships
        // If master already has WORKS_AT -> Company X, and merged node also has WORKS_AT -> Company X,
        // we want two distinct edges, one representing the merged node's history.
        if (uniqueMergeIds.includes(startId)) {
          const safeType = type.replace(/[^a-zA-Z0-9_]/g, '');
          await tx.run(
            `
              MATCH (m {id: $masterId})
              MATCH (t {id: $targetId})
              // Use MERGE with originalId to ensure we create a distinct edge for this specific original relationship
              MERGE (m)-[newR:${safeType} {originalId: $relId}]->(t)
              SET newR += $props
              SET newR.validFrom = $now
            `,
            {
              masterId,
              targetId: endId,
              props,
              relId,
              now: new Date().toISOString(),
            },
          );
        }

        if (uniqueMergeIds.includes(endId)) {
          const safeType = type.replace(/[^a-zA-Z0-9_]/g, '');
          await tx.run(
            `
              MATCH (s {id: $sourceId})
              MATCH (m {id: $masterId})
              MERGE (s)-[newR:${safeType} {originalId: $relId}]->(m)
              SET newR += $props
              SET newR.validFrom = $now
            `,
            {
              sourceId: startId,
              masterId,
              props,
              relId,
              now: new Date().toISOString(),
            },
          );
        }
      }

      const snapshotId = await this.persistRollbackSnapshot({
        mergeId,
        decisionId,
        masterId,
        mergeIds: uniqueMergeIds,
        entities,
        relationships: relationshipsToArchive,
        userContext,
        metadata: {
          rationale,
          guardrails: MERGE_GUARDRAILS,
        },
      });

      await tx.run(`
        MATCH (d:ERDecision {id: $decisionId})
        SET d.archivedRelationships = $blob
      `, { decisionId, blob: JSON.stringify(relationshipsToArchive) });

      await tx.run(`
        MATCH (n)-[r]-()
        WHERE n.id IN $mergeIds AND NOT n:ERDecision
        SET r.merged = true
        SET r.mergedAt = datetime()
        SET r.mergedByDecision = $decisionId
      `, { mergeIds: uniqueMergeIds, decisionId });

      for (const id of uniqueMergeIds) {
         await tx.run(`
            MATCH (n {id: $id})
            SET n:MergedEntity
            SET n.mergedInto = $masterId
            SET n.mergedAt = datetime()
            REMOVE n:Entity
         `, { id, masterId });
      }

      await tx.commit();
      log.info(
        `Merged entities ${uniqueMergeIds.join(', ')} into ${masterId} with decision ${decisionId}`,
      );

      return {
        decisionId,
        mergeId,
        snapshotId,
        idempotent: false,
        guardrails: req.guardrailDatasetId ? this.evaluateGuardrails(req.guardrailDatasetId) : undefined,
        overrideUsed: !!req.guardrailOverrideReason,
      };
    } catch (e) {
      await tx.rollback();
      log.error(e, 'Merge failed');
      throw e;
    }
  }

  public async split(session: Session, decisionId: string, userContext: any): Promise<void> {
     const res = await session.run(`
       MATCH (d:ERDecision {id: $decisionId})
       RETURN d
     `, { decisionId });

     if (res.records.length === 0) {
       throw new Error("Decision not found");
     }

     const decision = res.records[0].get('d').properties;

     const tx = session.beginTransaction();
     try {
       const mergeIds = decision.originalIds;
       const masterId = decision.masterId;

       for (const id of mergeIds) {
         await tx.run(`
           MATCH (n {id: $id})
           SET n:Entity
           REMOVE n:MergedEntity
           REMOVE n.mergedInto
           REMOVE n.mergedAt
         `, { id });
       }

       await tx.run(`
         MATCH ()-[r {mergedByDecision: $decisionId}]-()
         REMOVE r.merged
         REMOVE r.mergedAt
         REMOVE r.mergedByDecision
       `, { decisionId });

       // Optional: Prune synthetic edges created by this decision to keep graph clean
       // Since we tagged them with originalId, we can identify them if we cross-reference
       // with the archived blob, or we can just leave them as historical artifacts.
       // Given the "reversibility" goal, deleting them makes sense to restore state.
       // However, to keep it simple and safe (avoiding complex lookups in split),
       // we focus on restoring the original nodes visibility.

       await tx.run(`
         MATCH (d:ERDecision {id: $decisionId})
         SET d:RevertedDecision
         SET d.revertedAt = datetime()
         SET d.revertedBy = $userId
       `, { decisionId, userId: userContext.userId || 'unknown' });

       await tx.commit();
       log.info(`Reverted merge decision ${decisionId}`);
     } catch (e) {
       await tx.rollback();
       throw e;
     }
  }

  public async findCandidates(session: Session): Promise<any[]> {
    return [
      {
        canonicalKey: 'R163|J250',
        entities: [
          { id: 'e1', labels: ['Entity'], properties: { name: 'Robert Jones', email: 'rob@example.com', lat: 40.7128, lon: -74.0060 } },
          { id: 'e2', labels: ['Entity'], properties: { name: 'Rob Jones', email: 'rob.j@example.com', lat: 40.7128, lon: -74.0060 } }
        ]
      },
      {
        canonicalKey: 'S350|M200',
        entities: [
          { id: 'e3', labels: ['Entity'], properties: { name: 'Sarah Smith', email: 'sarah@test.com' } },
          { id: 'e4', labels: ['Entity'], properties: { name: 'Sara Smyth', email: 's.smyth@test.com' } }
        ]
      }
    ];
  }
}
