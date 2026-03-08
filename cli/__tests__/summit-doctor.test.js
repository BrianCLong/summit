"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const summit_doctor_js_1 = require("../src/summit-doctor.js");
describe('summit doctor checks', () => {
    test('node version validation handles pass and fail', () => {
        expect((0, summit_doctor_js_1.checkNodeVersion)(18, 'v20.10.0').status).toBe('pass');
        expect((0, summit_doctor_js_1.checkNodeVersion)(18, 'v18.19.0').status).toBe('pass');
        const outdated = (0, summit_doctor_js_1.checkNodeVersion)(18, 'v16.0.0');
        expect(outdated.status).toBe('fail');
        expect(outdated.fix).toMatch(/Node.js 18\+/);
    });
    test('auto-heals missing env file when example exists', async () => {
        const tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'summit-doctor-env-'));
        const envPath = path_1.default.join(tempDir, '.env');
        const examplePath = path_1.default.join(tempDir, '.env.example');
        fs_1.default.writeFileSync(examplePath, 'EXAMPLE_VAR=value');
        const result = await (0, summit_doctor_js_1.ensureEnvFile)(envPath, true);
        expect(result.status).toBe('pass');
        expect(result.autoFixed).toBe(true);
        expect(fs_1.default.existsSync(envPath)).toBe(true);
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    });
    test('checks makefile targets and reports missing ones', async () => {
        const tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'summit-doctor-make-'));
        const makefilePath = path_1.default.join(tempDir, 'Makefile');
        fs_1.default.writeFileSync(makefilePath, 'bootstrap:\n\t@echo bootstrapping\nsmoke:\n\t@echo smoke');
        const missing = await (0, summit_doctor_js_1.checkMakefileTargets)(tempDir);
        expect(missing.status).toBe('fail');
        expect(missing.message).toContain('Missing');
        fs_1.default.writeFileSync(makefilePath, 'bootstrap:\n\t@echo bootstrapping\nup:\n\t@echo up\nmigrate:\n\t@echo migrate\nsmoke:\n\t@echo smoke\ndown:\n\t@echo down');
        const present = await (0, summit_doctor_js_1.checkMakefileTargets)(tempDir);
        expect(present.status).toBe('pass');
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    });
    test('pnpm auto-fix installs via corepack when missing', async () => {
        let pnpmInstalled = false;
        const execRunner = (command) => {
            if (command.startsWith('command -v pnpm')) {
                if (pnpmInstalled) {
                    return '/usr/bin/pnpm';
                }
                throw new Error('pnpm missing');
            }
            if (command.startsWith('command -v corepack')) {
                return '/usr/bin/corepack';
            }
            if (command.startsWith('corepack prepare')) {
                pnpmInstalled = true;
                return '';
            }
            throw new Error(`unexpected command ${command}`);
        };
        const result = await (0, summit_doctor_js_1.checkPnpm)(execRunner, true);
        expect(result.status).toBe('pass');
        expect(result.autoFixed).toBe(true);
    });
    test('redis and postgres connectivity checks honor probe results', async () => {
        const reachableProbe = async () => true;
        const unreachableProbe = async () => false;
        expect((await (0, summit_doctor_js_1.checkRedis)(reachableProbe)).status).toBe('pass');
        expect((await (0, summit_doctor_js_1.checkPostgres)(reachableProbe)).status).toBe('pass');
        expect((await (0, summit_doctor_js_1.checkRedis)(unreachableProbe)).status).toBe('warn');
        expect((await (0, summit_doctor_js_1.checkPostgres)(unreachableProbe)).status).toBe('warn');
    });
    test('runDoctor aggregates results and summary', async () => {
        const tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'summit-doctor-run-'));
        fs_1.default.writeFileSync(path_1.default.join(tempDir, '.env.example'), 'TEST_VAR=value');
        fs_1.default.writeFileSync(path_1.default.join(tempDir, 'Makefile'), 'bootstrap:\n\t@echo bootstrapping\nup:\n\t@echo up\nmigrate:\n\t@echo migrate\nsmoke:\n\t@echo smoke\ndown:\n\t@echo down');
        const report = await (0, summit_doctor_js_1.runDoctor)({
            cwd: tempDir,
            autoFix: true,
            execRunner: () => '/usr/bin/true',
            redisProbe: async () => true,
            postgresProbe: async () => true,
        });
        expect(report.summary.total).toBeGreaterThan(0);
        expect(report.summary.failed).toBe(0);
        expect(report.summary.autoFixed).toBeGreaterThanOrEqual(1);
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    });
    test('docker check warns when daemon is unavailable', async () => {
        const execRunner = (command) => {
            if (command.startsWith('command -v docker')) {
                return '/usr/bin/docker';
            }
            throw new Error(`cannot execute ${command}`);
        };
        const result = await (0, summit_doctor_js_1.checkDocker)(execRunner);
        expect(result.status).toBe('warn');
        expect(result.fix).toMatch(/Start Docker/);
    });
});
