/**
 * Entity Resolution Service - Integration Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ErService } from '../services/ErService.js';
import {
  InMemoryEntityRecordRepository,
  InMemoryMatchDecisionRepository,
  InMemoryMergeOperationRepository,
} from '../repositories/InMemoryRepositories.js';
import { DEFAULT_CONFIG } from '../matching/classifier.js';
import { EntityRecord } from '../domain/EntityRecord.js';

describe('ErService', () => {
  let service: ErService;
  let entityRepo: InMemoryEntityRecordRepository;
  let decisionRepo: InMemoryMatchDecisionRepository;
  let mergeRepo: InMemoryMergeOperationRepository;

  beforeEach(() => {
    entityRepo = new InMemoryEntityRecordRepository();
    decisionRepo = new InMemoryMatchDecisionRepository();
    mergeRepo = new InMemoryMergeOperationRepository();
    service = new ErService(entityRepo, decisionRepo, mergeRepo, DEFAULT_CONFIG);
  });

  describe('compare', () => {
    it('should compare two records and return decision', async () => {
      const recordA: EntityRecord = {
        id: 'A1',
        entityType: 'Person',
        attributes: {
          name: 'John Smith',
          email: 'john.smith@example.com',
        },
      };

      const recordB: EntityRecord = {
        id: 'B1',
        entityType: 'Person',
        attributes: {
          name: 'John Smith',
          email: 'john.smith@example.com',
        },
      };

      const decision = await service.compare(recordA, recordB);

      expect(decision).toBeDefined();
      expect(decision.recordIdA).toBe('A1');
      expect(decision.recordIdB).toBe('B1');
      expect(decision.outcome).toBe('MERGE');
      expect(decision.explanation).toBeDefined();
    });

    it('should save decision to repository', async () => {
      const recordA: EntityRecord = {
        id: 'A1',
        entityType: 'Person',
        attributes: { name: 'John' },
      };

      const recordB: EntityRecord = {
        id: 'B1',
        entityType: 'Person',
        attributes: { name: 'John' },
      };

      const decision = await service.compare(recordA, recordB);

      const savedDecision = await decisionRepo.findById(decision.id!);
      expect(savedDecision).toBeDefined();
      expect(savedDecision?.matchScore).toBe(decision.matchScore);
    });
  });

  describe('merge and split', () => {
    it('should merge two records', async () => {
      const primary: EntityRecord = {
        id: 'primary-1',
        entityType: 'Person',
        attributes: {
          name: 'John Smith',
          email: 'john@example.com',
        },
      };

      const secondary: EntityRecord = {
        id: 'secondary-1',
        entityType: 'Person',
        attributes: {
          name: 'J. Smith',
          phone: '+1-555-0100',
        },
      };

      await entityRepo.save(primary);
      await entityRepo.save(secondary);

      const merged = await service.merge(
        'primary-1',
        'secondary-1',
        'user-123',
        'Same person, different records'
      );

      expect(merged).toBeDefined();
      expect(merged.id).toBe('primary-1');
      expect(merged.attributes.email).toBe('john@example.com');
      expect(merged.attributes.phone).toBe('+1-555-0100'); // Merged from secondary
    });

    it('should split (undo) a merge', async () => {
      const primary: EntityRecord = {
        id: 'primary-2',
        entityType: 'Person',
        attributes: { name: 'Alice', age: 30 },
      };

      const secondary: EntityRecord = {
        id: 'secondary-2',
        entityType: 'Person',
        attributes: { name: 'Alice', city: 'NYC' },
      };

      await entityRepo.save(primary);
      await entityRepo.save(secondary);

      // Merge
      const merged = await service.merge(
        'primary-2',
        'secondary-2',
        'user-123',
        'Test merge'
      );

      const mergeId = merged.mergeOperationId;

      // Split
      await service.split(mergeId, 'Test split', 'user-123');

      // Verify original records are restored
      const restoredPrimary = await entityRepo.findById('primary-2');
      const restoredSecondary = await entityRepo.findById('secondary-2');

      expect(restoredPrimary).toBeDefined();
      expect(restoredSecondary).toBeDefined();
      expect(restoredPrimary?.attributes.city).toBeUndefined(); // Should not have merged attribute
    });

    it('should throw error when trying to split non-existent merge', async () => {
      await expect(
        service.split('non-existent-merge', 'Test', 'user-123')
      ).rejects.toThrow('Merge operation not found');
    });
  });

  describe('getMergeHistory', () => {
    it('should return merge history for a record', async () => {
      const primary: EntityRecord = {
        id: 'primary-3',
        entityType: 'Person',
        attributes: { name: 'Bob' },
      };

      const secondary: EntityRecord = {
        id: 'secondary-3',
        entityType: 'Person',
        attributes: { name: 'Robert' },
      };

      await entityRepo.save(primary);
      await entityRepo.save(secondary);

      await service.merge('primary-3', 'secondary-3', 'user-123', 'Merge test');

      const history = await service.getMergeHistory('primary-3');

      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].primaryId).toBe('primary-3');
      expect(history[0].secondaryId).toBe('secondary-3');
    });
  });
});
