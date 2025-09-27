import { policyGatePlugin } from './policyGate';

jest.mock('../../../../sdk/typescript/src/policy/client', () => {
  const evaluate = jest.fn();
  const PolicyClient = jest.fn().mockImplementation(() => ({ evaluate }));
  return { PolicyClient, __esModule: true, evaluateMock: evaluate };
});

const { PolicyClient, evaluateMock } = jest.requireMock('../../../../sdk/typescript/src/policy/client');

describe('policyGatePlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows requests when policy returns allow', async () => {
    evaluateMock.mockResolvedValue({ allow: true, reason: 'authorized' });
    const plugin = policyGatePlugin();
    const headers = new Headers({
      'x-tenant': 'acme',
      'x-role': 'analyst',
      'x-purpose': 'investigation',
      'x-clearance': 'topsecret',
      'x-license': 'export',
      'x-resource-classification': 'topsecret',
      'x-resource-license': 'export',
      'x-resource-tenant': 'acme',
      'x-resource-purpose': 'investigation',
      'x-resource-actions': 'read',
    });
    const context: any = {
      request: { http: { headers }, operationName: 'InvestigateQuery' },
      operationName: 'InvestigateQuery',
      contextValue: {},
    };
    const hook = await plugin.requestDidStart(context);
    await hook?.didResolveOperation?.(context);
    expect(PolicyClient).toHaveBeenCalled();
    expect(evaluateMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'InvestigateQuery' }),
    );
    expect(context.contextValue.policyDecision).toEqual({ allow: true, reason: 'authorized' });
  });

  it('throws policy error with reason when denied', async () => {
    evaluateMock.mockResolvedValue({ allow: false, reason: 'license-mismatch' });
    const plugin = policyGatePlugin();
    const headers = new Headers({
      'x-tenant': 'acme',
      'x-role': 'analyst',
      'x-purpose': 'investigation',
      'x-clearance': 'topsecret',
      'x-license': 'export',
      'x-resource-classification': 'topsecret',
      'x-resource-license': 'import',
      'x-resource-tenant': 'acme',
      'x-resource-purpose': 'investigation',
      'x-resource-actions': 'read',
    });
    const context: any = {
      request: { http: { headers }, operationName: 'InvestigateQuery' },
      operationName: 'InvestigateQuery',
      contextValue: {},
    };
    const hook = await plugin.requestDidStart(context);
    await hook?.didResolveOperation?.(context).catch((err: unknown) => {
      expect(err).toBeInstanceOf(Error);
      const error = err as Error & { extensions?: { http?: { status: number }; policy?: { reason: string } } };
      expect(error.extensions?.http).toEqual({ status: 403 });
      expect(error.extensions?.policy).toEqual({ reason: 'license-mismatch' });
    });
  });
});
