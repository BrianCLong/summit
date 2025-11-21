import axios from 'axios';
import { authorize } from '../src/policy';
import type { AuthorizationInput } from '../src/types';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

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
});
