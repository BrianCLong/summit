import { verifyStripeSig, handleWebhook } from '../payments/StripeWebhook';
import fs from 'fs';
import path from 'path';

describe('StripeWebhook', () => {
  it('verifies signature', () => {
    const payload = '{}';
    const secret = 'whsec_test';
    const ts = '12345';
    const sig = require('crypto')
      .createHmac('sha256', secret)
      .update(`${ts}.${payload}`)
      .digest('hex');
    const header = `t=${ts},v1=${sig}`;
    expect(verifyStripeSig(payload, header, secret).ok).toBe(true);
  });

  it('handles idempotent payment and refund', async () => {
    const succeeded = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures/payments/payment_intent_succeeded.json'), 'utf8')
    );
    const refunded = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures/payments/charge_refunded.json'), 'utf8')
    );
    const calls: string[] = [];
    const deps = {
      orders: {
        markPaid: async (id: string) => calls.push(`paid:${id}`),
        findEntitlement: async (id: string) => `${id}-ent`,
      },
      entitlements: {
        issueFromOrder: async (id: string) => ({ id: `${id}-ent` }),
        revoke: async (id: string) => calls.push(`revoked:${id}`),
      },
      transparency: {
        appendIssue: async (id: string) => calls.push(`issue:${id}`),
        appendRevoke: async (id: string) => calls.push(`revoke:${id}`),
      },
      idempotency: new Set<string>(),
    };
    await handleWebhook(succeeded, deps);
    await handleWebhook(succeeded, deps); // idempotent
    await handleWebhook(refunded, deps);
    const expected = [
      'paid:order123',
      'issue:order123-ent',
      'revoke:order123-ent',
      'revoked:order123-ent',
    ];
    expect(calls.sort()).toEqual(expected.sort());
  });
});
