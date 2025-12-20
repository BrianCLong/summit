import { randomUUID } from 'crypto';
import {
  buildManifest,
  sanitizeEventForExport,
  verifyChainForExport,
} from '../api/export-utils.js';
import { calculateChainHash, calculateEventHash, GENESIS_HASH } from '../core/hash-utils.js';

function buildEvent(overrides = {}) {
  const base = {
    id: randomUUID(),
    eventType: 'user_login',
    level: 'info',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    version: '1.0.0',
    correlationId: randomUUID(),
    tenantId: 'tenant-1',
    serviceId: 'service-1',
    serviceName: 'Audit Service',
    environment: 'development',
    action: 'login',
    outcome: 'success',
    message: 'User logged in',
    details: {},
    complianceRelevant: false,
    complianceFrameworks: [],
  };

  return { ...base, ...overrides };
}

describe('export utils', () => {
  it('verifies a clean chain of events', () => {
    const first = buildEvent({ sequenceNumber: 1n });
    first.hash = calculateEventHash(first);
    first.previousEventHash = GENESIS_HASH;

    const second = buildEvent({
      id: randomUUID(),
      sequenceNumber: 2n,
      correlationId: first.correlationId,
    });
    second.hash = calculateEventHash(second);
    second.previousEventHash = calculateChainHash(
      first.hash,
      first.previousEventHash,
      1n,
    );

    const report = verifyChainForExport([second, first]);

    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.startHash).toBe(GENESIS_HASH);
    expect(report.endHash).toBe(
      calculateChainHash(second.hash, second.previousEventHash, 2n),
    );
  });

  it('detects tampering in a modified log', () => {
    const event = buildEvent({ sequenceNumber: 1n });
    event.hash = calculateEventHash(event);
    event.previousEventHash = GENESIS_HASH;

    const tampered = { ...event, message: 'unexpected change' };
    tampered.hash = event.hash; // stale hash should fail verification

    const report = verifyChainForExport([tampered]);

    expect(report.valid).toBe(false);
    expect(report.issues.some((issue) => issue.includes('Hash mismatch'))).toBe(
      true,
    );
  });

  it('sanitizes PII fields before export', () => {
    const event = buildEvent({
      sequenceNumber: 1n,
      userName: 'Jane Analyst',
      userEmail: 'jane@example.com',
      ipAddress: '10.0.0.1',
      userAgent: 'jest-test',
      geolocation: { city: 'Denver' },
      deviceFingerprint: 'abc123',
      impersonatedBy: 'admin',
    });

    const sanitized = sanitizeEventForExport(event);

    expect(sanitized.userName).toBeUndefined();
    expect(sanitized.userEmail).toBeUndefined();
    expect(sanitized.ipAddress).toBeUndefined();
    expect(sanitized.userAgent).toBeUndefined();
    expect(sanitized.geolocation).toBeUndefined();
    expect(sanitized.deviceFingerprint).toBeUndefined();
    expect(sanitized.impersonatedBy).toBeUndefined();
    expect(sanitized.redacted).toBe(true);
  });

  it('builds a manifest that reflects pagination inputs', () => {
    const first = buildEvent({ sequenceNumber: 1n });
    first.hash = calculateEventHash(first);
    first.previousEventHash = GENESIS_HASH;

    const manifest = buildManifest([first], new Date('2024-01-01'), new Date('2024-01-02'), 2, 50, 120);

    expect(manifest.page).toBe(2);
    expect(manifest.pageSize).toBe(50);
    expect(manifest.totalEvents).toBe(120);
    expect(manifest.exportedEvents).toBe(1);
    expect(manifest.checksum).toHaveLength(64);
  });
});
