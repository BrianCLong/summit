"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const restoreScript = path_1.default.resolve(__dirname, '../../scripts/db/restore.sh');
describe('tenant-scoped backup validation', () => {
    const tmpRoot = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'tenant-backup-'));
    const backupRoot = path_1.default.join(tmpRoot, 'backup');
    const tenant = 'tenant-a';
    const tenantPath = path_1.default.join(backupRoot, 'tenants', tenant);
    beforeAll(() => {
        fs_1.default.mkdirSync(tenantPath, { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(backupRoot, 'backup-metadata.json'), JSON.stringify({ environment: 'dev', tenant }), 'utf-8');
        fs_1.default.writeFileSync(path_1.default.join(tenantPath, 'postgres.dump'), '', 'utf-8');
        fs_1.default.writeFileSync(path_1.default.join(tenantPath, 'neo4j.dump'), '', 'utf-8');
    });
    afterAll(() => {
        fs_1.default.rmSync(tmpRoot, { recursive: true, force: true });
    });
    it('runs a dry-run restore when tenant matches metadata and folder', () => {
        const output = (0, child_process_1.execFileSync)('bash', [
            restoreScript,
            '--env=dev',
            `--backup-path=${backupRoot}`,
            '--datastores=postgres,neo4j',
            `--tenant=${tenant}`,
            '--dry-run',
            '--skip-verification',
            '--force',
        ], {
            env: {
                ...process.env,
                SKIP_VERIFICATION: 'true',
                DRY_RUN: 'true',
                FORCE: 'true',
                POSTGRES_CONTAINER: 'mock-postgres',
                NEO4J_CONTAINER: 'mock-neo4j',
            },
        }).toString();
        expect(output).toContain('Using tenant-scoped backup path');
        expect(output).toContain('DRY RUN');
    });
    it('fails fast when tenant metadata mismatches', () => {
        expect(() => (0, child_process_1.execFileSync)('bash', [
            restoreScript,
            '--env=dev',
            `--backup-path=${backupRoot}`,
            '--datastores=postgres',
            '--tenant=wrong-tenant',
            '--dry-run',
            '--skip-verification',
            '--force',
        ], {
            env: {
                ...process.env,
                SKIP_VERIFICATION: 'true',
                DRY_RUN: 'true',
                FORCE: 'true',
            },
        })).toThrow();
    });
});
