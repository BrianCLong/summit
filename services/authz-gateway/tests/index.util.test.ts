import { describe, expect, it, jest } from '@jest/globals';
import type { Express, Request } from 'express';
import { __testables, startServer } from '../src/index';

describe('index helpers', () => {
  it('extracts tenant from array header', () => {
    const req = {
      headers: { 'x-tenant-id': [' ', 'tenantC'] },
      method: 'GET',
      path: '/resource',
    } as unknown as Request;
    expect(__testables.getTenantId(req)).toBe('tenantC');
  });

  it('falls back to user tenant when header missing', () => {
    const req = { headers: {}, method: 'GET', path: '/resource' } as Request;
    expect(__testables.getTenantId(req, 'tenantUser')).toBe('tenantUser');
  });

  it('resolves explicit operation name', () => {
    const req = {
      body: { operationName: 'ListThings' },
      method: 'POST',
      path: '/graphql',
      headers: {},
    } as unknown as Request;
    expect(__testables.resolveOperation(req)).toBe('ListThings');
  });

  it('resolves mutation keyword when present', () => {
    const req = {
      body: { query: 'mutation { doThing }' },
      method: 'POST',
      path: '/graphql',
      headers: {},
    } as unknown as Request;
    expect(__testables.resolveOperation(req)).toBe('mutation');
  });

  it('resolves query keyword when mutation absent', () => {
    const req = {
      body: { query: 'query Test { ping }' },
      method: 'POST',
      path: '/graphql',
      headers: {},
    } as unknown as Request;
    expect(__testables.resolveOperation(req)).toBe('query');
  });

  it('defaults to method and path when no hints', () => {
    const req = {
      body: {},
      method: 'DELETE',
      path: '/cleanup',
      headers: {},
    } as unknown as Request;
    expect(__testables.resolveOperation(req)).toBe('DELETE /cleanup');
  });

  it('starts server with configured port', () => {
    const listenMock = jest.fn((port: unknown, cb: () => void) => {
      cb();
      return { close: jest.fn() };
    });
    const app = { listen: listenMock } as unknown as Express;
    const originalPort = process.env.PORT;
    process.env.PORT = '5055';
    startServer(app);
    expect(listenMock).toHaveBeenCalledWith('5055', expect.any(Function));
    process.env.PORT = originalPort;
  });
});
