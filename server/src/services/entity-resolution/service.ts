// @ts-nocheck
import { EntityInput, ResolutionCandidate, ResolutionDecision, ERConfig, DecisionType } from './models.js';
import { ScoringEngine } from './scoring.js';
import { provenanceLedger } from '../../provenance/ledger.js';
import { getDriver } from '../../graph/neo4j.js';
import { getTracer } from '../../observability/tracer.js';

export class EntityResolutionService {
  private scoringEngine: ScoringEngine;
  private config: ERConfig;

  constructor(config?: Partial<ERConfig>) {
    this.config = {
        thresholds: { merge: 0.95, link: 0.8, review: 0.6 },
        weights: {
            exactId: 1.0,
            email: 0.9,
            phone: 0.8,
            name: 0.6
        },
        enabledFeatures: ['exactId', 'email', 'phone', 'name'],
        ...config
    };
    this.scoringEngine = new ScoringEngine(this.config);
  }

  /**
   * Evaluates a batch of new entities against the existing graph to propose resolutions.
   * This is a simplified "blocking" approach where we query for potential candidates.
   */
  async resolveBatch(entities: EntityInput[]): Promise<ResolutionDecision[]> {
    return getTracer().withSpan('EntityResolutionService.resolveBatch', async (span: any) => {
        span.setAttribute('er.batch_size', entities.length);
        const { default: pLimit } = await import('p-limit');
        const limit = pLimit(10); // Concurrency limit
        const decisions: ResolutionDecision[] = [];

        const tasks = entities.map(entity => limit(async () => {
        // 1. Find candidates in the graph (Blocking phase)
        const candidates = await this.findCandidates(entity);

        for (const candidateEntity of candidates) {
            // 2. Score candidate
            const { score, features, reasons } = this.scoringEngine.calculateScore(entity, candidateEntity);

            // 3. Make Decision
            const decisionType = this.makeDecision(score);

            if (decisionType !== 'NO_MATCH') {
                decisions.push({
                    candidate: {
                        sourceEntityId: entity.id,
                        targetEntityId: candidateEntity.id,
                        overallScore: score,
                        features,
                        reasons
                    },
                    decision: decisionType,
                    confidence: score,
                    ruleId: 'default-weighted-score'
                });
            }
        }
        }));

        await Promise.all(tasks);
        return decisions;
    });
  }

  /**
   * Executes a resolution decision (Merge or Link).
   */
  async applyDecision(decision: ResolutionDecision, tenantId: string, actorId: string): Promise<void> {
    const { sourceEntityId, targetEntityId } = decision.candidate;

    if (decision.decision === 'MERGE') {
        await this.executeMerge(sourceEntityId, targetEntityId, tenantId, actorId, decision);
    } else if (decision.decision === 'LINK') {
        await this.executeLink(sourceEntityId, targetEntityId, tenantId, actorId, decision);
    }
  }

  private makeDecision(score: number): DecisionType {
    if (score >= this.config.thresholds.merge) return 'MERGE';
    if (score >= this.config.thresholds.link) return 'LINK';
    if (score >= this.config.thresholds.review) return 'REVIEW';
    return 'NO_MATCH';
  }

  private async findCandidates(entity: EntityInput): Promise<EntityInput[]> {
    const driver = getDriver();
    const session = driver.session();

    const cypher = `
      MATCH (n:Entity {tenantId: $tenantId})
      WHERE n.id <> $id AND (
        (n.email IS NOT NULL AND n.email = $email) OR
        (n.name IS NOT NULL AND n.name = $name) OR
        (n.ssn IS NOT NULL AND n.ssn = $ssn)
      )
      RETURN n { .* } as properties, labels(n) as labels, n.id as id
    `;

    try {
      const result = await session.run(cypher, {
        tenantId: entity.tenantId,
        id: entity.id,
        email: entity.properties.email || '',
        name: entity.properties.name || '',
        ssn: entity.properties.ssn || ''
      });

      return result.records.map(record => {
          const props = record.get('properties');
          const id = record.get('id');
          return {
              id: id,
              type: 'Entity', // Simplified
              properties: props,
              tenantId: entity.tenantId
          };
      });
    } catch (error: any) {
        console.error('Error finding candidates:', error);
        return [];
    } finally {
      await session.close();
    }
  }

  private async executeMerge(sourceId: string, targetId: string, tenantId: string, actorId: string, decision: ResolutionDecision) {
     const driver = getDriver();
     const session = driver.session();

     try {
         // 1. Log to Provenance Ledger
         await provenanceLedger.appendEntry({
             tenantId,
             actionType: 'ENTITY_MERGE',
             resourceType: 'entity',
             resourceId: targetId,
             actorId,
             actorType: 'system',
             payload: {
                 sourceId,
                 targetId,
                 decision
             },
             metadata: {
                 purpose: 'Entity Resolution Merge'
             }
         });

         // 2. Perform Graph Merge
         // Use apoc.refactor.mergeNodes which handles property combination and edge movement correctly.
         const cypher = `
            MATCH (source:Entity {id: $sourceId})
            MATCH (target:Entity {id: $targetId})
            CALL apoc.refactor.mergeNodes([target, source], {
                properties: {
                    mode: 'discard'
                },
                mergeRels: true
            }) YIELD node
            RETURN node
         `;

         // Use executeWrite for Neo4j Driver v5
         await session.executeWrite(tx => tx.run(cypher, { sourceId, targetId }));

     } finally {
         await session.close();
     }
  }

  private async executeLink(sourceId: string, targetId: string, tenantId: string, actorId: string, decision: ResolutionDecision) {
    const driver = getDriver();
    const session = driver.session();

    try {
        await provenanceLedger.appendEntry({
            tenantId,
            actionType: 'ENTITY_LINK',
            resourceType: 'entity',
            resourceId: sourceId, // Logging on both or source
            actorId,
            actorType: 'system',
            payload: {
                sourceId,
                targetId,
                decision
            },
            metadata: {
                purpose: 'Entity Resolution Link'
            }
        });

        const cypher = `
            MATCH (source:Entity {id: $sourceId})
            MATCH (target:Entity {id: $targetId})
            MERGE (source)-[r:SAME_AS]->(target)
            SET r.confidence = $confidence, r.createdAt = datetime()
        `;

        // Use executeWrite for Neo4j Driver v5
        await session.executeWrite(tx => tx.run(cypher, {
            sourceId,
            targetId,
            confidence: decision.confidence
        }));
    } finally {
        await session.close();
    }
  }
}
