"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_assert_1 = __importDefault(require("node:assert"));
const OntologyExecutionService_js_1 = require("./OntologyExecutionService.js");
(0, globals_1.describe)('OntologyExecutionService', () => {
    let service;
    let mockRegistry;
    const mockSchema = {
        id: 'test-schema',
        version: '1.0.0',
        definition: {
            entities: [
                {
                    name: 'TestEntity',
                    description: 'Test',
                    fields: [
                        { name: 'requiredField', type: 'string', description: '', required: true, sensitive: false, pii: false },
                        { name: 'optionalField', type: 'number', description: '', required: false, sensitive: false, pii: false }
                    ],
                    constraints: []
                }
            ],
            edges: []
        },
        changelog: '',
        status: 'ACTIVE',
        createdAt: new Date(),
        createdBy: 'test'
    };
    (0, globals_1.beforeEach)(() => {
        mockRegistry = {
            getLatestSchema: () => mockSchema,
            getInstance: () => mockRegistry
        };
        service = new OntologyExecutionService_js_1.OntologyExecutionService(mockRegistry);
    });
    (0, globals_1.it)('should validate valid data', async () => {
        const result = await service.validate('TestEntity', { requiredField: 'foo', optionalField: 123 });
        node_assert_1.default.strictEqual(result.valid, true);
    });
    (0, globals_1.it)('should fail validation on missing required field', async () => {
        const result = await service.validate('TestEntity', { optionalField: 123 });
        node_assert_1.default.strictEqual(result.valid, false);
        node_assert_1.default.match(result.errors[0], /Missing required field/);
    });
    (0, globals_1.it)('should fail validation on wrong type', async () => {
        const result = await service.validate('TestEntity', { requiredField: 123 });
        node_assert_1.default.strictEqual(result.valid, false);
        node_assert_1.default.match(result.errors[0], /expected string/);
    });
    (0, globals_1.it)('should infer new facts based on high confidence', async () => {
        const assertion = {
            id: '1',
            entityType: 'TestEntity',
            entityId: 'e1',
            property: 'prop',
            value: 'val',
            temporal: { validFrom: new Date() },
            probabilistic: { confidence: 0.95, source: 'test' },
            provenance: {}
        };
        const result = await service.infer([assertion]);
        node_assert_1.default.strictEqual(result.assertions.length, 1);
        node_assert_1.default.strictEqual(result.assertions[0].property, 'isVerified');
        node_assert_1.default.strictEqual(result.assertions[0].probabilistic.confidence, 1.0);
    });
    (0, globals_1.it)('should project assertions by time', async () => {
        const now = new Date();
        const past = new Date(now.getTime() - 10000);
        const future = new Date(now.getTime() + 10000);
        const a1 = {
            id: '1',
            entityType: 'T',
            entityId: '1',
            property: 'p',
            value: 'v',
            temporal: { validFrom: past, validTo: now },
            probabilistic: { confidence: 1, source: 't' },
            provenance: {}
        };
        const a2 = {
            id: '2',
            entityType: 'T',
            entityId: '1',
            property: 'p',
            value: 'v',
            temporal: { validFrom: future },
            probabilistic: { confidence: 1, source: 't' },
            provenance: {}
        };
        const result = await service.project([a1, a2], new Date(now.getTime() - 5000));
        node_assert_1.default.strictEqual(result.length, 1);
        node_assert_1.default.strictEqual(result[0].id, '1');
        const resultFuture = await service.project([a1, a2], new Date(future.getTime() + 1000));
        node_assert_1.default.strictEqual(resultFuture.length, 1);
        node_assert_1.default.strictEqual(resultFuture[0].id, '2');
    });
});
