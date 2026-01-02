import { IntelGraphService } from '../../services/IntelGraphService.js';
import { MLScorer } from './MLScorer.js';
import { ConflictResolver, StrategyType } from './ConflictResolver.js';
import { provenanceLedger } from '../../provenance/ledger.js';
import { randomUUID } from 'crypto';
import { SimilarityModel } from '../models/SimilarityModel.js';
import { NaiveBayesModel } from '../models/NaiveBayesModel.js';

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

  constructor(model?: SimilarityModel) {
    this.graphService = IntelGraphService.getInstance();
    // Default to NaiveBayesModel for "Advanced" resolution, or fallback to default
    this.scorer = new MLScorer(model || new NaiveBayesModel());
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
    // We use the new findSimilarNodes for fuzzy blocking.
    const label = (entity as any).label || 'Person';

    let candidates: any[] = [];
    try {
        const e = entity as any;

        // Use the new fuzzy search capability
        candidates = await this.graphService.findSimilarNodes(tenantId, label, {
            name: e.name,
            email: e.email,
            phone: e.phone
        }, 100);

        // Fallback: if no candidates found via fuzzy search, maybe fetch some recent ones?
        // But findSimilarNodes should cover exact matches too.

    } catch (e: any) {
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
