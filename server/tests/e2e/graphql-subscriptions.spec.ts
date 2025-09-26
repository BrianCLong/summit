import { test, expect } from '@playwright/test';
import { createClient, Client } from 'graphql-ws';
import WebSocket from 'ws';

const GRAPHQL_HTTP_URL = process.env.API_URL ? `${process.env.API_URL}/graphql` : 'http://localhost:4000/graphql';
const GRAPHQL_WS_URL = GRAPHQL_HTTP_URL.replace('http', 'ws');

function createGraphQLClient(token: string, tenantId: string): Client {
  return createClient({
    url: GRAPHQL_WS_URL,
    webSocketImpl: WebSocket,
    connectionParams: {
      Authorization: `Bearer ${token}`,
      'x-tenant-id': tenantId,
    },
  });
}

test.describe('GraphQL subscriptions', () => {
  test('emit graph query results for subscribed tenant', async ({ request }) => {
    const token = 'dev-token';
    const tenantId = 'test-tenant';
    const requestId = `test-${Date.now()}`;
    const client = createGraphQLClient(token, tenantId);

    let disposeSubscription: (() => void) | undefined;
    const subscriptionResult = new Promise<any>((resolve, reject) => {
      disposeSubscription = client.subscribe(
        {
          query: `subscription GraphQueryResults($requestId: ID!) {
            graphQueryResults(requestId: $requestId) {
              requestId
              tenantId
              completedAt
              durationMs
              records
            }
          }`,
          variables: { requestId },
        },
        {
          next: (value) => resolve(value),
          error: (err) => reject(err),
          complete: () => reject(new Error('Subscription completed before receiving data')),
        },
      );
    });

    const response = await request.post(GRAPHQL_HTTP_URL, {
      data: {
        query: `mutation ExecuteGraphQuery($requestId: ID!, $cypher: String!, $parameters: JSON) {
          executeGraphQuery(requestId: $requestId, cypher: $cypher, parameters: $parameters) {
            requestId
            tenantId
          }
        }`,
        variables: {
          requestId,
          cypher: 'RETURN 1 as value',
          parameters: {},
        },
      },
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-tenant-id': tenantId,
      },
    });

    expect(response.ok()).toBeTruthy();

    const payload = await subscriptionResult;
    disposeSubscription?.();
    await client.dispose();

    const data = payload?.data?.graphQueryResults;
    expect(data).toBeTruthy();
    expect(data.requestId).toBe(requestId);
    expect(data.tenantId).toBe(tenantId);
    expect(Array.isArray(data.records)).toBe(true);
    expect(data.records.length).toBeGreaterThan(0);
  });
});
