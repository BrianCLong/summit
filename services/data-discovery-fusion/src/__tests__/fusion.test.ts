import { describe, it, expect, beforeEach } from 'vitest';
import { FusionEngine } from '../fusion/FusionEngine.js';

describe('FusionEngine', () => {
  let engine: FusionEngine;

  beforeEach(() => {
    engine = new FusionEngine({
      defaultStrategy: 'fuzzy_match',
      similarityThreshold: 0.8,
      conflictResolution: 'most_complete',
      enableDeduplication: true,
    });
  });

  describe('fuse', () => {
    it('should fuse matching records', async () => {
      const records = [
        { sourceId: 'src1', recordId: '1', data: { name: 'John Doe', email: 'john@example.com' } },
        { sourceId: 'src2', recordId: '2', data: { name: 'John Doe', phone: '555-1234' } },
      ];

      const results = await engine.fuse(records, ['name']);

      expect(results).toHaveLength(1);
      expect(results[0].fusedRecord).toHaveProperty('name', 'John Doe');
      expect(results[0].fusedRecord).toHaveProperty('email', 'john@example.com');
      expect(results[0].fusedRecord).toHaveProperty('phone', '555-1234');
      expect(results[0].sourceRecords).toHaveLength(2);
    });

    it('should not fuse non-matching records', async () => {
      const records = [
        { sourceId: 'src1', recordId: '1', data: { name: 'John Doe', email: 'john@example.com' } },
        { sourceId: 'src2', recordId: '2', data: { name: 'Jane Smith', email: 'jane@example.com' } },
      ];

      const results = await engine.fuse(records, ['name']);

      expect(results).toHaveLength(2);
    });

    it('should handle single record', async () => {
      const records = [
        { sourceId: 'src1', recordId: '1', data: { name: 'John Doe' } },
      ];

      const results = await engine.fuse(records, ['name']);

      expect(results).toHaveLength(1);
      expect(results[0].fusedRecord.name).toBe('John Doe');
    });

    it('should resolve conflicts using most_complete strategy', async () => {
      const records = [
        { sourceId: 'src1', recordId: '1', data: { name: 'John', desc: 'Short' } },
        { sourceId: 'src2', recordId: '2', data: { name: 'John', desc: 'A much longer description' } },
      ];

      const results = await engine.fuse(records, ['name']);

      expect(results).toHaveLength(1);
      expect(results[0].fusedRecord.desc).toBe('A much longer description');
    });
  });

  describe('deduplicate', () => {
    it('should identify duplicate records', async () => {
      const records = [
        { sourceId: 'src1', recordId: '1', data: { name: 'John Doe', email: 'john@example.com' } },
        { sourceId: 'src1', recordId: '2', data: { name: 'John Doe', email: 'john@example.com' } },
        { sourceId: 'src1', recordId: '3', data: { name: 'Jane Smith', email: 'jane@example.com' } },
      ];

      const results = await engine.deduplicate(records, ['name', 'email']);

      expect(results).toHaveLength(1);
      expect(results[0].duplicatesRemoved).toBe(1);
    });

    it('should return empty array for no duplicates', async () => {
      const records = [
        { sourceId: 'src1', recordId: '1', data: { name: 'John', email: 'john@example.com' } },
        { sourceId: 'src1', recordId: '2', data: { name: 'Jane', email: 'jane@example.com' } },
      ];

      const results = await engine.deduplicate(records, ['name', 'email']);

      expect(results).toHaveLength(0);
    });
  });
});
