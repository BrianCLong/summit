import { describe, it, expect, beforeEach } from 'vitest';
import { CitizenProfileAggregator } from '../citizen-profile-aggregator.js';

describe('CitizenProfileAggregator', () => {
  let aggregator: CitizenProfileAggregator;

  beforeEach(() => {
    aggregator = new CitizenProfileAggregator();
  });

  describe('createProfile', () => {
    it('should create a new profile with provided data', async () => {
      const profile = await aggregator.createProfile({
        personal: { firstName: 'John', lastName: 'Doe', dateOfBirth: '1990-01-15' },
        contact: { email: 'john@example.com', phone: '555-1234' },
        address: { street: '123 Main St', city: 'Springfield', state: 'IL', zipCode: '62701', country: 'US' },
      });

      expect(profile.id).toBeDefined();
      expect(profile.personal.firstName).toBe('John');
      expect(profile.contact.email).toBe('john@example.com');
    });

    it('should generate UUID if not provided', async () => {
      const profile = await aggregator.createProfile({});
      expect(profile.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('aggregateFromSubmission', () => {
    it('should create profile from first submission', async () => {
      const profile = await aggregator.aggregateFromSubmission('citizen-1', 'form-1', {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        street: '456 Oak Ave',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
      });

      expect(profile.personal.firstName).toBe('Jane');
      expect(profile.personal.lastName).toBe('Smith');
      expect(profile.contact.email).toBe('jane@example.com');
      expect(profile.address.city).toBe('Chicago');
      expect(profile.submissions).toHaveLength(1);
    });

    it('should update existing profile with new submission', async () => {
      await aggregator.aggregateFromSubmission('citizen-2', 'form-1', {
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@example.com',
      });

      const updated = await aggregator.aggregateFromSubmission('citizen-2', 'form-2', {
        phone: '555-9999',
        employer: 'Acme Corp',
        income: 75000,
      });

      expect(updated.personal.firstName).toBe('Bob');
      expect(updated.contact.phone).toBe('555-9999');
      expect(updated.employment?.employer).toBe('Acme Corp');
      expect(updated.submissions).toHaveLength(2);
    });

    it('should handle alternative field names', async () => {
      const profile = await aggregator.aggregateFromSubmission('citizen-3', 'form-1', {
        dob: '1985-06-20',
        phoneNumber: '555-1111',
        zip: '90210',
        address: '789 Elm St',
      });

      expect(profile.personal.dateOfBirth).toBe('1985-06-20');
      expect(profile.contact.phone).toBe('555-1111');
      expect(profile.address.zipCode).toBe('90210');
      expect(profile.address.street).toBe('789 Elm St');
    });
  });

  describe('getProfile', () => {
    it('should return null for non-existent profile', async () => {
      const profile = await aggregator.getProfile('non-existent');
      expect(profile).toBeNull();
    });

    it('should return existing profile', async () => {
      await aggregator.createProfile({
        id: 'test-id',
        personal: { firstName: 'Test', lastName: 'User', dateOfBirth: '2000-01-01' },
      });

      const profile = await aggregator.getProfile('test-id');
      expect(profile?.personal.firstName).toBe('Test');
    });
  });

  describe('findByIdentifier', () => {
    beforeEach(async () => {
      await aggregator.createProfile({
        id: 'find-test',
        identifiers: { ssn: '123-45-6789' },
        contact: { email: 'find@example.com', phone: '555-FIND' },
        personal: { firstName: 'Find', lastName: 'Me', dateOfBirth: '1995-03-10' },
        address: { street: '', city: '', state: '', zipCode: '', country: 'US' },
      });
    });

    it('should find by email', async () => {
      const profile = await aggregator.findByIdentifier('email', 'find@example.com');
      expect(profile?.id).toBe('find-test');
    });

    it('should find by SSN', async () => {
      const profile = await aggregator.findByIdentifier('ssn', '123-45-6789');
      expect(profile?.id).toBe('find-test');
    });

    it('should find by phone', async () => {
      const profile = await aggregator.findByIdentifier('phone', '555-FIND');
      expect(profile?.id).toBe('find-test');
    });

    it('should return null for non-matching identifier', async () => {
      const profile = await aggregator.findByIdentifier('email', 'wrong@example.com');
      expect(profile).toBeNull();
    });
  });
});
