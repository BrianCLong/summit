import { describe, it, expect, afterEach } from 'vitest';
import nock from 'nock';
import fetch from 'node-fetch';

// Configure base
const SIG_BASE = 'https://sig.example.internal';

function maestroIngestBatch(payload:any){
  // Replace with actual client call
  return fetch(`${SIG_BASE}/ingest/batch`, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload)});
}

describe('SIG API contracts', () => {
  afterEach(() => nock.cleanAll());

  it('POST /ingest/batch sends required fields and handles receipts', async () => {
    const scope = nock(SIG_BASE)
      .post('/ingest/batch', (body) => {
        // Validate shape
        return body && Array.isArray(body.items) && body.items.every((i:any)=> i.id && i.payload);
      })
      .reply(200, { jobId: 'job-123', receipts: [{id:'i‑1', hash:'abc'}]});

    const res = await maestroIngestBatch({ items: [{id:'i‑1', payload:{}}] });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.jobId).toBeDefined();
    expect(Array.isArray(json.receipts)).toBe(true);
    scope.done();
  });

  it('POST /policy/evaluate enforces purpose/authority/license', async () => {
    const policy = nock(SIG_BASE)
      .post('/policy/evaluate', (body) => body && body.purpose && body.authority && body.license)
      .reply(200, { decision: 'allow', reason: 'ok' });

    const res = await fetch(`${SIG_BASE}/policy/evaluate`, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({purpose:'ingest', authority:'tasking:ops', license:'internal'})});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.decision).toBe('allow');
    policy.done();
  });
});
