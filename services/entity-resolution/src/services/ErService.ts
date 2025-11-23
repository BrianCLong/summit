/**
 * Entity Resolution Service - Main Service Class
 *
 * Orchestrates entity resolution with explainability and human-in-the-loop
 */

import {
  EntityRecord,
  MatchDecision,
  MergeOperation,
  MergedEntity,
  MergeOutcome,
} from '../domain/EntityRecord.js';
import {
  EntityRecordRepository,
  MatchDecisionRepository,
  MergeOperationRepository,
} from '../repositories/EntityRecordRepository.js';
import { ClassifierConfig, decideMatch } from '../matching/classifier.js';
import { findCandidatePairs } from '../matching/blocking.js';
import { randomUUID } from 'crypto';

/**
 * Main ER Service
 */
export class ErService {
  constructor(
    private entityRepo: EntityRecordRepository,
    private decisionRepo: MatchDecisionRepository,
    private mergeRepo: MergeOperationRepository,
    private config: ClassifierConfig
  ) {}

  /**
   * Compare two entity records on demand
   * Returns a MatchDecision with full explainability
   */
  async compare(
    recordA: EntityRecord,
    recordB: EntityRecord,
    decidedBy: string = 'er-engine'
  ): Promise<MatchDecision> {
    const decision = decideMatch(recordA, recordB, this.config, decidedBy);

    // Save decision to repository
    await this.decisionRepo.save(decision);

    return decision;
  }

  /**
   * Find candidate matches for a batch of records
   * Uses blocking to reduce O(N²) comparisons
   */
  async batchCandidates(
    records: EntityRecord[],
    maxCandidatesPerRecord: number = 10
  ): Promise<{ decisions: MatchDecision[] }> {
    // Find candidate pairs using blocking
    const candidatePairs = findCandidatePairs(records);

    // Create a map for quick record lookup
    const recordMap = new Map<string, EntityRecord>();
    for (const record of records) {
      recordMap.set(record.id, record);
    }

    // Score each pair
    const decisions: MatchDecision[] = [];

    for (const [idA, idB] of candidatePairs) {
      const recordA = recordMap.get(idA);
      const recordB = recordMap.get(idB);

      if (!recordA || !recordB) continue;

      const decision = decideMatch(recordA, recordB, this.config);
      await this.decisionRepo.save(decision);
      decisions.push(decision);
    }

    // Sort by score descending
    decisions.sort((a, b) => b.matchScore - a.matchScore);

    return { decisions };
  }

  /**
   * Apply a merge: combine secondary into primary
   * Stores pre-merge snapshots for reversibility
   */
  async merge(
    primaryId: string,
    secondaryId: string,
    triggeredBy: string,
    reason: string,
    decisionId?: string
  ): Promise<MergedEntity> {
    // Fetch both records
    const primary = await this.entityRepo.findById(primaryId);
    const secondary = await this.entityRepo.findById(secondaryId);

    if (!primary) {
      throw new Error(`Primary record not found: ${primaryId}`);
    }
    if (!secondary) {
      throw new Error(`Secondary record not found: ${secondaryId}`);
    }

    // Fetch decision context if provided
    let decisionContext: MatchDecision | undefined;
    if (decisionId) {
      decisionContext = (await this.decisionRepo.findById(decisionId)) || undefined;
    }

    // Create merge operation with pre-merge snapshot
    const mergeOperation: MergeOperation = {
      mergeId: randomUUID(),
      primaryId,
      secondaryId,
      outcome: 'APPLIED',
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      reason,
      decisionContext,
      preMergeSnapshot: {
        primaryRecord: JSON.parse(JSON.stringify(primary)),
        secondaryRecord: JSON.parse(JSON.stringify(secondary)),
      },
    };

    // Save merge operation
    await this.mergeRepo.save(mergeOperation);

    // Perform merge: Merge attributes from secondary into primary
    const mergedAttributes = this.mergeAttributes(
      primary.attributes,
      secondary.attributes
    );

    const mergedEntity: EntityRecord = {
      ...primary,
      attributes: mergedAttributes,
      updatedAt: new Date().toISOString(),
    };

    // Mark secondary as merged (soft delete)
    const mergedSecondary: EntityRecord = {
      ...secondary,
      attributes: {
        ...secondary.attributes,
        _merged: true,
        _mergedInto: primaryId,
        _mergeOperationId: mergeOperation.mergeId,
      },
      updatedAt: new Date().toISOString(),
    };

    // Update repositories
    await this.entityRepo.save(mergedEntity);
    await this.entityRepo.save(mergedSecondary);

    return {
      id: mergedEntity.id,
      entityType: mergedEntity.entityType,
      attributes: mergedEntity.attributes,
      mergedFrom: [primaryId, secondaryId],
      mergeOperationId: mergeOperation.mergeId,
    };
  }

  /**
   * Split (undo) a merge operation
   * Restores records to their pre-merge state
   */
  async split(mergeId: string, reason: string, triggeredBy: string): Promise<void> {
    // Fetch merge operation
    const mergeOp = await this.mergeRepo.findById(mergeId);

    if (!mergeOp) {
      throw new Error(`Merge operation not found: ${mergeId}`);
    }

    if (mergeOp.outcome !== 'APPLIED') {
      throw new Error(`Merge operation is not in APPLIED state: ${mergeOp.outcome}`);
    }

    if (!mergeOp.preMergeSnapshot) {
      throw new Error(`No pre-merge snapshot available for merge: ${mergeId}`);
    }

    // Restore original records from snapshot
    const { primaryRecord, secondaryRecord } = mergeOp.preMergeSnapshot;

    await this.entityRepo.save(primaryRecord);
    await this.entityRepo.save(secondaryRecord);

    // Update merge operation status
    const updatedMergeOp: MergeOperation = {
      ...mergeOp,
      outcome: 'REJECTED',
    };

    await this.mergeRepo.save(updatedMergeOp);
  }

  /**
   * Get match decision by ID
   */
  async getDecision(id: string): Promise<MatchDecision | null> {
    return this.decisionRepo.findById(id);
  }

  /**
   * Get merge history for a record
   */
  async getMergeHistory(recordId: string): Promise<MergeOperation[]> {
    return this.mergeRepo.findByRecordId(recordId);
  }

  /**
   * Merge attributes strategy: prefer non-null values from primary,
   * fill in missing values from secondary
   */
  private mergeAttributes(
    primary: Record<string, any>,
    secondary: Record<string, any>
  ): Record<string, any> {
    const merged = { ...primary };

    for (const key of Object.keys(secondary)) {
      // Skip internal merge markers
      if (key.startsWith('_merge')) continue;

      // If primary doesn't have this key, add it
      if (!(key in merged) || merged[key] === null || merged[key] === undefined) {
        merged[key] = secondary[key];
      }
    }

    return merged;
  }
}
