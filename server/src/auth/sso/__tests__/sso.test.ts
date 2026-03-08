import { jest } from '@jest/globals';

// Mock dependencies of AuthService to prevent them from crashing
jest.mock('argon2', () => ({
  default: {
    hash: jest.fn(),
    verify: jest.fn(),
  },
  hash: jest.fn(),
  verify: jest.fn(),
}));
jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

// Hoist mock for AuthService - Using regex string for module matching in case of relative path issues
// But unstable_mockModule requires exact specifier or one that matches what is imported.
jest.mock('../../../services/AuthService.ts', () => {
  class MockAuthService {
    externalLogin() {
      return Promise.resolve({
        user: { id: 'u1', defaultTenantId: 't1' },
        token: 'tok',
        refreshToken: 'refresh',
        expiresIn: 3600,
      });
    }
  }
  return {
    AuthService: MockAuthService,
    default: MockAuthService,
  };
});

describe('SSOService', () => {
  let ssoService: any;
  let SSOServiceClass: any;

  beforeAll(async () => {
    const module = await import('../SSOService.ts');
    SSOServiceClass = module.SSOService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ssoService = new SSOServiceClass();
  });

  it('should list providers', async () => {
    const providers = await ssoService.getAllProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0].provider).toBe('local-stub');
  });

  it('should handle login flow', async () => {
    const { url } = await ssoService.handleLogin('local-stub', 'http://cb');
    expect(url).toContain('stub_code_123');
  });

  it('should handle callback success', async () => {
    const result = await ssoService.handleCallback('local-stub', { code: 'stub_code_123' }, 'http://cb');
    expect(result.token).toBe('tok');
  });

  it('should enforce MFA if unverified', async () => {
    // Mock provider callback to return mfaVerified: false
    const provider = ssoService.getProvider('local-stub');
    jest.spyOn(provider, 'callback').mockResolvedValue({
      email: 'test@example.com',
      mfaVerified: false
    } as any);

    await expect(ssoService.handleCallback('local-stub', { code: 'stub_code_123' }, 'http://cb'))
      .rejects.toThrow('MFA required');
  });
});
