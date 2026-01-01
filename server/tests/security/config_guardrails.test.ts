import { describe, it, beforeEach, mock, after } from 'node:test';
import assert from 'node:assert';
// We don't import config directly at the top level because we want to test side effects of import
// but ESM modules are cached. We will use a helper to load it.

// Mock console.error
const mockConsoleError = mock.fn();
const originalConsoleError = console.error;
console.error = mockConsoleError;

// Mock process.exit
const mockExit = mock.fn();
const originalExit = process.exit;
// @ts-ignore
process.exit = mockExit;

describe('Production Security Guardrails', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mockExit.mock.resetCalls();
    mockConsoleError.mock.resetCalls();
    process.env = { ...originalEnv };
  });

  after(() => {
      console.error = originalConsoleError;
      process.exit = originalExit;
  });

  const loadConfig = async () => {
    // In ESM, re-importing a module doesn't re-execute it unless we use a cache busting strategy.
    // However, `src/config.ts` executes logic at the top level (IIFE).
    // To properly test this in ESM without a dedicated loader hook is hard.
    // Instead of importing the file which has side effects, we will replicate the logic we are testing
    // or we can use a query parameter cache buster if we were using dynamic import with URLs,
    // but `config.ts` is likely resolved relative to file system.

    // Strategy: The logic in `server/src/config.ts` is wrapped in `export const cfg = (() => { ... })();`
    // If we want to test the validation logic, we should probably extract it.
    // But since I cannot change source code of `config.ts` easily without potential regression or refactor,
    // I will try to dynamic import with a cache buster if possible, OR
    // I will just rely on the fact that I'm testing the *logic* if I can import the schema.

    // Actually, looking at `server/src/config.ts`, it does `process.exit(1)` inside the IIFE.
    // So simply importing it triggers the check.

    const cacheBust = `?t=${Date.now()}`;
    // We assume we are running from server root
    try {
        await import(`../../src/config.ts${cacheBust}`);
    } catch (e) {
        // Ignore module not found if cache busting fails resolution in some environments,
        // but here with tsx it might work if we are lucky or we might need another approach.
        // If cache busting fails, we might just be getting the cached module which is already loaded.

        // Alternative: The test runner runs this file. If we want isolated runs, we might need to spawn a process.
        // But let's try to verify if we can simply check the logic by extracting the validation if possible?
        // No, `config.ts` is an IIFE.

        // Let's rely on `server/scripts/validate-config-gate.ts` for the "Gate" part which can spawn processes.
        // For this unit test, let's keep it simple or skip it if it's too hard to test side-effects in ESM.

        // User asked to "Refactor ... to use node:test".
        // Given the IIFE side-effect nature, spawning a child process is the most robust way to test "it exits process".
    }
  };

  // Helper to run the check in a subprocess because ESM modules are cached and we need to reload with different envs
  const runCheckInSubprocess = async (env) => {
      // Dynamic import to avoid require in ESM
      const { spawn } = await import('node:child_process');
      return new Promise((resolve, reject) => {
        // We need to point to the TS file. We can use `tsx` to run a script that imports config.
        const proc = spawn('npx', ['tsx', '-e', 'import "./src/config.ts"'], {
            env: { ...process.env, ...env },
            cwd: process.cwd(), // server/
            stdio: 'pipe'
        });

        let stderr = '';
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            resolve({ code, stderr });
        });
      });
  };

  it('should pass in development mode with weak secrets', async () => {
    const env = {
        NODE_ENV: 'development',
        JWT_SECRET: 'weak',
        JWT_REFRESH_SECRET: 'weak',
        DATABASE_URL: 'postgres://localhost:5432/db',
        NEO4J_URI: 'bolt://localhost:7687',
        NEO4J_USER: 'neo4j',
        NEO4J_PASSWORD: 'password',
        SKIP_ENV_VALIDATION: '' // Ensure validation runs
    };

    const { code } = await runCheckInSubprocess(env);
    assert.strictEqual(code, 0);
  });

  it('should fail in production if JWT_SECRET is too short', async () => {
    const env = {
        NODE_ENV: 'production',
        JWT_SECRET: 'short',
        JWT_REFRESH_SECRET: 'short',
        DATABASE_URL: 'postgres://prod-db:5432/db',
        NEO4J_URI: 'bolt://prod-neo4j:7687',
        NEO4J_USER: 'neo4j',
        NEO4J_PASSWORD: 'strongpassword123',
        CORS_ORIGIN: 'https://example.com'
    };

    const { code, stderr } = await runCheckInSubprocess(env);
    assert.strictEqual(code, 1);
    assert.match(stderr, /value too short/);
  });
});
