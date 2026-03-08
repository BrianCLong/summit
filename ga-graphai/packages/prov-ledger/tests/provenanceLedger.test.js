"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const policy = {
    purpose: 'engineering',
    retention: 'standard-365d',
    licenseClass: 'MIT-OK',
    pii: false,
};
(0, vitest_1.describe)('provenance ledger', () => {
    (0, vitest_1.it)('hashes payloads deterministically', () => {
        const payload = { a: 1, b: ['x', 'y'] };
        (0, vitest_1.expect)((0, index_js_1.hashPayload)(payload)).toEqual((0, index_js_1.hashPayload)(payload));
        (0, vitest_1.expect)((0, index_js_1.hashPayload)(payload)).not.toEqual((0, index_js_1.hashPayload)({ a: 1 }));
    });
    (0, vitest_1.it)('creates signed records that can be verified', () => {
        const record = (0, index_js_1.createProvenanceRecord)({
            reqId: 'req-1',
            step: 'router',
            input: { foo: 'bar' },
            output: { ok: true },
            modelId: 'router-v1',
            ckpt: '1',
            prompt: 'route this task',
            params: { temp: 0.1 },
            policy,
        });
        const secret = 'test-secret';
        const signed = (0, index_js_1.signRecord)(record, secret);
        (0, vitest_1.expect)((0, index_js_1.verifySignature)(signed, secret)).toBe(true);
        (0, vitest_1.expect)((0, index_js_1.verifySignature)(signed, 'wrong')).toBe(false);
    });
    (0, vitest_1.it)('appends records to the ledger and verifies them', () => {
        const ledger = new index_js_1.ProvenanceLedger('ledger-secret');
        ledger.append({
            reqId: 'req-2',
            step: 'generator',
            input: { goal: 'test' },
            output: { result: 'ok' },
            modelId: 'gen',
            ckpt: '2',
            prompt: 'do it',
            params: { temp: 0.2 },
            policy,
        });
        ledger.append({
            reqId: 'req-2',
            step: 'critic',
            input: { artifact: 'ok' },
            output: { issues: [] },
            modelId: 'critic',
            ckpt: '2',
            prompt: 'critique',
            params: { temp: 0 },
            policy,
        });
        (0, vitest_1.expect)(ledger.list('req-2')).toHaveLength(2);
        (0, vitest_1.expect)(ledger.verifyAll('ledger-secret')).toBe(true);
    });
    (0, vitest_1.it)('verifies using the ledger secret when none is provided', () => {
        const ledger = new index_js_1.ProvenanceLedger('internal-secret');
        ledger.append({
            reqId: 'req-3',
            step: 'router',
            input: { query: 'demo' },
            output: { decision: 'route-to-gen' },
            modelId: 'router-v2',
            ckpt: '2',
            prompt: 'route',
            params: { temperature: 0.2 },
            policy,
        });
        (0, vitest_1.expect)(ledger.verifyAll()).toBe(true);
    });
    (0, vitest_1.it)('detects tampering per-request using the internal secret', () => {
        const ledger = new index_js_1.ProvenanceLedger('shared-secret');
        const signed = ledger.append({
            reqId: 'req-4',
            step: 'executor',
            input: { cmd: 'ls' },
            output: { status: 'ok' },
            modelId: 'shell',
            ckpt: '4',
            prompt: 'execute',
            params: { safe: true },
            policy,
        });
        // Tamper with the signature and ensure verification fails for that request
        const tampered = { ...signed, signature: `${signed.signature}-tampered` };
        (0, vitest_1.expect)(ledger.verifyFor('req-4')).toBe(true);
        (0, vitest_1.expect)(ledger.verifyRecord(tampered)).toBe(false);
    });
});
