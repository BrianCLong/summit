"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const normalizer_1 = require("../src/build/normalizer");
describe('normalizeTicket', () => {
    it('produces structured task spec with synthesized AC', async () => {
        const known = new Set();
        const reportedAt = new Date().toISOString();
        const result = await (0, normalizer_1.normalizeTicket)({
            ticketId: 'T-100',
            tenantId: 'tenant-x',
            title: 'Reduce build latency',
            body: `Goal: reduce build p95 latency to <= 950ms while keeping flake rate < 1% across 200 runs.
Targets: repo=maestro/module=runner job=test
Coverage >= 85% and ensure 0 HIGH CVEs before release.
Due=2025-09-30T00:00:00Z`,
            reportedAt,
            artifacts: [
                {
                    id: 'log1',
                    type: 'log',
                    uri: 's3://logs/build.log',
                    hash: 'sha256:abc',
                },
            ],
            labels: ['security'],
        }, { knownDigests: known });
        expect(result.language).toBe('en');
        const spec = result.spec;
        expect(spec.goal.toLowerCase()).toContain('reduce build p95');
        expect(spec.targets[0].repo).toContain('maestro');
        expect(spec.acceptanceCriteria.length).toBeGreaterThanOrEqual(3);
        expect(spec.acceptanceCriteria.some((ac) => ac.metric === 'flakeRate')).toBe(true);
        expect(spec.acceptanceCriteria.some((ac) => ac.metric === 'coverage')).toBe(true);
        expect(spec.policy.purpose).toBe('security');
        expect(spec.clarifyingQuestions).toBeUndefined();
        expect(spec.sla?.due).toBe('2025-09-30T00:00:00Z');
    });
    it('rejects duplicate tickets via digest cache', async () => {
        const known = new Set();
        const payload = {
            ticketId: 'T-duplicate',
            tenantId: 'tenant-x',
            title: 'Investigate flake',
            body: 'Goal: flake rate < 1%',
            reportedAt: new Date().toISOString(),
        };
        await (0, normalizer_1.normalizeTicket)({ ...payload }, { knownDigests: known });
        await expect((0, normalizer_1.normalizeTicket)({ ...payload }, { knownDigests: known })).rejects.toThrow(/duplicate-ticket/);
    });
});
