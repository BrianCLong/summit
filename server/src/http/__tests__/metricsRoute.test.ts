import { describe, it, expect, jest } from '@jest/globals';

await jest.unstable_mockModule('../../observability/metrics.js', () => ({
  registry: {
    contentType: 'text/plain; version=0.0.4',
    metrics: jest.fn(async () => 'reliability_request_duration_seconds 1'),
  },
}));

const { metricsRoute } = await import('../metricsRoute.js');

describe('metricsRoute', () => {
  it('returns a metrics payload with reliability collectors', async () => {
    const headers: Record<string, string> = {};
    const res = {
      set: jest.fn((key: string, value: string) => {
        headers[key.toLowerCase()] = value;
        return res;
      }),
      status: jest.fn(() => res),
      send: jest.fn(),
    } as any;

    await metricsRoute({} as any, res);

    expect(res.send).toHaveBeenCalled();
    expect(headers['content-type']).toContain('text/plain');
  });
});
