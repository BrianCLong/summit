import axios from 'axios';
import { authorize } from '../src/policy';
import type { AuthorizationInput } from '../src/types';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const originalEnv = {
  OPA_BASE_URL: process.env.OPA_BASE_URL,
  OPA_POLICY_PATH: process.env.OPA_POLICY_PATH,
  OPA_TENANT_POLICY_TEMPLATE: process.env.OPA_TENANT_POLICY_TEMPLATE,
  OPA_URL: process.env.OPA_URL,
};

const baseInput: AuthorizationInput = {
  subject: {
    id: 'alice',
    tenantId: 'tenant-a',
    roles: ['analyst'],
    entitlements: ['dataset:read'],
    residency: 'us',
    clearance: 'secret',
    loa: 'loa1',
    riskScore: 1,
    groups: ['research'],
    metadata: {},
  },
  resource: {
    id: 'resource-1',
    tenantId: 'tenant-a',
    residency: 'us',
    classification: 'secret',
    tags: [],
  },
  action: 'dataset:read',
  context: {
    protectedActions: [],
    requestTime: '2025-01-01T00:00:00.000Z',
    currentAcr: 'loa1',
  },
};

describe('authorize', () => {
  afterEach(() => {
    jest.resetAllMocks();
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  it('coerces string allow values', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        result: {
          allow: 'false',
        },
      },
    });

    const decision = await authorize(baseInput);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('deny');
  });

  it('retains obligations with valid shapes only', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        result: {
          allow: 'TRUE',
          reason: 'allow',
          obligations: [
            { type: 'header', requirement: 'x-forwarded-client-cert' },
            null,
            'invalid',
            { type: '', requirement: 'noop' },
          ],
        },
      },
    });

    const decision = await authorize(baseInput);
    expect(decision.allowed).toBe(true);
    expect(decision.obligations).toEqual([
      { type: 'header', requirement: 'x-forwarded-client-cert' },
    ]);
  });

  it('defaults to deny when allow is not recognizable', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        result: {
          allow: 'definitely',
          reason: undefined,
        },
      },
    });

    const decision = await authorize(baseInput);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('deny');
  });

  it('prefers tenant policy path and falls back on 404', async () => {
    process.env.OPA_BASE_URL = 'http://opa:8181';
    process.env.OPA_POLICY_PATH = 'global/abac/decision';
    process.env.OPA_TENANT_POLICY_TEMPLATE = 'tenants/{tenantId}/abac/decision';

    mockedAxios.post
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({
        data: { result: { allow: true, reason: 'allow' } },
      });

    const decision = await authorize(baseInput);

    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      1,
      'http://opa:8181/v1/data/tenants/tenant-a/abac/decision',
      { input: baseInput },
    );
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      2,
      'http://opa:8181/v1/data/global/abac/decision',
      { input: baseInput },
    );
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('allow');
  });
});
