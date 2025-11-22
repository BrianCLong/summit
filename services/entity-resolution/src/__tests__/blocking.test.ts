/**
 * Entity Resolution Service - Blocking Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  computeBlockingKeys,
  groupByBlockingKeys,
  findCandidatePairs,
} from '../matching/blocking.js';
import { EntityRecord } from '../domain/EntityRecord.js';

describe('Blocking', () => {
  describe('computeBlockingKeys', () => {
    it('should generate email domain key', () => {
      const record: EntityRecord = {
        id: '1',
        entityType: 'Person',
        attributes: {
          email: 'john@example.com',
        },
      };

      const keys = computeBlockingKeys(record);

      expect(keys.some((k) => k.key.includes('example.com'))).toBe(true);
    });

    it('should generate name+country key', () => {
      const record: EntityRecord = {
        id: '2',
        entityType: 'Person',
        attributes: {
          name: 'John Smith',
          country: 'US',
        },
      };

      const keys = computeBlockingKeys(record);

      expect(keys.some((k) => k.key.includes('smith') && k.key.includes('us'))).toBe(true);
    });

    it('should generate org key', () => {
      const record: EntityRecord = {
        id: '3',
        entityType: 'Organization',
        attributes: {
          organization: 'Acme Corp',
        },
      };

      const keys = computeBlockingKeys(record);

      expect(keys.some((k) => k.key.includes('org:'))).toBe(true);
    });

    it('should fallback to entity type if no other keys', () => {
      const record: EntityRecord = {
        id: '4',
        entityType: 'Person',
        attributes: {},
      };

      const keys = computeBlockingKeys(record);

      expect(keys.some((k) => k.key === 'type:Person')).toBe(true);
    });
  });

  describe('groupByBlockingKeys', () => {
    it('should group records by shared keys', () => {
      const records: EntityRecord[] = [
        {
          id: '1',
          entityType: 'Person',
          attributes: { email: 'john@example.com' },
        },
        {
          id: '2',
          entityType: 'Person',
          attributes: { email: 'jane@example.com' },
        },
        {
          id: '3',
          entityType: 'Person',
          attributes: { email: 'bob@different.com' },
        },
      ];

      const groups = groupByBlockingKeys(records);

      // Records 1 and 2 should share email_domain:example.com
      const exampleGroup = groups.get('email_domain:example.com');
      expect(exampleGroup).toBeDefined();
      expect(exampleGroup).toContain('1');
      expect(exampleGroup).toContain('2');
      expect(exampleGroup).not.toContain('3');
    });
  });

  describe('findCandidatePairs', () => {
    it('should find pairs that share blocking keys', () => {
      const records: EntityRecord[] = [
        {
          id: '1',
          entityType: 'Person',
          attributes: { email: 'john@example.com' },
        },
        {
          id: '2',
          entityType: 'Person',
          attributes: { email: 'jane@example.com' },
        },
      ];

      const pairs = findCandidatePairs(records);

      expect(pairs.length).toBeGreaterThan(0);
      expect(pairs).toContainEqual(['1', '2']);
    });

    it('should not create pairs for records without shared keys', () => {
      const records: EntityRecord[] = [
        {
          id: '1',
          entityType: 'Person',
          attributes: { email: 'john@example.com' },
        },
        {
          id: '2',
          entityType: 'Person',
          attributes: { email: 'jane@different.com' },
        },
      ];

      const pairs = findCandidatePairs(records);

      // Should not create a pair based solely on email domains
      expect(pairs).not.toContainEqual(['1', '2']);
    });

    it('should avoid duplicate pairs', () => {
      const records: EntityRecord[] = [
        {
          id: '1',
          entityType: 'Person',
          attributes: {
            email: 'john@example.com',
            organization: 'Acme',
          },
        },
        {
          id: '2',
          entityType: 'Person',
          attributes: {
            email: 'jane@example.com',
            organization: 'Acme',
          },
        },
      ];

      const pairs = findCandidatePairs(records);

      // Should only have one pair (1,2), not duplicated
      const pair12Count = pairs.filter(
        (p) => (p[0] === '1' && p[1] === '2') || (p[0] === '2' && p[1] === '1')
      ).length;

      expect(pair12Count).toBe(1);
    });
  });
});
