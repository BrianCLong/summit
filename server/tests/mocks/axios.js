"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = exports.spread = exports.Axios = exports.Cancel = exports.CancelToken = exports.isCancel = exports.isAxiosError = exports.request = exports.options = exports.head = exports.delete = exports.patch = exports.put = exports.post = exports.get = exports.create = void 0;
const globals_1 = require("@jest/globals");
const mockAxiosInstance = {
    get: globals_1.jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    post: globals_1.jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    put: globals_1.jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    patch: globals_1.jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    delete: globals_1.jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    head: globals_1.jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    options: globals_1.jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    request: globals_1.jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    interceptors: {
        request: { use: globals_1.jest.fn(), eject: globals_1.jest.fn() },
        response: { use: globals_1.jest.fn(), eject: globals_1.jest.fn() },
    },
    defaults: {
        headers: {
            common: {},
            get: {},
            post: {},
            put: {},
            patch: {},
            delete: {},
        },
    },
};
const axios = {
    ...mockAxiosInstance,
    create: globals_1.jest.fn(() => mockAxiosInstance),
    isAxiosError: globals_1.jest.fn(() => false),
    isCancel: globals_1.jest.fn(() => false),
    CancelToken: {
        source: globals_1.jest.fn(() => ({
            token: {},
            cancel: globals_1.jest.fn(),
        })),
    },
    Cancel: globals_1.jest.fn(),
    Axios: globals_1.jest.fn(),
    spread: globals_1.jest.fn(),
    all: globals_1.jest.fn().mockResolvedValue([]),
};
exports.default = axios;
exports.create = axios.create;
exports.get = axios.get;
exports.post = axios.post;
exports.put = axios.put;
exports.patch = axios.patch;
const deleteMethod = axios.delete;
exports.delete = deleteMethod;
exports.head = axios.head;
exports.options = axios.options;
exports.request = axios.request;
exports.isAxiosError = axios.isAxiosError;
exports.isCancel = axios.isCancel;
exports.CancelToken = axios.CancelToken;
exports.Cancel = axios.Cancel;
exports.Axios = axios.Axios;
exports.spread = axios.spread;
exports.all = axios.all;
