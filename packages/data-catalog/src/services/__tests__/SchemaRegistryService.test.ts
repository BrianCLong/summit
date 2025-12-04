/**
 * Schema Registry Service Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SchemaRegistryService } from '../SchemaRegistryService.js';
import { IMetadataStore } from '../../stores/PostgresMetadataStore.js';
import {
  SchemaVersion,
  SchemaFormat,
  SchemaVersionStatus,
} from '../../types/metadata.js';

// Mock store implementation
class MockSchemaStore implements Partial<IMetadataStore> {
  private schemas: Map<string, SchemaVersion[]> = new Map();

  async getSchemaVersion(schemaId: string, version: number): Promise<SchemaVersion | null> {
    const versions = this.schemas.get(schemaId) || [];
    return versions.find(v => v.version === version) || null;
  }

  async getLatestSchemaVersion(schemaId: string): Promise<SchemaVersion | null> {
    const versions = this.schemas.get(schemaId) || [];
    if (versions.length === 0) {
      return null;
    }
    return versions.reduce((latest, current) =>
      current.version > latest.version ? current : latest
    );
  }

  async registerSchema(schemaVersion: SchemaVersion): Promise<SchemaVersion> {
    const versions = this.schemas.get(schemaVersion.schemaId) || [];
    versions.push(schemaVersion);
    this.schemas.set(schemaVersion.schemaId, versions);
    return schemaVersion;
  }

  async listSchemaVersions(schemaId: string): Promise<SchemaVersion[]> {
    return (this.schemas.get(schemaId) || []).sort((a, b) => b.version - a.version);
  }
}

describe('SchemaRegistryService', () => {
  let service: SchemaRegistryService;
  let store: MockSchemaStore;

  beforeEach(() => {
    store = new MockSchemaStore();
    service = new SchemaRegistryService(store as unknown as IMetadataStore);
  });

  describe('registerSchemaVersion', () => {
    it('should register first schema version', async () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
        required: ['id', 'name'],
      };

      const result = await service.registerSchemaVersion(
        'user-schema',
        schema,
        SchemaFormat.JSON_SCHEMA,
        'user1',
        {
          description: 'User schema',
          changelog: 'Initial version',
        }
      );

      expect(result).toBeDefined();
      expect(result.schemaId).toBe('user-schema');
      expect(result.version).toBe(1);
      expect(result.schema).toEqual(schema);
      expect(result.backwardCompatible).toBe(true);
      expect(result.status).toBe(SchemaVersionStatus.ACTIVE);
    });

    it('should increment version number', async () => {
      const schema1 = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      await service.registerSchemaVersion(
        'test-schema',
        schema1,
        SchemaFormat.JSON_SCHEMA,
        'user1'
      );

      const schema2 = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      };

      const result = await service.registerSchemaVersion(
        'test-schema',
        schema2,
        SchemaFormat.JSON_SCHEMA,
        'user1'
      );

      expect(result.version).toBe(2);
    });

    it('should detect breaking changes', async () => {
      const schema1 = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
        required: ['id'],
      };

      await service.registerSchemaVersion(
        'test-schema',
        schema1,
        SchemaFormat.JSON_SCHEMA,
        'user1'
      );

      const schema2 = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
        required: ['id', 'name'], // Made 'name' required - breaking change
      };

      const result = await service.registerSchemaVersion(
        'test-schema',
        schema2,
        SchemaFormat.JSON_SCHEMA,
        'user1',
        { checkCompatibility: true }
      );

      expect(result.backwardCompatible).toBe(false);
      expect(result.breakingChanges).toContain('Added required field: name');
    });
  });

  describe('checkCompatibility', () => {
    it('should detect removed fields as breaking changes', () => {
      const oldSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
        },
      };

      const newSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      };

      const result = service.checkCompatibility(oldSchema, newSchema, SchemaFormat.JSON_SCHEMA);

      expect(result.compatible).toBe(false);
      expect(result.breakingChanges).toContain('Removed field: email');
    });

    it('should detect type changes as breaking changes', () => {
      const oldSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          age: { type: 'number' },
        },
      };

      const newSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          age: { type: 'string' },
        },
      };

      const result = service.checkCompatibility(oldSchema, newSchema, SchemaFormat.JSON_SCHEMA);

      expect(result.compatible).toBe(false);
      expect(result.breakingChanges).toContain('Changed type of age from number to string');
    });

    it('should allow adding optional fields', () => {
      const oldSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      };

      const newSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
        required: ['id'],
      };

      const result = service.checkCompatibility(oldSchema, newSchema, SchemaFormat.JSON_SCHEMA);

      expect(result.compatible).toBe(true);
      expect(result.warnings).toContain('Added optional field: name');
    });

    it('should check SQL DDL compatibility', () => {
      const oldSchema = {
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'name', type: 'VARCHAR(255)', nullable: true },
        ],
      };

      const newSchema = {
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'name', type: 'VARCHAR(255)', nullable: false }, // Made non-nullable
        ],
      };

      const result = service.checkCompatibility(oldSchema, newSchema, SchemaFormat.SQL_DDL);

      expect(result.compatible).toBe(false);
      expect(result.breakingChanges).toContain('Made name non-nullable');
    });

    it('should allow adding nullable columns in SQL DDL', () => {
      const oldSchema = {
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
        ],
      };

      const newSchema = {
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'email', type: 'VARCHAR(255)', nullable: true },
        ],
      };

      const result = service.checkCompatibility(oldSchema, newSchema, SchemaFormat.SQL_DDL);

      expect(result.compatible).toBe(true);
      expect(result.warnings).toContain('Added column: email');
    });
  });

  describe('validateSchema', () => {
    it('should validate JSON Schema format', () => {
      const schema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      const result = service.validateSchema(schema, SchemaFormat.JSON_SCHEMA);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing $schema in JSON Schema', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      const result = service.validateSchema(schema, SchemaFormat.JSON_SCHEMA);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing $schema property');
    });

    it('should validate Avro schema format', () => {
      const schema = {
        type: 'record',
        name: 'User',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'age', type: 'int' },
        ],
      };

      const result = service.validateSchema(schema, SchemaFormat.AVRO);

      expect(result.valid).toBe(true);
    });

    it('should detect missing required fields in Avro schema', () => {
      const schema = {
        type: 'record',
        fields: [
          { name: 'id', type: 'string' },
        ],
      };

      const result = service.validateSchema(schema, SchemaFormat.AVRO);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Avro schema must have name');
    });

    it('should validate SQL DDL format', () => {
      const schema = {
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
        ],
      };

      const result = service.validateSchema(schema, SchemaFormat.SQL_DDL);

      expect(result.valid).toBe(true);
    });
  });

  describe('getSchemaDiff', () => {
    it('should identify added fields', () => {
      const oldSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      const newSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
        },
      };

      const diff = service.getSchemaDiff(oldSchema, newSchema, SchemaFormat.JSON_SCHEMA);

      expect(diff.added.length).toBe(2);
      expect(diff.removed.length).toBe(0);
      expect(diff.modified.length).toBe(0);
    });

    it('should identify removed fields', () => {
      const oldSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          deprecated: { type: 'string' },
        },
      };

      const newSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      const diff = service.getSchemaDiff(oldSchema, newSchema, SchemaFormat.JSON_SCHEMA);

      expect(diff.added.length).toBe(0);
      expect(diff.removed.length).toBe(1);
      expect(diff.removed[0]).toContain('deprecated');
    });

    it('should identify modified fields', () => {
      const oldSchema = {
        type: 'object',
        properties: {
          age: { type: 'number' },
        },
      };

      const newSchema = {
        type: 'object',
        properties: {
          age: { type: 'string' },
        },
      };

      const diff = service.getSchemaDiff(oldSchema, newSchema, SchemaFormat.JSON_SCHEMA);

      expect(diff.modified.length).toBe(1);
      expect(diff.modified[0]).toContain('age');
    });
  });

  describe('getLatest', () => {
    it('should return latest schema version', async () => {
      const schema1 = { type: 'object', properties: { id: { type: 'string' } } };
      await service.registerSchemaVersion('test', schema1, SchemaFormat.JSON_SCHEMA, 'user1');

      const schema2 = {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
      };
      await service.registerSchemaVersion('test', schema2, SchemaFormat.JSON_SCHEMA, 'user1');

      const latest = await service.getLatest('test');

      expect(latest).toBeDefined();
      expect(latest!.version).toBe(2);
      expect(latest!.schema).toEqual(schema2);
    });

    it('should return null for non-existent schema', async () => {
      const latest = await service.getLatest('non-existent');
      expect(latest).toBeNull();
    });
  });

  describe('listVersions', () => {
    it('should return all versions in descending order', async () => {
      await service.registerSchemaVersion(
        'test',
        { version: 1 },
        SchemaFormat.JSON_SCHEMA,
        'user1'
      );
      await service.registerSchemaVersion(
        'test',
        { version: 2 },
        SchemaFormat.JSON_SCHEMA,
        'user1'
      );
      await service.registerSchemaVersion(
        'test',
        { version: 3 },
        SchemaFormat.JSON_SCHEMA,
        'user1'
      );

      const versions = await service.listVersions('test');

      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe(3);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(1);
    });
  });
});
