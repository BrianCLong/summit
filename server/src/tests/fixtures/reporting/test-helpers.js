"use strict";
/**
 * Test helpers and utilities for reporting service tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockNeo4jSession = createMockNeo4jSession;
exports.createMockNeo4jDriver = createMockNeo4jDriver;
exports.createMockLogger = createMockLogger;
exports.createMockNotificationService = createMockNotificationService;
exports.createMockAnalyticsService = createMockAnalyticsService;
exports.createMockReportRequest = createMockReportRequest;
exports.createMockReport = createMockReport;
exports.waitFor = waitFor;
exports.mockNeo4jResult = mockNeo4jResult;
/**
 * Create a mock Neo4j session
 */
function createMockNeo4jSession() {
    return {
        run: jest.fn(),
        close: jest.fn(),
    };
}
/**
 * Create a mock Neo4j driver
 */
function createMockNeo4jDriver() {
    const mockSession = createMockNeo4jSession();
    return {
        session: jest.fn(() => mockSession),
        close: jest.fn(),
        _mockSession: mockSession,
    };
}
/**
 * Create a mock logger
 */
function createMockLogger() {
    return {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    };
}
/**
 * Create a mock notification service
 */
function createMockNotificationService() {
    return {
        sendNotification: jest.fn().mockResolvedValue({ id: 'notif-123' }),
    };
}
/**
 * Create a mock analytics service
 */
function createMockAnalyticsService() {
    return {
        submitAnalyticsJob: jest.fn().mockResolvedValue({ id: 'job-123' }),
        getJobStatus: jest.fn().mockReturnValue({ status: 'COMPLETED', results: {} }),
    };
}
/**
 * Create a valid report request
 */
function createMockReportRequest(overrides) {
    return {
        templateId: 'INVESTIGATION_SUMMARY',
        parameters: {
            investigationId: 'inv-test-123',
            summaryLevel: 'detailed',
        },
        format: 'PDF',
        userId: 'analyst-123',
        ...overrides,
    };
}
/**
 * Create a mock report
 */
function createMockReport(overrides) {
    return {
        id: 'report-test-123',
        templateId: 'INVESTIGATION_SUMMARY',
        parameters: {
            investigationId: 'inv-test-123',
        },
        requestedFormat: 'PDF',
        requestedBy: 'analyst-123',
        status: 'GENERATING',
        createdAt: new Date('2024-01-20T10:00:00Z'),
        progress: 0,
        estimatedCompletion: null,
        sections: [],
        data: {},
        metadata: {},
        ...overrides,
    };
}
/**
 * Wait for a condition with timeout
 */
async function waitFor(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    while (!condition()) {
        if (Date.now() - startTime > timeout) {
            throw new Error('Timeout waiting for condition');
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
    }
}
/**
 * Mock Neo4j query result
 */
function mockNeo4jResult(records) {
    return {
        records: records.map((record) => ({
            get: (key) => record[key],
            toObject: () => record,
        })),
    };
}
