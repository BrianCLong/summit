
import { describe, expect, test, beforeEach } from '@jest/globals';
import { SchemaRegistryService } from '../../src/governance/ontology/SchemaRegistryService';
import { SchemaDefinition } from '../../src/governance/ontology/models';

describe('SchemaRegistryService', () => {
  let registry: SchemaRegistryService;

  beforeEach(async () => {
    // Reset singleton instance for testing if possible, or just use the instance
    // Since it's a singleton without a reset method, we might have state carryover.
    // For this unit test, we'll just check basic functionality.
    registry = SchemaRegistryService.getInstance();
    await registry.ensureInitialized();
  });

  test('should return a default bootstrap schema', () => {
    const latest = registry.getLatestSchema();
    expect(latest).toBeDefined();
    expect(latest?.version).toBe('1.0.0');
    expect(latest?.status).toBe('ACTIVE');
  });

  test('should register a new schema version', async () => {
    const newDef: SchemaDefinition = {
      entities: [],
      edges: []
    };

    const version = await registry.registerSchema(newDef, 'Test change', 'tester');
    expect(version.version).toBe('1.1.0'); // 1.0.0 -> 1.1.0
    expect(version.status).toBe('DRAFT');

    // Should not be latest active yet
    expect(registry.getLatestSchema()?.version).toBe('1.0.0');
  });

  test('should activate a schema', async () => {
    const newDef: SchemaDefinition = { entities: [], edges: [] };
    const version = await registry.registerSchema(newDef, 'Activation test', 'tester');

    await registry.activateSchema(version.id, 'admin');

    expect(registry.getLatestSchema()?.id).toBe(version.id);
    expect(registry.getLatestSchema()?.status).toBe('ACTIVE');
  });
});
