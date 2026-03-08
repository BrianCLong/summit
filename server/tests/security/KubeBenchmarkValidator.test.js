"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const KubeBenchmarkValidator_js_1 = require("../../src/security/KubeBenchmarkValidator.js");
(0, globals_1.describe)('KubeBenchmarkValidator', () => {
    (0, globals_1.it)('should run CIS benchmark simulation when tools are missing', async () => {
        const result = await KubeBenchmarkValidator_js_1.kubeBenchmarkValidator.runCisBenchmark();
        (0, globals_1.expect)(result.tool).toBe('kube-bench');
        (0, globals_1.expect)(result.status).toBe('fail'); // Simulated result has a failure
        (0, globals_1.expect)(result.items.length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('should run NSA benchmark simulation when tools are missing', async () => {
        const result = await KubeBenchmarkValidator_js_1.kubeBenchmarkValidator.runNsaBenchmark();
        (0, globals_1.expect)(result.tool).toBe('kubescape');
        (0, globals_1.expect)(result.status).toBe('fail'); // Simulated result has a failure
        (0, globals_1.expect)(result.items.length).toBeGreaterThan(0);
    });
});
