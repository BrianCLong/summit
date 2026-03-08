"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SchemaRegistryService_1 = require("../../src/governance/ontology/SchemaRegistryService");
(0, globals_1.describe)('SchemaRegistryService', () => {
    let registry;
    (0, globals_1.beforeEach)(async () => {
        // Reset singleton instance for testing if possible, or just use the instance
        // Since it's a singleton without a reset method, we might have state carryover.
        // For this unit test, we'll just check basic functionality.
        registry = SchemaRegistryService_1.SchemaRegistryService.getInstance();
        await registry.ensureInitialized();
    });
    (0, globals_1.test)('should return a default bootstrap schema', () => {
        const latest = registry.getLatestSchema();
        (0, globals_1.expect)(latest).toBeDefined();
        (0, globals_1.expect)(latest?.version).toMatch(/^\d+\.\d+\.\d+$/);
        (0, globals_1.expect)(latest?.status).toBe('ACTIVE');
    });
    (0, globals_1.test)('should register a new schema version', async () => {
        const previous = registry.getLatestSchema();
        const newDef = {
            entities: [],
            edges: []
        };
        const version = await registry.registerSchema(newDef, 'Test change', 'tester');
        (0, globals_1.expect)(version.version).not.toBe(previous?.version);
        (0, globals_1.expect)(version.status).toBe('DRAFT');
        // Should not be latest active yet
        (0, globals_1.expect)(registry.getLatestSchema()?.version).toBe(previous?.version);
    });
    (0, globals_1.test)('should activate a schema', async () => {
        const newDef = { entities: [], edges: [] };
        const version = await registry.registerSchema(newDef, 'Activation test', 'tester');
        await registry.activateSchema(version.id, 'admin');
        (0, globals_1.expect)(registry.getLatestSchema()?.id).toBe(version.id);
        (0, globals_1.expect)(registry.getLatestSchema()?.status).toBe('ACTIVE');
    });
});
