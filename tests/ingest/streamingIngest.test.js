"use strict";
// tests/ingest/streamingIngest.test.ts
Object.defineProperty(exports, "__esModule", { value: true });
const streamingIngest_1 = require("../../src/ingest/streamingIngest");
const ingestion_1 = require("../../src/data-pipeline/ingestion");
const schemaRegistry_1 = require("../../src/data-pipeline/schemaRegistry");
const transforms_1 = require("../../src/data-pipeline/transforms");
const quality_1 = require("../../src/data-pipeline/quality");
const schemaRegistry_2 = require("../../src/ingest/schemaRegistry");
jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-1234',
}));
describe('processStreamingIngest', () => {
    let baseParams;
    const compatibleSchema = {
        type: 'object',
        properties: {
            id: { type: 'string' },
            email: { type: 'string' },
        },
        required: ['id', 'email'],
    };
    const incompatibleSchema = {
        type: 'object',
        properties: {
            id: { type: 'string' },
        },
        required: ['id'],
    };
    const testRecord = { id: 'user-123', email: 'test@example.com' };
    beforeEach(() => {
        // Reset the in-memory registry before each test
        schemaRegistry_2.schemaRegistryClient.subjects.clear();
        const source = new ingestion_1.JsonSource('test-source', [testRecord]);
        const registry = new schemaRegistry_1.SchemaRegistry();
        registry.register({ version: '1.0', schema: compatibleSchema });
        // Set up a base configuration for the parameters
        baseParams = {
            source,
            subject: 'user-events',
            schemaId: '1.0',
            registry,
            transformPipeline: new transforms_1.TransformationPipeline(),
            qualityChecker: new quality_1.DataQualityChecker(),
            pipelineConfig: {
                schemaVersion: '1.0',
                qualityRules: {},
                deduplicationKey: 'id',
                watermarkField: 'timestamp',
            },
        };
    });
    test('should process records successfully when schema is compatible', async () => {
        // Arrange: Register a compatible schema
        const schemaId = schemaRegistry_2.schemaRegistryClient.register(baseParams.subject, compatibleSchema);
        baseParams.schemaId = schemaId;
        // Act: Run the streaming ingest process
        const result = await (0, streamingIngest_1.processStreamingIngest)(baseParams);
        // Assert: Verify that the record was processed and not sent to the DLQ
        expect(result.processed.length).toBe(1);
        expect(result.processed[0].id).toBe(testRecord.id);
        expect(result.deadLetters.length).toBe(0);
    });
    test('should send records to DLQ when schema is incompatible', async () => {
        // Arrange: Register a base schema, then try to ingest with an incompatible one
        schemaRegistry_2.schemaRegistryClient.register(baseParams.subject, compatibleSchema);
        const schemaId = schemaRegistry_2.schemaRegistryClient.register(baseParams.subject, incompatibleSchema);
        baseParams.schemaId = schemaId;
        // Act: Run the streaming ingest process
        const result = await (0, streamingIngest_1.processStreamingIngest)(baseParams);
        // Assert: Verify that no records were processed and the record was sent to the DLQ
        expect(result.processed.length).toBe(0);
        expect(result.deadLetters.length).toBe(1);
        expect(result.deadLetters[0].record.id).toBe(testRecord.id);
        expect(result.deadLetters[0].reason).toContain('Field "email" was removed');
        expect(result.deadLetters[0].lineageId).toBe('mock-uuid-1234');
    });
});
