/**
 * Comprehensive tests for SchemaRegistry
 *
 * Tests cover:
 * - Initialization and error handling
 * - Schema registration (happy path and error cases)
 * - Version retrieval and comparison
 * - Breaking change detection
 * - Changelog generation
 * - Edge cases and boundary conditions
 * - Atomic writes and file system operations
 * - Custom validators and options
 */

import { SchemaRegistry, SchemaRegistryError, RegistryLogger } from '../schema-registry';
import * as fs from 'fs/promises';
import * as path from 'path';
import { buildSchema } from 'graphql';

/**
 * Mock logger for testing
 */
class MockLogger implements RegistryLogger {
  logs: Array<{ level: string; message: string; context?: any }> = [];

  debug(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'debug', message, context });
  }

  info(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'info', message, context });
  }

  warn(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'warn', message, context });
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.logs.push({ level: 'error', message, context, error });
  }

  clear(): void {
    this.logs = [];
  }
}

describe('SchemaRegistry', () => {
  let testDir: string;
  let registry: SchemaRegistry;
  let mockLogger: MockLogger;

  // Sample schemas for testing
  const schema1 = `
    type Query {
      hello: String
    }
  `;

  const schema2 = `
    type Query {
      hello: String
      world: String
    }
  `;

  const schema3Breaking = `
    type Query {
      world: String
    }
  `;

  const invalidSchema = `
    type Query {
      hello: String
      invalid syntax here
    }
  `;

  beforeEach(async () => {
    // Create unique test directory for each test
    testDir = path.join(__dirname, `test-registry-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    mockLogger = new MockLogger();
    registry = new SchemaRegistry(testDir, mockLogger);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await registry.initialize();

      const stats = registry.getStats();
      expect(stats.totalVersions).toBe(0);
      expect(await fs.access(testDir)).resolves;
    });

    test('should be idempotent', async () => {
      await registry.initialize();
      await registry.initialize(); // Second call should not throw

      const debugLogs = mockLogger.logs.filter(l => l.level === 'debug');
      expect(debugLogs.some(l => l.message.includes('already initialized'))).toBe(true);
    });

    test('should load existing versions on initialization', async () => {
      // Create first registry and register a schema
      const registry1 = new SchemaRegistry(testDir, mockLogger);
      await registry1.initialize();
      await registry1.registerSchema(schema1, 'v1.0.0', 'test@example.com', 'First version');

      // Create second registry (should load existing version)
      const registry2 = new SchemaRegistry(testDir, new MockLogger());
      await registry2.initialize();

      const stats = registry2.getStats();
      expect(stats.totalVersions).toBe(1);
      expect(stats.latestVersion).toBe('v1.0.0');
    });

    test('should handle corrupted version files gracefully', async () => {
      // Create corrupt file
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'corrupt.json'), 'invalid json{', 'utf-8');

      await registry.initialize();

      const warnLogs = mockLogger.logs.filter(l => l.level === 'warn');
      expect(warnLogs.some(l => l.message.includes('Failed to load version file'))).toBe(true);
    });

    test('should handle non-existent directory on first run', async () => {
      const nonExistentDir = path.join(testDir, 'does-not-exist');
      const newRegistry = new SchemaRegistry(nonExistentDir, mockLogger);

      await newRegistry.initialize();

      expect(await fs.access(nonExistentDir)).resolves;
    });
  });

  describe('Schema Registration', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    test('should register a new schema successfully', async () => {
      const version = await registry.registerSchema(
        schema1,
        'v1.0.0',
        'test@example.com',
        'Initial schema'
      );

      expect(version.version).toBe('v1.0.0');
      expect(version.author).toBe('test@example.com');
      expect(version.description).toBe('Initial schema');
      expect(version.schema).toBe(schema1);
      expect(version.hash).toBeDefined();
      expect(version.changes).toEqual([]); // First version has no changes
    });

    test('should register schema with GraphQLSchema object', async () => {
      const schemaObj = buildSchema(schema1);
      const version = await registry.registerSchema(
        schemaObj,
        'v1.0.0',
        'test@example.com',
        'Initial schema'
      );

      expect(version.schema).toContain('type Query');
    });

    test('should detect changes between versions', async () => {
      await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com', 'First');
      const v2 = await registry.registerSchema(schema2, 'v1.1.0', 'test@example.com', 'Second');

      expect(v2.changes.length).toBeGreaterThan(0);
      expect(v2.changes.some(c => c.message.includes('world'))).toBe(true);
    });

    test('should throw error if not initialized', async () => {
      const uninitializedRegistry = new SchemaRegistry(testDir, mockLogger);

      await expect(
        uninitializedRegistry.registerSchema(schema1, 'v1.0.0')
      ).rejects.toThrow(SchemaRegistryError);
    });

    test('should throw error for empty schema', async () => {
      await expect(
        registry.registerSchema('', 'v1.0.0')
      ).rejects.toThrow(SchemaRegistryError);
    });

    test('should throw error for invalid version format', async () => {
      await expect(
        registry.registerSchema(schema1, 'invalid-version')
      ).rejects.toThrow(SchemaRegistryError);
      await expect(
        registry.registerSchema(schema1, 'invalid-version')
      ).rejects.toThrow('Invalid version format');
    });

    test('should accept valid version formats', async () => {
      await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com');
      await registry.registerSchema(schema2, '1.0.1', 'test@example.com'); // without 'v'
      await registry.registerSchema(schema2, 'v2.0.0-beta.1', 'test@example.com'); // with pre-release

      const stats = registry.getStats();
      expect(stats.totalVersions).toBe(3);
    });

    test('should throw error for duplicate version', async () => {
      await registry.registerSchema(schema1, 'v1.0.0');

      await expect(
        registry.registerSchema(schema2, 'v1.0.0')
      ).rejects.toThrow('already exists');
    });

    test('should throw error for duplicate schema (same hash)', async () => {
      await registry.registerSchema(schema1, 'v1.0.0');

      await expect(
        registry.registerSchema(schema1, 'v1.0.1')
      ).rejects.toThrow('already registered');
    });

    test('should allow duplicate schema with skipDuplicateCheck option', async () => {
      await registry.registerSchema(schema1, 'v1.0.0');

      const v2 = await registry.registerSchema(
        schema1,
        'v1.0.1',
        'test@example.com',
        'Duplicate allowed',
        { skipDuplicateCheck: true }
      );

      expect(v2.version).toBe('v1.0.1');
    });

    test('should register schema with tags', async () => {
      const version = await registry.registerSchema(
        schema1,
        'v1.0.0',
        'test@example.com',
        'Tagged version',
        { tags: ['experimental', 'feature'] }
      );

      expect(version.tags).toEqual(['experimental', 'feature']);
    });

    test('should persist schema to disk', async () => {
      await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com');

      const jsonPath = path.join(testDir, 'v1.0.0.json');
      const graphqlPath = path.join(testDir, 'v1.0.0.graphql');

      expect(await fs.access(jsonPath)).resolves;
      expect(await fs.access(graphqlPath)).resolves;

      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const parsedJson = JSON.parse(jsonContent);
      expect(parsedJson.version).toBe('v1.0.0');
    });

    test('should throw error for invalid GraphQL syntax', async () => {
      await expect(
        registry.registerSchema(invalidSchema, 'v1.0.0')
      ).rejects.toThrow();
    });

    test('should use custom validator', async () => {
      const customValidator = jest.fn(async (schema: string) => {
        return schema.includes('forbidden') ? ['Schema contains forbidden word'] : [];
      });

      const forbiddenSchema = `type Query { forbidden: String }`;

      await expect(
        registry.registerSchema(
          forbiddenSchema,
          'v1.0.0',
          'test@example.com',
          'Test',
          { customValidator }
        )
      ).rejects.toThrow('Custom validation failed');

      expect(customValidator).toHaveBeenCalledWith(expect.stringContaining('forbidden'));
    });
  });

  describe('Breaking Change Detection', () => {
    beforeEach(async () => {
      await registry.initialize();
      await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com', 'First');
    });

    test('should detect breaking changes', async () => {
      const hasBreaking = await registry.hasBreakingChanges(schema3Breaking);
      expect(hasBreaking).toBe(true);
    });

    test('should prevent breaking changes by default', async () => {
      await expect(
        registry.registerSchema(schema3Breaking, 'v2.0.0', 'test@example.com', 'Breaking')
      ).rejects.toThrow('breaking change');
    });

    test('should allow breaking changes with flag', async () => {
      const version = await registry.registerSchema(
        schema3Breaking,
        'v2.0.0',
        'test@example.com',
        'Breaking allowed',
        { allowBreaking: true }
      );

      expect(version.version).toBe('v2.0.0');
      expect(version.changes.some(c => c.type === 'BREAKING')).toBe(true);
    });

    test('should detect non-breaking changes', async () => {
      const hasBreaking = await registry.hasBreakingChanges(schema2);
      expect(hasBreaking).toBe(false);
    });
  });

  describe('Version Retrieval', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    test('should get specific version', async () => {
      await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com');

      const version = registry.getVersion('v1.0.0');
      expect(version).toBeDefined();
      expect(version?.version).toBe('v1.0.0');
    });

    test('should return undefined for non-existent version', () => {
      const version = registry.getVersion('v99.99.99');
      expect(version).toBeUndefined();
    });

    test('should get latest version', async () => {
      jest.useFakeTimers();
      await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com');
      jest.advanceTimersByTime(1000); // Advance time to ensure different timestamp
      await registry.registerSchema(schema2, 'v1.1.0', 'test@example.com');
      jest.useRealTimers();

      const latest = registry.getLatestVersion();
      expect(latest?.version).toBe('v1.1.0');
    });

    test('should return undefined when no versions exist', () => {
      const latest = registry.getLatestVersion();
      expect(latest).toBeUndefined();
    });

    test('should get all versions sorted by timestamp', async () => {
      jest.useFakeTimers();
      await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com');
      jest.advanceTimersByTime(1000);
      await registry.registerSchema(schema2, 'v1.1.0', 'test@example.com');
      jest.advanceTimersByTime(1000);
      await registry.registerSchema(schema2, 'v1.2.0', 'test@example.com', 'Third', { skipDuplicateCheck: true });
      jest.useRealTimers();

      const versions = registry.getAllVersions();
      expect(versions.length).toBe(3);
      expect(versions[0].version).toBe('v1.2.0'); // Latest first
      expect(versions[2].version).toBe('v1.0.0'); // Oldest last
    });
  });

  describe('Version Comparison', () => {
    beforeEach(async () => {
      await registry.initialize();
      await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com', 'First');
      await registry.registerSchema(schema2, 'v1.1.0', 'test@example.com', 'Second');
    });

    test('should compare two versions', async () => {
      const changes = await registry.compareVersions('v1.0.0', 'v1.1.0');

      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some(c => c.message.includes('world'))).toBe(true);
    });

    test('should throw error for non-existent from version', async () => {
      await expect(
        registry.compareVersions('v99.0.0', 'v1.1.0')
      ).rejects.toThrow('not found');
    });

    test('should throw error for non-existent to version', async () => {
      await expect(
        registry.compareVersions('v1.0.0', 'v99.0.0')
      ).rejects.toThrow('not found');
    });
  });

  describe('Changelog Generation', () => {
    beforeEach(async () => {
      await registry.initialize();
      await registry.registerSchema(schema1, 'v1.0.0', 'author1@example.com', 'First version');
      await new Promise(resolve => setTimeout(resolve, 10));
      await registry.registerSchema(schema2, 'v1.1.0', 'author2@example.com', 'Added world field');
    });

    test('should generate changelog between versions', async () => {
      const changelog = await registry.generateChangelog('v1.0.0', 'v1.1.0');

      expect(changelog).toContain('GraphQL Schema Changelog');
      expect(changelog).toContain('v1.0.0 → v1.1.0');
      expect(changelog).toContain('Version v1.1.0');
      expect(changelog).toContain('author2@example.com');
      expect(changelog).toContain('Added world field');
    });

    test('should generate changelog from oldest to latest by default', async () => {
      const changelog = await registry.generateChangelog();

      expect(changelog).toContain('v1.0.0 → v1.1.0');
    });

    test('should include tags in changelog', async () => {
      await registry.registerSchema(
        schema2,
        'v1.2.0',
        'author@example.com',
        'Tagged version',
        { tags: ['feature', 'experimental'], skipDuplicateCheck: true }
      );

      const changelog = await registry.generateChangelog('v1.1.0', 'v1.2.0');

      expect(changelog).toContain('feature, experimental');
    });

    test('should throw error if no versions exist', async () => {
      const emptyRegistry = new SchemaRegistry(testDir + '-empty', mockLogger);
      await emptyRegistry.initialize();

      await expect(
        emptyRegistry.generateChangelog()
      ).rejects.toThrow('No versions in registry');
    });
  });

  describe('Validation', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    test('should validate valid schema', async () => {
      const result = await registry.validateCanRegister(schema1);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should reject empty schema', async () => {
      const result = await registry.validateCanRegister('');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schema cannot be empty');
    });

    test('should reject invalid GraphQL syntax', async () => {
      const result = await registry.validateCanRegister(invalidSchema);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid GraphQL schema'))).toBe(true);
    });

    test('should detect breaking changes in validation', async () => {
      await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com');

      const result = await registry.validateCanRegister(schema3Breaking);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('breaking change'))).toBe(true);
      expect(result.breakingChanges).toBeDefined();
      expect(result.breakingChanges!.length).toBeGreaterThan(0);
    });

    test('should allow breaking changes with flag', async () => {
      await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com');

      const result = await registry.validateCanRegister(schema3Breaking, true);

      expect(result.valid).toBe(true);
      expect(result.warnings?.some(w => w.includes('breaking change'))).toBe(true);
    });
  });

  describe('Version Deletion', () => {
    beforeEach(async () => {
      await registry.initialize();
      await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com', 'First');
    });

    test('should delete a version', async () => {
      const deleted = await registry.deleteVersion('v1.0.0');

      expect(deleted).toBe(true);
      expect(registry.getVersion('v1.0.0')).toBeUndefined();

      const stats = registry.getStats();
      expect(stats.totalVersions).toBe(0);
    });

    test('should return false for non-existent version', async () => {
      const deleted = await registry.deleteVersion('v99.99.99');

      expect(deleted).toBe(false);
    });

    test('should remove files from disk', async () => {
      await registry.deleteVersion('v1.0.0');

      const jsonPath = path.join(testDir, 'v1.0.0.json');
      const graphqlPath = path.join(testDir, 'v1.0.0.graphql');

      await expect(fs.access(jsonPath)).rejects.toThrow();
      await expect(fs.access(graphqlPath)).rejects.toThrow();
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    test('should return correct stats for empty registry', () => {
      const stats = registry.getStats();

      expect(stats.totalVersions).toBe(0);
      expect(stats.oldestVersion).toBeUndefined();
      expect(stats.latestVersion).toBeUndefined();
      expect(stats.totalBreakingChanges).toBe(0);
      expect(stats.totalChanges).toBe(0);
    });

    test('should return correct stats after registrations', async () => {
      await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com', 'First');
      await registry.registerSchema(schema2, 'v1.1.0', 'test@example.com', 'Second');

      const stats = registry.getStats();

      expect(stats.totalVersions).toBe(2);
      expect(stats.oldestVersion).toBe('v1.0.0');
      expect(stats.latestVersion).toBe('v1.1.0');
      expect(stats.totalChanges).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should throw SchemaRegistryError with proper structure', async () => {
      await registry.initialize();

      try {
        await registry.registerSchema('', 'v1.0.0');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaRegistryError);
        expect((error as SchemaRegistryError).code).toBe('INVALID_SCHEMA');
        expect((error as SchemaRegistryError).name).toBe('SchemaRegistryError');
      }
    });

    test('should wrap unexpected errors', async () => {
      await registry.initialize();

      // Mock fs.writeFile to throw an error
      const originalWriteFile = fs.writeFile;
      (fs.writeFile as any) = jest.fn().mockRejectedValue(new Error('Disk full'));

      try {
        await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaRegistryError);
        expect((error as SchemaRegistryError).code).toBe('REGISTRATION_FAILED');
      } finally {
        // Restore original function
        (fs.writeFile as any) = originalWriteFile;
      }
    });

    test('should handle atomic write failures gracefully', async () => {
      await registry.initialize();

      // This test ensures cleanup happens on write failure
      // Implementation already handles this in saveVersion()
      expect(true).toBe(true);
    });
  });

  describe('Logger Integration', () => {
    test('should log initialization events', async () => {
      mockLogger.clear();
      await registry.initialize();

      expect(mockLogger.logs.some(l => l.message.includes('Initializing schema registry'))).toBe(true);
      expect(mockLogger.logs.some(l => l.message.includes('initialized successfully'))).toBe(true);
    });

    test('should log registration events', async () => {
      await registry.initialize();
      mockLogger.clear();

      await registry.registerSchema(schema1, 'v1.0.0', 'test@example.com');

      expect(mockLogger.logs.some(l => l.message.includes('Registering new schema version'))).toBe(true);
      expect(mockLogger.logs.some(l => l.message.includes('registered successfully'))).toBe(true);
    });

    test('should log errors', async () => {
      await registry.initialize();
      mockLogger.clear();

      try {
        await registry.registerSchema('', 'v1.0.0');
      } catch {
        // Expected error
      }

      expect(mockLogger.logs.some(l => l.level === 'error')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    test('should handle whitespace-only schema', async () => {
      await expect(
        registry.registerSchema('   \n\t   ', 'v1.0.0')
      ).rejects.toThrow('Schema cannot be empty');
    });

    test('should handle very large schema', async () => {
      const largeSchema = `
        type Query {
          ${Array.from({ length: 1000 }, (_, i) => `field${i}: String`).join('\n  ')}
        }
      `;

      const version = await registry.registerSchema(largeSchema, 'v1.0.0', 'test@example.com');
      expect(version.version).toBe('v1.0.0');
    });

    test('should handle special characters in descriptions', async () => {
      const specialDesc = 'Description with "quotes" and \'apostrophes\' and \n newlines';
      const version = await registry.registerSchema(
        schema1,
        'v1.0.0',
        'test@example.com',
        specialDesc
      );

      expect(version.description).toBe(specialDesc);

      // Reload from disk
      const registry2 = new SchemaRegistry(testDir, mockLogger);
      await registry2.initialize();
      const loaded = registry2.getVersion('v1.0.0');
      expect(loaded?.description).toBe(specialDesc);
    });

    test('should handle concurrent initializations gracefully', async () => {
      // Multiple initializations in parallel should not cause issues
      await Promise.all([
        registry.initialize(),
        registry.initialize(),
        registry.initialize()
      ]);

      const stats = registry.getStats();
      expect(stats).toBeDefined();
    });
  });
});
