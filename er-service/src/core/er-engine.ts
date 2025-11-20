import { randomUUID } from 'node:crypto';
import type {
  CandidateRequest,
  CandidateResponse,
  MergeRequest,
  MergeRecord,
  SplitRequest,
  SplitRecord,
  ExplainResponse,
  AuditEntry,
  EntityRecord,
  ScoringConfig,
} from '../types.js';
import { DEFAULT_SCORING_CONFIG } from '../types.js';
import { createScorer } from '../scoring/scorer.js';
import { ERStorage } from '../storage/storage.js';

/**
 * Main Entity Resolution Engine
 * Orchestrates candidate finding, merging, splitting, and explanations
 */
export class EREngine {
  private storage: ERStorage;
  private config: ScoringConfig;

  constructor(
    config: Partial<ScoringConfig> = {},
    storage?: ERStorage,
  ) {
    this.config = { ...DEFAULT_SCORING_CONFIG, ...config } as ScoringConfig;
    this.storage = storage || new ERStorage();
  }

  /**
   * Find candidate matches for an entity
   */
  candidates(request: CandidateRequest): CandidateResponse {
    const startTime = Date.now();
    const requestId = randomUUID();

    // Filter population to same tenant
    const population = request.population.filter(
      candidate => candidate.tenantId === request.tenantId,
    );

    // Create scorer based on method
    const scoringConfig: ScoringConfig = {
      ...this.config,
      method: request.method || this.config.method,
      threshold: request.threshold || this.config.threshold,
    };

    const scorer = createScorer(scoringConfig);

    // Score all candidates
    const scored = population
      .filter(candidate => candidate.id !== request.entity.id)
      .map(candidate => scorer.score(request.entity, candidate))
      .filter(result => result.score >= scoringConfig.threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, request.topK || 5);

    const executionTimeMs = Date.now() - startTime;

    return {
      requestId,
      candidates: scored,
      method: scorer.getMethod(),
      executionTimeMs,
    };
  }

  /**
   * Merge entities
   */
  merge(request: MergeRequest): MergeRecord {
    // Validate request
    if (request.entityIds.length < 2) {
      throw new Error('At least 2 entity IDs required for merge');
    }

    // Ensure all entities belong to the same tenant
    const entities = request.entityIds.map(id => {
      const entity = this.storage.getEntity(id);
      if (!entity) {
        throw new Error(`Entity ${id} not found`);
      }
      if (entity.tenantId !== request.tenantId) {
        throw new Error(`Entity ${id} does not belong to tenant ${request.tenantId}`);
      }
      return entity;
    });

    // If no primary specified, use first entity
    const primaryId = request.primaryId || request.entityIds[0];
    const primary = entities.find(e => e.id === primaryId);
    if (!primary) {
      throw new Error(`Primary entity ${primaryId} not found`);
    }

    // Calculate features between primary and each merged entity
    const scorer = createScorer(this.config);
    const scores = entities
      .filter(e => e.id !== primaryId)
      .map(e => scorer.score(primary, e));

    // Use features from first comparison
    const features = scores[0]?.features;
    if (!features) {
      throw new Error('Could not extract features for merge');
    }

    // Store merge
    const record = this.storage.storeMerge(
      request,
      features,
      this.config.weights,
      this.config.threshold,
      this.config.method,
    );

    return record;
  }

  /**
   * Revert a merge
   */
  revertMerge(mergeId: string, actor: string, reason: string): void {
    this.storage.revertMerge(mergeId, actor, reason);
  }

  /**
   * Split an entity
   */
  split(request: SplitRequest): SplitRecord {
    // Validate request
    if (request.splitGroups.length < 2) {
      throw new Error('At least 2 split groups required');
    }

    // Verify entity exists
    const entity = this.storage.getEntity(request.entityId);
    if (!entity) {
      throw new Error(`Entity ${request.entityId} not found`);
    }

    if (entity.tenantId !== request.tenantId) {
      throw new Error(`Entity ${request.entityId} does not belong to tenant ${request.tenantId}`);
    }

    // Create new entity IDs for each split
    const newEntityIds = request.splitGroups.map(() => randomUUID());

    // Create new entities
    request.splitGroups.forEach((group, index) => {
      const newEntity: EntityRecord = {
        id: newEntityIds[index],
        type: entity.type,
        name: entity.name,
        tenantId: entity.tenantId,
        attributes: { ...entity.attributes, ...group.attributes },
        deviceIds: group.deviceIds,
        accountIds: group.accountIds,
      };
      this.storage.storeEntity(newEntity);
    });

    // Store split record
    const record = this.storage.storeSplit(request, newEntityIds);

    return record;
  }

  /**
   * Explain a merge decision
   */
  explain(mergeId: string): ExplainResponse {
    const explanation = this.storage.getExplanation(mergeId);
    if (!explanation) {
      throw new Error(`Explanation for merge ${mergeId} not found`);
    }
    return explanation;
  }

  /**
   * Get merge record
   */
  getMerge(mergeId: string): MergeRecord | undefined {
    return this.storage.getMerge(mergeId);
  }

  /**
   * Get split record
   */
  getSplit(splitId: string): SplitRecord | undefined {
    return this.storage.getSplit(splitId);
  }

  /**
   * Get audit log
   */
  getAuditLog(options?: {
    tenantId?: string;
    actor?: string;
    event?: 'merge' | 'revert' | 'split';
    limit?: number;
  }): AuditEntry[] {
    return this.storage.getAuditLog(options);
  }

  /**
   * Store entity (for testing/demo)
   */
  storeEntity(entity: EntityRecord): void {
    this.storage.storeEntity(entity);
  }

  /**
   * Get entity
   */
  getEntity(id: string): EntityRecord | undefined {
    return this.storage.getEntity(id);
  }

  /**
   * Get all entities for a tenant
   */
  getEntitiesByTenant(tenantId: string): EntityRecord[] {
    return this.storage.getEntitiesByTenant(tenantId);
  }

  /**
   * Get statistics
   */
  getStats() {
    return this.storage.getStats();
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.storage.clear();
  }
}
