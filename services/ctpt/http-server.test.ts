import { createCTPTServer, CanaryTokenPlantingTracebackService } from './index';

describe('CTPT HTTP server', () => {
  it('exposes planting, callback, and dashboard endpoints', async () => {
    let now = new Date('2025-01-01T00:00:00Z');
    const service = new CanaryTokenPlantingTracebackService({
      now: () => now,
      idFactory: (() => {
        let counter = 0;
        return () => `server-id-${++counter}`;
      })(),
    });
    const server = createCTPTServer(service);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Server address was not assigned');
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const plantResponse = await fetch(`${baseUrl}/ctpt/tokens`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        plantedBy: 'api-test',
        sourceSystem: 'erp',
        ttlSeconds: 300,
      }),
    });
    expect(plantResponse.status).toBe(201);
    const planted = await plantResponse.json();

    const callbackResponse = await fetch(`${baseUrl}/ctpt/callbacks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tokenValue: planted.tokenValue,
        channel: 'http-callback',
      }),
    });
    expect(callbackResponse.status).toBe(202);
    const callback = await callbackResponse.json();
    expect(callback.tokenId).toBe(planted.id);

    now = new Date(now.getTime() + 60000);
    const dashboardResponse = await fetch(`${baseUrl}/ctpt/dashboard`);
    expect(dashboardResponse.status).toBe(200);
    const dashboard = await dashboardResponse.json();
    expect(dashboard.totals.planted).toBe(1);
    expect(dashboard.topAlerts[0].tokenId).toBe(planted.id);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
