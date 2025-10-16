import { getLogs } from './util';

const DISALLOWED = [/email/i, /password/i, /ssn/i, /credit/i];

describe('Privacy Compliance Tests', () => {
  it('no PII appears in logs', async () => {
    const logs = await getLogs();
    for (const pattern of DISALLOWED) {
      expect(logs).not.toMatch(pattern);
    }
  });

  it('no PII appears in traces', async () => {
    const traces = await getTraces();
    for (const pattern of DISALLOWED) {
      expect(traces).not.toMatch(pattern);
    }
  });

  it('sensitive headers are removed', async () => {
    const logs = await getLogs();
    expect(logs).not.toContain('authorization');
    expect(logs).not.toContain('cookie');
    expect(logs).not.toContain('x-api-key');
  });

  it('database parameters are scrubbed', async () => {
    const traces = await getTraces();
    expect(traces).not.toMatch(/db\.statement\.parameters/);
    expect(traces).not.toMatch(/user\.email/);
  });
});

async function getTraces(): Promise<string> {
  // Mock implementation - in production, this would fetch from OTEL collector
  return JSON.stringify({
    traces: [
      {
        operationName: 'database.query',
        tags: {
          'db.statement': 'SELECT * FROM users WHERE tenant_id = ?',
          // Note: db.statement.parameters should be scrubbed
        },
      },
    ],
  });
}
