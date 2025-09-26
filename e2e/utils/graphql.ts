import type { Page, Route } from '@playwright/test';

type GraphQLPayload = {
  query?: string;
  operationName?: string | null;
  variables?: Record<string, unknown>;
};

type GraphQLHandler = (payload: GraphQLPayload, route: Route) => Record<string, unknown>;

type HandlerMap = Record<string, GraphQLHandler>;

const defaultHandlers: HandlerMap = {
  CurrentUser: () => ({
    data: {
      me: {
        id: '1',
        email: 'analyst@example.com',
        role: 'ANALYST',
      },
    },
  }),
};

function inferOperationName(payload: GraphQLPayload): string | undefined {
  if (payload.operationName) return payload.operationName;
  const text = payload.query ?? '';
  const match = /\b(query|mutation)\s+(\w+)/.exec(text);
  return match?.[2];
}

export async function registerGraphQLMocks(page: Page, overrides: HandlerMap = {}): Promise<void> {
  await page.route('**/graphql', async (route: Route) => {
    const request = route.request();
    let payload: GraphQLPayload;

    try {
      payload = request.postDataJSON() as GraphQLPayload;
    } catch (error) {
      console.warn('[e2e] Failed to parse GraphQL payload:', (error as Error).message);
      return route.fulfill({ status: 200, body: JSON.stringify({ data: {} }) });
    }

    const operation = inferOperationName(payload);
    const handler = overrides[operation ?? ''] ?? defaultHandlers[operation ?? ''];

    if (!handler) {
      return route.fulfill({ status: 200, body: JSON.stringify({ data: {} }) });
    }

    const response = handler(payload, route);
    return route.fulfill({ status: 200, body: JSON.stringify(response) });
  });
}
