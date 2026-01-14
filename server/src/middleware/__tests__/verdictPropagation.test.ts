import { Request, Response, NextFunction } from 'express';
import { verdictPropagationMiddleware } from '../verdictPropagation.js';
import { GovernanceVerdict } from '../../governance/types.js';
import { jest } from '@jest/globals';

describe('Verdict Propagation Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: jest.Mock;
  let sendMock: jest.Mock;
  let setHeaderMock: jest.Mock;
  let getHeaderMock: jest.Mock;

  beforeEach(() => {
    req = {};
    jsonMock = jest.fn();
    sendMock = jest.fn();
    setHeaderMock = jest.fn();
    getHeaderMock = jest.fn();

    res = {
      locals: {},
      json: jsonMock,
      send: sendMock,
      setHeader: setHeaderMock,
      getHeader: getHeaderMock,
      headersSent: false
    };
    next = jest.fn();
  });

  it('should set governance headers when verdict is present in res.locals', () => {
    const verdict: GovernanceVerdict = {
      action: 'ALLOW',
      reasons: [],
      policyIds: ['policy-123'],
      metadata: {
        timestamp: '2023-01-01T00:00:00Z',
        evaluator: 'test-engine',
        latencyMs: 10,
        simulation: false
      },
      provenance: {
        origin: 'test',
        confidence: 1.0
      }
    };

    res.locals!.governanceVerdict = verdict;

    verdictPropagationMiddleware(req as Request, res as Response, next);

    // Simulate calling res.json
    res.json!({ data: 'test' });

    expect(setHeaderMock).toHaveBeenCalledWith('X-Governance-Action', 'ALLOW');
    expect(setHeaderMock).toHaveBeenCalledWith('X-Governance-Policy-Ids', 'policy-123');
    expect(setHeaderMock).toHaveBeenCalledWith('X-Governance-Evaluator', 'test-engine');
    expect(jsonMock).toHaveBeenCalledWith({ data: 'test' });
  });

  it('should not set headers if verdict is missing', () => {
    verdictPropagationMiddleware(req as Request, res as Response, next);

    res.json!({ data: 'test' });

    expect(setHeaderMock).not.toHaveBeenCalledWith('X-Governance-Action', expect.any(String));
  });

  it('should handle res.send as well', () => {
    const verdict: GovernanceVerdict = {
      action: 'DENY',
      reasons: ['violation'],
      policyIds: ['policy-456'],
      metadata: {
        timestamp: '2023-01-01T00:00:00Z',
        evaluator: 'test-engine',
        latencyMs: 10,
        simulation: false
      },
      provenance: { origin: 'test', confidence: 1.0 }
    };

    res.locals!.governanceVerdict = verdict;

    verdictPropagationMiddleware(req as Request, res as Response, next);

    res.send!('error');

    expect(setHeaderMock).toHaveBeenCalledWith('X-Governance-Action', 'DENY');
    expect(setHeaderMock).toHaveBeenCalledWith('X-Governance-Policy-Ids', 'policy-456');
    expect(sendMock).toHaveBeenCalledWith('error');
  });

  it('should not throw if metadata is partial', () => {
    const verdict: Partial<GovernanceVerdict> = {
      action: 'ALLOW',
      policyIds: [],
      metadata: {
        // evaluator missing
      } as any
    };

    res.locals!.governanceVerdict = verdict;

    verdictPropagationMiddleware(req as Request, res as Response, next);

    res.json!({});

    expect(setHeaderMock).toHaveBeenCalledWith('X-Governance-Action', 'ALLOW');
    // Evaluator header should not be set
    expect(setHeaderMock).not.toHaveBeenCalledWith('X-Governance-Evaluator', expect.any(String));
  });
});
