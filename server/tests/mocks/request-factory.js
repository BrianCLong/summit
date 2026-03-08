"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextFactory = exports.responseFactory = exports.requestFactory = void 0;
const crypto_1 = require("crypto");
const globals_1 = require("@jest/globals");
const requestFactory = (options = {}) => {
    const requestId = (0, crypto_1.randomUUID)();
    return {
        id: requestId,
        headers: {
            'content-type': 'application/json',
            'user-agent': 'IntelGraph-Test/1.0',
            'x-request-id': requestId,
            ...(options.headers || {}),
        },
        body: options.body || {},
        query: options.query || {},
        params: options.params || {},
        user: options.user,
        tenant: options.tenant,
        cookies: options.cookies || {},
        ip: options.ip || '127.0.0.1',
        method: options.method || 'GET',
        url: options.url || '/',
        path: options.path || '/',
        get(name) {
            return this.headers[name.toLowerCase()];
        },
    };
};
exports.requestFactory = requestFactory;
const responseFactory = () => {
    const res = {
        statusCode: 200,
        headers: {},
        body: null,
    };
    res.status = globals_1.jest.fn().mockReturnValue(res);
    res.json = globals_1.jest.fn().mockReturnValue(res);
    res.send = globals_1.jest.fn().mockReturnValue(res);
    res.set = globals_1.jest.fn().mockReturnValue(res);
    res.setHeader = globals_1.jest.fn((name, value) => {
        res.headers[name] = value;
        return res;
    });
    res.getHeader = globals_1.jest.fn((name) => res.headers[name]);
    res.end = globals_1.jest.fn();
    return res;
};
exports.responseFactory = responseFactory;
const nextFactory = () => globals_1.jest.fn();
exports.nextFactory = nextFactory;
