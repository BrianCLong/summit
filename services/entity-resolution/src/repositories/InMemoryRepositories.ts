/**
 * Entity Resolution Service - In-Memory Repository Implementations
 *
 * Simple in-memory implementations for development and testing
 * TODO: Replace with real database implementations for production
 */

import { EntityRecord, MatchDecision, MergeOperation } from '../domain/EntityRecord.js';
import {
  EntityRecordRepository,
  MatchDecisionRepository,
  MergeOperationRepository,
} from './EntityRecordRepository.js';

/**
 * In-memory entity record repository
 */
export class InMemoryEntityRecordRepository implements EntityRecordRepository {
  private records = new Map<string, EntityRecord>();

  async findById(id: string): Promise<EntityRecord | null> {
    return this.records.get(id) || null;
  }

  async findByIds(ids: string[]): Promise<EntityRecord[]> {
    return ids.map((id) => this.records.get(id)).filter(Boolean) as EntityRecord[];
  }

  async save(record: EntityRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async findAll(): Promise<EntityRecord[]> {
    return Array.from(this.records.values());
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }
}

/**
 * In-memory match decision repository
 */
export class InMemoryMatchDecisionRepository implements MatchDecisionRepository {
  private decisions = new Map<string, MatchDecision>();
  private recordIndex = new Map<string, string[]>(); // recordId -> decisionIds

  async save(decision: MatchDecision): Promise<void> {
    const id = decision.id || `decision-${Date.now()}-${Math.random()}`;
    decision.id = id;
    this.decisions.set(id, decision);

    // Index by both record IDs
    this.addToIndex(decision.recordIdA, id);
    this.addToIndex(decision.recordIdB, id);
  }

  async findById(id: string): Promise<MatchDecision | null> {
    return this.decisions.get(id) || null;
  }

  async findByRecordId(recordId: string): Promise<MatchDecision[]> {
    const decisionIds = this.recordIndex.get(recordId) || [];
    return decisionIds
      .map((id) => this.decisions.get(id))
      .filter(Boolean) as MatchDecision[];
  }

  async findAll(): Promise<MatchDecision[]> {
    return Array.from(this.decisions.values());
  }

  private addToIndex(recordId: string, decisionId: string): void {
    if (!this.recordIndex.has(recordId)) {
      this.recordIndex.set(recordId, []);
    }
    this.recordIndex.get(recordId)!.push(decisionId);
  }
}

/**
 * In-memory merge operation repository
 */
export class InMemoryMergeOperationRepository implements MergeOperationRepository {
  private operations = new Map<string, MergeOperation>();
  private recordIndex = new Map<string, string[]>(); // recordId -> mergeIds

  async save(operation: MergeOperation): Promise<void> {
    this.operations.set(operation.mergeId, operation);

    // Index by both record IDs
    this.addToIndex(operation.primaryId, operation.mergeId);
    this.addToIndex(operation.secondaryId, operation.mergeId);
  }

  async findById(mergeId: string): Promise<MergeOperation | null> {
    return this.operations.get(mergeId) || null;
  }

  async findByRecordId(recordId: string): Promise<MergeOperation[]> {
    const mergeIds = this.recordIndex.get(recordId) || [];
    return mergeIds
      .map((id) => this.operations.get(id))
      .filter(Boolean) as MergeOperation[];
  }

  async findAll(): Promise<MergeOperation[]> {
    return Array.from(this.operations.values());
  }

  private addToIndex(recordId: string, mergeId: string): void {
    if (!this.recordIndex.has(recordId)) {
      this.recordIndex.set(recordId, []);
    }
    this.recordIndex.get(recordId)!.push(mergeId);
  }
}
