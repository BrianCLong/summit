"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GraphDetector_js_1 = require("../GraphDetector.js");
const recordWith = (values) => ({
    get: (key) => ({
        toNumber: () => values[key] ?? 0,
    }),
});
(0, globals_1.describe)('GraphDetector', () => {
    (0, globals_1.it)('should detect coordinated cliques', async () => {
        const run = globals_1.jest.fn().mockResolvedValueOnce({
            records: [recordWith({ internalInteractions: 30, actorCount: 6 })],
        });
        const close = globals_1.jest.fn().mockResolvedValue(undefined);
        const detector = new GraphDetector_js_1.GraphDetector({
            session: globals_1.jest.fn(() => ({ run, close })),
        });
        const result = await detector.detectCoordinatedCliques(['u1', 'u2', 'u3', 'u4', 'u5', 'u6']);
        (0, globals_1.expect)(result.isAnomalous).toBe(true);
        (0, globals_1.expect)(result.score).toBeGreaterThan(0.5);
        (0, globals_1.expect)(run).toHaveBeenCalled();
        (0, globals_1.expect)(close).toHaveBeenCalled();
    });
    (0, globals_1.it)('should analyze influence cascade', async () => {
        const run = globals_1.jest.fn()
            .mockResolvedValueOnce({ records: [recordWith({ depth: 5 })] })
            .mockResolvedValueOnce({ records: [recordWith({ breadth: 100 })] });
        const close = globals_1.jest.fn().mockResolvedValue(undefined);
        const detector = new GraphDetector_js_1.GraphDetector({
            session: globals_1.jest.fn(() => ({ run, close })),
        });
        const metrics = await detector.analyzeInfluenceCascade('post1');
        (0, globals_1.expect)(metrics.depth).toBe(5);
        (0, globals_1.expect)(metrics.breadth).toBe(100);
        (0, globals_1.expect)(run).toHaveBeenCalled();
        (0, globals_1.expect)(close).toHaveBeenCalled();
    });
});
