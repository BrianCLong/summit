import { randomUUID } from 'node:crypto';
import type {
  MergeRecord,
  MergeRequest,
  SplitRecord,
  SplitRequest,
  AuditEntry,
  ExplainResponse,
  ERFeatures,
  EntityRecord,
} from '../types.js';

/**
 * In-memory storage for ER operations with full audit trail
 */
export class ERStorage {
  private merges = new Map<string, MergeRecord>();
  private splits = new Map<string, SplitRecord>();
  private explanations = new Map<string, ExplainResponse>();
  private auditLog: AuditEntry[] = [];
  private entities = new Map<string, EntityRecord>();

  constructor(private readonly clock: () => Date = () => new Date()) {}

  /**
   * Store a merge operation
   */
  storeMerge(
    request: MergeRequest,
    features: ERFeatures,
    featureWeights: Record<string, number>,
    threshold: number,
    method: string,
  ): MergeRecord {
    const mergeId = randomUUID();
    const primaryId = request.primaryId || request.entityIds[0];
    const mergedIds = request.entityIds.filter(id => id !== primaryId);

    const record: MergeRecord = {
      mergeId,
      tenantId: request.tenantId,
      primaryId,
      mergedIds,
      actor: request.actor,
      reason: request.reason,
      policyTags: request.policyTags || [],
      confidence: request.confidence,
      mergedAt: this.clock().toISOString(),
      reversible: true,
      features,
    };

    this.merges.set(mergeId, record);

    // Create audit entry
    this.addAuditEntry({
      id: randomUUID(),
      tenantId: request.tenantId,
      actor: request.actor,
      event: 'merge',
      target: mergeId,
      reason: request.reason,
      metadata: {
        primaryId,
        mergedIds,
        confidence: request.confidence,
        policyTags: request.policyTags,
      },
      createdAt: record.mergedAt,
    });

    // Store explanation
    this.storeExplanation({
      mergeId,
      features,
      rationale: this.buildRationale(features, featureWeights),
      featureWeights,
      threshold,
      policyTags: request.policyTags || [],
      method,
      createdAt: record.mergedAt,
    });

    return record;
  }

  /**
   * Revert a merge operation
   */
  revertMerge(mergeId: string, actor: string, reason: string): void {
    const record = this.merges.get(mergeId);
    if (!record) {
      throw new Error(`Merge ${mergeId} not found`);
    }

    if (!record.reversible) {
      throw new Error(`Merge ${mergeId} is not reversible (locked)`);
    }

    // Remove merge record
    this.merges.delete(mergeId);

    // Create revert audit entry
    this.addAuditEntry({
      id: randomUUID(),
      tenantId: record.tenantId,
      actor,
      event: 'revert',
      target: mergeId,
      reason,
      metadata: {
        originalPrimaryId: record.primaryId,
        originalMergedIds: record.mergedIds,
        revertedAt: this.clock().toISOString(),
      },
      createdAt: this.clock().toISOString(),
    });
  }

  /**
   * Lock a merge (make it irreversible)
   */
  lockMerge(mergeId: string): void {
    const record = this.merges.get(mergeId);
    if (!record) {
      throw new Error(`Merge ${mergeId} not found`);
    }

    record.reversible = false;
    this.merges.set(mergeId, record);
  }

  /**
   * Get a merge record
   */
  getMerge(mergeId: string): MergeRecord | undefined {
    return this.merges.get(mergeId);
  }

  /**
   * Get all merges for a tenant
   */
  getMergesByTenant(tenantId: string): MergeRecord[] {
    return Array.from(this.merges.values()).filter(
      m => m.tenantId === tenantId,
    );
  }

  /**
   * Store a split operation
   */
  storeSplit(request: SplitRequest, newEntityIds: string[]): SplitRecord {
    const splitId = randomUUID();

    const record: SplitRecord = {
      splitId,
      tenantId: request.tenantId,
      originalEntityId: request.entityId,
      newEntityIds,
      actor: request.actor,
      reason: request.reason,
      splitAt: this.clock().toISOString(),
    };

    this.splits.set(splitId, record);

    // Create audit entry
    this.addAuditEntry({
      id: randomUUID(),
      tenantId: request.tenantId,
      actor: request.actor,
      event: 'split',
      target: splitId,
      reason: request.reason,
      metadata: {
        originalEntityId: request.entityId,
        newEntityIds,
        splitGroups: request.splitGroups.length,
      },
      createdAt: record.splitAt,
    });

    return record;
  }

  /**
   * Get a split record
   */
  getSplit(splitId: string): SplitRecord | undefined {
    return this.splits.get(splitId);
  }

  /**
   * Store explanation
   */
  private storeExplanation(explanation: ExplainResponse): void {
    this.explanations.set(explanation.mergeId, explanation);
  }

  /**
   * Get explanation for a merge
   */
  getExplanation(mergeId: string): ExplainResponse | undefined {
    return this.explanations.get(mergeId);
  }

  /**
   * Add audit entry
   */
  private addAuditEntry(entry: AuditEntry): void {
    this.auditLog.push(entry);
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
    let log = [...this.auditLog];

    if (options?.tenantId) {
      log = log.filter(e => e.tenantId === options.tenantId);
    }

    if (options?.actor) {
      log = log.filter(e => e.actor === options.actor);
    }

    if (options?.event) {
      log = log.filter(e => e.event === options.event);
    }

    // Sort by creation time, newest first
    log.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options?.limit) {
      log = log.slice(0, options.limit);
    }

    return log;
  }

  /**
   * Store entity (for testing/demo purposes)
   */
  storeEntity(entity: EntityRecord): void {
    this.entities.set(entity.id, entity);
  }

  /**
   * Get entity
   */
  getEntity(id: string): EntityRecord | undefined {
    return this.entities.get(id);
  }

  /**
   * Get all entities for a tenant
   */
  getEntitiesByTenant(tenantId: string): EntityRecord[] {
    return Array.from(this.entities.values()).filter(
      e => e.tenantId === tenantId,
    );
  }

  /**
   * Build human-readable rationale from features
   */
  private buildRationale(
    features: ERFeatures,
    weights: Record<string, number>,
  ): string[] {
    const rationale: string[] = [];

    const sortedWeights = Object.entries(weights)
      .sort(([, a], [, b]) => b - a);

    for (const [feature, weight] of sortedWeights) {
      if (weight > 0.05) {
        const value = features[feature as keyof ERFeatures];
        if (typeof value === 'number' && value > 0.3) {
          rationale.push(
            `${feature}: ${(value * 100).toFixed(1)}% (weight: ${(weight * 100).toFixed(0)}%)`,
          );
        } else if (typeof value === 'boolean' && value) {
          rationale.push(
            `${feature}: true (weight: ${(weight * 100).toFixed(0)}%)`,
          );
        }
      }
    }

    return rationale;
  }

  /**
   * Get storage statistics
   */
  getStats() {
    return {
      merges: this.merges.size,
      splits: this.splits.size,
      explanations: this.explanations.size,
      auditEntries: this.auditLog.length,
      entities: this.entities.size,
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.merges.clear();
    this.splits.clear();
    this.explanations.clear();
    this.auditLog = [];
    this.entities.clear();
  }
}
