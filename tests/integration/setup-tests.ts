// Integration harness adjustments

beforeAll(() => {
  jest.setTimeout(60000);
});

afterAll(() => {
  jest.useRealTimers();
});

// ---- Network Egress Guard (test-only) ---------------------------------------
// Blocks any HTTP(S) requests that are not loopback. Keeps integration in-process.
import http from 'http';
import https from 'https';
import dns from 'dns';
import net from 'net';

const isLoopback = (host?: string) => {
  if (!host) return false;
  // Normalize brackets for IPv6 literals
  const h = host.replace(/^\[|\]$/g, '');
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
};

// Patch http/https.request & .get
function wrapClient<T extends typeof http | typeof https>(
  client: T,
  name: 'http' | 'https',
): void {
  const origRequest = client.request;
  const origGet = client.get;

  function guard(options: any, cb?: any) {
    // options can be string | URL | RequestOptions
    let host: string | undefined;
    let hostname: string | undefined;

    if (typeof options === 'string') {
      try {
        const u = new URL(options);
        host = u.hostname;
        hostname = u.hostname;
      } catch {
        // Not a full URL; treat as path-only -> assume loopback ok
        host = '127.0.0.1';
        hostname = '127.0.0.1';
      }
    } else if (options instanceof URL) {
      host = options.hostname;
      hostname = options.hostname;
    } else if (typeof options === 'object' && options) {
      host = options.host ?? options.hostname;
      hostname = options.hostname ?? options.host;
    }

    // Allow explicit agent connections to loopback sockets
    const isLoop = isLoopback(host ?? hostname);
    if (!isLoop) {
      const msg =
        `[integration-egress-guard] Blocked ${name} request to non-loopback host: ` +
        `${host ?? hostname ?? '<unknown>'}. ` +
        `Integration tests must stay in-process. Use local stubs/mocks instead.`;
      throw new Error(msg);
    }

    return origRequest.call(client, options as any, cb);
  }

  // @ts-expect-error we are intentionally monkey-patching in tests
  client.request = guard;

  // @ts-expect-error same here
  client.get = function (options: any, cb?: any) {
    const req = guard(options, cb);
    req.end?.();
    return req;
  };
}

wrapClient(http, 'http');
wrapClient(https, 'https');

// Optional extra: prevent raw TCP egress too (except loopback)
const origConnect = net.connect;
net.connect = function (...args: any[]) {
  // heuristics to extract host/port
  let host: string | undefined;
  let port: number | undefined;

  if (typeof args[0] === 'number') {
    port = args[0];
    host = typeof args[1] === 'string' ? args[1] : '127.0.0.1';
  } else if (typeof args[0] === 'object') {
    const o = args[0];
    port = o.port;
    host = o.host || '127.0.0.1';
  }

  if (!isLoopback(host)) {
    throw new Error(
      `[integration-egress-guard] Blocked net.connect to non-loopback host: ${host ?? '<unknown>'}:${port ?? '?'}`,
    );
  }

  // @ts-expect-error pass-through to original
  return origConnect.apply(net, args as any);
};

// ---- No .only Guard ----------------------------------------------------------
const bomb = (what: string) => {
  throw new Error(
    `[no-only-tests] Detected ${what}. Remove '.only' to avoid masking test coverage.`,
  );
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
  console.error = (...args: any[]) => {
    __originalConsoleError(...args);
    throw new Error(
      '[console.error] used in tests — replace with assertions or throw',
    );
  };
});

afterAll(() => {
  console.error = __originalConsoleError;
});
