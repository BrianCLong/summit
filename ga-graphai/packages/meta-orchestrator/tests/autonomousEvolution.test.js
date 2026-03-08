"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
function buildOptions(overrides = {}) {
    const baseGenerator = async (prompt, iteration) => `draft iteration ${iteration}: ${prompt} with autonomous-navigation blueprint`;
    const options = {
        rsip: {
            aspects: ['quality', 'safety'],
            generator: baseGenerator,
            evaluator: async (output, aspect, iteration) => {
                if (aspect === 'safety') {
                    return output.includes('unsafe') ? 0.2 : 0.9;
                }
                return Math.min(1, 0.4 + iteration * 0.2);
            },
            qualityThreshold: 0.6,
            maxIterations: 3,
        },
        capabilityDetector: async (output) => {
            if (output.includes('autonomous-navigation')) {
                return [
                    {
                        capability: 'autonomous-navigation',
                        confidence: 0.82,
                        evidence: 'navigation routines synthesized',
                    },
                ];
            }
            return [];
        },
        boundaryRules: [
            {
                name: 'safety-guard',
                description: 'reject unsafe outputs',
                severity: 'warn',
                check: (output) => output.includes('unsafe'),
                guidance: 'Remove unsafe behaviours before proceeding.',
            },
        ],
    };
    return { ...options, ...overrides };
}
(0, vitest_1.describe)('AutonomousEvolutionOrchestrator', () => {
    (0, vitest_1.it)('runs recursive improvement cycles and detects emergent capabilities', async () => {
        const orchestrator = new index_js_1.AutonomousEvolutionOrchestrator(buildOptions({ maxEvolutionRounds: 2, emergenceThreshold: 0.75 }));
        const result = await orchestrator.run('Base prompt focusing on resilience');
        (0, vitest_1.expect)(result.success).toBe(true);
        (0, vitest_1.expect)(result.reason).toBe('quality-threshold');
        (0, vitest_1.expect)(result.emergentCapabilities[0]).toMatchObject({
            capability: 'autonomous-navigation',
            firstDetectedAt: 1,
        });
        (0, vitest_1.expect)(result.cycles[0].qualityScore).toBeGreaterThanOrEqual(0.6);
    });
    (0, vitest_1.it)('enforces ethical boundaries and stops when blocked', async () => {
        const orchestrator = new index_js_1.AutonomousEvolutionOrchestrator(buildOptions({
            maxEvolutionRounds: 2,
            boundaryRules: [
                {
                    name: 'no-unsafe-content',
                    description: 'halt when unsafe patterns appear',
                    severity: 'block',
                    guidance: 'Abort evolution due to unsafe content.',
                    check: (output) => output.includes('unsafe pattern'),
                },
            ],
            rsip: {
                aspects: ['safety'],
                generator: async () => 'unsafe pattern persists',
                evaluator: async () => 0.95,
                qualityThreshold: 0.8,
                maxIterations: 2,
            },
            capabilityDetector: async () => [],
        }));
        const result = await orchestrator.run('safety critical prompt');
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe('ethical-boundary');
        (0, vitest_1.expect)(result.boundaryViolations.some((entry) => entry.severity === 'block'))
            .toBe(true);
        (0, vitest_1.expect)(result.cycles.length).toBe(1);
    });
});
