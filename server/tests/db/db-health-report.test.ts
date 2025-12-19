import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  formatDbHealthReport,
  generateDbHealthReport,
  parseDbHealthOutput,
} from '../../src/db/dbHealth';

const originalEnv = { ...process.env };

describe('db health report (unit)', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    Object.keys(process.env).forEach((key) => delete process.env[key]);
    Object.assign(process.env, originalEnv);
  });

  it('generates a report with pgstattuple when enabled', async () => {
    process.env.DB_HEALTH = '1';

    type QueryMock = jest.MockedFunction<
      (sql: any, params?: any) => Promise<{ rows: any[] }>
    >;
    const query: QueryMock = jest.fn();
    query
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({
        rows: [
          {
            schema: 'public',
            name: 'events',
            relkind: 'r',
            table_len: 100_000,
            dead_tuple_len: 25_000,
            dead_tuple_count: 5_000,
            tuple_count: 20_000,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            schema: 'public',
            name: 'events_idx',
            table_name: 'events',
            relkind: 'i',
            table_len: 50_000,
            dead_tuple_len: 20_000,
            dead_tuple_count: 4_000,
            tuple_count: 8_000,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            schema: 'public',
            name: 'events',
            n_dead_tup: 5_000,
            n_live_tup: 15_000,
            last_vacuum: null,
            last_autovacuum: '2024-04-01T00:00:00Z',
            last_analyze: '2024-04-01T00:00:00Z',
            last_autoanalyze: '2024-04-02T00:00:00Z',
            vacuum_trigger: 2_000,
            analyze_trigger: 1_000,
            xid_age: 190_000_000,
            freeze_max_age: 200_000_000,
          },
        ],
      });

    const mockPool = { query };

    const report = await generateDbHealthReport({
      pool: mockPool as any,
      now: new Date('2024-05-05T00:00:00Z'),
    });

    expect(report.usedPgstattuple).toBe(true);
    expect(report.bloat.tables[0].bloatPct).toBeGreaterThan(20);
    expect(report.alerts.find((alert) => alert.includes('wraparound'))).toBeDefined();

    const formatted = formatDbHealthReport(report);
    const parsed = parseDbHealthOutput(formatted);
    expect(parsed.bloat.tables[0].name).toBe('events');
    expect(parsed.recommendations.targetedActions.length).toBeGreaterThan(0);
  });

  it('falls back to heuristic collection when extensions are disabled', async () => {
    process.env.DB_HEALTH = '0';

    type QueryMock = jest.MockedFunction<
      (sql: any, params?: any) => Promise<{ rows: any[] }>
    >;
    const query: QueryMock = jest.fn();
    query
      .mockResolvedValueOnce({
        rows: [
          {
            schema: 'public',
            name: 'devices',
            relkind: 'r',
            table_len: 80_000,
            dead_tuple_len: 8_000,
            dead_tuple_count: 1_600,
            tuple_count: 8_000,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            schema: 'public',
            name: 'devices_idx',
            table_name: 'devices',
            relkind: 'i',
            table_len: 10_000,
            dead_tuple_len: 3_000,
            dead_tuple_count: 500,
            tuple_count: 1_000,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            schema: 'public',
            name: 'devices',
            n_dead_tup: 1_600,
            n_live_tup: 6_400,
            last_vacuum: null,
            last_autovacuum: null,
            last_analyze: null,
            last_autoanalyze: null,
            vacuum_trigger: 1_000,
            analyze_trigger: 800,
            xid_age: 50_000,
            freeze_max_age: 200_000_000,
          },
        ],
      });

    const mockPool = { query };

    const report = await generateDbHealthReport({
      pool: mockPool as any,
      useExtensions: false,
      now: new Date('2024-05-05T00:00:00Z'),
    });

    expect(report.usedPgstattuple).toBe(false);
    expect(report.bloat.method).toBe('heuristic');
    expect(report.alerts.length).toBeGreaterThan(0);
    expect(report.recommendations.migrationFreeConfig).toEqual(
      expect.arrayContaining(['SELECT pg_reload_conf();']),
    );
  });
});
