import { test, expect } from '@playwright/test';
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';

test('rejects non persisted queries over websocket', async () => {
  const client = createClient({ url: 'ws://localhost:4000/graphql', webSocketImpl: WebSocket });
  const result: any = await new Promise((resolve) => {
    client.subscribe(
      { query: 'query { __typename }' },
      {
        next: () => {},
        error: (e) => resolve(e),
        complete: () => resolve(null),
      },
    );
  });
  expect(result).toBeTruthy();
});
