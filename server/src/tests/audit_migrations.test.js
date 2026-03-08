"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const audit_migrations_js_1 = require("../../scripts/audit_migrations.js");
const createTempDir = () => node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'audit-migrations-'));
(0, globals_1.describe)('audit_migrations', () => {
    (0, globals_1.it)('detects new migrations that are not in the manifest', async () => {
        const baseDir = createTempDir();
        const migrationsDir = node_path_1.default.join(baseDir, 'migrations');
        node_fs_1.default.mkdirSync(migrationsDir, { recursive: true });
        const initialMigration = '001_init.sql';
        const initialContent = '-- initial migration';
        node_fs_1.default.writeFileSync(node_path_1.default.join(migrationsDir, initialMigration), initialContent);
        const manifestPath = node_path_1.default.join(migrationsDir, 'manifest.json');
        node_fs_1.default.writeFileSync(manifestPath, JSON.stringify({ [initialMigration]: (0, audit_migrations_js_1.calculateHash)(initialContent) }));
        const newMigration = '002_new.sql';
        node_fs_1.default.writeFileSync(node_path_1.default.join(migrationsDir, newMigration), 'CREATE TABLE test(id int);');
        const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
        const result = await (0, audit_migrations_js_1.auditMigrations)({ migrationsDir, manifestPath, mode: 'check', logger });
        (0, globals_1.expect)(result.hasError).toBe(true);
        (0, globals_1.expect)(result.errors.join(' ')).toContain('MANIFEST ERROR');
    });
    (0, globals_1.it)('rolls back manifest updates when persistence fails', async () => {
        const baseDir = createTempDir();
        const migrationsDir = node_path_1.default.join(baseDir, 'migrations');
        node_fs_1.default.mkdirSync(migrationsDir, { recursive: true });
        const migration = '001_init.sql';
        const content = 'CREATE TABLE test(id int);';
        node_fs_1.default.writeFileSync(node_path_1.default.join(migrationsDir, migration), content);
        const manifestPath = node_path_1.default.join(migrationsDir, 'manifest.json');
        const originalManifest = JSON.stringify({});
        node_fs_1.default.writeFileSync(manifestPath, originalManifest);
        const originalWrite = node_fs_1.default.writeFileSync;
        const writeSpy = jest.spyOn(node_fs_1.default, 'writeFileSync').mockImplementation((file, data, ...rest) => {
            if (typeof file === 'string' && file.endsWith('.tmp')) {
                throw new Error('disk full');
            }
            return originalWrite.apply(node_fs_1.default, [file, data, ...rest]);
        });
        await (0, globals_1.expect)((0, audit_migrations_js_1.auditMigrations)({ migrationsDir, manifestPath, mode: 'update', logger: console })).rejects.toThrow('disk full');
        (0, globals_1.expect)(node_fs_1.default.readFileSync(manifestPath, 'utf-8')).toBe(originalManifest);
        writeSpy.mockRestore();
    });
    (0, globals_1.it)('flags destructive SQL statements', async () => {
        const baseDir = createTempDir();
        const migrationsDir = node_path_1.default.join(baseDir, 'migrations');
        node_fs_1.default.mkdirSync(migrationsDir, { recursive: true });
        const migration = '001_drop_table.sql';
        const content = 'DROP TABLE users;';
        node_fs_1.default.writeFileSync(node_path_1.default.join(migrationsDir, migration), content);
        const manifestPath = node_path_1.default.join(migrationsDir, 'manifest.json');
        node_fs_1.default.writeFileSync(manifestPath, JSON.stringify({ [migration]: (0, audit_migrations_js_1.calculateHash)(content) }));
        const result = await (0, audit_migrations_js_1.auditMigrations)({ migrationsDir, manifestPath, mode: 'check', logger: console });
        (0, globals_1.expect)(result.hasError).toBe(true);
        (0, globals_1.expect)(result.errors.join(' ')).toContain('RULE VIOLATION');
    });
});
