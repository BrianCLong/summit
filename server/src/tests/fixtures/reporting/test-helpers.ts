/**
 * Test helpers and utilities for reporting service tests
 */

import type { Report, ReportRequest } from '../../../services/reporting/types/index.js';

/**
 * Create a mock Neo4j session
 */
export function createMockNeo4jSession() {
  return {
    run: jest.fn(),
    close: jest.fn(),
  };
}

/**
 * Create a mock Neo4j driver
 */
export function createMockNeo4jDriver() {
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
export function createMockLogger() {
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
export function createMockNotificationService() {
  return {
    sendNotification: jest.fn().mockResolvedValue({ id: 'notif-123' }),
  };
}

/**
 * Create a mock analytics service
 */
export function createMockAnalyticsService() {
  return {
    submitAnalyticsJob: jest.fn().mockResolvedValue({ id: 'job-123' }),
    getJobStatus: jest.fn().mockReturnValue({ status: 'COMPLETED', results: {} }),
  };
}

/**
 * Create a valid report request
 */
export function createMockReportRequest(overrides?: Partial<ReportRequest>): ReportRequest {
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
export function createMockReport(overrides?: Partial<Report>): Report {
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
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 100,
): Promise<void> {
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
export function mockNeo4jResult(records: any[]) {
  return {
    records: records.map((record) => ({
      get: (key: string) => record[key],
      toObject: () => record,
    })),
  };
}
