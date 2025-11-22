/**
 * Entity Resolution Service - Repository Interfaces
 *
 * Abstractions for data persistence
 */

import { EntityRecord, MatchDecision, MergeOperation } from '../domain/EntityRecord.js';

/**
 * Repository interface for entity records
 */
export interface EntityRecordRepository {
  /**
   * Find entity record by ID
   */
  findById(id: string): Promise<EntityRecord | null>;

  /**
   * Find multiple entity records by IDs
   */
  findByIds(ids: string[]): Promise<EntityRecord[]>;

  /**
   * Save an entity record
   */
  save(record: EntityRecord): Promise<void>;

  /**
   * Find all entity records (use with caution - for small datasets)
   */
  findAll(): Promise<EntityRecord[]>;

  /**
   * Delete an entity record (for split/undo operations)
   */
  delete(id: string): Promise<void>;
}

/**
 * Repository interface for match decisions
 */
export interface MatchDecisionRepository {
  /**
   * Save a match decision
   */
  save(decision: MatchDecision): Promise<void>;

  /**
   * Find decision by ID
   */
  findById(id: string): Promise<MatchDecision | null>;

  /**
   * Find all decisions for a record
   */
  findByRecordId(recordId: string): Promise<MatchDecision[]>;

  /**
   * Find all decisions
   */
  findAll(): Promise<MatchDecision[]>;
}

/**
 * Repository interface for merge operations
 */
export interface MergeOperationRepository {
  /**
   * Save a merge operation
   */
  save(operation: MergeOperation): Promise<void>;

  /**
   * Find merge operation by ID
   */
  findById(mergeId: string): Promise<MergeOperation | null>;

  /**
   * Find all merge operations for a record
   */
  findByRecordId(recordId: string): Promise<MergeOperation[]>;

  /**
   * Find all merge operations
   */
  findAll(): Promise<MergeOperation[]>;
}
