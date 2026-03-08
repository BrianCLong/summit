"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const securityHeaders_js_1 = require("../securityHeaders.js");
const ORIGINAL_ENV = { ...process.env };
const runMiddleware = async (envOverrides = {}) => {
    process.env = { ...ORIGINAL_ENV, ...envOverrides };
    const req = {
        path: '/test',
        method: 'GET',
        headers: {},
    };
    const headers = {};
    const res = {
        setHeader: (key, value) => {
            headers[key.toLowerCase()] = value;
        },
        getHeader: (key) => headers[key.toLowerCase()],
        removeHeader: (key) => {
            delete headers[key.toLowerCase()];
        },
    };
    const handler = (0, securityHeaders_js_1.securityHeaders)({
        allowedOrigins: ['https://allowed.example'],
    });
    await new Promise((resolve, reject) => {
        handler(req, res, (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
    return headers;
};
(0, globals_1.describe)('securityHeaders middleware', () => {
    (0, globals_1.beforeEach)(() => {
        process.env = { ...ORIGINAL_ENV };
    });
    (0, globals_1.afterAll)(() => {
        process.env = ORIGINAL_ENV;
    });
    (0, globals_1.it)('applies baseline headers when enabled', async () => {
        const headers = await runMiddleware();
        (0, globals_1.expect)(headers['x-content-type-options']).toBe('nosniff');
        (0, globals_1.expect)(headers['x-frame-options']).toBe('DENY');
        (0, globals_1.expect)(headers['referrer-policy']).toBe('no-referrer');
    });
    (0, globals_1.it)('can be disabled via SECURITY_HEADERS_ENABLED=false', async () => {
        const headers = await runMiddleware({ SECURITY_HEADERS_ENABLED: 'false' });
        (0, globals_1.expect)(headers['x-content-type-options']).toBeUndefined();
        (0, globals_1.expect)(headers['x-frame-options']).toBeUndefined();
        (0, globals_1.expect)(headers['referrer-policy']).toBeUndefined();
    });
    (0, globals_1.it)('supports CSP report-only mode when enabled', async () => {
        const headers = await runMiddleware({
            SECURITY_HEADERS_CSP_ENABLED: 'true',
            SECURITY_HEADERS_CSP_REPORT_ONLY: 'true',
        });
        (0, globals_1.expect)(headers['content-security-policy']).toBeUndefined();
        (0, globals_1.expect)(headers['content-security-policy-report-only']).toBeDefined();
    });
});
