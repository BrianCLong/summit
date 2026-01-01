/**
 * Test Infrastructure: Test Logger (Silence Logs)
 *
 * Problem: Tests generate noisy logs that clutter test output.
 *
 * Solution: Silence logs during tests, optionally capturing them for assertions.
 *
 * Usage:
 *   import { silenceLogs, restoreLogs } from '../../test/infra/logger';
 *
 *   beforeAll(() => {
 *     silenceLogs();
 *   });
 *
 *   afterAll(() => {
 *     restoreLogs();
 *   });
 */

// Store original console methods
let originalConsole: {
  log: typeof console.log;
  error: typeof console.error;
  warn: typeof console.warn;
  info: typeof console.info;
  debug: typeof console.debug;
} | null = null;

// Captured logs (if capturing enabled)
let capturedLogs: Array<{ level: string; args: any[] }> = [];
let capturingEnabled = false;

/**
 * Silence all console logs.
 *
 * This replaces console.log, console.error, etc. with no-ops.
 *
 * @param capture - Whether to capture logs for later inspection (default: false)
 */
export function silenceLogs(capture: boolean = false): void {
  if (originalConsole) {
    return; // Already silenced
  }

  // Store originals
  originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };

  capturingEnabled = capture;
  capturedLogs = [];

  // Replace with no-ops (or capturing functions)
  const noOp = capture
    ? (level: string) =>
        (...args: any[]) => {
          capturedLogs.push({ level, args });
        }
    : () => () => {};

  console.log = noOp('log');
  console.error = noOp('error');
  console.warn = noOp('warn');
  console.info = noOp('info');
  console.debug = noOp('debug');
}

/**
 * Restore original console methods.
 */
export function restoreLogs(): void {
  if (!originalConsole) {
    return; // Not silenced
  }

  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;

  originalConsole = null;
  capturingEnabled = false;
  capturedLogs = [];
}

/**
 * Get captured logs.
 *
 * Only works if silenceLogs(true) was called.
 *
 * @returns Array of captured log entries
 */
export function getCapturedLogs(): Array<{ level: string; args: any[] }> {
  return [...capturedLogs];
}

/**
 * Clear captured logs.
 */
export function clearCapturedLogs(): void {
  capturedLogs = [];
}

/**
 * Assert that a log was captured.
 *
 * @param level - Log level (log, error, warn, info, debug)
 * @param message - Expected message (substring match)
 * @throws Error if log not found
 */
export function assertLogCaptured(level: string, message: string): void {
  if (!capturingEnabled) {
    throw new Error('Log capturing not enabled. Call silenceLogs(true) first.');
  }

  const found = capturedLogs.some(
    (entry) =>
      entry.level === level &&
      entry.args.some((arg) => String(arg).includes(message))
  );

  if (!found) {
    throw new Error(
      `Expected log [${level}] containing "${message}" not found.\n` +
        `Captured logs:\n${JSON.stringify(capturedLogs, null, 2)}`
    );
  }
}

/**
 * Create a mock logger for testing.
 *
 * This returns a logger object with methods that capture calls.
 *
 * @returns Mock logger
 */
export function createMockLogger(): {
  log: jest.Mock;
  error: jest.Mock;
  warn: jest.Mock;
  info: jest.Mock;
  debug: jest.Mock;
  getCalls: () => Array<{ level: string; args: any[] }>;
} {
  const calls: Array<{ level: string; args: any[] }> = [];

  const createMock = (level: string) => {
    const fn = (...args: any[]) => {
      calls.push({ level, args });
    };
    // Add Jest mock properties manually (for compatibility)
    (fn as any).mock = {
      calls: [],
      results: [],
      instances: [],
    };
    (fn as any).mockClear = () => {
      (fn as any).mock.calls = [];
      (fn as any).mock.results = [];
      (fn as any).mock.instances = [];
    };
    return fn as any;
  };

  return {
    log: createMock('log'),
    error: createMock('error'),
    warn: createMock('warn'),
    info: createMock('info'),
    debug: createMock('debug'),
    getCalls: () => [...calls],
  };
}

/**
 * Temporarily enable logs (for debugging specific tests).
 *
 * @param fn - Function to run with logs enabled
 */
export async function withLogs<T>(fn: () => Promise<T>): Promise<T> {
  const wasSilenced = originalConsole !== null;

  if (wasSilenced) {
    restoreLogs();
  }

  try {
    return await fn();
  } finally {
    if (wasSilenced) {
      silenceLogs(capturingEnabled);
    }
  }
}
