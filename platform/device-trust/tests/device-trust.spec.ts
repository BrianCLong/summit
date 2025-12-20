import { test, expect } from '@playwright/test';
import fixtures from '../fixtures/posture-fixtures.json';

const nonCompliant = fixtures[1];
const remediated = { ...nonCompliant, webauthn: { userVerified: true, userPresent: true }, local: { ...nonCompliant.local, firewallEnabled: true, screenLock: true } };

// This scenario is documentation-friendly; running it requires the Go attestor and Node policy service to be up.
test('non-compliant → remediate → pass', async ({ request }) => {
  const deviceId = 'playwright-demo';

  const fail = await request.post('http://localhost:8090/evaluate', { data: { deviceId, ...nonCompliant, secureContext: false } });
  expect(fail.status()).toBe(200);
  const failBody = await fail.json();
  expect(failBody.decision.status).toBe('step_up');

  const pass = await request.post('http://localhost:8090/evaluate', { data: { deviceId, ...remediated, secureContext: true } });
  expect(pass.status()).toBe(200);
  const passBody = await pass.json();
  expect(passBody.decision.status).toBe('pass');
  expect(passBody.decision.claims['posture:status']).toBe('pass');
});
