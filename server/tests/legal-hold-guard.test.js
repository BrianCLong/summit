"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const legal_hold_guard_js_1 = require("../src/cases/legal-hold-guard.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('legal hold guard', () => {
    (0, globals_1.it)('denies when case has legal hold', async () => {
        const req = {
            params: { id: 'c1' },
            db: { case: { findUnique: async () => ({ legalHold: true }) } },
        };
        const reply = {
            status: 0,
            body: null,
            code(code) {
                this.status = code;
                return this;
            },
            send(payload) {
                this.body = payload;
            },
        };
        await (0, legal_hold_guard_js_1.denyWhenHold)(req, reply);
        (0, globals_1.expect)(reply.status).toBe(423);
        (0, globals_1.expect)(reply.body).toEqual({
            error: 'Legal hold active: operation locked',
        });
    });
    (0, globals_1.it)('passes through when no hold', async () => {
        const req = {
            params: { id: 'c1' },
            db: { case: { findUnique: async () => ({ legalHold: false }) } },
        };
        const reply = { code: globals_1.jest.fn().mockReturnThis(), send: globals_1.jest.fn() };
        await (0, legal_hold_guard_js_1.denyWhenHold)(req, reply);
        (0, globals_1.expect)(reply.code).not.toHaveBeenCalled();
    });
});
