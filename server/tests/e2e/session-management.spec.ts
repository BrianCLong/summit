import { test, expect } from '@playwright/test';

const GRAPHQL_URL = process.env.PLAYWRIGHT_GRAPHQL_URL || 'http://localhost:4000/graphql';

test.describe('Session management GraphQL flows', () => {
  let skipSuite = false;

  test.beforeAll(async ({ request }) => {
    try {
      const response = await request.post(GRAPHQL_URL, {
        data: { query: '{ __typename }' },
      });
      skipSuite = !response.ok();
    } catch (error) {
      skipSuite = true;
    }
  });

  test('allows users to revoke their active session', async ({ request }) => {
    test.skip(skipSuite, 'GraphQL endpoint not reachable');

    const unique = Date.now();
    const email = `playwright-${unique}@example.com`;
    const password = 'PlaywrightSecure!123';

    const registerResponse = await request.post(GRAPHQL_URL, {
      data: {
        query: `mutation Register($input: RegisterInput!) {
          register(input: $input) {
            token
            session { id }
          }
        }`,
        variables: {
          input: {
            email,
            password,
            firstName: 'Play',
            lastName: 'Wright',
          },
        },
      },
    });

    expect(registerResponse.ok()).toBeTruthy();
    const registerBody = await registerResponse.json();
    expect(registerBody.errors).toBeFalsy();

    const authPayload = registerBody.data?.register;
    expect(authPayload?.session?.id).toBeTruthy();
    const sessionId = authPayload.session.id;
    const token = authPayload.token;

    const revokeResponse = await request.post(GRAPHQL_URL, {
      data: {
        query: `mutation Revoke($sessionId: ID!) {
          revokeSession(sessionId: $sessionId) {
            success
            revokedCount
            message
          }
        }`,
        variables: { sessionId },
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(revokeResponse.ok()).toBeTruthy();
    const revokeBody = await revokeResponse.json();
    expect(revokeBody.errors).toBeFalsy();
    expect(revokeBody.data?.revokeSession.success).toBeTruthy();
    expect(revokeBody.data?.revokeSession.revokedCount).toBeGreaterThanOrEqual(1);

    const retryResponse = await request.post(GRAPHQL_URL, {
      data: {
        query: `mutation RevokeAgain($sessionId: ID!) {
          revokeSession(sessionId: $sessionId) {
            success
            revokedCount
          }
        }`,
        variables: { sessionId },
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(retryResponse.ok()).toBeTruthy();
    const retryBody = await retryResponse.json();
    expect(retryBody.errors?.[0]?.message).toBeTruthy();
  });
});
