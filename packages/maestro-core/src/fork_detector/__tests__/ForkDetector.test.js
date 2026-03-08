"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ForkDetector_1 = require("../ForkDetector");
(0, globals_1.describe)('ForkDetector', () => {
    (0, globals_1.it)('should give high entropy to decision tasks', () => {
        const task = {
            name: 'Decision Node',
            payload: { prompt: 'Please decide if this is valid.' }
        };
        const entropy = ForkDetector_1.ForkDetector.calculateEntropy(task);
        (0, globals_1.expect)(entropy).toBeGreaterThan(0.5);
    });
    (0, globals_1.it)('should give low entropy to mechanical tasks', () => {
        const task = {
            name: 'Save to S3',
            kind: 'upload',
            payload: { bucket: 'my-bucket' }
        };
        const entropy = ForkDetector_1.ForkDetector.calculateEntropy(task);
        (0, globals_1.expect)(entropy).toBeLessThan(0.5);
    });
    (0, globals_1.it)('should prioritize high entropy tasks', () => {
        const high = { name: 'decide', payload: {} };
        const low = { name: 'extract', payload: {} };
        const sorted = ForkDetector_1.ForkDetector.prioritize([low, high]);
        (0, globals_1.expect)(sorted[0]).toBe(high);
        (0, globals_1.expect)(sorted[1]).toBe(low);
    });
});
