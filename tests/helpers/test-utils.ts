/**
 * Shared Test Utilities
 *
 * Helpers for test data generation, assertion, and environment setup
 * used across unit, integration, and e2e test suites.
 */

import { randomUUID, createHash, createHmac } from 'node:crypto';

// ─── Test Data Builders ──────────────────────────────────────────────────────

export interface TestEntity {
  id: string;
  type: 'Person' | 'Organization' | 'Location' | 'Event';
  name: string;
  tenantId: string;
  properties: Record<string, unknown>;
}

export function buildEntity(overrides: Partial<TestEntity> = {}): TestEntity {
  return {
    id: randomUUID(),
    type: 'Person',
    name: `Test Entity ${Date.now()}`,
    tenantId: 'tenant-test',
    properties: {},
    ...overrides,
  };
}

export interface TestRelationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties: Record<string, unknown>;
}

export function buildRelationship(
  overrides: Partial<TestRelationship> = {},
): TestRelationship {
  return {
    id: randomUUID(),
    type: 'RELATES_TO',
    sourceId: randomUUID(),
    targetId: randomUUID(),
    properties: {},
    ...overrides,
  };
}

export interface TestInvestigation {
  id: string;
  name: string;
  tenantId: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  createdBy: string;
}

export function buildInvestigation(
  overrides: Partial<TestInvestigation> = {},
): TestInvestigation {
  return {
    id: randomUUID(),
    name: `Test Investigation ${Date.now()}`,
    tenantId: 'tenant-test',
    status: 'ACTIVE',
    createdBy: 'test-analyst',
    ...overrides,
  };
}

// ─── Auth Test Helpers ───────────────────────────────────────────────────────

export interface TestAuthContext {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

export function buildAuthContext(
  overrides: Partial<TestAuthContext> = {},
): TestAuthContext {
  return {
    userId: 'test-user',
    tenantId: 'tenant-test',
    roles: ['analyst'],
    permissions: ['entity:read', 'entity:write', 'investigation:read'],
    ...overrides,
  };
}

export function buildAdminAuthContext(): TestAuthContext {
  return buildAuthContext({
    roles: ['admin'],
    permissions: [
      'entity:read',
      'entity:write',
      'entity:delete',
      'investigation:read',
      'investigation:write',
      'admin:write',
      'policy:write',
    ],
  });
}

// ─── Webhook Signature Helpers ───────────────────────────────────────────────

export function generateWebhookSignature(
  payload: string,
  secret: string,
): string {
  const hmac = createHmac('sha256', secret);
  return 'sha256=' + hmac.update(payload).digest('hex');
}

// ─── Hash Helpers ────────────────────────────────────────────────────────────

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// ─── Timing Helpers ──────────────────────────────────────────────────────────

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'Operation',
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
  );
  return Promise.race([promise, timeout]);
}

// ─── Retry Helpers ───────────────────────────────────────────────────────────

export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Unreachable');
}

// ─── Assertion Helpers ───────────────────────────────────────────────────────

export function assertNoPII(data: string): void {
  const PII_PATTERNS = [
    /\b[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/,     // Email
    /\b\d{3}-\d{2}-\d{4}\b/,                      // SSN
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,          // Phone
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
  ];

  for (const pattern of PII_PATTERNS) {
    if (pattern.test(data)) {
      throw new Error(`PII detected in data: pattern ${pattern.source} matched`);
    }
  }
}

export function assertValidHash(hash: string): void {
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    throw new Error(`Invalid SHA-256 hash: ${hash}`);
  }
}

export function assertValidUUID(uuid: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      uuid,
    )
  ) {
    throw new Error(`Invalid UUID v4: ${uuid}`);
  }
}
