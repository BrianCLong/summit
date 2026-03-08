"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pact_1 = require("@pact-foundation/pact");
const node_path_1 = __importDefault(require("node:path"));
const provider = new pact_1.Pact({
    consumer: 'CompanyOS',
    provider: 'MaestroConductor',
    dir: node_path_1.default.resolve('pact/pacts'),
});
describe('Policy Pack contract', () => {
    beforeAll(async () => {
        await provider.setup();
    });
    afterAll(async () => {
        await provider.finalize();
    });
    it('serves tar with Digest/ETag and optional attestation endpoint', async () => {
        await provider.addInteraction({
            state: 'policy pack exists',
            uponReceiving: 'GET policy pack',
            withRequest: { method: 'HEAD', path: '/v1/policy/packs/policy-pack-v0' },
            willRespondWith: {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.intelgraph.policy+tar',
                    Digest: 'sha-256=abc123',
                    ETag: 'W/"sha-256:abc123"',
                },
            },
        });
        await provider.executeTest(async (mock) => {
            const r = await fetch(`${mock}/v1/policy/packs/policy-pack-v0`, {
                method: 'HEAD',
            });
            expect(r.status).toBe(200);
            expect(r.headers.get('digest')).toMatch(/^sha-256=/);
            expect(r.headers.get('etag')).toMatch(/^W\/"sha-256:/);
        });
    });
});
