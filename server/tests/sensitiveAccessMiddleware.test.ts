import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

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

const buildApp = (auditPath: string, allow = true) => {
  if (fs.existsSync(auditPath)) {
    fs.unlinkSync(auditPath);
  }
  const app = express();
  app.use(express.json());

  const auditStore = new AppendOnlyAuditStore({ filePath: auditPath });

  const middleware = createSensitiveContextMiddleware({
    auditStore: auditStore as any,
    routes: ['/api/test'],
    opaClient: {
      evaluatePolicy: async () => ({ allow, reason: allow ? 'allowed' : 'denied' }),
    } as any,
    action: 'test_sensitive',
  });

  app.post('/api/test', middleware, (_req, res) => {
    res.json({ ok: true, accessContext: (res.locals as any).sensitiveAccessContext });
  });

  return { app, auditPath };
};

const readAuditFile = (auditPath: string) => {
  if (!fs.existsSync(auditPath)) return [];
  return fs
    .readFileSync(auditPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
};

describe('sensitive context middleware', () => {
  it('rejects missing context fields', async () => {
    const auditPath = path.join(__dirname, 'tmp-audit-deny.jsonl');
    const { app } = buildApp(auditPath);

    const response = await request(app).post('/api/test').send({});

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('SENSITIVE_CONTEXT_REQUIRED');

    const records = readAuditFile(auditPath);
    expect(records.length).toBe(1);
    expect(records[0].metadata?.decision).toBe('deny');
  });

  it('allows when all fields provided and records audit', async () => {
    const auditPath = path.join(__dirname, 'tmp-audit-allow.jsonl');
    const { app } = buildApp(auditPath, true);

    const response = await request(app)
      .post('/api/test')
      .set('x-purpose', 'investigation')
      .set('x-justification', 'Case triage')
      .set('x-case-id', 'CASE-42')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.accessContext.purpose).toBe('investigation');

    const records = readAuditFile(auditPath);
    expect(records.length).toBe(1);
    expect(records[0].metadata?.decision).toBe('allow');
    expect(records[0].metadata?.case_id).toBe('CASE-42');
  });
});
