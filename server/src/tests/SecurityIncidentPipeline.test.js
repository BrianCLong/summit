"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SecurityIncidentPipeline_js_1 = require("../services/SecurityIncidentPipeline.js");
const neo4j_js_1 = require("../db/neo4j.js");
const globals_1 = require("@jest/globals");
// Mock PrismaClient manually as it's hard to import in test env sometimes
const PrismaClient = class {
};
// Mock dependencies
const mockPrisma = new PrismaClient();
const mockRedis = {
    get: globals_1.jest.fn(),
    set: globals_1.jest.fn(),
    setex: globals_1.jest.fn(),
};
const mockLogger = {
    info: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
};
// Mock Neo4jService
const mockNeo4j = {
    getSession: globals_1.jest.fn(),
};
// Mock the neo helper
globals_1.jest.mock('../db/neo4j', () => {
    return {
        Neo4jService: globals_1.jest.fn(),
        neo: {
            run: globals_1.jest.fn()
        }
    };
});
const mockAuditSystem = {
// Add methods if needed by pipeline
};
const mockTriageService = {
    scoreAlert: globals_1.jest.fn(),
};
describe('SecurityIncidentPipeline', () => {
    let pipeline;
    beforeEach(() => {
        // We need to mock neo.run return
        const neoRun = neo4j_js_1.neo.run;
        neoRun.mockResolvedValue({ records: [] });
        pipeline = new SecurityIncidentPipeline_js_1.SecurityIncidentPipeline(mockPrisma, mockRedis, mockLogger, mockNeo4j, mockAuditSystem, mockTriageService);
        globals_1.jest.clearAllMocks();
    });
    it('should process a high-score event and create an incident', async () => {
        // Setup
        const event = {
            id: 'evt-1',
            type: 'test-event',
            severity: 'critical',
            timestamp: new Date(),
            tenantId: 'tenant-1',
            actorId: 'user-1',
            details: {}
        };
        const scoreAlertMock = mockTriageService.scoreAlert;
        scoreAlertMock.mockResolvedValue({
            score: 0.9,
            recommendations: [{ action: 'investigate' }]
        });
        const redisGetMock = mockRedis.get;
        redisGetMock.mockResolvedValue(JSON.stringify({
            id: 'inc-1',
            status: 'new'
        }));
        // Execute
        const result = await pipeline.processEvent(event);
        // Verify
        expect(mockTriageService.scoreAlert).toHaveBeenCalledWith(event.id, expect.objectContaining({
            id: 'evt-1'
        }));
        expect(mockRedis.set).toHaveBeenCalledTimes(3); // Create, Evidence, Owner
        expect(mockLogger.warn).toHaveBeenCalled(); // Alert raised
        expect(result).toBeDefined();
        // Check if graph dump was attempted
        expect(neo4j_js_1.neo.run).toHaveBeenCalled();
    });
    it('should skip incident creation for low scores', async () => {
        const event = {
            id: 'evt-low',
            type: 'low-risk',
            severity: 'low',
            timestamp: new Date(),
            tenantId: 'tenant-1',
            details: {}
        };
        const scoreAlertMock = mockTriageService.scoreAlert;
        scoreAlertMock.mockResolvedValue({
            score: 0.1,
            recommendations: []
        });
        const result = await pipeline.processEvent(event);
        expect(result).toBeNull();
        expect(mockRedis.set).not.toHaveBeenCalled();
    });
});
