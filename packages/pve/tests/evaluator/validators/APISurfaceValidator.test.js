"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const APISurfaceValidator_1 = require("../../../src/evaluator/validators/APISurfaceValidator");
(0, vitest_1.describe)('APISurfaceValidator', () => {
    const validator = new APISurfaceValidator_1.APISurfaceValidator();
    (0, vitest_1.it)('should detect new endpoints', async () => {
        const input = {
            type: 'api_surface',
            apiType: 'rest',
            previous: {
                info: { version: '1.0.0' },
                paths: {
                    '/users': { get: {} },
                },
            },
            current: {
                info: { version: '1.1.0' },
                paths: {
                    '/users': { get: {} },
                    '/users/new': { post: {} },
                },
            },
        };
        const results = await validator.validate({ type: 'api_surface', input });
        const newEndpointResult = results.find((r) => r.policy === 'pve.api.new_endpoints');
        (0, vitest_1.expect)(newEndpointResult).toBeDefined();
        (0, vitest_1.expect)(newEndpointResult?.allowed).toBe(true);
        (0, vitest_1.expect)(newEndpointResult?.message).toContain('Added 1 new endpoints');
    });
    (0, vitest_1.it)('should detect breaking changes (removed endpoint)', async () => {
        const input = {
            type: 'api_surface',
            apiType: 'rest',
            previous: {
                info: { version: '1.0.0' },
                paths: {
                    '/users': { get: {} },
                },
            },
            current: {
                info: { version: '2.0.0' },
                paths: {},
            },
        };
        const results = await validator.validate({ type: 'api_surface', input });
        const breakingChangeResult = results.find((r) => r.policy === 'pve.api.breaking_change');
        (0, vitest_1.expect)(breakingChangeResult).toBeDefined();
        (0, vitest_1.expect)(breakingChangeResult?.allowed).toBe(false);
        (0, vitest_1.expect)(breakingChangeResult?.message).toContain('Endpoint removed: /users');
    });
    (0, vitest_1.it)('should detect missing version bump', async () => {
        const input = {
            type: 'api_surface',
            apiType: 'rest',
            previous: {
                info: { version: '1.0.0' },
                paths: {
                    '/users': { get: {} },
                },
            },
            current: {
                info: { version: '1.0.0' }, // Version unchanged despite changes
                paths: {
                    '/users': { get: {} },
                    '/users/new': { post: {} },
                },
            },
        };
        const results = await validator.validate({ type: 'api_surface', input });
        const versionBumpResult = results.find((r) => r.policy === 'pve.api.version_bump');
        (0, vitest_1.expect)(versionBumpResult).toBeDefined();
        (0, vitest_1.expect)(versionBumpResult?.allowed).toBe(false);
    });
    (0, vitest_1.it)('should flag Purview DataAssets endpoints specifically', async () => {
        const input = {
            type: 'api_surface',
            apiType: 'rest',
            previous: {
                info: { version: '1.0.0' },
                paths: {},
            },
            current: {
                info: { version: '1.1.0' },
                paths: {
                    '/purview/DataAssets/create': { post: {} },
                },
            },
        };
        const results = await validator.validate({ type: 'api_surface', input });
        const purviewResult = results.find((r) => r.policy === 'pve.api.purview_data_assets');
        (0, vitest_1.expect)(purviewResult).toBeDefined();
        (0, vitest_1.expect)(purviewResult?.allowed).toBe(false); // Warning is treated as not allowed but with warning severity usually, or allowed=false depending on implementation.
        // Checking implementation: warn() calls fail() with severity 'warning', and fail sets allowed=false.
        (0, vitest_1.expect)(purviewResult?.severity).toBe('warning');
        (0, vitest_1.expect)(purviewResult?.message).toContain('New Purview DataAssets endpoint detected');
    });
});
