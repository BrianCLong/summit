// Mock for node-fetch - CommonJS compatible
const mockResponse = {
  ok: true,
  status: 200,
  statusText: 'OK',
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  blob: () => Promise.resolve(new Blob()),
  headers: new Map(),
};

const fetch = () => Promise.resolve(mockResponse);
fetch.default = fetch;

class Headers {
  constructor(init) {
    this._headers = new Map();
    if (init) {
      Object.entries(init).forEach(([k, v]) => this._headers.set(k.toLowerCase(), v));
    }
  }
  get(name) { return this._headers.get(name.toLowerCase()); }
  set(name, value) { this._headers.set(name.toLowerCase(), value); }
  has(name) { return this._headers.has(name.toLowerCase()); }
  delete(name) { this._headers.delete(name.toLowerCase()); }
  entries() { return this._headers.entries(); }
  keys() { return this._headers.keys(); }
  values() { return this._headers.values(); }
  forEach(cb) { this._headers.forEach(cb); }
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
}

module.exports = fetch;
module.exports.default = fetch;
module.exports.Headers = Headers;
module.exports.Request = Request;
module.exports.Response = Response;
