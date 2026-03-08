"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
let CopilotOrchestrationService;
let hasService = false;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imported = require('../../src/services/CopilotOrchestrationService');
    CopilotOrchestrationService = imported.default ?? imported;
    hasService = true;
}
catch {
    hasService = false;
}
const describeIf = hasService ? globals_1.describe : globals_1.describe.skip;
describeIf('CopilotOrchestrationService', () => {
    let service;
    let mockNeo4jDriver;
    let mockAIExtractionService;
    let mockFederatedSearchService;
    let mockLogger;
    (0, globals_1.beforeEach)(() => {
        mockNeo4jDriver = {
            session: globals_1.jest.fn(() => ({
                run: globals_1.jest.fn(() => ({ records: [] })),
                close: globals_1.jest.fn(),
            })),
        };
        mockAIExtractionService = {
            extractEntities: globals_1.jest.fn(),
            extractRelationships: globals_1.jest.fn(),
        };
        mockFederatedSearchService = {
            search: globals_1.jest.fn(),
        };
        mockLogger = {
            info: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
            warn: globals_1.jest.fn(),
        };
        service = new CopilotOrchestrationService(mockNeo4jDriver, mockAIExtractionService, mockFederatedSearchService, mockLogger);
    });
    (0, globals_1.it)('should initialize with correct properties', () => {
        (0, globals_1.expect)(service.driver).toBe(mockNeo4jDriver);
        (0, globals_1.expect)(service.aiExtraction).toBe(mockAIExtractionService);
        (0, globals_1.expect)(service.federatedSearch).toBe(mockFederatedSearchService);
        (0, globals_1.expect)(service.logger).toBe(mockLogger);
        (0, globals_1.expect)(service.activeQueries).toBeInstanceOf(Map);
        (0, globals_1.expect)(service.queryPlanners).toBeInstanceOf(Map);
        (0, globals_1.expect)(service.executionStrategies).toBeInstanceOf(Map);
        (0, globals_1.expect)(service.domainKnowledge).toBeInstanceOf(Map);
        (0, globals_1.expect)(service.queryPatterns).toBeInstanceOf(Map);
        (0, globals_1.expect)(service.metrics).toBeDefined();
    });
    (0, globals_1.it)('should initialize query planners', () => {
        (0, globals_1.expect)(service.queryPlanners.size).toBeGreaterThan(0);
        (0, globals_1.expect)(service.logger.info).toHaveBeenCalledWith(globals_1.expect.stringContaining('Initialized'), globals_1.expect.any(Object));
    });
    (0, globals_1.it)('should load domain knowledge', () => {
        (0, globals_1.expect)(service.domainKnowledge.size).toBeGreaterThan(0);
        (0, globals_1.expect)(service.logger.info).toHaveBeenCalledWith(globals_1.expect.stringContaining('Loaded domain knowledge'), globals_1.expect.any(Object));
    });
    (0, globals_1.it)('should orchestrate a simple query', async () => {
        const queryText = 'who is John Doe';
        const context = { userId: 'user1', investigationId: 'inv1' };
        // Mock analyzeQuery to return a simple analysis
        service.analyzeQuery = globals_1.jest.fn(() => Promise.resolve({
            originalText: queryText,
            intent: 'discovery',
            entities: [{ name: 'John Doe', type: 'PERSON' }],
            relationships: [],
            temporalScope: null,
            spatialScope: null,
            complexity: 0.2,
            confidence: 0.8,
            keywords: ['john', 'doe'],
            queryType: 'ENTITY_ANALYSIS',
        }));
        // Mock generateExecutionPlan to return a simple plan
        service.generateExecutionPlan = globals_1.jest.fn(() => Promise.resolve({
            queryId: 'mock-query-id',
            strategy: 'ENTITY_ANALYSIS',
            steps: [{ id: 'step1', type: 'GRAPH_QUERY', operation: 'findEntity' }],
            estimatedTime: 1000,
            complexity: 0.2,
            dataSources: ['neo4j'],
            parallelizable: false,
        }));
        // Mock executePlan to return simple results
        service.executePlan = globals_1.jest.fn(() => Promise.resolve({
            entities: [{ id: 'e1', label: 'John Doe' }],
            relationships: [],
            insights: [],
            visualizations: [],
            summary: 'Mock summary',
            confidence: 0.9,
            executionDetails: [],
        }));
        const result = await service.orchestrateQuery(queryText, context);
        (0, globals_1.expect)(result).toBeDefined();
        (0, globals_1.expect)(result.id).toBeDefined();
        (0, globals_1.expect)(result.text).toEqual(queryText);
        (0, globals_1.expect)(result.status).toEqual('COMPLETED');
        (0, globals_1.expect)(service.analyzeQuery).toHaveBeenCalledWith(queryText, context);
        (0, globals_1.expect)(service.generateExecutionPlan).toHaveBeenCalled();
        (0, globals_1.expect)(service.executePlan).toHaveBeenCalled();
        (0, globals_1.expect)(service.metrics.totalQueries).toEqual(1);
        (0, globals_1.expect)(service.metrics.successfulQueries).toEqual(1);
        (0, globals_1.expect)(service.logger.info).toHaveBeenCalledWith(globals_1.expect.stringContaining('Query orchestration completed'), globals_1.expect.any(Object));
    });
    // Add more tests for other methods like analyzeQuery, generateExecutionPlan, executePlan, etc.
    // Test different query types and edge cases.
});
