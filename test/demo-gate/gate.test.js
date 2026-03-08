"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const gate_js_1 = require("../../server/src/demo/gate.js");
const middleware_js_1 = require("../../server/src/demo/middleware.js");
describe('Demo Mode Hard Gate', () => {
    const originalEnv = process.env;
    beforeEach(() => {
        globals_1.jest.resetModules();
        process.env = { ...originalEnv };
    });
    afterAll(() => {
        process.env = originalEnv;
    });
    describe('isDemoEnabled', () => {
        it('returns true when DEMO_MODE is "true"', () => {
            process.env.DEMO_MODE = 'true';
            expect((0, gate_js_1.isDemoEnabled)()).toBe(true);
        });
        it('returns false when DEMO_MODE is "false"', () => {
            process.env.DEMO_MODE = 'false';
            expect((0, gate_js_1.isDemoEnabled)()).toBe(false);
        });
        it('returns false when DEMO_MODE is missing', () => {
            delete process.env.DEMO_MODE;
            expect((0, gate_js_1.isDemoEnabled)()).toBe(false);
        });
        it('returns false when DEMO_MODE is random string', () => {
            process.env.DEMO_MODE = 'foo';
            expect((0, gate_js_1.isDemoEnabled)()).toBe(false);
        });
    });
    describe('demoGate Middleware', () => {
        let req;
        let res;
        let next;
        let statusSpy;
        let jsonSpy;
        beforeEach(() => {
            req = { path: '/api/demo/test', ip: '127.0.0.1' };
            res = {
                status: globals_1.jest.fn().mockReturnThis(),
                json: globals_1.jest.fn()
            };
            statusSpy = res.status;
            jsonSpy = res.json;
            next = globals_1.jest.fn();
        });
        it('calls next() when DEMO_MODE is enabled', () => {
            process.env.DEMO_MODE = 'true';
            (0, middleware_js_1.demoGate)(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(statusSpy).not.toHaveBeenCalled();
        });
        it('returns 404 when DEMO_MODE is disabled', () => {
            process.env.DEMO_MODE = 'false';
            (0, middleware_js_1.demoGate)(req, res, next);
            expect(next).not.toHaveBeenCalled();
            expect(statusSpy).toHaveBeenCalledWith(404);
            expect(jsonSpy).toHaveBeenCalledWith({ error: 'Not Found' });
        });
        it('returns 404 when DEMO_MODE is missing', () => {
            delete process.env.DEMO_MODE;
            (0, middleware_js_1.demoGate)(req, res, next);
            expect(next).not.toHaveBeenCalled();
            expect(statusSpy).toHaveBeenCalledWith(404);
        });
    });
});
