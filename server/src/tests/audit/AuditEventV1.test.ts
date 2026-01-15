import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import path from 'path';
import type { AuditEventV1 } from '../../audit/audit-v1.js';

describe('AuditEventV1 schema', () => {
  const schemaPath = path.join(
    process.cwd(),
    'src',
    'audit',
    'audit-v1.schema.json',
  );
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const events: AuditEventV1[] = [
    {
      eventId: 'evt-001',
      occurredAt: '2025-01-01T00:00:00.000Z',
      actor: {
        type: 'user',
        id: 'user-123',
        name: 'Analyst One',
        ipAddress: '203.0.113.10',
      },
      action: {
        type: 'user_login',
        name: 'login',
        outcome: 'success',
      },
      target: {
        type: 'session',
        id: 'session-abc',
      },
      tenantId: 'tenant-1',
      traceId: 'trace-001',
      metadata: {
        message: 'User signed in',
      },
    },
    {
      eventId: 'evt-002',
      occurredAt: '2025-01-02T12:34:56.000Z',
      actor: {
        type: 'service',
        id: 'svc-ingest',
        name: 'Ingestion Service',
      },
      action: {
        type: 'data_import',
        name: 'ingest',
        outcome: 'partial',
      },
      target: {
        type: 'artifact',
        id: 'artifact-789',
        path: '/uploads/sample.pdf',
      },
      tenantId: 'tenant-2',
      traceId: 'trace-002',
      metadata: {
        source: 'upload',
        sizeBytes: 2048,
      },
    },
    {
      eventId: 'evt-003',
      occurredAt: '2025-01-03T08:15:30.000Z',
      actor: {
        type: 'system',
        name: 'scheduler',
      },
      action: {
        type: 'policy_decision',
        name: 'policy-eval',
        outcome: 'failure',
      },
      target: {
        type: 'policy',
        id: 'policy-opa-1',
        name: 'Access Policy',
      },
      tenantId: 'tenant-1',
      traceId: 'trace-003',
      metadata: {
        decision: 'deny',
        reason: 'missing clearance',
      },
    },
  ];

  it('matches the audit.v1 schema (golden snapshots)', () => {
    for (const event of events) {
      const valid = validate(event);
      expect(valid).toBe(true);
      expect(validate.errors).toBeNull();
      expect(event).toMatchSnapshot();
    }
  });
});
