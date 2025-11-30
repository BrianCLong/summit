/**
 * Schema Registry Service Unit Tests
 */

import { SchemaRegistryService } from '../SchemaRegistryService';
import {
  SchemaType,
  CompatibilityMode,
  SchemaStatus,
  VersionType,
} from '../../types/schemaRegistry';

describe('SchemaRegistryService', () => {
  let service: SchemaRegistryService;

  beforeEach(() => {
    service = new SchemaRegistryService();
  });

  describe('registerSchema', () => {
    it('should register a new schema successfully', async () => {
      const request = {
        name: 'UserSchema',
        namespace: 'com.example',
        description: 'User entity schema',
        type: SchemaType.JSON_SCHEMA,
        format: 'json',
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['id', 'name', 'email'],
        },
        compatibilityMode: CompatibilityMode.BACKWARD,
        owner: 'data-team',
        tags: ['user', 'core'],
        domain: 'customer',
        properties: {},
      };

      const schema = await service.registerSchema(request);

      expect(schema).toBeDefined();
      expect(schema.id).toBeDefined();
      expect(schema.name).toBe('UserSchema');
      expect(schema.namespace).toBe('com.example');
      expect(schema.fullyQualifiedName).toBe('com.example.UserSchema');
      expect(schema.version).toBe('1.0.0');
      expect(schema.versionNumber).toBe(1);
      expect(schema.status).toBe(SchemaStatus.ACTIVE);
      expect(schema.owner).toBe('data-team');
      expect(schema.tags).toContain('user');
    });

    it('should prevent duplicate schema registration', async () => {
      const request = {
        name: 'DuplicateSchema',
        namespace: 'com.example',
        description: 'Test schema',
        type: SchemaType.JSON_SCHEMA,
        format: 'json',
        schema: {
          type: 'object',
          properties: { id: { type: 'string' } },
        },
        compatibilityMode: CompatibilityMode.NONE,
        owner: 'data-team',
        tags: [],
        domain: null,
        properties: {},
      };

      await service.registerSchema(request);

      // Try to register the same schema again
      await expect(service.registerSchema(request)).rejects.toThrow(
        'Schema already exists',
      );
    });

    it('should create schema with correct initial version', async () => {
      const request = {
        name: 'VersionTest',
        namespace: 'com.example',
        description: null,
        type: SchemaType.AVRO,
        format: 'avro',
        schema: { type: 'record', name: 'User', fields: [] },
        compatibilityMode: CompatibilityMode.FULL,
        owner: 'data-team',
        tags: [],
        domain: null,
        properties: {},
      };

      const schema = await service.registerSchema(request);

      expect(schema.version).toBe('1.0.0');
      expect(schema.majorVersion).toBe(1);
      expect(schema.minorVersion).toBe(0);
      expect(schema.patchVersion).toBe(0);
      expect(schema.previousVersionId).toBeNull();
      expect(schema.isBreakingChange).toBe(false);
    });
  });

  describe('getSchema', () => {
    it('should retrieve an existing schema by ID', async () => {
      const request = {
        name: 'TestSchema',
        namespace: 'com.test',
        description: 'Test',
        type: SchemaType.JSON_SCHEMA,
        format: 'json',
        schema: { type: 'object' },
        compatibilityMode: CompatibilityMode.BACKWARD,
        owner: 'test',
        tags: [],
        domain: null,
        properties: {},
      };

      const registered = await service.registerSchema(request);
      const retrieved = await service.getSchema(registered.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(registered.id);
      expect(retrieved?.name).toBe('TestSchema');
    });

    it('should return null for non-existent schema', async () => {
      const schema = await service.getSchema('non-existent-id');
      expect(schema).toBeNull();
    });
  });

  describe('getSchemaByName', () => {
    it('should retrieve schema by namespace and name', async () => {
      const request = {
        name: 'OrderSchema',
        namespace: 'com.shop',
        description: 'Order entity',
        type: SchemaType.JSON_SCHEMA,
        format: 'json',
        schema: { type: 'object' },
        compatibilityMode: CompatibilityMode.BACKWARD,
        owner: 'shop-team',
        tags: [],
        domain: null,
        properties: {},
      };

      await service.registerSchema(request);
      const schema = await service.getSchemaByName('com.shop', 'OrderSchema');

      expect(schema).toBeDefined();
      expect(schema?.name).toBe('OrderSchema');
      expect(schema?.namespace).toBe('com.shop');
    });

    it('should return null for non-existent schema', async () => {
      const schema = await service.getSchemaByName(
        'com.nonexistent',
        'NoSchema',
      );
      expect(schema).toBeNull();
    });
  });

  describe('evolveSchema', () => {
    it('should create new version with backward compatible changes', async () => {
      // Register initial schema
      const initialRequest = {
        name: 'ProductSchema',
        namespace: 'com.shop',
        description: 'Product entity',
        type: SchemaType.JSON_SCHEMA,
        format: 'json',
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
        compatibilityMode: CompatibilityMode.BACKWARD,
        owner: 'shop-team',
        tags: [],
        domain: null,
        properties: {},
      };

      const v1 = await service.registerSchema(initialRequest);

      // Evolve schema - add optional field
      const evolutionRequest = {
        schemaId: v1.id,
        newSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' }, // New field
          },
        },
        versionType: VersionType.MINOR,
        description: 'Added description field',
        skipCompatibilityCheck: false,
      };

      const v2 = await service.evolveSchema(evolutionRequest);

      expect(v2.version).toBe('1.1.0');
      expect(v2.versionNumber).toBe(2);
      expect(v2.previousVersionId).toBe(v1.id);
      expect(v2.isBreakingChange).toBe(false);
    });

    it('should detect breaking changes when field is removed', async () => {
      const initialRequest = {
        name: 'BreakingSchema',
        namespace: 'com.test',
        description: 'Test',
        type: SchemaType.JSON_SCHEMA,
        format: 'json',
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            oldField: { type: 'string' },
          },
        },
        compatibilityMode: CompatibilityMode.BACKWARD,
        owner: 'test',
        tags: [],
        domain: null,
        properties: {},
      };

      const v1 = await service.registerSchema(initialRequest);

      // Remove field - breaking change
      const evolutionRequest = {
        schemaId: v1.id,
        newSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
        versionType: VersionType.MAJOR,
        description: 'Removed oldField',
        skipCompatibilityCheck: true, // Skip to allow breaking change
      };

      const v2 = await service.evolveSchema(evolutionRequest);

      expect(v2.version).toBe('2.0.0');
      expect(v2.isBreakingChange).toBe(true);
    });

    it('should throw error for non-existent schema', async () => {
      const evolutionRequest = {
        schemaId: 'non-existent',
        newSchema: { type: 'object' },
        versionType: VersionType.MINOR,
        description: null,
        skipCompatibilityCheck: false,
      };

      await expect(service.evolveSchema(evolutionRequest)).rejects.toThrow(
        'Schema not found',
      );
    });
  });

  describe('searchSchemas', () => {
    beforeEach(async () => {
      // Register test schemas
      const schemas = [
        {
          name: 'UserSchema',
          namespace: 'com.auth',
          type: SchemaType.JSON_SCHEMA,
          tags: ['user', 'auth'],
          domain: 'authentication',
        },
        {
          name: 'OrderSchema',
          namespace: 'com.shop',
          type: SchemaType.AVRO,
          tags: ['order', 'commerce'],
          domain: 'sales',
        },
        {
          name: 'ProductSchema',
          namespace: 'com.shop',
          type: SchemaType.JSON_SCHEMA,
          tags: ['product', 'commerce'],
          domain: 'sales',
        },
      ];

      for (const s of schemas) {
        await service.registerSchema({
          ...s,
          description: `${s.name} description`,
          format: s.type === SchemaType.AVRO ? 'avro' : 'json',
          schema: { type: 'object' },
          compatibilityMode: CompatibilityMode.BACKWARD,
          owner: 'test',
          properties: {},
        });
      }
    });

    it('should find schemas by name', async () => {
      const result = await service.searchSchemas({
        query: 'User',
        namespace: null,
        type: null,
        status: null,
        tags: [],
        domain: null,
        offset: 0,
        limit: 10,
      });

      expect(result.schemas.length).toBeGreaterThan(0);
      expect(result.schemas[0].name).toContain('User');
    });

    it('should filter by namespace', async () => {
      const result = await service.searchSchemas({
        query: '',
        namespace: 'com.shop',
        type: null,
        status: null,
        tags: [],
        domain: null,
        offset: 0,
        limit: 10,
      });

      expect(result.schemas.length).toBe(2);
      result.schemas.forEach((s) => {
        expect(s.namespace).toBe('com.shop');
      });
    });

    it('should filter by type', async () => {
      const result = await service.searchSchemas({
        query: '',
        namespace: null,
        type: SchemaType.AVRO,
        status: null,
        tags: [],
        domain: null,
        offset: 0,
        limit: 10,
      });

      expect(result.schemas.length).toBe(1);
      expect(result.schemas[0].type).toBe(SchemaType.AVRO);
    });

    it('should filter by tags', async () => {
      const result = await service.searchSchemas({
        query: '',
        namespace: null,
        type: null,
        status: null,
        tags: ['commerce'],
        domain: null,
        offset: 0,
        limit: 10,
      });

      expect(result.schemas.length).toBe(2);
      result.schemas.forEach((s) => {
        expect(s.tags).toContain('commerce');
      });
    });

    it('should apply pagination', async () => {
      const result = await service.searchSchemas({
        query: '',
        namespace: null,
        type: null,
        status: null,
        tags: [],
        domain: null,
        offset: 1,
        limit: 1,
      });

      expect(result.schemas.length).toBe(1);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
    });
  });

  describe('deprecateSchema', () => {
    it('should deprecate a schema', async () => {
      const request = {
        name: 'LegacySchema',
        namespace: 'com.old',
        description: 'Old schema',
        type: SchemaType.JSON_SCHEMA,
        format: 'json',
        schema: { type: 'object' },
        compatibilityMode: CompatibilityMode.NONE,
        owner: 'test',
        tags: [],
        domain: null,
        properties: {},
      };

      const schema = await service.registerSchema(request);
      const deprecated = await service.deprecateSchema(
        schema.id,
        'Replaced by new version',
      );

      expect(deprecated.status).toBe(SchemaStatus.DEPRECATED);
      expect(deprecated.deprecatedAt).toBeDefined();
      expect(deprecated.deprecationReason).toBe('Replaced by new version');
    });

    it('should allow specifying replacement schema', async () => {
      const oldRequest = {
        name: 'OldSchema',
        namespace: 'com.test',
        description: 'Old',
        type: SchemaType.JSON_SCHEMA,
        format: 'json',
        schema: { type: 'object' },
        compatibilityMode: CompatibilityMode.NONE,
        owner: 'test',
        tags: [],
        domain: null,
        properties: {},
      };

      const newRequest = {
        ...oldRequest,
        name: 'NewSchema',
        description: 'New',
      };

      const oldSchema = await service.registerSchema(oldRequest);
      const newSchema = await service.registerSchema(newRequest);

      const deprecated = await service.deprecateSchema(
        oldSchema.id,
        'Use NewSchema instead',
        newSchema.id,
      );

      expect(deprecated.replacedByVersionId).toBe(newSchema.id);
    });
  });

  describe('archiveSchema', () => {
    it('should archive a schema', async () => {
      const request = {
        name: 'ArchivedSchema',
        namespace: 'com.old',
        description: 'To be archived',
        type: SchemaType.JSON_SCHEMA,
        format: 'json',
        schema: { type: 'object' },
        compatibilityMode: CompatibilityMode.NONE,
        owner: 'test',
        tags: [],
        domain: null,
        properties: {},
      };

      const schema = await service.registerSchema(request);
      const archived = await service.archiveSchema(schema.id);

      expect(archived.status).toBe(SchemaStatus.ARCHIVED);
    });
  });

  describe('getSchemaVersions', () => {
    it('should return version history', async () => {
      const request = {
        name: 'VersionedSchema',
        namespace: 'com.test',
        description: 'Test versioning',
        type: SchemaType.JSON_SCHEMA,
        format: 'json',
        schema: {
          type: 'object',
          properties: { id: { type: 'string' } },
        },
        compatibilityMode: CompatibilityMode.BACKWARD,
        owner: 'test',
        tags: [],
        domain: null,
        properties: {},
      };

      const v1 = await service.registerSchema(request);

      // Create v2
      await service.evolveSchema({
        schemaId: v1.id,
        newSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
        versionType: VersionType.MINOR,
        description: 'Added name field',
        skipCompatibilityCheck: false,
      });

      const versions = await service.getSchemaVersions(v1.id);

      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].version).toBe('1.0.0');
    });
  });
});
