/**
 * Test Helpers and Utilities
 * Shared test utilities for creating mock data and common test scenarios
 */

import { randomUUID } from 'node:crypto';

export interface MockUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER';
  tenant: string;
  residency: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface MockEntity {
  id: string;
  type: string;
  tenantId: string;
  properties: Record<string, any>;
  labels: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface MockContext {
  user: MockUser;
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: randomUUID(),
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: 'ANALYST',
    tenant: 'test-tenant',
    residency: 'US',
    isActive: true,
    ...overrides,
  };
}

/**
 * Create a mock admin user
 */
export function createMockAdminUser(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    role: 'ADMIN',
    permissions: ['*'],
    ...overrides,
  });
}

/**
 * Create a mock viewer user (read-only)
 */
export function createMockViewerUser(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({
    role: 'VIEWER',
    permissions: [
      'investigation:read',
      'entity:read',
      'relationship:read',
      'tag:read',
      'graph:read',
    ],
    ...overrides,
  });
}

/**
 * Create a mock entity for Neo4j tests
 */
export function createMockEntity(overrides?: Partial<MockEntity>): MockEntity {
  const id = randomUUID();
  const type = overrides?.type || 'Person';

  return {
    id,
    type,
    tenantId: 'test-tenant',
    properties: {
      id,
      name: 'Test Entity',
      description: 'A test entity',
      tenantId: 'test-tenant',
      createdAt: new Date().toISOString(),
    },
    labels: [type, 'Entity'],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock GraphQL context
 */
export function createMockContext(userOverrides?: Partial<MockUser>): MockContext {
  return {
    user: createMockUser(userOverrides),
  };
}

/**
 * Create mock JWT token for testing
 */
export function createMockJWT(payload?: any): string {
  // Simple base64 encoded mock JWT (not cryptographically valid, just for testing)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const body = Buffer.from(JSON.stringify(payload || { sub: 'test-user', exp: Date.now() + 3600000 })).toString('base64');
  const signature = Buffer.from('mock-signature').toString('base64');

  return `${header}.${body}.${signature}`;
}

/**
 * Create mock Neo4j session
 */
export function createMockNeo4jSession() {
  return {
    run: jest.fn().mockResolvedValue({ records: [] }),
    close: jest.fn().mockResolvedValue(undefined),
    lastBookmarks: jest.fn(),
    beginTransaction: jest.fn(),
  };
}

/**
 * Create mock Neo4j driver
 */
export function createMockNeo4jDriver() {
  const session = createMockNeo4jSession();

  return {
    session: jest.fn(() => session),
    verifyConnectivity: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    getServerInfo: jest.fn(),
    supportsMultiDb: jest.fn(),
    _mockSession: session, // Expose for assertions
  };
}

/**
 * Create mock Neo4j record
 */
export function createMockNeo4jRecord(entity: MockEntity) {
  return {
    get: (key: string) => {
      if (key === 'n' || key === 'node') {
        return {
          properties: entity.properties,
          labels: entity.labels,
        };
      }
      return entity.properties[key];
    },
    keys: Object.keys(entity.properties),
    length: Object.keys(entity.properties).length,
    toObject: () => entity.properties,
  };
}

/**
 * Create mock Express request
 */
export function createMockRequest(overrides?: any) {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    ip: '127.0.0.1',
    method: 'GET',
    path: '/',
    ...overrides,
  };
}

/**
 * Create mock Express response
 */
export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Create mock Next function
 */
export function createMockNext() {
  return jest.fn();
}

/**
 * Wait for async operations (useful for testing timers, promises)
 */
export async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Flush all promises (useful for testing async operations)
 */
export async function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Mock logger to suppress logs during tests
 */
export function createMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn().mockReturnThis(),
  };
}

/**
 * Assert error contains specific message (case insensitive)
 */
export function assertErrorContains(error: any, message: string): void {
  expect(error).toBeDefined();
  const errorMessage = error?.message || error?.toString() || '';
  expect(errorMessage.toLowerCase()).toContain(message.toLowerCase());
}

/**
 * Assert no sensitive data in error message
 */
export function assertNoSensitiveData(errorMessage: string): void {
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /api[_-]?key/i,
    /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP addresses
    /:\d{4,5}/, // Port numbers
    /postgres|mysql|mongodb/i, // Database types
  ];

  sensitivePatterns.forEach(pattern => {
    expect(errorMessage).not.toMatch(pattern);
  });
}
