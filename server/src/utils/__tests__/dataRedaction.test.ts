import { describe, it, expect } from '@jest/globals';
import { redactData } from '../dataRedaction.js';
import { User } from '../../types/context.js';

describe('redactData', () => {
  const mockUser = (role: string): User => ({
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Data structure that matches PII_DEFINITIONS exact paths
  const sampleData = {
    id: '123',
    email: 'sensitive@example.com',
    phone: '123-456-7890',
    properties: {
      email: 'nested@example.com',
      ssn: '123-45-6789',
      creditCard: '1111-2222-3333-4444',
      name: 'John Doe',
      address: '123 Main St'
    },
    // Unknown path - currently NOT redacted
    profile: {
      name: 'Jane Doe'
    }
  };

  it('should redact sensitive data for VIEWER role', () => {
    const user = mockUser('VIEWER');
    const result = redactData(sampleData, user);

    // Root fields
    expect(result.email).toBe('[REDACTED]');
    expect(result.phone).toBe('[REDACTED]');

    // Nested fields matching "properties.*"
    expect(result.properties.email).toBe('[REDACTED]');
    expect(result.properties.name).toBe('J***e'); // MASK_PARTIAL
    expect(result.properties.address).toBe('[REDACTED]');
    expect(result.properties.ssn).toBe('[REDACTED]');
    expect(result.properties.creditCard).toBe('[REDACTED]');

    // Unknown path remains untouched
    expect(result.profile.name).toBe('Jane Doe');
  });

  it('should redact sensitive data for ANALYST role', () => {
    const user = mockUser('ANALYST');
    const result = redactData(sampleData, user);

    expect(result.email).toBe('sen***@example.com'); // MASK_PARTIAL
    expect(result.phone).toBe('***-***-7890'); // MASK_PARTIAL
    expect(result.properties.ssn).toBe('[REDACTED]');
    expect(result.properties.creditCard).toBe('[REDACTED]');

    // NAME and ADDRESS are not in ANALYST policy
    expect(result.properties.name).toBe('John Doe');
    expect(result.properties.address).toBe('123 Main St');
  });

  it('should not redact data for ADMIN role', () => {
    const user = mockUser('ADMIN');
    const result = redactData(sampleData, user);

    expect(result).toEqual(sampleData);
  });

  it('should handle null and undefined data', () => {
    const user = mockUser('VIEWER');
    expect(redactData(null, user)).toBeNull();
    expect(redactData(undefined, user)).toBeUndefined();
  });

  it('should not modify the original object', () => {
    const user = mockUser('VIEWER');
    const original = JSON.parse(JSON.stringify(sampleData));
    const result = redactData(sampleData, user);

    expect(sampleData).toEqual(original);
    expect(result).not.toBe(sampleData);
  });
});
