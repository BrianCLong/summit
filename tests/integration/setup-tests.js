"use strict";
// Integration harness adjustments
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
beforeAll(() => {
    jest.setTimeout(60000);
});
afterAll(() => {
    jest.useRealTimers();
});
// ---- Network Egress Guard (test-only) ---------------------------------------
// Blocks any HTTP(S) requests that are not loopback. Keeps integration in-process.
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const net_1 = __importDefault(require("net"));
const isLoopback = (host) => {
    if (!host)
        return false;
    // Normalize brackets for IPv6 literals
    const h = host.replace(/^\[|\]$/g, '');
    return h === 'localhost' || h === '127.0.0.1' || h === '::1';
};
// Patch http/https.request & .get
function wrapClient(client, name) {
    const origRequest = client.request;
    const origGet = client.get;
    function guard(options, cb) {
        // options can be string | URL | RequestOptions
        let host;
        let hostname;
        if (typeof options === 'string') {
            try {
                const u = new URL(options);
                host = u.hostname;
                hostname = u.hostname;
            }
            catch {
                // Not a full URL; treat as path-only -> assume loopback ok
                host = '127.0.0.1';
                hostname = '127.0.0.1';
            }
        }
        else if (options instanceof URL) {
            host = options.hostname;
            hostname = options.hostname;
        }
        else if (typeof options === 'object' && options) {
            host = options.host ?? options.hostname;
            hostname = options.hostname ?? options.host;
        }
        // Allow explicit agent connections to loopback sockets
        const isLoop = isLoopback(host ?? hostname);
        if (!isLoop) {
            const msg = `[integration-egress-guard] Blocked ${name} request to non-loopback host: ` +
                `${host ?? hostname ?? '<unknown>'}. ` +
                `Integration tests must stay in-process. Use local stubs/mocks instead.`;
            throw new Error(msg);
        }
        return origRequest.call(client, options, cb);
    }
    // @ts-expect-error we are intentionally monkey-patching in tests
    client.request = guard;
    // @ts-expect-error same here
    client.get = function (options, cb) {
        const req = guard(options, cb);
        req.end?.();
        return req;
    };
}
wrapClient(http_1.default, 'http');
wrapClient(https_1.default, 'https');
// Optional extra: prevent raw TCP egress too (except loopback)
const origConnect = net_1.default.connect;
net_1.default.connect = function (...args) {
    // heuristics to extract host/port
    let host;
    let port;
    if (typeof args[0] === 'number') {
        port = args[0];
        host = typeof args[1] === 'string' ? args[1] : '127.0.0.1';
    }
    else if (typeof args[0] === 'object') {
        const o = args[0];
        port = o.port;
        host = o.host || '127.0.0.1';
    }
    if (!isLoopback(host)) {
        throw new Error(`[integration-egress-guard] Blocked net.connect to non-loopback host: ${host ?? '<unknown>'}:${port ?? '?'}`);
    }
    // @ts-expect-error pass-through to original
    return origConnect.apply(net_1.default, args);
};
// ---- No .only Guard ----------------------------------------------------------
const bomb = (what) => {
    throw new Error(`[no-only-tests] Detected ${what}. Remove '.only' to avoid masking test coverage.`);
};
// @ts-ignore - we’re patching Jest globals in test env
const _it = global.it;
// @ts-ignore
const _describe = global.describe;
Object.defineProperty(_it, 'only', { get: () => bomb('it.only') });
// @ts-ignore
Object.defineProperty(_describe, 'only', { get: () => bomb('describe.only') });
// ---- console.error Guard -----------------------------------------------------
const __originalConsoleError = console.error;
beforeAll(() => {
    console.error = (...args) => {
        __originalConsoleError(...args);
        throw new Error('[console.error] used in tests — replace with assertions or throw');
    };
});
afterAll(() => {
    console.error = __originalConsoleError;
});
