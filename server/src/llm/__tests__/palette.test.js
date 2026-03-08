"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const selector_js_1 = require("../palette/selector.js");
const injection_js_1 = require("../palette/injection.js");
const router_js_1 = require("../router.js");
const mock_js_1 = require("../providers/mock.js");
const provenance_js_1 = require("../palette/provenance.js");
const runtimeEnabled = {
    enabled: true,
    defaultPaletteId: 'concise_exec',
    allowExploration: true,
    maxK: 3,
};
(0, globals_1.describe)('Reasoning Palette core', () => {
    (0, globals_1.it)('selects fixed palette deterministically', () => {
        const selector = new selector_js_1.PaletteSelector(runtimeEnabled);
        const result = selector.select({ overrideId: 'math_rigor' });
        (0, globals_1.expect)(result.palette.id).toBe('math_rigor');
    });
    (0, globals_1.it)('selects random palette reproducibly with seed', () => {
        const selector = new selector_js_1.PaletteSelector(runtimeEnabled);
        const a = selector.select({ strategy: { type: 'random', seed: 123, allowedIds: ['concise_exec', 'code_planner'] } });
        const b = selector.select({ strategy: { type: 'random', seed: 123, allowedIds: ['concise_exec', 'code_planner'] } });
        (0, globals_1.expect)(a.palette.id).toBe(b.palette.id);
    });
    (0, globals_1.it)('throws when exploration is disabled', () => {
        const selector = new selector_js_1.PaletteSelector({ ...runtimeEnabled, allowExploration: false });
        (0, globals_1.expect)(() => selector.select({ strategy: { type: 'random' } })).toThrow();
    });
    (0, globals_1.it)('appends palette text after existing system message', () => {
        const messages = [
            { role: 'system', content: 'system-header' },
            { role: 'user', content: 'hello' },
        ];
        const selection = new selector_js_1.PaletteSelector(runtimeEnabled).select({ overrideId: 'concise_exec' });
        const injected = (0, injection_js_1.applyPaletteInjection)(selection.palette, messages);
        (0, globals_1.expect)(injected.messages[0].content).toContain('system-header');
        (0, globals_1.expect)(injected.messages[0].content).toContain('--- REASONING PALETTE MODE: concise_exec ---');
    });
});
(0, globals_1.describe)('LLMRouter palette integration', () => {
    class TestProvenance extends provenance_js_1.PaletteProvenanceRecorder {
        async record(event) {
            this.events.push(event);
        }
    }
    class EchoProvider extends mock_js_1.MockProvider {
        lastRequest;
        async generate(req) {
            this.lastRequest = req;
            return this.createResponse(req, `echo-${req.id}`, { prompt: 1, completion: 1 }, 'mock-model', Date.now());
        }
    }
    const routerConfig = {
        providers: [new EchoProvider()],
        cacheTTL: 0,
        paletteRuntimeConfig: runtimeEnabled,
        paletteProvenanceRecorder: new TestProvenance(),
    };
    (0, globals_1.it)('injects palette prefix and records provenance', async () => {
        const router = new router_js_1.LLMRouter(routerConfig);
        const res = await router.route({
            tenantId: 'tenant-1',
            messages: [
                { role: 'system', content: 'baseline' },
                { role: 'user', content: 'hi' },
            ],
            palette: { overrideId: 'math_rigor' },
        });
        const provider = routerConfig.providers[0];
        (0, globals_1.expect)(provider.lastRequest.messages[0].content).toContain('baseline');
        (0, globals_1.expect)(provider.lastRequest.messages[0].content).toContain('--- REASONING PALETTE MODE: math_rigor ---');
        (0, globals_1.expect)(res.paletteUsage?.paletteId).toBe('math_rigor');
        const provenance = routerConfig.paletteProvenanceRecorder;
        (0, globals_1.expect)(provenance.events.length).toBeGreaterThan(0);
        (0, globals_1.expect)(provenance.events[0].paletteId).toBe('math_rigor');
    });
    (0, globals_1.it)('runs multi-sample palette selection and surfaces candidates', async () => {
        const verifier = {
            async evaluate() {
                return { selectedIndex: 1, scores: [0.1, 0.9] };
            },
        };
        const router = new router_js_1.LLMRouter({ ...routerConfig, paletteVerifier: verifier });
        const res = await router.route({
            messages: [{ role: 'user', content: 'hi' }],
            palette: { strategy: { type: 'random', seed: 42 }, k: 2, seed: 99 },
        });
        (0, globals_1.expect)(res.selectedCandidateIndex).toBe(1);
        (0, globals_1.expect)(res.paletteCandidates?.length).toBe(2);
        (0, globals_1.expect)(res.paletteVerifierScores).toEqual([0.1, 0.9]);
    });
});
