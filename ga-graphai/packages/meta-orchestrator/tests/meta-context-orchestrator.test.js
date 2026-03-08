"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
function buildNode(overrides) {
    return {
        kind: overrides.kind,
        layer: overrides.layer,
        affordances: overrides.affordances ?? ['describable'],
        data: overrides.data ?? { note: 'test' },
        provenance: overrides.provenance ??
            {
                source: 'test-suite',
                timestamp: new Date().toISOString(),
            },
        tags: overrides.tags,
        title: overrides.title,
        invariants: overrides.invariants,
        supersedes: overrides.supersedes,
        supersededBy: overrides.supersededBy,
    };
}
(0, vitest_1.describe)('MetaContextOrchestrator', () => {
    let orchestrator;
    (0, vitest_1.beforeEach)(() => {
        orchestrator = new index_js_1.MetaContextOrchestrator();
    });
    (0, vitest_1.it)('supersedes prior nodes when registering updates and assembles active context', () => {
        orchestrator.registerNode({ ...buildNode({ kind: 'decision', layer: 'task' }), id: 'n1' });
        orchestrator.registerNode({
            ...buildNode({ kind: 'decision', layer: 'task', title: 'Updated', supersedes: ['n1'] }),
            id: 'n2',
        });
        const packet = orchestrator.assemble({ goal: 'test-plan' });
        const nodeIds = packet.nodes.map((node) => node.id);
        (0, vitest_1.expect)(nodeIds).toContain('n2');
        (0, vitest_1.expect)(nodeIds).not.toContain('n1');
    });
    (0, vitest_1.it)('enforces strict contracts, blocking forbidden tags and ensuring required kinds', () => {
        orchestrator.registerNode({
            ...buildNode({ kind: 'decision', layer: 'task', tags: ['reviewed'] }),
            id: 'decision-1',
        });
        orchestrator.registerNode({
            ...buildNode({ kind: 'note', layer: 'task', tags: ['secret'] }),
            id: 'note-1',
        });
        const contract = {
            requiredKinds: ['decision'],
            forbiddenTags: ['secret'],
            layerAllowlist: ['task', 'world'],
        };
        (0, vitest_1.expect)(() => orchestrator.assemble({ goal: 'guardrails', contract, strict: true })).toThrowError(/forbidden tags/);
    });
    (0, vitest_1.it)('filters by affordances and includeKinds to produce minimal packets', () => {
        orchestrator.registerNode({
            ...buildNode({ kind: 'summary', layer: 'world', affordances: ['describable'] }),
            id: 'summary-1',
        });
        orchestrator.registerNode({
            ...buildNode({
                kind: 'summary',
                layer: 'world',
                affordances: ['describable', 'runnable'],
            }),
            id: 'summary-2',
        });
        const packet = orchestrator.assemble({
            goal: 'run-experiment',
            includeKinds: ['summary'],
            requiredAffordances: ['runnable'],
        });
        (0, vitest_1.expect)(packet.nodes).toHaveLength(1);
        (0, vitest_1.expect)(packet.nodes[0].id).toBe('summary-2');
    });
    (0, vitest_1.it)('records standalone deltas and exposes them in assembled packets', () => {
        const delta = orchestrator.recordDelta({
            kind: 'decision',
            summary: 'selected architecture',
            author: 'tester',
            linkedNodeIds: [],
        });
        orchestrator.registerNode({ ...buildNode({ kind: 'fact', layer: 'world' }), id: 'fact-1' });
        const packet = orchestrator.assemble({ goal: 'traceability' });
        (0, vitest_1.expect)(packet.deltas.some((entry) => entry.id === delta.id)).toBe(true);
        (0, vitest_1.expect)(packet.deltas.length).toBeGreaterThanOrEqual(1);
    });
});
