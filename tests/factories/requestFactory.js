"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextFactory = exports.responseFactory = exports.requestFactory = void 0;
const globals_1 = require("@jest/globals");
const requestFactory = (overrides = {}) => {
    const req = {
        headers: {},
        body: {},
        query: {},
        params: {},
        path: '/',
        method: 'GET',
        user: undefined,
        get: globals_1.jest.fn((key) => {
            // Simple mock for headers
            const headers = overrides.headers || {};
            return headers[key.toLowerCase()] || headers[key];
        }),
        header: globals_1.jest.fn((key) => {
            const headers = overrides.headers || {};
            return headers[key.toLowerCase()] || headers[key];
        }),
        ...overrides,
    };
    return req;
};
exports.requestFactory = requestFactory;
const responseFactory = (overrides = {}) => {
    const res = {
        status: globals_1.jest.fn().mockReturnThis(),
        json: globals_1.jest.fn().mockReturnThis(),
        send: globals_1.jest.fn().mockReturnThis(),
        setHeader: globals_1.jest.fn().mockReturnThis(),
        locals: {},
        ...overrides,
    };
    return res;
};
exports.responseFactory = responseFactory;
const nextFactory = () => globals_1.jest.fn();
exports.nextFactory = nextFactory;
