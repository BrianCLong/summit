"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Use process.cwd() since tests run from server directory
const testsDir = path_1.default.join(process.cwd(), 'tests');
globals_1.jest.mock('../src/audit/appendOnlyAuditStore.js', () => {
    const fs = require('fs');
    const path = require('path');
    return {
        AppendOnlyAuditStore: class {
            filePath;
            constructor(options = {}) {
                this.filePath =
                    options.filePath || path.join(process.cwd(), 'logs', 'audit', 'jest-audit.jsonl');
            }
            async append(event) {
                fs.appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, 'utf8');
                return event;
            }
        },
    };
});
globals_1.jest.mock('../src/conductor/governance/opa-integration.js', () => ({
    opaPolicyEngine: {
        evaluatePolicy: globals_1.jest.fn(),
    },
}));
const appendOnlyAuditStore_js_1 = require("../src/audit/appendOnlyAuditStore.js");
const sensitive_context_js_1 = require("../src/middleware/sensitive-context.js");
const buildMiddleware = (auditPath, allow = true) => {
    if (fs_1.default.existsSync(auditPath)) {
        fs_1.default.unlinkSync(auditPath);
    }
    const auditStore = new appendOnlyAuditStore_js_1.AppendOnlyAuditStore({ filePath: auditPath });
    const middleware = (0, sensitive_context_js_1.createSensitiveContextMiddleware)({
        auditStore: auditStore,
        routes: ['/api/test'],
        opaClient: {
            evaluatePolicy: async () => ({ allow, reason: allow ? 'allowed' : 'denied' }),
        },
        action: 'test_sensitive',
    });
    return { middleware, auditPath };
};
const readAuditFile = (auditPath) => {
    if (!fs_1.default.existsSync(auditPath))
        return [];
    return fs_1.default
        .readFileSync(auditPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
};
(0, globals_1.describe)('sensitive context middleware', () => {
    (0, globals_1.it)('rejects missing context fields', async () => {
        const auditPath = path_1.default.join(testsDir, 'tmp-audit-deny.jsonl');
        const { middleware } = buildMiddleware(auditPath);
        const req = {
            method: 'POST',
            path: '/api/test',
            baseUrl: '',
            headers: {},
            body: {},
            params: {},
            ip: '127.0.0.1',
        };
        const res = {
            locals: {},
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn().mockReturnThis(),
        };
        const next = globals_1.jest.fn();
        await middleware(req, res, next);
        (0, globals_1.expect)(res.status).toHaveBeenCalledWith(400);
        (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({ code: 'SENSITIVE_CONTEXT_REQUIRED' }));
        (0, globals_1.expect)(next).not.toHaveBeenCalled();
        const records = readAuditFile(auditPath);
        (0, globals_1.expect)(records.length).toBe(1);
        (0, globals_1.expect)(records[0].metadata?.decision).toBe('deny');
    });
    (0, globals_1.it)('allows when all fields provided and records audit', async () => {
        const auditPath = path_1.default.join(testsDir, 'tmp-audit-allow.jsonl');
        const { middleware } = buildMiddleware(auditPath, true);
        const req = {
            method: 'POST',
            path: '/api/test',
            baseUrl: '',
            headers: {
                'x-purpose': 'investigation',
                'x-justification': 'Case triage',
                'x-case-id': 'CASE-42',
            },
            body: {},
            params: {},
            ip: '127.0.0.1',
        };
        const res = {
            locals: {},
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn().mockReturnThis(),
        };
        const next = globals_1.jest.fn();
        await middleware(req, res, next);
        if (next.mock.calls.length) {
            res.json({
                ok: true,
                accessContext: res.locals.sensitiveAccessContext,
            });
        }
        (0, globals_1.expect)(next).toHaveBeenCalled();
        (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            ok: true,
            accessContext: globals_1.expect.objectContaining({ purpose: 'investigation' }),
        }));
        const records = readAuditFile(auditPath);
        (0, globals_1.expect)(records.length).toBe(1);
        (0, globals_1.expect)(records[0].metadata?.decision).toBe('allow');
        (0, globals_1.expect)(records[0].metadata?.case_id).toBe('CASE-42');
    });
});
