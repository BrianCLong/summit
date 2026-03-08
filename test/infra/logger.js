"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.silenceLogs = silenceLogs;
exports.restoreLogs = restoreLogs;
exports.getCapturedLogs = getCapturedLogs;
exports.clearCapturedLogs = clearCapturedLogs;
exports.assertLogCaptured = assertLogCaptured;
exports.createMockLogger = createMockLogger;
exports.withLogs = withLogs;
// Store original console methods
let originalConsole = null;
// Captured logs (if capturing enabled)
let capturedLogs = [];
let capturingEnabled = false;
/**
 * Silence all console logs.
 *
 * This replaces console.log, console.error, etc. with no-ops.
 *
 * @param capture - Whether to capture logs for later inspection (default: false)
 */
function silenceLogs(capture = false) {
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
        ? (level) => (...args) => {
            capturedLogs.push({ level, args });
        }
        : () => () => { };
    console.log = noOp('log');
    console.error = noOp('error');
    console.warn = noOp('warn');
    console.info = noOp('info');
    console.debug = noOp('debug');
}
/**
 * Restore original console methods.
 */
function restoreLogs() {
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
function getCapturedLogs() {
    return [...capturedLogs];
}
/**
 * Clear captured logs.
 */
function clearCapturedLogs() {
    capturedLogs = [];
}
/**
 * Assert that a log was captured.
 *
 * @param level - Log level (log, error, warn, info, debug)
 * @param message - Expected message (substring match)
 * @throws Error if log not found
 */
function assertLogCaptured(level, message) {
    if (!capturingEnabled) {
        throw new Error('Log capturing not enabled. Call silenceLogs(true) first.');
    }
    const found = capturedLogs.some((entry) => entry.level === level &&
        entry.args.some((arg) => String(arg).includes(message)));
    if (!found) {
        throw new Error(`Expected log [${level}] containing "${message}" not found.\n` +
            `Captured logs:\n${JSON.stringify(capturedLogs, null, 2)}`);
    }
}
/**
 * Create a mock logger for testing.
 *
 * This returns a logger object with methods that capture calls.
 *
 * @returns Mock logger
 */
function createMockLogger() {
    const calls = [];
    const createMock = (level) => {
        const fn = (...args) => {
            calls.push({ level, args });
        };
        // Add Jest mock properties manually (for compatibility)
        fn.mock = {
            calls: [],
            results: [],
            instances: [],
        };
        fn.mockClear = () => {
            fn.mock.calls = [];
            fn.mock.results = [];
            fn.mock.instances = [];
        };
        return fn;
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
async function withLogs(fn) {
    const wasSilenced = originalConsole !== null;
    if (wasSilenced) {
        restoreLogs();
    }
    try {
        return await fn();
    }
    finally {
        if (wasSilenced) {
            silenceLogs(capturingEnabled);
        }
    }
}
