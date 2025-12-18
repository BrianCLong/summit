/**
 * Unit tests for TimeIndex
 */

import { describe, expect, it, beforeEach } from '@jest/globals';
import { TimeIndex, createTimeIndex, type TimeIndexEntry } from '../indexes/TimeIndex.js';

describe('TimeIndex', () => {
  let index: TimeIndex<{ name: string }>;

  beforeEach(() => {
    index = createTimeIndex<{ name: string }>();
  });

  describe('insert', () => {
    it('inserts entries correctly', () => {
      index.insert({
        id: '1',
        entityId: 'entity-1',
        start: 0,
        end: 100,
        data: { name: 'test' },
      });

      expect(index.count).toBe(1);
      expect(index.has('1')).toBe(true);
    });

    it('updates existing entry on duplicate id', () => {
      index.insert({
        id: '1',
        entityId: 'entity-1',
        start: 0,
        end: 100,
        data: { name: 'original' },
      });

      index.insert({
        id: '1',
        entityId: 'entity-1',
        start: 50,
        end: 150,
        data: { name: 'updated' },
      });

      expect(index.count).toBe(1);
      expect(index.get('1')?.data.name).toBe('updated');
      expect(index.get('1')?.start).toBe(50);
    });
  });

  describe('delete', () => {
    it('deletes existing entry', () => {
      index.insert({
        id: '1',
        entityId: 'entity-1',
        start: 0,
        end: 100,
        data: { name: 'test' },
      });

      expect(index.delete('1')).toBe(true);
      expect(index.count).toBe(0);
      expect(index.has('1')).toBe(false);
    });

    it('returns false for non-existent entry', () => {
      expect(index.delete('non-existent')).toBe(false);
    });
  });

  describe('findOverlapping', () => {
    beforeEach(() => {
      index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
      index.insert({ id: '2', entityId: 'e1', start: 50, end: 150, data: { name: 'b' } });
      index.insert({ id: '3', entityId: 'e2', start: 200, end: 300, data: { name: 'c' } });
      index.insert({ id: '4', entityId: 'e2', start: 250, end: 350, data: { name: 'd' } });
    });

    it('finds all overlapping entries', () => {
      const results = index.findOverlapping({ start: 75, end: 125 });
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id).sort()).toEqual(['1', '2']);
    });

    it('finds entries at exact timestamp', () => {
      const results = index.findOverlapping({ start: 100, end: 100 });
      expect(results).toHaveLength(2);
    });

    it('returns empty for non-overlapping window', () => {
      const results = index.findOverlapping({ start: 400, end: 500 });
      expect(results).toHaveLength(0);
    });

    it('finds all entries for full range', () => {
      const results = index.findOverlapping({ start: 0, end: 500 });
      expect(results).toHaveLength(4);
    });
  });

  describe('findAtTime', () => {
    beforeEach(() => {
      index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
      index.insert({ id: '2', entityId: 'e1', start: 50, end: 150, data: { name: 'b' } });
    });

    it('finds entries containing timestamp', () => {
      const results = index.findAtTime(75);
      expect(results).toHaveLength(2);
    });

    it('returns empty for timestamp outside all intervals', () => {
      const results = index.findAtTime(200);
      expect(results).toHaveLength(0);
    });
  });

  describe('findByEntity', () => {
    beforeEach(() => {
      index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
      index.insert({ id: '2', entityId: 'e1', start: 200, end: 300, data: { name: 'b' } });
      index.insert({ id: '3', entityId: 'e2', start: 50, end: 150, data: { name: 'c' } });
    });

    it('finds all entries for entity', () => {
      const results = index.findByEntity('e1');
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.entityId === 'e1')).toBe(true);
    });

    it('returns empty for non-existent entity', () => {
      const results = index.findByEntity('non-existent');
      expect(results).toHaveLength(0);
    });
  });

  describe('findByEntityInWindow', () => {
    beforeEach(() => {
      index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
      index.insert({ id: '2', entityId: 'e1', start: 200, end: 300, data: { name: 'b' } });
      index.insert({ id: '3', entityId: 'e2', start: 50, end: 150, data: { name: 'c' } });
    });

    it('finds entity entries in time window', () => {
      const results = index.findByEntityInWindow('e1', { start: 0, end: 150 });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('returns empty for entity outside window', () => {
      const results = index.findByEntityInWindow('e1', { start: 400, end: 500 });
      expect(results).toHaveLength(0);
    });
  });

  describe('getEntityIds', () => {
    it('returns all unique entity IDs', () => {
      index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
      index.insert({ id: '2', entityId: 'e1', start: 200, end: 300, data: { name: 'b' } });
      index.insert({ id: '3', entityId: 'e2', start: 50, end: 150, data: { name: 'c' } });

      const entityIds = index.getEntityIds();
      expect(entityIds.sort()).toEqual(['e1', 'e2']);
    });
  });

  describe('getTimeBounds', () => {
    it('returns null for empty index', () => {
      expect(index.getTimeBounds()).toBeNull();
    });

    it('returns correct bounds', () => {
      index.insert({ id: '1', entityId: 'e1', start: 50, end: 100, data: { name: 'a' } });
      index.insert({ id: '2', entityId: 'e1', start: 200, end: 300, data: { name: 'b' } });

      const bounds = index.getTimeBounds();
      expect(bounds).toEqual({ start: 50, end: 300 });
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
      index.insert({ id: '2', entityId: 'e1', start: 200, end: 300, data: { name: 'b' } });

      index.clear();

      expect(index.count).toBe(0);
      expect(index.getEntityIds()).toHaveLength(0);
    });
  });

  describe('entries iterator', () => {
    it('iterates over all entries', () => {
      index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
      index.insert({ id: '2', entityId: 'e2', start: 200, end: 300, data: { name: 'b' } });

      const entries = Array.from(index.entries());
      expect(entries).toHaveLength(2);
    });
  });
});
