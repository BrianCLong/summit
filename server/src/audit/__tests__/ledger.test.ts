import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AuditLedger, hashPayload, safePayloadFromEvent, verifyAuditLedgerChain } from '../ledger.ts';
import { LogEventBus } from '../../logging/logEventBus.ts';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('AuditLedger', () => {
  it('records and verifies a hash chain', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-ledger-'));
    const ledgerFilePath = path.join(tmpDir, 'ledger.tsonl');
    const bus = new LogEventBus(10);
    const ledger = new AuditLedger({ ledgerFilePath, bus });

    await ledger.recordEvent({
      level: 'info',
      message: 'first event',
      tenantId: 'tenant-1',
      userId: 'user-1',
    });
    await ledger.recordEvent({
      level: 'warn',
      message: 'second event',
      tenantId: 'tenant-1',
      correlationId: 'corr-2',
    });

    const lines = fs
      .readFileSync(ledgerFilePath, 'utf8')
      .trim()
      .split('\n')
      .map((line: string) => JSON.parse(line));

    expect(lines).toHaveLength(2);

    const expectedPayloadHash = hashPayload(
      safePayloadFromEvent({
        level: 'info',
        message: 'first event',
        tenantId: 'tenant-1',
        userId: 'user-1',
        timestamp: lines[0].timestamp,
      }),
    );
    expect(lines[0].payloadHash).toBe(expectedPayloadHash);

    const verification = await verifyAuditLedgerChain({ ledgerFilePath });
    expect(verification.ok).toBe(true);
    expect(verification.checked).toBe(2);

    ledger.stop();
  });

  it('detects tampered entries', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-ledger-tamper-'));
    const ledgerFilePath = path.join(tmpDir, 'ledger.tsonl');
    const bus = new LogEventBus(10);
    const ledger = new AuditLedger({ ledgerFilePath, bus });

    bus.publish({ level: 'info', message: 'event', tenantId: 'tenant-2' });
    bus.publish({ level: 'info', message: 'event-2', tenantId: 'tenant-2' });
    await sleep(50);

    const lines = fs.readFileSync(ledgerFilePath, 'utf8').trim().split('\n');
    const tampered = JSON.parse(lines[1]);
    tampered.payloadHash = 'deadbeef';
    lines[1] = JSON.stringify(tampered);
    fs.writeFileSync(ledgerFilePath, `${lines.join('\n')}\n`, 'utf8');

    const verification = await verifyAuditLedgerChain({ ledgerFilePath });
    expect(verification.ok).toBe(false);
    expect(verification.errors.length).toBeGreaterThan(0);

    ledger.stop();
  });
});
