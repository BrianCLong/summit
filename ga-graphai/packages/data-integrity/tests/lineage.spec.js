"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const lineageService_js_1 = require("../src/lineage/lineageService.js");
function makeArtifact(id, payload, overrides = {}) {
    const observedAt = new Date().toISOString();
    return {
        id,
        payload,
        metadata: {
            origin: `source-${id}`,
            confidence: 0.92,
            isSimulated: false,
            observedAt,
            ...overrides,
        },
    };
}
(0, vitest_1.describe)('LineageService', () => {
    (0, vitest_1.it)('enforces provenance metadata on registration and transformation outputs', () => {
        const service = new lineageService_js_1.LineageService();
        (0, vitest_1.expect)(() => service.registerArtifact({
            id: 'invalid',
            payload: {},
            metadata: { origin: '', confidence: 0.5, isSimulated: false, observedAt: new Date().toISOString() },
        })).toThrow(/origin/);
        const valid = makeArtifact('raw', { reading: 1 });
        service.registerArtifact(valid);
        (0, vitest_1.expect)(() => service.recordTransformation({
            id: 'bad-confidence',
            operation: 'derive',
            inputs: ['raw'],
            outputs: [
                makeArtifact('derived', { normalized: 1 }, {
                    origin: 'derived-system',
                    confidence: 2,
                }),
            ],
        })).toThrow(/confidence/);
    });
    (0, vitest_1.it)('builds bidirectional traces so auditors can reconstruct flows', () => {
        const service = new lineageService_js_1.LineageService();
        const observedAt = new Date().toISOString();
        service.registerArtifact({ id: 'sensor-a', payload: { reading: 1 }, metadata: { origin: 'sensor-a', confidence: 0.91, isSimulated: false, observedAt } });
        service.registerArtifact({ id: 'sensor-b', payload: { reading: 2 }, metadata: { origin: 'sensor-b', confidence: 0.93, isSimulated: false, observedAt } });
        service.recordTransformation({
            id: 'fusion',
            operation: 'fusion',
            inputs: ['sensor-a', 'sensor-b'],
            outputs: [
                { id: 'fused', payload: { reading: 1.5 }, metadata: { origin: 'fusion-service', confidence: 0.89, isSimulated: false, observedAt } },
            ],
            actor: 'pipeline',
        });
        service.recordTransformation({
            id: 'simulation',
            operation: 'simulation-label',
            inputs: ['fused'],
            outputs: [
                { id: 'simulated', payload: { reading: 1.5 }, metadata: { origin: 'sim-lab', confidence: 0.8, isSimulated: true, observedAt } },
            ],
            notes: 'Downstream consumers must know this is simulated',
        });
        const trace = service.trace('simulated');
        (0, vitest_1.expect)(trace.roots).toEqual(vitest_1.expect.arrayContaining(['sensor-a', 'sensor-b']));
        (0, vitest_1.expect)(trace.leaves).toContain('simulated');
        (0, vitest_1.expect)(trace.edges).toEqual(vitest_1.expect.arrayContaining([
            { from: 'sensor-a', to: 'fused', via: 'fusion' },
            { from: 'sensor-b', to: 'fused', via: 'fusion' },
            { from: 'fused', to: 'simulated', via: 'simulation' },
        ]));
        const audit = service.auditTrail('simulated');
        (0, vitest_1.expect)(audit.verification.valid).toBe(true);
        (0, vitest_1.expect)(audit.ledger.some((entry) => entry.id === 'simulation')).toBe(true);
    });
    (0, vitest_1.it)('can verify tampering by replaying the canonical ledger', () => {
        const service = new lineageService_js_1.LineageService();
        const base = makeArtifact('raw', { reading: 3 });
        service.registerArtifact(base);
        service.recordTransformation({
            id: 'normalize',
            operation: 'normalize',
            inputs: ['raw'],
            outputs: [makeArtifact('normalized', { reading: 0.3 }, { origin: 'normalizer' })],
            timestamp: new Date().toISOString(),
        });
        const initial = service.auditTrail('normalized');
        (0, vitest_1.expect)(initial.verification.valid).toBe(true);
        const ledger = service.ledger;
        const events = ledger.list(0, Number.MAX_SAFE_INTEGER);
        events[events.length - 1].payload = { tampered: true };
        const verification = ledger.verify('lineage');
        (0, vitest_1.expect)(verification.valid).toBe(false);
    });
});
