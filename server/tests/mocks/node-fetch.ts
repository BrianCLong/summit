import { jest } from '@jest/globals';

const mockResponse = {
  ok: true,
  status: 200,
  statusText: 'OK',
  json: jest.fn(() => Promise.resolve({})),
  text: jest.fn(() => Promise.resolve('')),
  arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
  blob: jest.fn(() => Promise.resolve(new Blob())),
  headers: new Map(),
  clone: jest.fn(function(this: typeof mockResponse) { return this; }),
};

// Create the main fetch function as a jest mock
const fetch = jest.fn(() => Promise.resolve(mockResponse));

// Class implementations
export class Headers {
  private _headers: Map<string, string>;

  constructor(init?: HeadersInit | Headers) {
    this._headers = new Map();
    if (init) {
      if (init instanceof Headers) {
        init._headers.forEach((v, k) => this._headers.set(k, v));
      } else if (Array.isArray(init)) {
        (init as [string, string][]).forEach(([k, v]) => this._headers.set(k.toLowerCase(), v));
      } else {
        Object.entries(init as Record<string, string>).forEach(([k, v]) => this._headers.set(k.toLowerCase(), v));
      }
    }
  }

  get(name: string): string | null {
    return this._headers.get(name.toLowerCase()) || null;
  }

  set(name: string, value: string): void {
    this._headers.set(name.toLowerCase(), value);
  }

  has(name: string): boolean {
    return this._headers.has(name.toLowerCase());
  }

  delete(name: string): void {
    this._headers.delete(name.toLowerCase());
  }

  entries(): IterableIterator<[string, string]> {
    return this._headers.entries();
  }

  keys(): IterableIterator<string> {
    return this._headers.keys();
  }

  values(): IterableIterator<string> {
    return this._headers.values();
  }

  forEach(cb: (value: string, key: string, parent: Headers) => void): void {
    this._headers.forEach((v, k) => cb(v, k, this));
  }

  append(name: string, value: string): void {
    this._headers.set(name.toLowerCase(), value);
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this._headers.entries();
  }
}

export class Request {
  url: string;
  method: string;
  headers: Headers;
  body: any;

  constructor(input: string | Request, init: RequestInit = {}) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init.method || 'GET';
    this.headers = new Headers(init.headers);
    this.body = init.body;
  }
}

export class Response {
  body: any;
  status: number;
  statusText: string;
  ok: boolean;
  headers: Headers;

  constructor(body?: any, init: ResponseInit = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Headers(init.headers);
  }

  json(): Promise<any> {
    return Promise.resolve(JSON.parse(this.body || '{}'));
  }

  text(): Promise<string> {
    return Promise.resolve(this.body || '');
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(new ArrayBuffer(0));
  }

  blob(): Promise<Blob> {
    return Promise.resolve(new Blob());
  }

  clone(): Response {
    return new Response(this.body, {
      status: this.status,
      statusText: this.statusText,
    });
  }
}

// Attach mockResponse for testing convenience
(fetch as any).mockResponse = mockResponse;

// Export both named and default
export { fetch };
export default fetch;
