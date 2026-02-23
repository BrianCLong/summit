import { jest } from '@jest/globals';

export const requestFactory = (overrides: Record<string, any> = {}) => {
  const req = {
    headers: {},
    body: {},
    query: {},
    params: {},
    path: '/',
    method: 'GET',
    user: undefined,
    get: jest.fn((key: string) => {
        // Simple mock for headers
        const headers = overrides.headers || {};
        return headers[key.toLowerCase()] || headers[key];
    }),
    header: jest.fn((key: string) => {
        const headers = overrides.headers || {};
        return headers[key.toLowerCase()] || headers[key];
    }),
    ...overrides,
  };
  return req;
};

export const responseFactory = (overrides: Record<string, any> = {}) => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    locals: {},
    ...overrides,
  };
  return res;
};

export const nextFactory = () => jest.fn();
