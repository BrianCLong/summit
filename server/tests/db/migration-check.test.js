"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const migration_checker_js_1 = require("../../src/db/migrations/migration-checker.js");
const writeMigration = (dir, name, sql) => {
    const upPath = path_1.default.join(dir, `${name}.up.sql`);
    fs_1.default.writeFileSync(upPath, sql, 'utf8');
};
(0, globals_1.describe)('migration safety gate', () => {
    (0, globals_1.it)('allows safe migrations', () => {
        const dir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'migrations-'));
        writeMigration(dir, '20250101000000_safe', 'CREATE TABLE safe_table (id uuid primary key);');
        const report = (0, migration_checker_js_1.buildMigrationRiskReport)({
            migrationsDir: dir,
            overridden: false,
        });
        (0, globals_1.expect)(report.summary.findings).toBe(0);
        (0, globals_1.expect)(report.summary.riskyMigrations).toBe(0);
    });
    (0, globals_1.it)('flags destructive migrations', () => {
        const dir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'migrations-'));
        writeMigration(dir, '20250101000001_drop', 'DROP TABLE users;');
        const report = (0, migration_checker_js_1.buildMigrationRiskReport)({
            migrationsDir: dir,
            overridden: false,
        });
        (0, globals_1.expect)(report.summary.findings).toBeGreaterThan(0);
        (0, globals_1.expect)(report.summary.riskyMigrations).toBe(1);
        (0, globals_1.expect)(report.migrations[0].findings[0].rule).toBe('drop_table');
    });
    (0, globals_1.it)('marks overridden reports when destructive checks are bypassed', () => {
        const findings = (0, migration_checker_js_1.scanSqlForRisks)('ALTER TABLE users ADD COLUMN role text NOT NULL;');
        (0, globals_1.expect)(findings.some((finding) => finding.rule === 'add_not_null_without_default'))
            .toBe(true);
        const report = (0, migration_checker_js_1.buildMigrationRiskReport)({
            migrationsDir: fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'migrations-')),
            overridden: true,
        });
        (0, globals_1.expect)(report.overridden).toBe(true);
    });
});
