import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { DbObservabilityService } from '../db-observability.js';

describe('DbObservabilityService', () => {
  const auditMock = { recordEvent: jest.fn() };
  const queryMock = jest.fn();
  const slowQueryInsights = jest.fn(() => []);

  const service = new DbObservabilityService({
    getPool: () => ({ query: queryMock, slowQueryInsights }),
    getAudit: () => auditMock,
    now: () => new Date('2024-01-01T00:00:00.000Z'),
  });

  beforeEach(() => {
    queryMock.mockReset();
    slowQueryInsights.mockReset();
    auditMock.recordEvent.mockReset();
  });

  it('enforces explain whitelist', async () => {
    await expect(
      service.explainWhitelistedQuery({
        queryId: 'nonexistent',
      }),
    ).rejects.toThrow('Query is not whitelisted for explain');
  });

  it('builds a snapshot with summaries and explain plan', async () => {
    queryMock.mockImplementation((input: any) => {
      const sql = typeof input === 'string' ? input : input.text;

      if (sql.includes('pg_extension')) {
        return Promise.resolve({ rows: [{ enabled: true }] });
      }

      if (sql.includes('pg_stat_statements')) {
        return Promise.resolve({
          rows: [
            {
              queryid: '123',
              query: 'select * from foo',
              calls: 3,
              mean_exec_time: 12.5,
              total_exec_time: 37.5,
              rows: 5,
            },
          ],
        });
      }

      if (sql.includes('EXPLAIN')) {
        return Promise.resolve({
          rows: [
            {
              'QUERY PLAN': [
                {
                  Plan: {
                    'Node Type': 'Seq Scan',
                    'Plan Rows': 42,
                  },
                },
              ],
            },
          ],
        });
      }

      return Promise.resolve({
        rows: [
          {
            waiting_pid: 10,
            blocking_pid: 20,
            relation: 'public.test',
            waiting_mode: 'ShareLock',
            blocking_mode: 'ExclusiveLock',
            waiting_query: 'select 1',
            blocking_query: 'update test set x=1',
            waiting_ms: 1500,
            blocking_ms: 9000,
          },
        ],
      });
    });

    const snapshot = await service.snapshot(
      { explain: { queryId: 'activeSessions', parameters: { limit: 5 } } },
      { userId: 'admin', tenantId: 'tenant', correlationId: 'corr' },
    );

    expect(snapshot.locks).toHaveLength(1);
    expect(snapshot.slowQueries.entries[0].source).toBe('pg_stat_statements');
    expect(snapshot.explain?.queryId).toBe('activeSessions');
    expect(snapshot.summary.overall).toMatch(/block(ed|ing)/i);
    expect(auditMock.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'db_observability',
        outcome: 'success',
      }),
    );
  });
});
