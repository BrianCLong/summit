import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SSOService } from '../SSOService.ts';
import { OIDCProvider } from '../SSOProvider.ts';
import axios from 'axios';

// Mock dependencies
const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
  release: jest.fn()
};
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

jest.mock('../../config/database.ts', () => ({
  getPostgresPool: () => mockPool
}));

jest.mock('../../services/AuthService.ts', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    generateTokens: jest.fn<any>().mockResolvedValue({ token: 'mock-jwt', refreshToken: 'mock-refresh' })
  }))
}));

jest.mock('axios');

describe('SSOService', () => {
  let ssoService: SSOService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockPool.connect as jest.Mock<any>).mockResolvedValue(mockClient);
    (mockPool.query as jest.Mock<any>).mockResolvedValue({ rows: [] });
    (mockClient.query as jest.Mock<any>).mockResolvedValue({ rows: [] });
    ssoService = new SSOService();
  });

  describe('configureSSO', () => {
    it('should validate and save valid OIDC config', async () => {
      const config = {
        tenantId: 'tenant-1',
        providerType: 'oidc' as const,
        issuerUrl: 'https://accounts.google.com',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        authorizationUrl: 'https://auth',
        tokenUrl: 'https://token',
        isActive: true
      };

      // Mock validation success
      (axios.get as jest.Mock<any>).mockResolvedValue({ status: 200, data: { authorization_endpoint: 'https://auth' } });

      await ssoService.configureSSO(config);

      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO tenant_sso_config'), expect.any(Array));
    });

    it('should throw on invalid config', async () => {
        const config = {
          tenantId: 'tenant-1',
          providerType: 'oidc' as const,
          issuerUrl: 'https://bad-url',
          clientId: 'client-id',
          isActive: true
        };

        // Mock validation failure
        (axios.get as jest.Mock<any>).mockRejectedValue(new Error('Network error'));

        await expect(ssoService.configureSSO(config)).rejects.toThrow('Invalid SSO configuration');
      });
  });

  describe('generateAuthUrl', () => {
      it('should return auth url if configured', async () => {
          (mockPool.query as jest.Mock<any>).mockResolvedValueOnce({
              rows: [{
                  tenant_id: 'tenant-1',
                  provider_type: 'oidc',
                  issuer_url: 'https://issuer',
                  client_id: 'client',
                  authorization_url: 'https://auth',
                  token_url: 'https://token',
                  is_active: true
              }]
          });

          const url = await ssoService.generateAuthUrl('tenant-1', 'http://cb');
          expect(url).toContain('https://auth');
          expect(url).toContain('client_id=client');
          expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO sso_states'), expect.any(Array));
      });
  });
});
