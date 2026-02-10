import fs from 'fs';
import os from 'os';
import path from 'path';

// Mock conf module (ESM-only package)
const mockStore = new Map<string, unknown>();
jest.mock('conf', () => {
  return {
    __esModule: true,
    default: class MockConf<T extends object> {
      private defaults: T;
      constructor(options: { projectName: string; defaults: T }) {
        this.defaults = options.defaults;
        mockStore.set('config', this.defaults);
      }
      get store(): T {
        return (mockStore.get('config') as T) ?? this.defaults;
      }
      set store(val: T) {
        mockStore.set('config', val);
      }
      get<K extends keyof T>(key: K): T[K] {
        return (this.store as T)[key];
      }
      set<K extends keyof T>(key: K, val: T[K]): void {
        const current = this.store;
        (current as T)[key] = val;
        mockStore.set('config', current);
      }
    },
  };
});

import {
  checkDocker,
  checkMakefileTargets,
  checkNodeVersion,
  checkPnpm,
  checkPostgres,
  checkRedis,
  ensureEnvFile,
  runDoctor,
  type ExecRunner,
} from '../src/summit-doctor.js';

describe('summit doctor checks', () => {
  test('node version validation handles pass and fail', () => {
    expect(checkNodeVersion(18, 'v20.10.0').status).toBe('pass');
    expect(checkNodeVersion(18, 'v18.19.0').status).toBe('pass');
    const outdated = checkNodeVersion(18, 'v16.0.0');
    expect(outdated.status).toBe('fail');
    expect(outdated.fix).toMatch(/Node.js 18\+/);
  });

  test('auto-heals missing env file when example exists', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summit-doctor-env-'));
    const envPath = path.join(tempDir, '.env');
    const examplePath = path.join(tempDir, '.env.example');
    fs.writeFileSync(examplePath, 'EXAMPLE_VAR=value');

    const result = await ensureEnvFile(envPath, true);

    expect(result.status).toBe('pass');
    expect(result.autoFixed).toBe(true);
    expect(fs.existsSync(envPath)).toBe(true);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('checks makefile targets and reports missing ones', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summit-doctor-make-'));
    const makefilePath = path.join(tempDir, 'Makefile');
    fs.writeFileSync(makefilePath, 'bootstrap:\n\t@echo bootstrapping\nsmoke:\n\t@echo smoke');

    const missing = await checkMakefileTargets(tempDir);
    expect(missing.status).toBe('fail');
    expect(missing.message).toContain('Missing');

    fs.writeFileSync(
      makefilePath,
      'bootstrap:\n\t@echo bootstrapping\nup:\n\t@echo up\nmigrate:\n\t@echo migrate\nsmoke:\n\t@echo smoke\ndown:\n\t@echo down',
    );
    const present = await checkMakefileTargets(tempDir);
    expect(present.status).toBe('pass');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('pnpm auto-fix installs via corepack when missing', async () => {
    let pnpmInstalled = false;
    const execRunner: ExecRunner = (command: string) => {
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

    const result = await checkPnpm(execRunner, true);
    expect(result.status).toBe('pass');
    expect(result.autoFixed).toBe(true);
  });

  test('redis and postgres connectivity checks honor probe results', async () => {
    const reachableProbe = async () => true;
    const unreachableProbe = async () => false;

    expect((await checkRedis(reachableProbe)).status).toBe('pass');
    expect((await checkPostgres(reachableProbe)).status).toBe('pass');
    expect((await checkRedis(unreachableProbe)).status).toBe('warn');
    expect((await checkPostgres(unreachableProbe)).status).toBe('warn');
  });

  test('runDoctor aggregates results and summary', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summit-doctor-run-'));
    fs.writeFileSync(path.join(tempDir, '.env.example'), 'TEST_VAR=value');
    fs.writeFileSync(
      path.join(tempDir, 'Makefile'),
      'bootstrap:\n\t@echo bootstrapping\nup:\n\t@echo up\nmigrate:\n\t@echo migrate\nsmoke:\n\t@echo smoke\ndown:\n\t@echo down',
    );

    const report = await runDoctor({
      cwd: tempDir,
      autoFix: true,
      execRunner: () => '/usr/bin/true',
      redisProbe: async () => true,
      postgresProbe: async () => true,
    });

    expect(report.summary.total).toBeGreaterThan(0);
    expect(report.summary.failed).toBe(0);
    expect(report.summary.autoFixed).toBeGreaterThanOrEqual(1);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('docker check warns when daemon is unavailable', async () => {
    const execRunner: ExecRunner = (command: string) => {
      if (command.startsWith('command -v docker')) {
        return '/usr/bin/docker';
      }
      throw new Error(`cannot execute ${command}`);
    };

    const result = await checkDocker(execRunner);
    expect(result.status).toBe('warn');
    expect(result.fix).toMatch(/Start Docker/);
  });
});
