"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const base = {
    name: 'example',
    version: 'v1',
    fields: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: false },
    },
};
const additive = {
    name: 'example',
    version: 'v2',
    fields: {
        ...base.fields,
        description: { type: 'string', required: false },
    },
};
(0, vitest_1.describe)('schema compatibility', () => {
    (0, vitest_1.it)('allows additive optional fields by default', () => {
        const report = (0, index_js_1.compareSchemas)(base, additive);
        (0, vitest_1.expect)(report.compatible).toBe(true);
        (0, vitest_1.expect)(report.issues.some((issue) => issue.severity === 'warning')).toBe(true);
    });
    (0, vitest_1.it)('flags removals as breaking with actionable reason', () => {
        const removal = {
            name: 'example',
            version: 'v2',
            fields: { id: { type: 'string', required: true } },
        };
        const report = (0, index_js_1.compareSchemas)(base, removal);
        (0, vitest_1.expect)(report.compatible).toBe(false);
        (0, vitest_1.expect)(report.issues[0].reason).toContain('Field removed');
    });
    (0, vitest_1.it)('requires migration document when breaking change approved', () => {
        const renamed = {
            name: 'example',
            version: 'v2',
            fields: { id: { type: 'number', required: true }, name: { type: 'string' } },
        };
        const report = (0, index_js_1.compareSchemas)(base, renamed, {
            allowBreaking: true,
            migrationDocument: undefined,
        });
        (0, vitest_1.expect)(report.compatible).toBe(false);
    });
    (0, vitest_1.it)('loads registry from schema directory', async () => {
        const registry = await index_js_1.SchemaRegistry.fromDirectory('../schema');
        const reports = registry.checkLatest();
        const manifestReport = reports.find((r) => r.schema === 'export-manifest');
        (0, vitest_1.expect)(manifestReport?.compatible).toBe(true);
    });
});
