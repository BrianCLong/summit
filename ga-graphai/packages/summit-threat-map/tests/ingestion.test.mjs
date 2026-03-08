import test from 'node:test';
import assert from 'node:assert/strict';

import { parseShodanStream, parseShadowserverReport, verifyShadowserverHmac } from '../src/ingestion.mjs';
import { loadScoringConfig } from '../src/config.mjs';
import { scoreEvent } from '../src/scoring.mjs';

test('parseShodanStream normalizes newline json', () => {
  const payload = `${JSON.stringify({ id: 'a1', ip_str: '1.1.1.1', timestamp: '2026-01-01T00:00:00Z', port: 443, vulns: ['CVE-2025-0001'], location: { latitude: 37.1, longitude: -122.1 } })}\n`;
  const events = parseShodanStream(payload);
  assert.equal(events.length, 1);
  assert.equal(events[0].source, 'shodan');
  assert.equal(events[0].exposureState, 'exposed');
});

test('verifyShadowserverHmac validates signature', async () => {
  const raw = JSON.stringify({ id: 'r1', ip: '2.2.2.2' });
  const secret = 'topsecret';
  const crypto = await import('node:crypto');
  const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  assert.equal(verifyShadowserverHmac(raw, signature, secret), true);
  assert.equal(verifyShadowserverHmac(raw, 'bad', secret), false);
});

test('scoreEvent applies decay and kev multiplier', () => {
  const config = loadScoringConfig(new URL('../scoring.yaml', import.meta.url).pathname);
  const event = parseShadowserverReport(`${JSON.stringify({ id: 'b2', ip: '2.2.2.2', infection: 'true', cve: 'CVE-2025-1234', timestamp: new Date().toISOString() })}\n`, 'daily')[0];
  event.evidence.why = 'Matches KEV exploitation path';
  const score = scoreEvent(event, config, new Date());
  assert.equal(score > 0.7, true);
});
