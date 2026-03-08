"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const authorization_js_1 = require("../authorization.js");
const requestFactory = (overrides = {}) => ({
    user: undefined,
    headers: {},
    ...overrides,
});
const responseFactory = () => {
    const res = {};
    res.status = globals_1.jest.fn().mockReturnValue(res);
    res.json = globals_1.jest.fn().mockReturnValue(res);
    return res;
};
const nextFactory = () => globals_1.jest.fn();
describe('authorize middleware', () => {
    it('returns 401 when no user is present', () => {
        const middleware = (0, authorization_js_1.authorize)('write_graph');
        const req = requestFactory();
        const res = responseFactory();
        const next = nextFactory();
        middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(next).not.toHaveBeenCalled();
    });
    it('returns 403 when permission is missing', () => {
        const middleware = (0, authorization_js_1.authorize)('write_graph');
        const req = requestFactory({ user: { role: 'VIEWER' } });
        const res = responseFactory();
        const next = nextFactory();
        middleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ required: 'write_graph', error: 'Forbidden' }));
        expect(next).not.toHaveBeenCalled();
    });
    it('allows access when the user has the required capability', () => {
        const middleware = (0, authorization_js_1.authorize)('run_maestro');
        const req = requestFactory({ user: { role: 'OPERATOR' } });
        const res = responseFactory();
        const next = nextFactory();
        middleware(req, res, next);
        expect(res.status).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });
});
