/**
 * Tests for deprecated configuration key migration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  migrateDeprecatedKey,
  emitDeprecationWarnings,
  clearWarnings,
  getWarnings,
  isDeprecated,
  getDeprecationStatus,
} from './deprecated';

describe('Deprecated Configuration Keys', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    clearWarnings();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('migrateDeprecatedKey', () => {
    it('should return new value when only new key is set', () => {
      process.env.NEO4J_USER = 'neo4j';
      delete process.env.NEO4J_USERNAME;

      const result = migrateDeprecatedKey('NEO4J_USERNAME', 'NEO4J_USER');

      expect(result).toBe('neo4j');
      expect(getWarnings()).toHaveLength(0);
    });

    it('should return old value with warning when only old key is set', () => {
      process.env.NEO4J_USERNAME = 'neo4j';
      delete process.env.NEO4J_USER;

      const result = migrateDeprecatedKey('NEO4J_USERNAME', 'NEO4J_USER');

      expect(result).toBe('neo4j');
      expect(getWarnings()).toHaveLength(1);
      expect(getWarnings()[0]).toMatchObject({
        oldKey: 'NEO4J_USERNAME',
        newKey: 'NEO4J_USER',
        oldValue: 'neo4j',
        action: 'using_old',
      });
    });

    it('should return new value when both keys have same value', () => {
      process.env.NEO4J_USERNAME = 'neo4j';
      process.env.NEO4J_USER = 'neo4j';

      const result = migrateDeprecatedKey('NEO4J_USERNAME', 'NEO4J_USER');

      expect(result).toBe('neo4j');
      expect(getWarnings()).toHaveLength(0);
    });

    it('should warn about conflict when both keys have different values', () => {
      process.env.NEO4J_USERNAME = 'old_user';
      process.env.NEO4J_USER = 'new_user';

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = migrateDeprecatedKey('NEO4J_USERNAME', 'NEO4J_USER');

      expect(result).toBe('new_user'); // Should prefer new key
      expect(getWarnings()).toHaveLength(1);
      expect(getWarnings()[0].action).toBe('conflict');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should throw in production when there is a conflict', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.NEO4J_USERNAME = 'old_user';
      process.env.NEO4J_USER = 'new_user';

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        migrateDeprecatedKey('NEO4J_USERNAME', 'NEO4J_USER');
      }).toThrow('Configuration conflict');

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should return undefined when neither key is set', () => {
      delete process.env.NEO4J_USERNAME;
      delete process.env.NEO4J_USER;

      const result = migrateDeprecatedKey('NEO4J_USERNAME', 'NEO4J_USER');

      expect(result).toBeUndefined();
      expect(getWarnings()).toHaveLength(0);
    });
  });

  describe('emitDeprecationWarnings', () => {
    it('should emit warnings for deprecated keys in use', () => {
      process.env.NEO4J_USERNAME = 'neo4j';
      delete process.env.NEO4J_USER;

      migrateDeprecatedKey('NEO4J_USERNAME', 'NEO4J_USER');

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      emitDeprecationWarnings();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some((call) =>
        call[0]?.includes('DEPRECATED CONFIGURATION DETECTED')
      )).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should not emit warnings if no deprecated keys are used', () => {
      process.env.NEO4J_USER = 'neo4j';
      delete process.env.NEO4J_USERNAME;

      migrateDeprecatedKey('NEO4J_USERNAME', 'NEO4J_USER');

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      emitDeprecationWarnings();

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should only emit warnings once', () => {
      process.env.NEO4J_USERNAME = 'neo4j';
      delete process.env.NEO4J_USER;

      migrateDeprecatedKey('NEO4J_USERNAME', 'NEO4J_USER');

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      emitDeprecationWarnings();
      const firstCallCount = consoleSpy.mock.calls.length;

      emitDeprecationWarnings();
      const secondCallCount = consoleSpy.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount); // Should not increase

      consoleSpy.mockRestore();
    });
  });

  describe('isDeprecated', () => {
    it('should return true for deprecated keys', () => {
      expect(isDeprecated('NEO4J_USERNAME')).toBe(true);
      expect(isDeprecated('POSTGRES_URL')).toBe(true);
    });

    it('should return false for current keys', () => {
      expect(isDeprecated('NEO4J_USER')).toBe(false);
      expect(isDeprecated('DATABASE_URL')).toBe(false);
    });

    it('should return false for unknown keys', () => {
      expect(isDeprecated('RANDOM_KEY')).toBe(false);
    });
  });

  describe('getDeprecationStatus', () => {
    it('should return deprecation info for old keys', () => {
      const status = getDeprecationStatus('NEO4J_USERNAME');

      expect(status).toBeDefined();
      expect(status?.oldKey).toBe('NEO4J_USERNAME');
      expect(status?.newKey).toBe('NEO4J_USER');
      expect(status?.deprecatedSince).toBeDefined();
      expect(status?.removeIn).toBeDefined();
    });

    it('should return deprecation info for new keys', () => {
      const status = getDeprecationStatus('NEO4J_USER');

      expect(status).toBeDefined();
      expect(status?.oldKey).toBe('NEO4J_USERNAME');
      expect(status?.newKey).toBe('NEO4J_USER');
    });

    it('should return undefined for unknown keys', () => {
      const status = getDeprecationStatus('RANDOM_KEY');

      expect(status).toBeUndefined();
    });
  });

  describe('clearWarnings', () => {
    it('should clear all accumulated warnings', () => {
      process.env.NEO4J_USERNAME = 'neo4j';
      delete process.env.NEO4J_USER;

      migrateDeprecatedKey('NEO4J_USERNAME', 'NEO4J_USER');

      expect(getWarnings()).toHaveLength(1);

      clearWarnings();

      expect(getWarnings()).toHaveLength(0);
    });

    it('should allow warnings to be emitted again after clearing', () => {
      process.env.NEO4J_USERNAME = 'neo4j';
      delete process.env.NEO4J_USER;

      migrateDeprecatedKey('NEO4J_USERNAME', 'NEO4J_USER');

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      emitDeprecationWarnings();
      const firstCallCount = consoleSpy.mock.calls.length;

      clearWarnings();
      migrateDeprecatedKey('NEO4J_USERNAME', 'NEO4J_USER');
      emitDeprecationWarnings();
      const secondCallCount = consoleSpy.mock.calls.length;

      expect(secondCallCount).toBeGreaterThan(firstCallCount);

      consoleSpy.mockRestore();
    });
  });
});
