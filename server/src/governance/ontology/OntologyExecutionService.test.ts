
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { test, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { OntologyExecutionService } from './OntologyExecutionService.js';
import { SchemaVersion, OntologyAssertion } from './models.js';

describe('OntologyExecutionService', () => {
    let service: OntologyExecutionService;
    let mockRegistry: any;

    const mockSchema: SchemaVersion = {
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

    beforeEach(() => {
        mockRegistry = {
            getLatestSchema: () => mockSchema,
            getInstance: () => mockRegistry
        };
        service = new OntologyExecutionService(mockRegistry);
    });

    it('should validate valid data', async () => {
        const result = await service.validate('TestEntity', { requiredField: 'foo', optionalField: 123 });
        assert.strictEqual(result.valid, true);
    });

    it('should fail validation on missing required field', async () => {
        const result = await service.validate('TestEntity', { optionalField: 123 });
        assert.strictEqual(result.valid, false);
        assert.match(result.errors[0], /Missing required field/);
    });

    it('should fail validation on wrong type', async () => {
        const result = await service.validate('TestEntity', { requiredField: 123 });
        assert.strictEqual(result.valid, false);
        assert.match(result.errors[0], /expected string/);
    });

    it('should infer new facts based on high confidence', async () => {
        const assertion: OntologyAssertion = {
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
        assert.strictEqual(result.assertions.length, 1);
        assert.strictEqual(result.assertions[0].property, 'isVerified');
        assert.strictEqual(result.assertions[0].probabilistic.confidence, 1.0);
    });

    it('should project assertions by time', async () => {
        const now = new Date();
        const past = new Date(now.getTime() - 10000);
        const future = new Date(now.getTime() + 10000);

        const a1: OntologyAssertion = {
            id: '1',
            entityType: 'T',
            entityId: '1',
            property: 'p',
            value: 'v',
            temporal: { validFrom: past, validTo: now },
            probabilistic: { confidence: 1, source: 't' },
            provenance: {}
        };

        const a2: OntologyAssertion = {
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
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, '1');

        const resultFuture = await service.project([a1, a2], new Date(future.getTime() + 1000));
        assert.strictEqual(resultFuture.length, 1);
        assert.strictEqual(resultFuture[0].id, '2');
    });
});
