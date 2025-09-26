/**
 * E2E tests for external authentication providers
 */

import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';
import { AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { validateOIDCToken, opaAuthzMiddleware } from '../../src/middleware/opa-abac';
import { resetExternalAuthManager } from '../../src/security/externalAuth';
import type { OPAClient } from '../../src/graphql/intelgraph/types';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

import axios from 'axios';

const mockedAxios = axios as unknown as {
  get: jest.Mock;
};

const oktaIssuer = 'https://okta.example.com/oauth2/default';
const oktaJwksUri = `${oktaIssuer}/v1/keys`;
const azureTenant = '00000000-1111-2222-3333-444455556666';
const azureIssuer = `https://login.microsoftonline.com/${azureTenant}/v2.0`;
const azureJwksUri = `https://login.microsoftonline.com/${azureTenant}/discovery/v2.0/keys`;

const oktaKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const oktaPrivateKey = oktaKeys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const oktaPublicJwk = oktaKeys.publicKey.export({ format: 'jwk' }) as Record<string, any>;
oktaPublicJwk.kid = 'okta-key-1';
oktaPublicJwk.alg = 'RS256';
oktaPublicJwk.use = 'sig';

const azureKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const azurePrivateKey = azureKeys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const azurePublicJwk = azureKeys.publicKey.export({ format: 'jwk' }) as Record<string, any>;
azurePublicJwk.kid = 'azure-key-1';
azurePublicJwk.alg = 'RS256';
azurePublicJwk.use = 'sig';

describe('External identity provider integration', () => {
  let app: express.Express;
  let opaClient: OPAClient & { evaluate: jest.Mock };

  beforeEach(() => {
    process.env.AUTH_PROVIDERS = 'okta,azure';
    process.env.AUTH_DEFAULT_TENANT = 'global-tenant';
    process.env.AUTH_ROLE_MAPPINGS = JSON.stringify({
      'Okta-SOC-Admins': ['ADMIN'],
      'azure-intelgraph-analyst': ['ANALYST'],
    });

    process.env.OKTA_ISSUER = oktaIssuer;
    process.env.OKTA_AUDIENCE = 'api://default';
    process.env.OKTA_JWKS_URI = oktaJwksUri;
    process.env.OKTA_GROUPS_CLAIM = 'groups';

    process.env.AZURE_AD_ISSUER = azureIssuer;
    process.env.AZURE_AD_AUDIENCE = 'api://intelgraph';
    process.env.AZURE_AD_JWKS_URI = azureJwksUri;
    process.env.AZURE_AD_GROUPS_CLAIM = 'groups';

    mockedAxios.get.mockImplementation((url: string) => {
      if (url === oktaJwksUri) {
        return Promise.resolve({ data: { keys: [oktaPublicJwk] } });
      }
      if (url === azureJwksUri) {
        return Promise.resolve({ data: { keys: [azurePublicJwk] } });
      }
      return Promise.reject(new Error(`Unexpected JWKS URL: ${url}`));
    });

    resetExternalAuthManager();

    opaClient = {
      evaluate: jest.fn().mockResolvedValue(true),
    } as unknown as OPAClient & { evaluate: jest.Mock };

    app = express();
    app.get(
      '/secure',
      (req: Request, res: Response, next: NextFunction) => validateOIDCToken(req, res, next),
      opaAuthzMiddleware(opaClient),
      (req: Request, res: Response) => {
        res.json({ user: (req as any).user });
      },
    );

    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof AuthenticationError) {
        return res.status(401).json({ error: 'unauthorized' });
      }
      if (err instanceof ForbiddenError) {
        return res.status(403).json({ error: 'forbidden' });
      }
      return res.status(500).json({ error: err.message });
    });
  });

  afterEach(() => {
    mockedAxios.get.mockReset();
    resetExternalAuthManager();
    delete process.env.AUTH_PROVIDERS;
    delete process.env.AUTH_DEFAULT_TENANT;
    delete process.env.AUTH_ROLE_MAPPINGS;
    delete process.env.OKTA_ISSUER;
    delete process.env.OKTA_AUDIENCE;
    delete process.env.OKTA_JWKS_URI;
    delete process.env.OKTA_GROUPS_CLAIM;
    delete process.env.AZURE_AD_ISSUER;
    delete process.env.AZURE_AD_AUDIENCE;
    delete process.env.AZURE_AD_JWKS_URI;
    delete process.env.AZURE_AD_GROUPS_CLAIM;
  });

  test('accepts Okta JWTs and populates RBAC roles for OPA', async () => {
    const token = jwt.sign(
      {
        iss: oktaIssuer,
        aud: 'api://default',
        sub: 'user-okta-123',
        email: 'alice.okta@example.com',
        name: 'Alice Okta',
        groups: ['Okta-SOC-Admins'],
        tenant: 'okta-enterprise',
      },
      oktaPrivateKey,
      { algorithm: 'RS256', expiresIn: '1h', header: { kid: oktaPublicJwk.kid } },
    );

    const response = await request(app)
      .get('/secure')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.user).toMatchObject({
      roles: ['ADMIN'],
      tenant: 'okta-enterprise',
      email: 'alice.okta@example.com',
    });

    expect(opaClient.evaluate).toHaveBeenCalledWith(
      'intelgraph.abac.allow',
      expect.objectContaining({
        user: expect.objectContaining({
          roles: ['ADMIN'],
          tenant: 'okta-enterprise',
        }),
      }),
    );
  });

  test('accepts Azure AD JWTs and derives tenant from tid claim', async () => {
    const token = jwt.sign(
      {
        iss: azureIssuer,
        aud: 'api://intelgraph',
        sub: 'azure-user-456',
        email: 'bob.azure@example.com',
        name: 'Bob Azure',
        groups: ['azure-intelgraph-analyst'],
        tid: azureTenant,
      },
      azurePrivateKey,
      { algorithm: 'RS256', expiresIn: '1h', header: { kid: azurePublicJwk.kid } },
    );

    const response = await request(app)
      .get('/secure')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.user).toMatchObject({
      roles: ['ANALYST'],
      tenant: azureTenant,
      email: 'bob.azure@example.com',
    });

    expect(opaClient.evaluate).toHaveBeenCalledWith(
      'intelgraph.abac.allow',
      expect.objectContaining({
        user: expect.objectContaining({
          roles: ['ANALYST'],
          tenant: azureTenant,
        }),
      }),
    );
  });

  test('rejects tokens from unknown issuers', async () => {
    const token = jwt.sign(
      {
        iss: 'https://malicious.example.com',
        aud: 'api://default',
        sub: 'malicious-user',
      },
      oktaPrivateKey,
      { algorithm: 'RS256', expiresIn: '1h', header: { kid: oktaPublicJwk.kid } },
    );

    await request(app)
      .get('/secure')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});
