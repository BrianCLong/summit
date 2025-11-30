/**
 * Unit Tests for Matchers
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  NationalIdMatcher,
  PassportMatcher,
  EmailMatcher,
  PhoneMatcher,
  NameMatcher,
  DateOfBirthMatcher,
  AddressMatcher,
} from '../../src/matchers/index.js';
import type { MatchInput } from '../../src/matchers/base.js';

describe('Deterministic Matchers', () => {
  describe('NationalIdMatcher', () => {
    let matcher: NationalIdMatcher;

    beforeEach(() => {
      matcher = new NationalIdMatcher();
    });

    it('should match identical national IDs', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { nationalId: '123-45-6789' },
        attributesB: { nationalId: '123-45-6789' },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(1.0);
      expect(results[0].isDeterministic).toBe(true);
    });

    it('should match national IDs with different formatting', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { nationalId: '123-45-6789' },
        attributesB: { nationalId: '123456789' },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(1.0);
    });

    it('should not match different national IDs', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { nationalId: '123-45-6789' },
        attributesB: { nationalId: '987-65-4321' },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(0.0);
    });

    it('should return empty results when no IDs present', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { name: 'John' },
        attributesB: { name: 'John' },
      };

      const results = await matcher.match(input);
      expect(results.length).toBe(0);
    });
  });

  describe('EmailMatcher', () => {
    let matcher: EmailMatcher;

    beforeEach(() => {
      matcher = new EmailMatcher();
    });

    it('should match identical emails', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { email: 'john@example.com' },
        attributesB: { email: 'john@example.com' },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(1.0);
    });

    it('should match emails with different casing', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { email: 'John@Example.COM' },
        attributesB: { email: 'john@example.com' },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(1.0);
    });

    it('should match Gmail-style aliases', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { email: 'john.doe+work@gmail.com' },
        attributesB: { email: 'johndoe@gmail.com' },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(1.0);
    });

    it('should not match different emails', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { email: 'john@example.com' },
        attributesB: { email: 'jane@example.com' },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(0.0);
    });
  });

  describe('PhoneMatcher', () => {
    let matcher: PhoneMatcher;

    beforeEach(() => {
      matcher = new PhoneMatcher();
    });

    it('should match identical phone numbers', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { phone: '+1-555-123-4567' },
        attributesB: { phone: '+1-555-123-4567' },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(1.0);
    });

    it('should match phone numbers with different formatting', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { phone: '+1 (555) 123-4567' },
        attributesB: { phone: '5551234567' },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(1.0);
    });
  });

  describe('PassportMatcher', () => {
    let matcher: PassportMatcher;

    beforeEach(() => {
      matcher = new PassportMatcher();
    });

    it('should match identical passport numbers', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: {
          props: {
            identifications: [{ type: 'passport', value: 'AB123456', issuingCountry: 'US' }],
          },
        },
        attributesB: {
          props: {
            identifications: [{ type: 'passport', value: 'AB123456', issuingCountry: 'US' }],
          },
        },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(1.0);
    });
  });
});

describe('Probabilistic Matchers', () => {
  describe('NameMatcher', () => {
    let matcher: NameMatcher;

    beforeEach(() => {
      matcher = new NameMatcher();
    });

    it('should give high score for identical names', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { props: { name: 'John Smith' } },
        attributesB: { props: { name: 'John Smith' } },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(1.0);
    });

    it('should give high score for similar names', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { props: { name: 'John Smith' } },
        attributesB: { props: { name: 'Jon Smith' } },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.8);
    });

    it('should give moderate score for name order variations', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { props: { name: 'John Michael Smith' } },
        attributesB: { props: { name: 'Smith, John Michael' } },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.6);
    });

    it('should give low score for different names', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { props: { name: 'John Smith' } },
        attributesB: { props: { name: 'Jane Doe' } },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeLessThan(0.5);
    });

    it('should normalize organization names', async () => {
      const input: MatchInput = {
        entityType: 'Organization',
        attributesA: { props: { name: 'Acme Corporation Inc.' } },
        attributesB: { props: { name: 'Acme Corp' } },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.7);
    });
  });

  describe('DateOfBirthMatcher', () => {
    let matcher: DateOfBirthMatcher;

    beforeEach(() => {
      matcher = new DateOfBirthMatcher();
    });

    it('should match identical dates', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { props: { dateOfBirth: '1990-05-15' } },
        attributesB: { props: { dateOfBirth: '1990-05-15' } },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(1.0);
    });

    it('should detect day/month transposition', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { props: { dateOfBirth: '1990-05-12' } },
        attributesB: { props: { dateOfBirth: '1990-12-05' } },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.8);
      expect(results[0].explanation).toContain('transposition');
    });

    it('should give partial score for year-only match', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { props: { dateOfBirth: '1990-05-15' } },
        attributesB: { props: { dateOfBirth: '1990-08-20' } },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(0.3);
    });

    it('should give zero for completely different dates', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: { props: { dateOfBirth: '1990-05-15' } },
        attributesB: { props: { dateOfBirth: '1985-08-20' } },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBe(0.0);
    });
  });

  describe('AddressMatcher', () => {
    let matcher: AddressMatcher;

    beforeEach(() => {
      matcher = new AddressMatcher();
    });

    it('should give high score for similar addresses', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: {
          props: {
            address: {
              street: '123 Main Street',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
              country: 'USA',
            },
          },
        },
        attributesB: {
          props: {
            address: {
              street: '123 Main St',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
              country: 'USA',
            },
          },
        },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.8);
    });

    it('should give partial score for same city/country', async () => {
      const input: MatchInput = {
        entityType: 'Person',
        attributesA: {
          props: {
            address: {
              street: '123 Main Street',
              city: 'New York',
              country: 'USA',
            },
          },
        },
        attributesB: {
          props: {
            address: {
              street: '456 Oak Avenue',
              city: 'New York',
              country: 'USA',
            },
          },
        },
      };

      const results = await matcher.match(input);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.3);
    });
  });
});
