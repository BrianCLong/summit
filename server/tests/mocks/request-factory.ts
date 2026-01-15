import { randomUUID } from 'crypto';
import { jest } from '@jest/globals';

export const requestFactory = (options: Record<string, any> = {}) => {
  const requestId = randomUUID();
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
    get(name: string) {
      return this.headers[name.toLowerCase()];
    },
  };
};

export const responseFactory = () => {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null,
  };

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn((name: string, value: string) => {
    res.headers[name] = value;
    return res;
  });
  res.getHeader = jest.fn((name: string) => res.headers[name]);
  res.end = jest.fn();

  return res;
};

export const nextFactory = () => jest.fn();
