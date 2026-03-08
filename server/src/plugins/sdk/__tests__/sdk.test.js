"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const validator_js_1 = require("../validator.js");
const sandbox_js_1 = require("../sandbox.js");
(0, globals_1.describe)('Plugin SDK', () => {
    (0, globals_1.describe)('Manifest Validation', () => {
        const validManifest = {
            name: 'test-plugin',
            version: '1.0.0',
            type: 'connector',
            capabilities: ['read:graph'],
            requiredScopes: ['tenant:123'],
            riskLevel: 'low',
            owner: 'dev@example.com'
        };
        (0, globals_1.it)('should validate a correct manifest', () => {
            const result = validator_js_1.ManifestValidator.validate(validManifest);
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.data).toMatchObject(validManifest);
        });
        (0, globals_1.it)('should fail on invalid name format', () => {
            const invalid = { ...validManifest, name: 'Test Plugin' }; // Spaces not allowed
            const result = validator_js_1.ManifestValidator.validate(invalid);
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errors[0]).toContain('Name must be kebab-case');
        });
        (0, globals_1.it)('should fail on invalid semver', () => {
            const invalid = { ...validManifest, version: '1.0' }; // Missing patch
            const result = validator_js_1.ManifestValidator.validate(invalid);
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errors[0]).toContain('Must be valid semver');
        });
        (0, globals_1.it)('should fail on missing required fields', () => {
            const invalid = { ...validManifest };
            delete invalid.owner;
            const result = validator_js_1.ManifestValidator.validate(invalid);
            (0, globals_1.expect)(result.success).toBe(false);
        });
    });
    (0, globals_1.describe)('Plugin Sandbox', () => {
        (0, globals_1.it)('should execute a function within timeout', async () => {
            const sandbox = new sandbox_js_1.PluginSandbox({ timeoutMs: 100 });
            const result = await sandbox.run(async () => {
                return 'success';
            });
            (0, globals_1.expect)(result).toBe('success');
        });
        (0, globals_1.it)('should timeout long running functions', async () => {
            const sandbox = new sandbox_js_1.PluginSandbox({ timeoutMs: 50 });
            await (0, globals_1.expect)(sandbox.run(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return 'too slow';
            })).rejects.toThrow('Plugin execution timed out');
        });
        (0, globals_1.it)('should block network if configured', () => {
            const sandbox = new sandbox_js_1.PluginSandbox({ allowNetwork: false });
            (0, globals_1.expect)(() => sandbox.checkNetworkAccess('example.com')).toThrow('Network access denied');
        });
        (0, globals_1.it)('should allow network if configured', () => {
            const sandbox = new sandbox_js_1.PluginSandbox({ allowNetwork: true });
            (0, globals_1.expect)(() => sandbox.checkNetworkAccess('example.com')).not.toThrow();
        });
    });
});
