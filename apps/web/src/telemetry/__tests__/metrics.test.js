"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const metrics_1 = require("../metrics");
(0, vitest_1.describe)('generateErrorFingerprint', () => {
    (0, vitest_1.it)('generates consistent fingerprints for identical errors', () => {
        const error1 = new Error('Test error');
        error1.stack = 'Error: Test error\n  at test.js:10:15\n  at run.js:5:20';
        const error2 = new Error('Test error');
        error2.stack = 'Error: Test error\n  at test.js:10:15\n  at run.js:5:20';
        const fingerprint1 = (0, metrics_1.generateErrorFingerprint)(error1);
        const fingerprint2 = (0, metrics_1.generateErrorFingerprint)(error2);
        (0, vitest_1.expect)(fingerprint1).toBe(fingerprint2);
    });
    (0, vitest_1.it)('generates different fingerprints for different errors', () => {
        const error1 = new Error('Test error A');
        const error2 = new Error('Test error B');
        const fingerprint1 = (0, metrics_1.generateErrorFingerprint)(error1);
        const fingerprint2 = (0, metrics_1.generateErrorFingerprint)(error2);
        (0, vitest_1.expect)(fingerprint1).not.toBe(fingerprint2);
    });
    (0, vitest_1.it)('normalizes line and column numbers', () => {
        const error1 = new Error('Test error');
        error1.stack = 'Error: Test error\n  at test.js:10:15';
        const error2 = new Error('Test error');
        error2.stack = 'Error: Test error\n  at test.js:25:30';
        const fingerprint1 = (0, metrics_1.generateErrorFingerprint)(error1);
        const fingerprint2 = (0, metrics_1.generateErrorFingerprint)(error2);
        // Should be the same since line numbers are normalized
        (0, vitest_1.expect)(fingerprint1).toBe(fingerprint2);
    });
    (0, vitest_1.it)('normalizes numeric values in error messages', () => {
        const error1 = new Error('Failed to load 5 items');
        error1.stack = 'Error: Failed to load 5 items\n  at test.js:10:15';
        const error2 = new Error('Failed to load 10 items');
        error2.stack = 'Error: Failed to load 10 items\n  at test.js:10:15';
        const fingerprint1 = (0, metrics_1.generateErrorFingerprint)(error1);
        const fingerprint2 = (0, metrics_1.generateErrorFingerprint)(error2);
        // Should be the same since numbers are normalized
        (0, vitest_1.expect)(fingerprint1).toBe(fingerprint2);
    });
    (0, vitest_1.it)('returns a valid hex string', () => {
        const error = new Error('Test error');
        const fingerprint = (0, metrics_1.generateErrorFingerprint)(error);
        (0, vitest_1.expect)(fingerprint).toMatch(/^[0-9a-f]{8}$/);
    });
});
(0, vitest_1.describe)('categorizeError', () => {
    (0, vitest_1.it)('categorizes network errors', () => {
        const error = new Error('Network request failed');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(error)).toBe('network');
        const fetchError = new Error('Failed to fetch');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(fetchError)).toBe('network');
        const networkError = new Error('NetworkError: timeout');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(networkError)).toBe('network');
    });
    (0, vitest_1.it)('categorizes data fetch errors', () => {
        const error = new Error('GraphQL query failed');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(error)).toBe('data_fetch');
        const loadingError = new Error('Loading data failed');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(loadingError)).toBe('data_fetch');
    });
    (0, vitest_1.it)('categorizes mutation errors', () => {
        const error = new Error('Mutation failed to execute');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(error)).toBe('mutation');
        const updateError = new Error('Failed to update record');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(updateError)).toBe('mutation');
        const saveError = new Error('Could not save changes');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(saveError)).toBe('mutation');
    });
    (0, vitest_1.it)('categorizes auth errors', () => {
        const error = new Error('Authentication failed');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(error)).toBe('auth');
        const unAuthError = new Error('Unauthorized access');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(unAuthError)).toBe('auth');
        const forbiddenError = new Error('Forbidden resource');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(forbiddenError)).toBe('auth');
    });
    (0, vitest_1.it)('categorizes validation errors', () => {
        const error = new Error('Validation error: email is required');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(error)).toBe('validation');
        const invalidError = new Error('Invalid input provided');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(invalidError)).toBe('validation');
    });
    (0, vitest_1.it)('categorizes render errors when errorInfo is provided', () => {
        const error = new Error('Cannot read property of undefined');
        const errorInfo = {
            componentStack: 'at Component\n  at App',
        };
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(error, errorInfo)).toBe('render');
    });
    (0, vitest_1.it)('returns unknown for uncategorized errors', () => {
        const error = new Error('Something random happened');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(error)).toBe('unknown');
    });
    (0, vitest_1.it)('is case-insensitive', () => {
        const error = new Error('NETWORK REQUEST FAILED');
        (0, vitest_1.expect)((0, metrics_1.categorizeError)(error)).toBe('network');
    });
});
(0, vitest_1.describe)('reportError', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        global.fetch = vitest_1.vi.fn(() => Promise.resolve({
            ok: true,
            json: async () => ({}),
        }));
    });
    (0, vitest_1.it)('sends error data to telemetry endpoint', async () => {
        const error = new Error('Test error');
        const errorInfo = { componentStack: 'at Component' };
        await (0, metrics_1.reportError)(error, errorInfo, 'high');
        (0, vitest_1.expect)(global.fetch).toHaveBeenCalledWith('/api/monitoring/telemetry/events', vitest_1.expect.objectContaining({
            method: 'POST',
            headers: vitest_1.expect.objectContaining({
                'Content-Type': 'application/json',
            }),
        }));
    });
    (0, vitest_1.it)('includes error fingerprint and category', async () => {
        const error = new Error('Test error');
        await (0, metrics_1.reportError)(error, undefined, 'high');
        const fetchCall = global.fetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);
        (0, vitest_1.expect)(body.labels).toHaveProperty('fingerprint');
        (0, vitest_1.expect)(body.labels).toHaveProperty('category');
    });
    (0, vitest_1.it)('includes additional context', async () => {
        const error = new Error('Test error');
        const context = { userId: '123', feature: 'dashboard' };
        await (0, metrics_1.reportError)(error, undefined, 'high', context);
        const fetchCall = global.fetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);
        (0, vitest_1.expect)(body.payload).toMatchObject({
            userId: '123',
            feature: 'dashboard',
        });
    });
    (0, vitest_1.it)('handles fetch failures gracefully', async () => {
        global.fetch = vitest_1.vi.fn(() => Promise.reject(new Error('Network error')));
        const consoleSpy = vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
        await (0, metrics_1.reportError)(new Error('Test error'), undefined, 'high');
        (0, vitest_1.expect)(consoleSpy).toHaveBeenCalledWith('Failed to report error:', vitest_1.expect.any(Error));
        consoleSpy.mockRestore();
    });
});
