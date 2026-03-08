"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const globals_1 = require("@jest/globals");
const connectMock = globals_1.jest.fn();
const queryMock = globals_1.jest.fn();
const endMock = globals_1.jest.fn();
let MigrationSafetySimulator;
beforeAll(async () => {
    globals_1.jest.unstable_mockModule('pg', () => ({
        Client: globals_1.jest.fn(() => ({
            connect: connectMock,
            query: queryMock,
            end: endMock,
        })),
    }));
    ({ MigrationSafetySimulator } = await Promise.resolve().then(() => __importStar(require('../MigrationSafetySimulator.js'))));
    const pgModule = (await Promise.resolve().then(() => __importStar(require('pg'))));
    if (pgModule?.Client?.prototype) {
        pgModule.Client.prototype.connect = connectMock;
        pgModule.Client.prototype.query = queryMock;
        pgModule.Client.prototype.end = endMock;
    }
});
describe('MigrationSafetySimulator.detectUnsafePatterns', () => {
    it('flags destructive operations and missing predicates', () => {
        const sql = `
      CREATE TABLE widgets (id uuid primary key);
      DROP TABLE old_table;
      ALTER TABLE widgets ADD COLUMN legacy text;
      UPDATE widgets SET name = 'x';
      DELETE FROM widgets;
      ALTER TABLE widgets ALTER COLUMN legacy SET NOT NULL;
    `;
        const patterns = MigrationSafetySimulator.detectUnsafePatterns(sql, 'up');
        const patternTypes = patterns.map((pattern) => pattern.pattern);
        expect(patternTypes).toContain('drop_table');
        expect(patternTypes).toContain('update_without_where');
        expect(patternTypes).toContain('delete_without_where');
        expect(patternTypes).toContain('set_not_null');
    });
});
describe('MigrationSafetySimulator.run', () => {
    const tempRoots = [];
    afterEach(() => {
        connectMock.mockReset();
        queryMock.mockReset();
        endMock.mockReset();
        tempRoots.forEach((dir) => {
            fs_1.default.rmSync(dir, { recursive: true, force: true });
        });
        tempRoots.length = 0;
    });
    it('runs migrations in sorted order with savepoint isolation and keeps going on error', async () => {
        const root = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'migration-safety-'));
        tempRoots.push(root);
        const migrationsDir = path_1.default.join(root, 'migrations');
        const reportDir = path_1.default.join(root, 'report');
        const patchDir = path_1.default.join(root, 'patches');
        fs_1.default.mkdirSync(migrationsDir, { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(migrationsDir, '002_second.sql'), 'CREATE TABLE second(id int);');
        fs_1.default.writeFileSync(path_1.default.join(migrationsDir, '001_first.sql'), 'CREATE TABLE first(id int);');
        fs_1.default.writeFileSync(path_1.default.join(migrationsDir, '001_first.down.sql'), 'DROP TABLE first;');
        queryMock.mockImplementation((sql) => {
            if (sql.includes('DROP TABLE first')) {
                return Promise.reject(new Error('boom'));
            }
            return Promise.resolve({ rowCount: 0 });
        });
        const simulator = new MigrationSafetySimulator({
            migrationsDir,
            connectionString: 'postgres://example',
            reportDir,
            patchDir,
            continueOnError: true,
        });
        const report = await simulator.run();
        expect(report.migrations.map((m) => m.file)).toEqual([
            '001_first.sql',
            '002_second.sql',
        ]);
        expect(report.migrations[0].status).toBe('failed');
        expect(report.migrations[1].status).toBe('passed');
        expect(report.summary.failed).toBe(1);
        expect(report.summary.patchesGenerated).toBe(1);
        expect(fs_1.default.existsSync(path_1.default.join(patchDir, '002_second.down.sql'))).toBe(true);
        const queries = queryMock.mock.calls.map((call) => call[0]);
        expect(queries.some((sql) => sql.startsWith('SAVEPOINT migration_001_first'))).toBe(true);
        expect(queries.some((sql) => sql.startsWith('ROLLBACK TO SAVEPOINT migration_001_first'))).toBe(true);
    });
});
describe('MigrationSafetySimulator.generateRollbackPatchContent', () => {
    it('generates rollback stubs with drops for created objects', () => {
        const upSql = `
      CREATE TABLE IF NOT EXISTS demo (id serial primary key);
      ALTER TABLE demo ADD COLUMN extra text;
      CREATE INDEX demo_extra_idx ON demo(extra);
    `;
        const patch = MigrationSafetySimulator.generateRollbackPatchContent('2025-08-13_initial.sql', upSql);
        expect(patch).toContain('DROP TABLE IF EXISTS demo CASCADE;');
        expect(patch).toContain('DROP COLUMN IF EXISTS extra');
        expect(patch).toContain('DROP INDEX IF EXISTS demo_extra_idx;');
        expect(patch.startsWith('-- Auto-generated rollback for 2025-08-13_initial.sql')).toBe(true);
    });
});
