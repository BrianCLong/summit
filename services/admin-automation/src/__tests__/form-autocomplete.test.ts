import { describe, it, expect, beforeEach } from 'vitest';
import { CitizenProfileAggregator } from '../citizen-profile-aggregator.js';
import { FormAutocomplete } from '../form-autocomplete.js';
import type { FormField } from '../types.js';

describe('FormAutocomplete', () => {
  let aggregator: CitizenProfileAggregator;
  let autocomplete: FormAutocomplete;

  beforeEach(async () => {
    aggregator = new CitizenProfileAggregator();
    autocomplete = new FormAutocomplete(aggregator);

    // Create test citizen
    await aggregator.createProfile({
      id: 'citizen-autocomplete',
      personal: {
        firstName: 'Alice',
        lastName: 'Johnson',
        middleName: 'Marie',
        dateOfBirth: '1988-07-22',
        gender: 'female',
      },
      contact: {
        email: 'alice@example.com',
        phone: '555-2468',
      },
      address: {
        street: '100 Pine St',
        city: 'Boston',
        state: 'MA',
        zipCode: '02101',
        country: 'US',
      },
      identifiers: {
        ssn: '987-65-4321',
        driverLicense: 'DL123456',
      },
      employment: {
        employer: 'Tech Corp',
        occupation: 'Engineer',
        income: 95000,
        employmentStatus: 'employed',
      },
      documents: [],
      submissions: [],
    });
  });

  describe('autocompleteForm', () => {
    it('should auto-fill standard fields', async () => {
      const fields: FormField[] = [
        { id: 'f1', name: 'firstName', type: 'text', required: true },
        { id: 'f2', name: 'lastName', type: 'text', required: true },
        { id: 'f3', name: 'email', type: 'email', required: true },
        { id: 'f4', name: 'phone', type: 'phone', required: false },
      ];

      const result = await autocomplete.autocompleteForm('citizen-autocomplete', fields);

      expect(result.values.f1).toBe('Alice');
      expect(result.values.f2).toBe('Johnson');
      expect(result.values.f3).toBe('alice@example.com');
      expect(result.values.f4).toBe('555-2468');
      expect(result.completedCount).toBe(4);
      expect(result.completionRate).toBe(1);
    });

    it('should handle alternative field names', async () => {
      const fields: FormField[] = [
        { id: 'f1', name: 'first_name', type: 'text', required: true },
        { id: 'f2', name: 'last_name', type: 'text', required: true },
        { id: 'f3', name: 'dob', type: 'date', required: true },
        { id: 'f4', name: 'zip', type: 'text', required: true },
      ];

      const result = await autocomplete.autocompleteForm('citizen-autocomplete', fields);

      expect(result.values.f1).toBe('Alice');
      expect(result.values.f2).toBe('Johnson');
      expect(result.values.f3).toBe('1988-07-22');
      expect(result.values.f4).toBe('02101');
    });

    it('should use custom profile mapping when provided', async () => {
      const fields: FormField[] = [
        { id: 'f1', name: 'customField', type: 'text', required: true, profileMapping: 'employment.employer' },
      ];

      const result = await autocomplete.autocompleteForm('citizen-autocomplete', fields);

      expect(result.values.f1).toBe('Tech Corp');
    });

    it('should return empty for non-existent citizen', async () => {
      const fields: FormField[] = [
        { id: 'f1', name: 'firstName', type: 'text', required: true },
      ];

      const result = await autocomplete.autocompleteForm('non-existent', fields);

      expect(result.completedCount).toBe(0);
      expect(result.completionRate).toBe(0);
    });

    it('should calculate correct completion rate for partial matches', async () => {
      const fields: FormField[] = [
        { id: 'f1', name: 'firstName', type: 'text', required: true },
        { id: 'f2', name: 'unknownField', type: 'text', required: true },
        { id: 'f3', name: 'anotherUnknown', type: 'text', required: false },
        { id: 'f4', name: 'email', type: 'email', required: true },
      ];

      const result = await autocomplete.autocompleteForm('citizen-autocomplete', fields);

      expect(result.completedCount).toBe(2);
      expect(result.totalFields).toBe(4);
      expect(result.completionRate).toBe(0.5);
    });
  });

  describe('suggestValues', () => {
    it('should suggest matching value', async () => {
      const suggestions = await autocomplete.suggestValues('citizen-autocomplete', 'firstName', 'Al');
      expect(suggestions).toContain('Alice');
    });

    it('should return empty for non-matching prefix', async () => {
      const suggestions = await autocomplete.suggestValues('citizen-autocomplete', 'firstName', 'Bo');
      expect(suggestions).toHaveLength(0);
    });

    it('should be case-insensitive', async () => {
      const suggestions = await autocomplete.suggestValues('citizen-autocomplete', 'firstName', 'al');
      expect(suggestions).toContain('Alice');
    });
  });

  describe('validatePrefill', () => {
    it('should validate matching value', async () => {
      const result = await autocomplete.validatePrefill('citizen-autocomplete', 'firstName', 'Alice');
      expect(result.valid).toBe(true);
    });

    it('should invalidate non-matching value', async () => {
      const result = await autocomplete.validatePrefill('citizen-autocomplete', 'firstName', 'Bob');
      expect(result.valid).toBe(false);
      expect(result.profileValue).toBe('Alice');
    });

    it('should validate for unknown fields', async () => {
      const result = await autocomplete.validatePrefill('citizen-autocomplete', 'unknownField', 'anything');
      expect(result.valid).toBe(true);
    });
  });
});
