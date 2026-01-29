import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AppendOnlyAuditStore } from '../appendOnlyAuditStore.ts';

const tmpFile = () => path.join(os.tmpdir(), `audit-store-${Date.now()}-${Math.random()}.tsonl`);

describe('AppendOnlyAuditStore', () => {
  it('appends events and maintains hash chain integrity', async () => {
    const filePath = tmpFile();
    const store = new AppendOnlyAuditStore({ filePath });

    await store.append({
      version: 'audit_event_v1',
      actor: { type: 'service', id: 'svc-1' },
      action: 'policy_decision',
      resource: { type: 'resource', id: 'res-1' },
      classification: 'internal',
      policy_version: 'v1',
      decision_id: 'decision-1',
      trace_id: 'trace-1',
      timestamp: new Date().toISOString(),
      customer: 'customer-a',
    });

    await store.append({
      version: 'audit_event_v1',
      actor: { type: 'service', id: 'svc-1' },
      action: 'policy_decision',
      resource: { type: 'resource', id: 'res-2' },
      classification: 'restricted',
      policy_version: 'v1',
      decision_id: 'decision-2',
      trace_id: 'trace-2',
      timestamp: new Date().toISOString(),
      customer: 'customer-a',
    });

    const verification = await store.verify();
    expect(verification.ok).toBe(true);
    expect(verification.checked).toBe(2);
    expect(verification.last_hash).toBeDefined();

    const range = await store.readRange({ customer: 'customer-a' });
    expect(range).toHaveLength(2);

    fs.unlinkSync(filePath);
  });
});
