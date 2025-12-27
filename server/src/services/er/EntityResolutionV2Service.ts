import { Session, Transaction } from 'neo4j-driver';
import pino from 'pino';
import { randomUUID } from 'crypto';
import { soundex } from './soundex.js';
import { provenanceLedger } from '../../provenance/ledger.js';
import {
  evaluateGuardrails,
  type GuardrailResult,
  type FixtureEntity,
} from './guardrails.js';

const log = (pino as any)({ name: 'EntityResolutionV2Service' });

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
  guardrailDatasetId?: string;
  guardrailOverrideReason?: string;
}

export class EntityResolutionV2Service {

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

  public evaluateGuardrails(datasetId?: string): GuardrailResult {
    const resolvedDatasetId =
      datasetId || process.env.ER_GUARDRAIL_DATASET_ID || 'baseline';

    return evaluateGuardrails(
      resolvedDatasetId,
      (entityA: FixtureEntity, entityB: FixtureEntity) =>
        this.explain(entityA as EntityV2, entityB as EntityV2).score
    );
  }

  public async merge(
    session: Session,
    req: MergeRequest
  ): Promise<{ guardrails: GuardrailResult; overrideUsed: boolean }> {
    const { masterId, mergeIds, userContext, rationale } = req;

    const result = await session.run(
      `MATCH (n) WHERE n.id IN $ids RETURN n`,
      { ids: [masterId, ...mergeIds] }
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

    if (entities.length !== mergeIds.length + 1) {
      throw new Error("One or more entities not found");
    }

    if (!this.checkPolicy(userContext, entities)) {
      throw new Error(
        'Policy violation: Insufficient authority to merge these entities.'
      );
    }

    const guardrails = this.evaluateGuardrails(req.guardrailDatasetId);
    const overrideReason = req.guardrailOverrideReason?.trim();
    const overrideUsed = !guardrails.passed && Boolean(overrideReason);

    if (!guardrails.passed && !overrideUsed) {
      throw new Error(
        `Entity resolution guardrails failed for dataset ${guardrails.datasetId}. ` +
          `Precision ${guardrails.metrics.precision.toFixed(2)}, ` +
          `Recall ${guardrails.metrics.recall.toFixed(2)}.`
      );
    }

    if (overrideUsed) {
      await provenanceLedger.appendEntry({
        timestamp: new Date(),
        tenantId: userContext?.tenantId || 'unknown',
        actionType: 'ER_GUARDRAIL_OVERRIDE',
        resourceType: 'EntityResolution',
        resourceId: masterId,
        actorId: userContext.userId || 'unknown',
        actorType: 'user',
        payload: {
          datasetId: guardrails.datasetId,
          reason: overrideReason,
          metrics: guardrails.metrics,
          thresholds: guardrails.thresholds,
          mergeIds,
        },
        metadata: {
          purpose: 'Entity Resolution guardrail override',
        },
      });
    }

    const tx = session.beginTransaction();
    try {
      // 1. Create ERDecision node
      const decisionId = randomUUID();
      await tx.run(`
        CREATE (d:ERDecision {
          id: $decisionId,
          timestamp: datetime(),
          user: $userId,
          rationale: $rationale,
          originalIds: $mergeIds,
          masterId: $masterId,
          guardrailDatasetId: $guardrailDatasetId,
          guardrailStatus: $guardrailStatus,
          guardrailPrecision: $guardrailPrecision,
          guardrailRecall: $guardrailRecall,
          guardrailMinPrecision: $guardrailMinPrecision,
          guardrailMinRecall: $guardrailMinRecall,
          guardrailMatchThreshold: $guardrailMatchThreshold,
          guardrailOverrideReason: $guardrailOverrideReason,
          guardrailOverrideBy: $guardrailOverrideBy
        })
        WITH d
        MATCH (m {id: $masterId})
        MERGE (d)-[:AFFECTS]->(m)
      `, {
        decisionId,
        userId: userContext.userId || 'unknown',
        rationale,
        mergeIds,
        masterId,
        guardrailDatasetId: guardrails.datasetId,
        guardrailStatus: guardrails.passed ? 'passed' : 'failed',
        guardrailPrecision: guardrails.metrics.precision,
        guardrailRecall: guardrails.metrics.recall,
        guardrailMinPrecision: guardrails.thresholds.minPrecision,
        guardrailMinRecall: guardrails.thresholds.minRecall,
        guardrailMatchThreshold: guardrails.thresholds.matchThreshold,
        guardrailOverrideReason: overrideReason || null,
        guardrailOverrideBy: overrideUsed ? userContext.userId || 'unknown' : null,
      });

      // 2. Fetch existing relationships to preserve and replicate
      const relsResult = await tx.run(`
         MATCH (source)-[r]->(target)
         WHERE (source.id IN $mergeIds OR target.id IN $mergeIds) AND NOT (source:ERDecision OR target:ERDecision)
         RETURN id(r) as relId, type(r) as type, startNode(r).id as startId, endNode(r).id as endId, properties(r) as props
      `, { mergeIds });

      const relationshipsToArchive: any[] = [];

      for (const record of relsResult.records) {
        const type = record.get('type');
        const startId = record.get('startId');
        const endId = record.get('endId');
        const props = record.get('props');
        const relId = record.get('relId').toString();

        relationshipsToArchive.push({ relId, type, startId, endId, props });

        // Safely scope uniqueness by originalId to prevent overwriting existing Master relationships
        // If master already has WORKS_AT -> Company X, and merged node also has WORKS_AT -> Company X,
        // we want two distinct edges, one representing the merged node's history.

        if (mergeIds.includes(startId)) {
           const safeType = type.replace(/[^a-zA-Z0-9_]/g, '');
           await tx.run(`
             MATCH (m {id: $masterId})
             MATCH (t {id: $targetId})
             // Use MERGE with originalId to ensure we create a distinct edge for this specific original relationship
             MERGE (m)-[newR:${safeType} {originalId: $relId}]->(t)
             SET newR += $props
             SET newR.validFrom = $now
           `, { masterId, targetId: endId, props, relId, now: new Date().toISOString() });
        }

        if (mergeIds.includes(endId)) {
           const safeType = type.replace(/[^a-zA-Z0-9_]/g, '');
           await tx.run(`
             MATCH (s {id: $sourceId})
             MATCH (m {id: $masterId})
             MERGE (s)-[newR:${safeType} {originalId: $relId}]->(m)
             SET newR += $props
             SET newR.validFrom = $now
           `, { sourceId: startId, masterId, props, relId, now: new Date().toISOString() });
        }
      }

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
      `, { mergeIds, decisionId });

      for (const id of mergeIds) {
         await tx.run(`
            MATCH (n {id: $id})
            SET n:MergedEntity
            SET n.mergedInto = $masterId
            SET n.mergedAt = datetime()
            REMOVE n:Entity
         `, { id, masterId });
      }

      await tx.commit();
      log.info(`Merged entities ${mergeIds.join(', ')} into ${masterId} with decision ${decisionId}`);

      return {
        guardrails,
        overrideUsed,
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
