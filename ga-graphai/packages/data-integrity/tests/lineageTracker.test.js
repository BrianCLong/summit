"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('LineageTracker', () => {
    (0, vitest_1.it)('attaches provenance on ingress and validates hash and source', () => {
        const tracker = new index_js_1.LineageTracker();
        const envelope = tracker.ingress({ foo: 'bar' }, {
            source: 'api-gateway',
            ingress: 'api',
            traceId: 'trace-1',
        });
        const validation = tracker.validate(envelope, { source: 'api-gateway', ingress: 'api' });
        (0, vitest_1.expect)(validation.valid).toBe(true);
        (0, vitest_1.expect)(envelope.provenance.checksum).toBeDefined();
        (0, vitest_1.expect)(envelope.provenance.traceId).toBe('trace-1');
        (0, vitest_1.expect)(validation.chainDepth).toBe(0);
    });
    (0, vitest_1.it)('propagates hops with chained checksums and renders headers', () => {
        const tracker = new index_js_1.LineageTracker({ signer: (hash) => `sig:${hash.slice(0, 6)}` });
        const ingress = tracker.ingress({ payload: 'value' }, {
            source: 'broker',
            ingress: 'message-broker',
            traceId: 'trace-2',
            parentChecksums: ['root'],
        });
        const hop = tracker.propagate(ingress, {
            source: 'worker',
            ingress: 'database',
            attributes: { shard: 'alpha' },
        });
        (0, vitest_1.expect)(hop.provenance.chain?.length).toBe(2);
        (0, vitest_1.expect)(hop.provenance.signature).toMatch(/^sig:/);
        const headers = tracker.asHeaders(hop);
        const reconstructed = tracker.fromHeaders(ingress.payload, headers);
        const validation = tracker.validate(reconstructed, { source: 'worker', ingress: 'database' });
        (0, vitest_1.expect)(headers['x-lineage-chain']).toContain('root');
        (0, vitest_1.expect)(reconstructed.provenance.attributes?.shard).toBe('alpha');
        (0, vitest_1.expect)(validation.hashMatches).toBe(true);
    });
});
