import { describe, it, expect, jest } from '@jest/globals';
import { MaterializedViewScheduler } from '../MaterializedViewScheduler';
import type { Pool } from 'pg';

describe('MaterializedViewScheduler', () => {
  it('records refresh metrics and staleness', async () => {
    const now = new Date();
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({
        rows: [
          {
            view_name: 'maestro.mv_reporting_entity_activity',
            refreshed_at: now.toISOString(),
            duration_ms: 25,
            row_count: 12,
            status: 'ok',
            error: null,
          },
        ],
      });

    const pool = { query: queryMock } as unknown as Pool;
    const scheduler = new MaterializedViewScheduler(pool, {
      enabled: true,
      intervalMs: 10_000,
      stalenessBudgetSeconds: 900,
      useConcurrentRefresh: true,
      viewNames: ['maestro.mv_reporting_entity_activity'],
    });

    const results = await scheduler.refreshNow();

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.viewName).toBe('maestro.mv_reporting_entity_activity');
    expect(scheduler.getStalenessSeconds()).toBeGreaterThanOrEqual(0);

    const snapshot = scheduler.getSnapshot();
    expect(
      snapshot.views['maestro.mv_reporting_entity_activity']?.rowCount,
    ).toBe(12);
  });
});
