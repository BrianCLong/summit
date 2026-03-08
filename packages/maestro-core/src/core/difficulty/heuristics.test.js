"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const heuristics_1 = require("./heuristics");
(0, globals_1.describe)("difficulty heuristics", () => {
    (0, globals_1.it)("scores short simple queries low", () => {
        const f = (0, heuristics_1.extractDifficultyFeatures)("What time is it in Denver?");
        const s = (0, heuristics_1.scoreDifficultyFromFeatures)(f);
        (0, globals_1.expect)(s).toBeLessThan(0.35);
    });
    (0, globals_1.it)("scores multi-step engineering prompts higher", () => {
        const q = `
Build a router. Requirements:
- must be cost-aware
- add tests
- add metrics
\`\`\`ts
export function x() {}
\`\`\`
`;
        const f = (0, heuristics_1.extractDifficultyFeatures)(q);
        const s = (0, heuristics_1.scoreDifficultyFromFeatures)(f);
        (0, globals_1.expect)(s).toBeGreaterThan(0.55);
    });
    (0, globals_1.it)("detects domain hints", () => {
        (0, globals_1.expect)((0, heuristics_1.detectDomain)("Investigate CVE-2025-XXXX and propose mitigations")).toBe("security");
    });
});
