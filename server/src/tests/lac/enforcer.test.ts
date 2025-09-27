import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';
import { compilePolicy, createLacMiddleware } from '@/policy/lac/index.js';

describe('LAC middleware enforcement', () => {
  const policyPath = path.join(__dirname, '../../../policies/lac/canned/standard.yaml');
  const policySource = fs.readFileSync(policyPath, 'utf8');
  const { bytecode } = compilePolicy(policySource);

  function createMockReq(body: any, headers: Record<string, string>): Request {
    return {
      body,
      headers,
    } as unknown as Request;
  }

  function createMockRes() {
    const headers: Record<string, string> = {};
    let statusCode = 200;
    let jsonBody: any;
    const res: Partial<Response> = {
      setHeader: (name: string, value: string) => {
        headers[name.toLowerCase()] = value;
        return res as Response;
      },
      status: (code: number) => {
        statusCode = code;
        return res as Response;
      },
      json: (payload: any) => {
        jsonBody = payload;
        return res as Response;
      },
    };
    return {
      res: res as Response,
      headers,
      get statusCode() {
        return statusCode;
      },
      get jsonBody() {
        return jsonBody;
      },
    };
  }

  it('allows compliant queries and annotates legal basis', () => {
    const middleware = createLacMiddleware(bytecode);
    const req = createMockReq(
      {
        query: 'query listProducts { items }',
        operationName: 'listProducts',
      },
      {
        'x-licenses': 'data-broker-license',
        'x-jurisdiction': 'US',
        'x-retention-days': '5',
      },
    );
    const { res, headers } = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(headers['x-legal-basis']).toContain('CCPA');
    expect((req as any).lacDecision.status).toBe('allow');
    expect((req as any).lacDecision.diff).not.toHaveLength(0);
  });

  it('blocks violations with clear reason and diff simulation', () => {
    const middleware = createLacMiddleware(bytecode);
    const req = createMockReq(
      {
        query: 'query resolveIdentity { id }',
        operationName: 'resolveIdentity',
      },
      {
        'x-licenses': 'data-broker-license',
        'x-jurisdiction': 'US',
        'x-retention-days': '3',
      },
    );
    const mock = createMockRes();
    const next = jest.fn();

    middleware(req, mock.res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mock.statusCode).toBe(403);
    expect(mock.jsonBody.error).toBe('POLICY_VIOLATION');
    expect(mock.jsonBody.reasons.join(' ')).toContain('warrant');
    expect(mock.jsonBody.diff).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ element: 'warrant' }),
      ]),
    );
    expect(mock.jsonBody.appealHint).toContain('Data Protection Officer');
  });
});
