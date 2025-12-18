import { test, expect, request as playwrightRequest } from '@playwright/test';
import type { AddressInfo } from 'net';
import { createApp } from '../../src/server.js';
import { loadConfig } from '../../src/config.js';
import { initSchema } from '../../src/db.js';
import { createMemoryPool } from '../helpers/memory-db.js';

const bootstrapServer = async () => {
  const { pool } = createMemoryPool();
  await initSchema(pool);
  const config = loadConfig();
  config.residencyAllowList = ['US'];
  config.licenseAllowList = ['ITAR'];
  const app = createApp({ pool, config });
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const context = await playwrightRequest.newContext({ baseURL: `http://127.0.0.1:${port}` });
  return { pool, server, port, context };
};

test('apply→blocked export→approved downgrade→export', async () => {
  const { server, context } = await bootstrapServer();

  try {
    await context.post('/taxonomy/seed');
    const documentId = '00000000-0000-0000-0000-000000000001';
    const createResponse = await context.post('/documents', {
      data: {
        id: documentId,
        title: 'Sensitive dossier',
        classificationCode: 'S',
        residency: 'US',
        license: 'ITAR',
        derivedFrom: true,
        actor: 'operator'
      }
    });
    expect(createResponse.ok()).toBeTruthy();

    const exportBlocked = await context.post(`/export/${documentId}`);
    expect(exportBlocked.status()).toBe(200);
    const blockedResult = await exportBlocked.json();
    expect(blockedResult.allowed).toBe(false);

    const requestResponse = await context.post('/downgrade/requests', {
      data: {
        documentId,
        requestedCode: 'U',
        justification: 'Need for external sharing',
        actor: 'operator'
      }
    });
    expect(requestResponse.ok()).toBeTruthy();
    const { id } = await requestResponse.json();

    const firstApproval = await context.post('/downgrade/approve', {
      data: { requestId: id, approver: 'approver-1' }
    });
    expect((await firstApproval.json()).status).toBe('waiting_second_approval');

    const secondApproval = await context.post('/downgrade/approve', {
      data: { requestId: id, approver: 'approver-2' }
    });
    expect((await secondApproval.json()).status).toBe('approved');

    const exportAllowed = await context.post(`/export/${documentId}`);
    const allowedResult = await exportAllowed.json();
    expect(allowedResult.allowed).toBe(true);
  } finally {
    await context.dispose();
    server.close();
  }
});
