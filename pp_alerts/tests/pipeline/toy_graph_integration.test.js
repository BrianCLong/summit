"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ingest_1 = require("../../src/pipeline/ingest");
const eval_1 = require("../../src/pipeline/eval");
const additive_1 = require("../../src/secret_sharing/additive");
describe('Toy Graph Pipeline Integration', () => {
    const MODULUS = 1000;
    beforeAll(() => {
        process.env.PP_ALERTS_HMAC_KEY = 'test-key';
    });
    afterAll(() => {
        delete process.env.PP_ALERTS_HMAC_KEY;
    });
    it('should ingest and evaluate a privacy-preserving graph flow', () => {
        // 1. Prepare Data
        const secretValue = 42;
        const bundle = (0, additive_1.split)(secretValue, 3, MODULUS);
        const topology = {
            nodes: [{ node_id_pseudo: 'N1', type: 'Host' }],
            edges: []
        };
        const shares = {
            trustee_set_id: 'T1',
            shares: bundle.shares.map(s => ({
                feature_key: 'alert_score',
                node_id_pseudo: 'N1',
                share_bytes_b64: Buffer.from(JSON.stringify(s)).toString('base64'),
                field_classification: 'highly-sensitive'
            }))
        };
        // 2. Ingest
        const payload = { topology, shares };
        expect(() => (0, ingest_1.ingest)(payload)).not.toThrow();
        // 3. Eval (Simulated reconstruction)
        // In real flow, we'd fetch shares from storage. Here we reuse bundle.
        const result = (0, eval_1.evaluate)(bundle);
        expect(result).toBe(secretValue);
    });
    it('should reject ingestion if sensitive data leaks into topology', () => {
        const topology = {
            nodes: [{ node_id_pseudo: 'N1', type: 'Host', src_ip: '1.2.3.4' }], // Leak!
            edges: []
        };
        const shares = { shares: [] };
        expect(() => (0, ingest_1.ingest)({ topology, shares })).toThrow(/matched src_ip/);
    });
});
