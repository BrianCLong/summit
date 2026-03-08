"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetch = exports.Response = exports.Request = exports.Headers = void 0;
const globals_1 = require("@jest/globals");
const mockResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: globals_1.jest.fn(() => Promise.resolve({})),
    text: globals_1.jest.fn(() => Promise.resolve('')),
    arrayBuffer: globals_1.jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
    blob: globals_1.jest.fn(() => Promise.resolve(new Blob())),
    headers: new Map(),
    clone: globals_1.jest.fn(function () { return this; }),
};
// Create the main fetch function as a jest mock
const fetch = globals_1.jest.fn(() => Promise.resolve(mockResponse));
exports.fetch = fetch;
// Class implementations
class Headers {
    _headers;
    constructor(init) {
        this._headers = new Map();
        if (init) {
            if (init instanceof Headers) {
                init._headers.forEach((v, k) => this._headers.set(k, v));
            }
            else if (Array.isArray(init)) {
                init.forEach(([k, v]) => this._headers.set(k.toLowerCase(), v));
            }
            else {
                Object.entries(init).forEach(([k, v]) => this._headers.set(k.toLowerCase(), v));
            }
        }
    }
    get(name) {
        return this._headers.get(name.toLowerCase()) || null;
    }
    set(name, value) {
        this._headers.set(name.toLowerCase(), value);
    }
    has(name) {
        return this._headers.has(name.toLowerCase());
    }
    delete(name) {
        this._headers.delete(name.toLowerCase());
    }
    entries() {
        return this._headers.entries();
    }
    keys() {
        return this._headers.keys();
    }
    values() {
        return this._headers.values();
    }
    forEach(cb) {
        this._headers.forEach((v, k) => cb(v, k, this));
    }
    append(name, value) {
        this._headers.set(name.toLowerCase(), value);
    }
    [Symbol.iterator]() {
        return this._headers.entries();
    }
}
exports.Headers = Headers;
class Request {
    url;
    method;
    headers;
    body;
    constructor(input, init = {}) {
        this.url = typeof input === 'string' ? input : input.url;
        this.method = init.method || 'GET';
        this.headers = new Headers(init.headers);
        this.body = init.body;
    }
}
exports.Request = Request;
class Response {
    body;
    status;
    statusText;
    ok;
    headers;
    constructor(body, init = {}) {
        this.body = body;
        this.status = init.status || 200;
        this.statusText = init.statusText || 'OK';
        this.ok = this.status >= 200 && this.status < 300;
        this.headers = new Headers(init.headers);
    }
    json() {
        return Promise.resolve(JSON.parse(this.body || '{}'));
    }
    text() {
        return Promise.resolve(this.body || '');
    }
    arrayBuffer() {
        return Promise.resolve(new ArrayBuffer(0));
    }
    blob() {
        return Promise.resolve(new Blob());
    }
    clone() {
        return new Response(this.body, {
            status: this.status,
            statusText: this.statusText,
        });
    }
}
exports.Response = Response;
// Attach mockResponse for testing convenience
fetch.mockResponse = mockResponse;
exports.default = fetch;
