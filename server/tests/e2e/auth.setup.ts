/**
 * Authentication Setup for E2E Tests
 * Creates authenticated user sessions for testing
 */

import { test as setup, expect } from '@playwright/test';
import speakeasy from 'speakeasy';

const adminFile = 'tests/e2e/.auth/admin.json';
const analystFile = 'tests/e2e/.auth/analyst.json';
const viewerFile = 'tests/e2e/.auth/viewer.json';

type StubUser = {
  email: string;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER';
  secret: string;
  storagePath: string;
  responseUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    mfaEnabled: boolean;
  };
};

const stubUsers: StubUser[] = [
  {
    email: 'admin@test.com',
    role: 'ADMIN',
    secret: 'JBSWY3DPEHPK3PXP',
    storagePath: adminFile,
    responseUser: {
      id: 'admin-1',
      email: 'admin@test.com',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      mfaEnabled: true,
    },
  },
  {
    email: 'analyst@test.com',
    role: 'ANALYST',
    secret: 'KRUGS4ZANFZSAYJA',
    storagePath: analystFile,
    responseUser: {
      id: 'analyst-1',
      email: 'analyst@test.com',
      firstName: 'Data',
      lastName: 'Analyst',
      role: 'ANALYST',
      mfaEnabled: true,
    },
  },
  {
    email: 'viewer@test.com',
    role: 'VIEWER',
    secret: 'KBZWC3DPO5XXE3DE',
    storagePath: viewerFile,
    responseUser: {
      id: 'viewer-1',
      email: 'viewer@test.com',
      firstName: 'Read',
      lastName: 'Only',
      role: 'VIEWER',
      mfaEnabled: true,
    },
  },
];

async function installMfaInterceptors(page: any, stub: StubUser) {
  const challengeMap = new Map<string, StubUser>();

  await page.route('**/graphql', async (route: any) => {
    if (route.request().method() !== 'POST') {
      return route.continue();
    }

    let payload: any = {};
    try {
      payload = JSON.parse(route.request().postData() || '{}');
    } catch (error) {
      payload = {};
    }

    const operation = payload.operationName;

    if (operation === 'LoginMutation') {
      const challengeId = `challenge-${stub.role.toLowerCase()}-${Date.now()}`;
      challengeMap.set(challengeId, stub);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            login: {
              token: null,
              refreshToken: null,
              requiresMfa: true,
              challengeId,
              user: stub.responseUser,
              mfaSetup: {
                secret: stub.secret,
                otpauthUrl: `otpauth://totp/Summit:${encodeURIComponent(
                  stub.email,
                )}?secret=${stub.secret}&issuer=Summit`,
              },
            },
          },
        }),
      });
    }

    if (operation === 'VerifyMfaMutation') {
      const challengeId = payload.variables?.challengeId;
      const match = challengeMap.get(challengeId);
      if (!match) {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'Unknown MFA challenge' }] }),
        });
      }
      challengeMap.delete(challengeId);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            verifyMfa: {
              token: `${match.role.toLowerCase()}-token`,
              refreshToken: `${match.role.toLowerCase()}-refresh`,
              requiresMfa: false,
              user: match.responseUser,
            },
          },
        }),
      });
    }

    return route.continue();
  });

  return async () => {
    await page.unroute('**/graphql');
  };
}

for (const stub of stubUsers) {
  setup(`authenticate as ${stub.role.toLowerCase()}`, async ({ page }) => {
    const teardown = await installMfaInterceptors(page, stub);

    try {
      await page.goto('/login');

      await page.fill('[data-testid="email-input"]', stub.email);
      await page.fill('[data-testid="password-input"]', 'testpassword');
      await page.click('[data-testid="login-button"]');

      await page.waitForSelector('[data-testid="mfa-code-input"]');
      const totp = speakeasy.totp({ secret: stub.secret, encoding: 'base32' });
      await page.fill('[data-testid="mfa-code-input"]', totp);
      await page.click('[data-testid="mfa-submit-button"]');

      await expect(page).toHaveURL('/dashboard');

      await page.context().storageState({ path: stub.storagePath });
    } finally {
      await teardown();
    }
  });
}
