import express from 'express';
import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  AppendOnlyAuditLog,
  createAuditExportRouter,
  runAuditVerifierCli,
} from '../src/index.js';

function buildLog(): AppendOnlyAuditLog {
  const log = new AppendOnlyAuditLog();
  log.append({
    id: 'evt-1',
    actor: 'alice',
    action: 'login',
    resource: 'console',
    system: 'auth',
    category: 'access',
    metadata: { email: 'alice@example.com', ip: '10.0.0.1' },
  });
  log.append({
    id: 'evt-2',
    actor: 'alice',
    action: 'download',
    resource: 'report.pdf',
    system: 'content',
    category: 'export',
    metadata: { correlationIds: ['case-1'] },
  });
  log.append({
    id: 'evt-3',
    actor: 'bob',
    action: 'approve',
    resource: 'request-7',
    system: 'workflow',
    category: 'decision',
    metadata: { reviewer: 'bob' },
  });
  return log;
}

describe('Audit export API + verifier', () => {
  let app: express.Express;
  let log: AppendOnlyAuditLog;

  beforeEach(() => {
    log = buildLog();
    app = express();
    app.use(createAuditExportRouter(log));
  });

  it('returns chained hashes on append and refuses mutations', () => {
    const ledger = new AppendOnlyAuditLog();
    const first = ledger.append({
      id: 'e-1',
      actor: 'system',
      action: 'create',
      resource: 'dataset:1',
      system: 'audit',
      category: 'ingest',
    });

    const second = ledger.append({
      id: 'e-2',
      actor: 'system',
      action: 'update',
      resource: 'dataset:1',
      system: 'audit',
      category: 'ingest',
    });

    expect(first.previousHash).toBeUndefined();
    expect(first.eventHash).toBeDefined();
    expect(second.previousHash).toBe(first.eventHash);
    expect(second.eventHash).toBeDefined();

    expect(() =>
      ledger.append({
        ...second,
        id: first.id,
      } as any),
    ).toThrow(/append-only audit log rejects/i);
  });

  it('includes hash chain data and verifies clean exports', async () => {
    const response = await request(app).get('/audit/export?limit=2');
    expect(response.status).toBe(200);
    expect(response.body.events[0].eventHash).toBeDefined();
    expect(response.body.events[0].previousHash).toBeUndefined();
    expect(response.body.verification.chain.ok).toBe(true);

    const exitCode = await runAuditVerifierCli(
      response.body.evidence,
      response.body.manifest,
    );
    expect(exitCode).toBe(0);
  });

  it('detects tampering via the CLI verifier', async () => {
    const response = await request(app).get('/audit/export');
    const tampered = {
      ...response.body.evidence,
      entries: response.body.evidence.entries.map((entry: any, index: number) =>
        index === 0 ? { ...entry, actor: 'mallory' } : entry,
      ),
    };

    const exitCode = await runAuditVerifierCli(tampered, response.body.manifest);
    expect(exitCode).toBe(1);
  });

  it('paginates deterministically and redacts PII', async () => {
    const firstPage = await request(app).get('/audit/export?limit=2');
    expect(firstPage.body.page.pageSize).toBe(2);
    expect(firstPage.body.page.total).toBe(3);
    expect(firstPage.body.schema.piiSafe).toBe(true);

    const cursor = firstPage.body.page.nextCursor;
    expect(cursor).toBe(2);

    const secondPage = await request(app).get(
      `/audit/export?limit=2&cursor=${cursor}`,
    );
    expect(secondPage.body.page.cursor).toBe(cursor);

    const combined = [
      ...firstPage.body.evidence.entries,
      ...secondPage.body.evidence.entries,
    ];
    expect(JSON.stringify(combined)).not.toContain('alice@example.com');
  });
});
