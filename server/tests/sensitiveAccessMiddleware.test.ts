import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Use process.cwd() since tests run from server directory
const testsDir = path.join(process.cwd(), 'tests');

jest.mock('../src/audit/appendOnlyAuditStore.js', () => {
  const fs = require('fs');
  const path = require('path');
  return {
    AppendOnlyAuditStore: class {
      filePath: string;

      constructor(options: any = {}) {
        this.filePath =
          options.filePath || path.join(process.cwd(), 'logs', 'audit', 'jest-audit.jsonl');
      }

      async append(event: any) {
        fs.appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, 'utf8');
        return event;
      }
    },
  };
});

jest.mock('../src/conductor/governance/opa-integration.js', () => ({
  opaPolicyEngine: {
    evaluatePolicy: jest.fn(),
  },
}));

import { AppendOnlyAuditStore } from '../src/audit/appendOnlyAuditStore.js';
import { createSensitiveContextMiddleware } from '../src/middleware/sensitive-context.js';

const buildMiddleware = (auditPath: string, allow = true) => {
  if (fs.existsSync(auditPath)) {
    fs.unlinkSync(auditPath);
  }
  const auditStore = new AppendOnlyAuditStore({ filePath: auditPath });

  const middleware = createSensitiveContextMiddleware({
    auditStore: auditStore as any,
    routes: ['/api/test'],
    opaClient: {
      evaluatePolicy: async () => ({ allow, reason: allow ? 'allowed' : 'denied' }),
    } as any,
    action: 'test_sensitive',
  });

  return { middleware, auditPath };
};

const readAuditFile = (auditPath: string) => {
  if (!fs.existsSync(auditPath)) return [];
  return fs
    .readFileSync(auditPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line: string) => JSON.parse(line));
};

describe('sensitive context middleware', () => {
  it('rejects missing context fields', async () => {
    const auditPath = path.join(testsDir, 'tmp-audit-deny.jsonl');
    const { middleware } = buildMiddleware(auditPath);
    const req: any = {
      method: 'POST',
      path: '/api/test',
      baseUrl: '',
      headers: {},
      body: {},
      params: {},
      ip: '127.0.0.1',
    };
    const res: any = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SENSITIVE_CONTEXT_REQUIRED' }),
    );
    expect(next).not.toHaveBeenCalled();

    const records = readAuditFile(auditPath);
    expect(records.length).toBe(1);
    expect(records[0].metadata?.decision).toBe('deny');
  });

  it('allows when all fields provided and records audit', async () => {
    const auditPath = path.join(testsDir, 'tmp-audit-allow.jsonl');
    const { middleware } = buildMiddleware(auditPath, true);
    const req: any = {
      method: 'POST',
      path: '/api/test',
      baseUrl: '',
      headers: {
        'x-purpose': 'investigation',
        'x-justification': 'Case triage',
        'x-case-id': 'CASE-42',
      },
      body: {},
      params: {},
      ip: '127.0.0.1',
    };
    const res: any = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await middleware(req, res, next);
    if (next.mock.calls.length) {
      res.json({
        ok: true,
        accessContext: (res.locals as any).sensitiveAccessContext,
      });
    }

    expect(next).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        accessContext: expect.objectContaining({ purpose: 'investigation' }),
      }),
    );

    const records = readAuditFile(auditPath);
    expect(records.length).toBe(1);
    expect(records[0].metadata?.decision).toBe('allow');
    expect(records[0].metadata?.case_id).toBe('CASE-42');
  });
});
