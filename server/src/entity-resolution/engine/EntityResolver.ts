import { IntelGraphService } from '../../services/IntelGraphService.js';
import { MLScorer } from './MLScorer.js';
import { ConflictResolver, StrategyType } from './ConflictResolver.js';
import { provenanceLedger } from '../../provenance/ledger.js';
import { randomUUID } from 'crypto';

export interface EntityResolutionResult {
  matchCandidateId: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  suggestedAction: 'auto_merge' | 'review' | 'reject';
}

export class EntityResolver {
  private graphService: IntelGraphService;
  private scorer: MLScorer;

  constructor() {
    this.graphService = IntelGraphService.getInstance();
    this.scorer = new MLScorer();
  }

  /**
   * Finds potential duplicates for a given entity.
   */
  public async findDuplicates(
    tenantId: string,
    entityId: string,
    threshold: number = 0.7
  ): Promise<EntityResolutionResult[]> {
    // 1. Fetch target entity
    const entity = await this.graphService.getNodeById(tenantId, entityId);
    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    // 2. Fetch candidates using Blocking Strategy
    // In production, use search index or blocking keys.
    // Here we query by Email, Phone, and Name if available.
    const label = (entity as any).label || 'Person';

    let candidates: any[] = [];
    try {
        const promises: Promise<any[]>[] = [];
        const e = entity as any;

        // Block by Email
        if (e.email) {
            promises.push(this.graphService.searchNodes(tenantId, label, { email: e.email }, 50));
        }

        // Block by Phone
        if (e.phone) {
            promises.push(this.graphService.searchNodes(tenantId, label, { phone: e.phone }, 50));
        }

        // Block by Name (Exact match)
        if (e.name) {
             promises.push(this.graphService.searchNodes(tenantId, label, { name: e.name }, 50));
        }

        // Fallback: if no strong identifiers, fetch recent entities?
        // Or if promises empty (e.g. only ID known?), maybe generic search?
        // If blocking keys yielded nothing, we might want to try broader search but that's expensive.
        if (promises.length === 0) {
             promises.push(this.graphService.searchNodes(tenantId, label, {}, 100));
        }

        const resultSets = await Promise.all(promises);

        // Flatten and Deduplicate
        const uniqueMap = new Map<string, any>();
        for (const set of resultSets) {
            for (const item of set) {
                uniqueMap.set(item.id, item);
            }
        }
        candidates = Array.from(uniqueMap.values());

    } catch (e) {
        // If labels are invalid, ignore.
        console.warn('Error fetching candidates', e);
    }

    // Filter out self
    candidates = candidates.filter(c => c.id !== entityId);

    // 3. Score candidates
    const results: EntityResolutionResult[] = [];
    for (const candidate of candidates) {
      const prediction = await this.scorer.score(entity, candidate);
      if (prediction.score >= threshold) {
        results.push({
          matchCandidateId: candidate.id,
          score: prediction.score,
          confidence: prediction.confidence,
          explanation: prediction.explanation,
          suggestedAction: prediction.suggestedAction
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Recommends whether to merge two entities.
   */
  public async recommendMerge(
    tenantId: string,
    entityIdA: string,
    entityIdB: string
  ): Promise<any> {
    const entityA = await this.graphService.getNodeById(tenantId, entityIdA);
    const entityB = await this.graphService.getNodeById(tenantId, entityIdB);

    if (!entityA || !entityB) {
      throw new Error('One or both entities not found');
    }

    return this.scorer.score(entityA, entityB);
  }

  /**
   * Executes a merge of two entities.
   */
  public async merge(
    tenantId: string,
    entityIdA: string, // Primary (surviving)
    entityIdB: string, // Secondary (merging into A)
    strategies: StrategyType[] = ['recency'],
    dryRun: boolean = false
  ): Promise<any> {
    const entityA = await this.graphService.getNodeById(tenantId, entityIdA);
    const entityB = await this.graphService.getNodeById(tenantId, entityIdB);

    if (!entityA || !entityB) {
      throw new Error('One or both entities not found');
    }

    // Resolve conflict
    const mergedEntity = ConflictResolver.resolve(entityA, entityB, strategies);

    // Create merge preview / result
    const result = {
      originalA: entityA,
      originalB: entityB,
      merged: mergedEntity,
      strategies
    };

    if (dryRun) {
      return { ...result, status: 'dry-run' };
    }

    // Execute Merge
    const label = (entityA as any).labels ? (entityA as any).labels[0] : ((entityA as any).label || 'Person');

    // Remove system fields from merged object before update
    const { id, tenantId: tid, createdAt, updatedAt, ...propsToUpdate } = mergedEntity;

    await this.graphService.ensureNode(tenantId, label, propsToUpdate);

    // 2. Create relationship MERGED_INTO from B to A
    await this.graphService.createEdge(tenantId, entityIdB, entityIdA, 'MERGED_INTO', {
      timestamp: new Date().toISOString(),
      reason: 'Entity Resolution Merge'
    });

    // 3. Record Provenance
    await provenanceLedger.appendEntry({
      timestamp: new Date(),
      tenantId,
      actionType: 'MERGE_ENTITIES',
      resourceType: 'Entity',
      resourceId: entityIdA,
      actorId: 'system-entity-resolver', // Or get from context
      actorType: 'system',
      payload: {
        mutationType: 'MERGE',
        entityId: entityIdA,
        entityType: label,
        newState: {
             id: entityIdA,
             type: label,
             version: 1,
             data: mergedEntity,
             metadata: { mergedFrom: entityIdB, strategies }
        },
        reason: `Merged with ${entityIdB} using ${strategies.join(', ')}`
      },
      metadata: {
        purpose: 'Entity Resolution',
      }
    });

    return { ...result, status: 'completed' };
  }
}
