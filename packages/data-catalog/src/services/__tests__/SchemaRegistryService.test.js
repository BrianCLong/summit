"use strict";
/**
 * Schema Registry Service Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SchemaRegistryService_js_1 = require("../SchemaRegistryService.js");
const metadata_js_1 = require("../../types/metadata.js");
// Mock store implementation
class MockSchemaStore {
    schemas = new Map();
    async getSchemaVersion(schemaId, version) {
        const versions = this.schemas.get(schemaId) || [];
        return versions.find(v => v.version === version) || null;
    }
    async getLatestSchemaVersion(schemaId) {
        const versions = this.schemas.get(schemaId) || [];
        if (versions.length === 0) {
            return null;
        }
        return versions.reduce((latest, current) => current.version > latest.version ? current : latest);
    }
    async registerSchema(schemaVersion) {
        const versions = this.schemas.get(schemaVersion.schemaId) || [];
        versions.push(schemaVersion);
        this.schemas.set(schemaVersion.schemaId, versions);
        return schemaVersion;
    }
    async listSchemaVersions(schemaId) {
        return (this.schemas.get(schemaId) || []).sort((a, b) => b.version - a.version);
    }
}
(0, globals_1.describe)('SchemaRegistryService', () => {
    let service;
    let store;
    (0, globals_1.beforeEach)(() => {
        store = new MockSchemaStore();
        service = new SchemaRegistryService_js_1.SchemaRegistryService(store);
    });
    (0, globals_1.describe)('registerSchemaVersion', () => {
        (0, globals_1.it)('should register first schema version', async () => {
            const schema = {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                },
                required: ['id', 'name'],
            };
            const result = await service.registerSchemaVersion('user-schema', schema, metadata_js_1.SchemaFormat.JSON_SCHEMA, 'user1', {
                description: 'User schema',
                changelog: 'Initial version',
            });
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.schemaId).toBe('user-schema');
            (0, globals_1.expect)(result.version).toBe(1);
            (0, globals_1.expect)(result.schema).toEqual(schema);
            (0, globals_1.expect)(result.backwardCompatible).toBe(true);
            (0, globals_1.expect)(result.status).toBe(metadata_js_1.SchemaVersionStatus.ACTIVE);
        });
        (0, globals_1.it)('should increment version number', async () => {
            const schema1 = {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            };
            await service.registerSchemaVersion('test-schema', schema1, metadata_js_1.SchemaFormat.JSON_SCHEMA, 'user1');
            const schema2 = {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                },
            };
            const result = await service.registerSchemaVersion('test-schema', schema2, metadata_js_1.SchemaFormat.JSON_SCHEMA, 'user1');
            (0, globals_1.expect)(result.version).toBe(2);
        });
        (0, globals_1.it)('should detect breaking changes', async () => {
            const schema1 = {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                },
                required: ['id'],
            };
            await service.registerSchemaVersion('test-schema', schema1, metadata_js_1.SchemaFormat.JSON_SCHEMA, 'user1');
            const schema2 = {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                },
                required: ['id', 'name'], // Made 'name' required - breaking change
            };
            const result = await service.registerSchemaVersion('test-schema', schema2, metadata_js_1.SchemaFormat.JSON_SCHEMA, 'user1', { checkCompatibility: true });
            (0, globals_1.expect)(result.backwardCompatible).toBe(false);
            (0, globals_1.expect)(result.breakingChanges).toContain('Added required field: name');
        });
    });
    (0, globals_1.describe)('checkCompatibility', () => {
        (0, globals_1.it)('should detect removed fields as breaking changes', () => {
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
            const result = service.checkCompatibility(oldSchema, newSchema, metadata_js_1.SchemaFormat.JSON_SCHEMA);
            (0, globals_1.expect)(result.compatible).toBe(false);
            (0, globals_1.expect)(result.breakingChanges).toContain('Removed field: email');
        });
        (0, globals_1.it)('should detect type changes as breaking changes', () => {
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
            const result = service.checkCompatibility(oldSchema, newSchema, metadata_js_1.SchemaFormat.JSON_SCHEMA);
            (0, globals_1.expect)(result.compatible).toBe(false);
            (0, globals_1.expect)(result.breakingChanges).toContain('Changed type of age from number to string');
        });
        (0, globals_1.it)('should allow adding optional fields', () => {
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
            const result = service.checkCompatibility(oldSchema, newSchema, metadata_js_1.SchemaFormat.JSON_SCHEMA);
            (0, globals_1.expect)(result.compatible).toBe(true);
            (0, globals_1.expect)(result.warnings).toContain('Added optional field: name');
        });
        (0, globals_1.it)('should check SQL DDL compatibility', () => {
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
            const result = service.checkCompatibility(oldSchema, newSchema, metadata_js_1.SchemaFormat.SQL_DDL);
            (0, globals_1.expect)(result.compatible).toBe(false);
            (0, globals_1.expect)(result.breakingChanges).toContain('Made name non-nullable');
        });
        (0, globals_1.it)('should allow adding nullable columns in SQL DDL', () => {
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
            const result = service.checkCompatibility(oldSchema, newSchema, metadata_js_1.SchemaFormat.SQL_DDL);
            (0, globals_1.expect)(result.compatible).toBe(true);
            (0, globals_1.expect)(result.warnings).toContain('Added column: email');
        });
    });
    (0, globals_1.describe)('validateSchema', () => {
        (0, globals_1.it)('should validate JSON Schema format', () => {
            const schema = {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            };
            const result = service.validateSchema(schema, metadata_js_1.SchemaFormat.JSON_SCHEMA);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should detect missing $schema in JSON Schema', () => {
            const schema = {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            };
            const result = service.validateSchema(schema, metadata_js_1.SchemaFormat.JSON_SCHEMA);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Missing $schema property');
        });
        (0, globals_1.it)('should validate Avro schema format', () => {
            const schema = {
                type: 'record',
                name: 'User',
                fields: [
                    { name: 'id', type: 'string' },
                    { name: 'age', type: 'int' },
                ],
            };
            const result = service.validateSchema(schema, metadata_js_1.SchemaFormat.AVRO);
            (0, globals_1.expect)(result.valid).toBe(true);
        });
        (0, globals_1.it)('should detect missing required fields in Avro schema', () => {
            const schema = {
                type: 'record',
                fields: [
                    { name: 'id', type: 'string' },
                ],
            };
            const result = service.validateSchema(schema, metadata_js_1.SchemaFormat.AVRO);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Avro schema must have name');
        });
        (0, globals_1.it)('should validate SQL DDL format', () => {
            const schema = {
                columns: [
                    { name: 'id', type: 'INTEGER', nullable: false },
                ],
            };
            const result = service.validateSchema(schema, metadata_js_1.SchemaFormat.SQL_DDL);
            (0, globals_1.expect)(result.valid).toBe(true);
        });
    });
    (0, globals_1.describe)('getSchemaDiff', () => {
        (0, globals_1.it)('should identify added fields', () => {
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
            const diff = service.getSchemaDiff(oldSchema, newSchema, metadata_js_1.SchemaFormat.JSON_SCHEMA);
            (0, globals_1.expect)(diff.added.length).toBe(2);
            (0, globals_1.expect)(diff.removed.length).toBe(0);
            (0, globals_1.expect)(diff.modified.length).toBe(0);
        });
        (0, globals_1.it)('should identify removed fields', () => {
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
            const diff = service.getSchemaDiff(oldSchema, newSchema, metadata_js_1.SchemaFormat.JSON_SCHEMA);
            (0, globals_1.expect)(diff.added.length).toBe(0);
            (0, globals_1.expect)(diff.removed.length).toBe(1);
            (0, globals_1.expect)(diff.removed[0]).toContain('deprecated');
        });
        (0, globals_1.it)('should identify modified fields', () => {
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
            const diff = service.getSchemaDiff(oldSchema, newSchema, metadata_js_1.SchemaFormat.JSON_SCHEMA);
            (0, globals_1.expect)(diff.modified.length).toBe(1);
            (0, globals_1.expect)(diff.modified[0]).toContain('age');
        });
    });
    (0, globals_1.describe)('getLatest', () => {
        (0, globals_1.it)('should return latest schema version', async () => {
            const schema1 = { type: 'object', properties: { id: { type: 'string' } } };
            await service.registerSchemaVersion('test', schema1, metadata_js_1.SchemaFormat.JSON_SCHEMA, 'user1');
            const schema2 = {
                type: 'object',
                properties: { id: { type: 'string' }, name: { type: 'string' } },
            };
            await service.registerSchemaVersion('test', schema2, metadata_js_1.SchemaFormat.JSON_SCHEMA, 'user1');
            const latest = await service.getLatest('test');
            (0, globals_1.expect)(latest).toBeDefined();
            (0, globals_1.expect)(latest.version).toBe(2);
            (0, globals_1.expect)(latest.schema).toEqual(schema2);
        });
        (0, globals_1.it)('should return null for non-existent schema', async () => {
            const latest = await service.getLatest('non-existent');
            (0, globals_1.expect)(latest).toBeNull();
        });
    });
    (0, globals_1.describe)('listVersions', () => {
        (0, globals_1.it)('should return all versions in descending order', async () => {
            await service.registerSchemaVersion('test', { version: 1 }, metadata_js_1.SchemaFormat.JSON_SCHEMA, 'user1');
            await service.registerSchemaVersion('test', { version: 2 }, metadata_js_1.SchemaFormat.JSON_SCHEMA, 'user1');
            await service.registerSchemaVersion('test', { version: 3 }, metadata_js_1.SchemaFormat.JSON_SCHEMA, 'user1');
            const versions = await service.listVersions('test');
            (0, globals_1.expect)(versions).toHaveLength(3);
            (0, globals_1.expect)(versions[0].version).toBe(3);
            (0, globals_1.expect)(versions[1].version).toBe(2);
            (0, globals_1.expect)(versions[2].version).toBe(1);
        });
    });
});
