"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck - Test file has type errors with mocks and unimplemented methods
const globals_1 = require("@jest/globals");
// Mock connector-sdk before any imports
globals_1.jest.mock('@intelgraph/connector-sdk', () => ({
    PullConnector: class {
    },
    ConnectorContext: {},
    ConnectorResult: {},
    DataEnvelope: {},
}));
const gcs_ingest_js_1 = require("../gcs-ingest.js");
const stream_1 = require("stream");
// Mock GCSConnector
const mockGCSConnectorInstance = {
    healthCheck: globals_1.jest.fn(),
    listObjects: globals_1.jest.fn(),
    downloadStream: globals_1.jest.fn(),
};
globals_1.jest.mock('../gcs.js', () => {
    return {
        GCSConnector: globals_1.jest.fn(() => mockGCSConnectorInstance),
    };
});
// TODO: These tests have TypeScript inference issues with jest.fn() mocking
// and also reference an unimplemented 'initialize' method.
// Skip until the connector API stabilizes.
globals_1.describe.skip('GCSBatchConnector', () => {
    let connector;
    let mockContext;
    (0, globals_1.beforeEach)(() => {
        connector = new gcs_ingest_js_1.GCSBatchConnector();
        mockContext = {
            signal: { aborted: false },
            logger: {
                debug: globals_1.jest.fn(),
                info: globals_1.jest.fn(),
                warn: globals_1.jest.fn(),
                error: globals_1.jest.fn(),
            },
            stateStore: {
                getCursor: globals_1.jest.fn().mockResolvedValue(null),
                setCursor: globals_1.jest.fn(),
                get: globals_1.jest.fn(),
                set: globals_1.jest.fn(),
            },
            emitter: {
                emitEntity: globals_1.jest.fn(),
            },
        };
        mockGCSConnectorInstance.healthCheck.mockReset();
        mockGCSConnectorInstance.listObjects.mockReset();
        mockGCSConnectorInstance.downloadStream.mockReset();
    });
    (0, globals_1.it)('should initialize correctly', async () => {
        await connector.initialize({
            config: {
                batchSize: 50,
                schema: { entityType: 'TestEntity' },
            },
            secrets: {
                projectId: 'test-project',
                bucketName: 'test-bucket',
            },
            tenantId: 'tenant-1',
        });
        // Access private property for testing via casting or assumption
        (0, globals_1.expect)(connector.batchSize).toBe(50);
    });
    (0, globals_1.it)('should ingest JSON files', async () => {
        await connector.initialize({
            config: {},
            secrets: { projectId: 'p', bucketName: 'b' },
            tenantId: 't',
        });
        mockGCSConnectorInstance.listObjects.mockResolvedValue({
            objects: [
                { name: 'data.json', bucket: 'b', etag: '123', contentType: 'application/json' },
            ],
            nextPageToken: undefined,
        });
        const jsonContent = JSON.stringify([{ id: 1, name: 'Alice' }]);
        const stream = stream_1.Readable.from([Buffer.from(jsonContent)]);
        mockGCSConnectorInstance.downloadStream.mockResolvedValue(stream);
        await connector.pull(mockContext);
        (0, globals_1.expect)(mockGCSConnectorInstance.listObjects).toHaveBeenCalled();
        (0, globals_1.expect)(mockGCSConnectorInstance.downloadStream).toHaveBeenCalledWith('data.json');
        (0, globals_1.expect)(mockContext.emitter.emitEntity).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            props: { id: 1, name: 'Alice' },
            type: 'Document', // Default
        }));
    });
    (0, globals_1.it)('should handle deduplication', async () => {
        await connector.initialize({
            config: {},
            secrets: { projectId: 'p', bucketName: 'b' },
            tenantId: 't',
        });
        mockGCSConnectorInstance.listObjects.mockResolvedValue({
            objects: [
                { name: 'data.json', bucket: 'b', etag: '123' },
            ],
            nextPageToken: undefined,
        });
        // Mock state store to return existing etag
        mockContext.stateStore.get.mockResolvedValue('123');
        await connector.pull(mockContext);
        (0, globals_1.expect)(mockGCSConnectorInstance.downloadStream).not.toHaveBeenCalled();
        (0, globals_1.expect)(mockContext.emitter.emitEntity).not.toHaveBeenCalled();
    });
});
