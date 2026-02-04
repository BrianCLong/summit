// Mock for node-fetch - CommonJS compatible
// This provides a basic mock that tests can override with jest.mock()

const mockResponse = {
  ok: true,
  status: 200,
  statusText: 'OK',
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  blob: () => Promise.resolve(new Blob()),
  headers: new Map(),
  clone: function() { return this; },
};

// Create a mock function that can be reset/overridden
function createMockFetch() {
  const calls = [];
  const results = [];

  const mockFn = function(...args) {
    calls.push(args);
    if (results.length > 0) {
      return results.shift();
    }
    return Promise.resolve(mockResponse);
  };

  // Add Jest-like mock methods
  mockFn.mock = { calls, results: [] };
  mockFn.mockReset = function() {
    calls.length = 0;
    results.length = 0;
    return mockFn;
  };
  mockFn.mockClear = mockFn.mockReset;
  mockFn.mockResolvedValue = function(value) {
    results.push(Promise.resolve(value));
    return mockFn;
  };
  mockFn.mockResolvedValueOnce = function(value) {
    results.push(Promise.resolve(value));
    return mockFn;
  };
  mockFn.mockRejectedValue = function(error) {
    results.push(Promise.reject(error));
    return mockFn;
  };
  mockFn.mockRejectedValueOnce = function(error) {
    results.push(Promise.reject(error));
    return mockFn;
  };
  mockFn.mockImplementation = function(fn) {
    const originalMock = mockFn;
    return function(...args) {
      calls.push(args);
      return fn(...args);
    };
  };

  return mockFn;
}

const fetch = createMockFetch();
fetch.default = fetch;
fetch.mockResponse = mockResponse;

class Headers {
  constructor(init) {
    this._headers = new Map();
    if (init) {
      if (init instanceof Headers) {
        init._headers.forEach((v, k) => this._headers.set(k, v));
      } else if (Array.isArray(init)) {
        init.forEach(([k, v]) => this._headers.set(k.toLowerCase(), v));
      } else {
        Object.entries(init).forEach(([k, v]) => this._headers.set(k.toLowerCase(), v));
      }
    }
  }
  get(name) { return this._headers.get(name.toLowerCase()) || null; }
  set(name, value) { this._headers.set(name.toLowerCase(), value); }
  has(name) { return this._headers.has(name.toLowerCase()); }
  delete(name) { this._headers.delete(name.toLowerCase()); }
  entries() { return this._headers.entries(); }
  keys() { return this._headers.keys(); }
  values() { return this._headers.values(); }
  forEach(cb) { this._headers.forEach((v, k) => cb(v, k, this)); }
  append(name, value) { this._headers.set(name.toLowerCase(), value); }
  [Symbol.iterator]() { return this._headers.entries(); }
}

class Request {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init.method || 'GET';
    this.headers = new Headers(init.headers);
    this.body = init.body;
  }
}

class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Headers(init.headers);
  }
  json() { return Promise.resolve(JSON.parse(this.body || '{}')); }
  text() { return Promise.resolve(this.body || ''); }
  arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
  blob() { return Promise.resolve(new Blob()); }
  clone() { return new Response(this.body, { status: this.status, statusText: this.statusText }); }
}

module.exports = fetch;
module.exports.default = fetch;
module.exports.Headers = Headers;
module.exports.Request = Request;
module.exports.Response = Response;
