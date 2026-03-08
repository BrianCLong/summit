"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const vitest_1 = require("vitest");
const loader_js_1 = require("../src/loader.js");
const simulator_js_1 = require("../src/simulator.js");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, node_path_1.dirname)(__filename);
function loadConfig() {
    const baseDir = (0, node_path_1.resolve)(__dirname, '../fixtures');
    const raw = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.resolve)(baseDir, 'config.json'), 'utf-8'));
    return (0, loader_js_1.normalizePaths)(raw, baseDir);
}
(0, vitest_1.describe)('Schema Evolution Simulator', () => {
    const config = loadConfig();
    const schema = (0, loader_js_1.loadSchema)(config.schemaPath);
    const telemetry = (0, loader_js_1.loadTelemetry)(config.telemetryPath);
    const changes = (0, loader_js_1.loadChanges)(config.changesPath);
    const fixture = (0, loader_js_1.loadFixtureDataset)(config.fixturePath);
    const output = (0, simulator_js_1.runSimulation)({ schema, telemetry, changes, fixture });
    (0, vitest_1.it)('flags seeded breaking changes in compatibility matrix', () => {
        const billingImpact = output.compatibility.impacts.find((impact) => impact.consumer === 'billing-service' && impact.table === 'customers');
        (0, vitest_1.expect)(billingImpact).toBeDefined();
        (0, vitest_1.expect)(billingImpact?.status).toBe('breaking');
        (0, vitest_1.expect)(billingImpact?.reasons.some((reason) => reason.includes('split'))).toBe(true);
    });
    (0, vitest_1.it)('generates migrations with SQL and code stubs for each change', () => {
        (0, vitest_1.expect)(output.migrationBundle.migrations).toHaveLength(3);
        const rename = output.migrationBundle.migrations.find((migration) => migration.changeType === 'rename');
        (0, vitest_1.expect)(rename?.sql).toContain('RENAME COLUMN email TO primary_email');
        const split = output.migrationBundle.migrations.find((migration) => migration.changeType === 'split');
        (0, vitest_1.expect)(split?.sql).toContain('ADD COLUMN first_name');
        const widen = output.migrationBundle.migrations.find((migration) => migration.changeType === 'widen');
        (0, vitest_1.expect)(widen?.sql).toContain('ALTER COLUMN total_amount TYPE FLOAT');
    });
    (0, vitest_1.it)('applies generated migrations to fixture data without throwing and returns preview', () => {
        (0, vitest_1.expect)(output.fixturePreview).toBeDefined();
        const customers = output.fixturePreview?.tables.customers ?? [];
        (0, vitest_1.expect)(customers[0]).toHaveProperty('primary_email', 'ada@example.com');
        (0, vitest_1.expect)(customers[0]).not.toHaveProperty('email');
        (0, vitest_1.expect)(customers[0]).toHaveProperty('first_name', 'Ada');
        (0, vitest_1.expect)(customers[0]).toHaveProperty('last_name', 'Lovelace');
    });
    (0, vitest_1.it)('produces deterministic risk assessment and rollout gating', () => {
        (0, vitest_1.expect)(output.risk.score).toBeCloseTo(13.14, 2);
        (0, vitest_1.expect)(output.risk.severity).toBe('medium');
        const cutoverPhase = output.rollout.phases.find((phase) => phase.name === 'Cutover');
        (0, vitest_1.expect)(cutoverPhase?.gate).toBe('pass');
        (0, vitest_1.expect)(cutoverPhase?.riskScore).toBeCloseTo(13.14, 2);
    });
});
