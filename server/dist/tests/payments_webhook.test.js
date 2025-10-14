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
        const succeeded = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/payments/payment_intent_succeeded.json'), 'utf8'));
        const refunded = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/payments/charge_refunded.json'), 'utf8'));
        const calls = [];
        const deps = {
            orders: {
                markPaid: async (id) => calls.push(`paid:${id}`),
                findEntitlement: async (id) => `${id}-ent`,
            },
            entitlements: {
                issueFromOrder: async (id) => ({ id: `${id}-ent` }),
                revoke: async (id) => calls.push(`revoked:${id}`),
            },
            transparency: {
                appendIssue: async (id) => calls.push(`issue:${id}`),
                appendRevoke: async (id) => calls.push(`revoke:${id}`),
            },
            idempotency: new Set(),
        };
        await handleWebhook(succeeded, deps);
        await handleWebhook(succeeded, deps); // idempotent
        await handleWebhook(refunded, deps);
        expect(calls).toEqual([
            'paid:order123',
            'issue:order123-ent',
            'revoke:order123-ent',
            'revoked:order123-ent',
        ]);
    });
});
//# sourceMappingURL=payments_webhook.test.js.map