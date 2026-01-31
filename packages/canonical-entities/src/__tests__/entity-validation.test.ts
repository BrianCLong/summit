/**
 * Canonical Entity Validation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  PersonEntity,
  OrganizationEntity,
  AssetEntity,
  EventEntity,
  validateEntity,
  createEntity,
} from '../types';

describe('Canonical Entity Validation', () => {
  describe('PersonEntity', () => {
    it('should validate a valid person entity', () => {
      const person: PersonEntity = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        canonicalId: null,
        entityType: 'Person',
        confidence: { score: 0.95, method: 'ml-classifier' },
        source: 'connector:ofac',
        sources: [{ sourceId: 'ofac-123', fetchedAt: new Date() }],
        classification: 'UNCLASSIFIED',
        compartments: [],
        tenantId: 'tenant-1',
        validFrom: new Date('2024-01-01'),
        validTo: null,
        observedAt: new Date(),
        recordedAt: new Date(),
        name: { full: 'John Doe', first: 'John', last: 'Doe' },
        identifiers: [{ type: 'passport', value: 'AB123456', country: 'US' }],
        nationalities: ['US'],
      };

      const result = validateEntity(person);
      expect(result.success).toBe(true);
    });

    it('should reject person without required name', () => {
      const invalidPerson = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        entityType: 'Person',
        // missing name
      };

      const result = validateEntity(invalidPerson as any);
      expect(result.success).toBe(false);
    });

    it('should validate identifiers schema', () => {
      const person: Partial<PersonEntity> = {
        identifiers: [
          { type: 'passport', value: 'AB123456', country: 'US' },
          { type: 'ssn', value: '***-**-1234', country: 'US' }, // masked
        ],
      };

      expect(person.identifiers).toHaveLength(2);
      expect(person.identifiers![0].type).toBe('passport');
    });
  });

  describe('OrganizationEntity', () => {
    it('should validate organization with LEI', () => {
      const org: OrganizationEntity = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        canonicalId: null,
        entityType: 'Organization',
        confidence: { score: 0.99, method: 'exact-match' },
        source: 'connector:gleif',
        sources: [],
        classification: 'UNCLASSIFIED',
        compartments: [],
        tenantId: 'tenant-1',
        validFrom: new Date(),
        validTo: null,
        observedAt: new Date(),
        recordedAt: new Date(),
        name: 'Acme Corporation',
        legalName: 'Acme Corporation Inc.',
        lei: '5493001KJTIIGC8Y1R12',
        jurisdiction: 'US-DE',
        entityStatus: 'active',
      };

      const result = validateEntity(org);
      expect(result.success).toBe(true);
    });
  });

  describe('AssetEntity', () => {
    it('should validate financial asset', () => {
      const asset: AssetEntity = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        canonicalId: null,
        entityType: 'Asset',
        confidence: { score: 0.85, method: 'rule-based' },
        source: 'connector:internal',
        sources: [],
        classification: 'CONFIDENTIAL',
        compartments: ['FINANCE'],
        tenantId: 'tenant-1',
        validFrom: new Date(),
        validTo: null,
        observedAt: new Date(),
        recordedAt: new Date(),
        assetType: 'financial',
        name: 'Corporate Account',
        value: { amount: 1000000, currency: 'USD' },
        ownership: [{ entityId: 'org-123', percentage: 100 }],
      };

      const result = validateEntity(asset);
      expect(result.success).toBe(true);
    });
  });

  describe('EventEntity', () => {
    it('should validate event with participants', () => {
      const event: EventEntity = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        canonicalId: null,
        entityType: 'Event',
        confidence: { score: 0.75, method: 'nlp-extraction' },
        source: 'connector:news',
        sources: [],
        classification: 'UNCLASSIFIED',
        compartments: [],
        tenantId: 'tenant-1',
        validFrom: new Date(),
        validTo: null,
        observedAt: new Date(),
        recordedAt: new Date(),
        eventType: 'meeting',
        name: 'Board Meeting Q4',
        occurredAt: new Date('2024-12-01'),
        location: { type: 'address', value: 'New York, NY' },
        participants: [
          { entityId: 'person-1', role: 'attendee' },
          { entityId: 'person-2', role: 'chair' },
        ],
      };

      const result = validateEntity(event);
      expect(result.success).toBe(true);
    });
  });

  describe('Bitemporal Fields', () => {
    it('should require observedAt and recordedAt', () => {
      const entity = createEntity('Person', {
        name: { full: 'Test User' },
      });

      expect(entity.observedAt).toBeDefined();
      expect(entity.recordedAt).toBeDefined();
      expect(entity.validFrom).toBeDefined();
    });

    it('should track temporal validity', () => {
      const entity = createEntity('Person', {
        name: { full: 'Test User' },
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2024-12-31'),
      });

      const now = new Date('2024-06-15');
      const isValid =
        entity.validFrom <= now && (entity.validTo === null || entity.validTo >= now);

      expect(isValid).toBe(true);
    });
  });

  describe('Classification', () => {
    it('should validate classification levels', () => {
      const validLevels = [
        'UNCLASSIFIED',
        'CONFIDENTIAL',
        'SECRET',
        'TOP_SECRET',
      ];

      validLevels.forEach((level) => {
        const entity = createEntity('Person', {
          name: { full: 'Test' },
          classification: level as any,
        });
        expect(entity.classification).toBe(level);
      });
    });

    it('should handle compartments', () => {
      const entity = createEntity('Person', {
        name: { full: 'Test' },
        classification: 'SECRET',
        compartments: ['GAMMA', 'SIGINT'],
      });

      expect(entity.compartments).toContain('GAMMA');
      expect(entity.compartments).toContain('SIGINT');
    });
  });
});
