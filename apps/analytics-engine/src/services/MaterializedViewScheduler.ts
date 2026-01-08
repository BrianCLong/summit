import { Pool } from "pg";
import { logger } from "../utils/logger";

export type MaterializedViewSource =
  | "maestro.mv_reporting_entity_activity"
  | "maestro.mv_reporting_case_snapshot"
  | "maestro.mv_reporting_case_timeline"
  | string;

export interface RefreshViewStatus {
  viewName: MaterializedViewSource;
  refreshedAt?: Date;
  durationMs?: number;
  rowCount?: number;
  status?: string;
  error?: string | null;
}

export interface RefreshSnapshot {
  lastRunStartedAt?: Date;
  lastRunCompletedAt?: Date;
  lastError?: string;
  views: Record<MaterializedViewSource, RefreshViewStatus>;
}

export interface SchedulerOptions {
  enabled: boolean;
  intervalMs: number;
  stalenessBudgetSeconds: number;
  useConcurrentRefresh: boolean;
  viewNames?: MaterializedViewSource[];
}

const DEFAULT_VIEWS: MaterializedViewSource[] = [
  "maestro.mv_reporting_entity_activity",
  "maestro.mv_reporting_case_snapshot",
  "maestro.mv_reporting_case_timeline",
];

export class MaterializedViewScheduler {
  private timer?: NodeJS.Timeout;
  private snapshot: RefreshSnapshot = { views: {} };

  constructor(
    private pool: Pool,
    private options: SchedulerOptions
  ) {}

  start() {
    if (!this.options.enabled) {
      logger.info("MV reporting disabled; scheduler not started");
      return;
    }

    const schedule = async () => {
      try {
        await this.refreshNow();
      } catch (error) {
        logger.warn("Materialized view refresh failed (will retry on next interval)", {
          err: error as Error,
        });
      }
    };

    // Kick off an eager refresh and then set the interval.
    void schedule();
    this.timer = setInterval(schedule, this.options.intervalMs);
    // Avoid keeping the process alive purely for the scheduler.
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async refreshNow(): Promise<RefreshViewStatus[]> {
    // Respect the CONCURRENTLY override if an environment (pg-mem) cannot support it.
    const concurrentSetting = this.options.useConcurrentRefresh ? "on" : "off";
    await this.pool.query("SELECT set_config('maestro.reporting_refresh_concurrent', $1, false)", [
      concurrentSetting,
    ]);

    const startedAt = new Date();
    this.snapshot.lastRunStartedAt = startedAt;

    const { rows } = await this.pool.query(
      "SELECT * FROM maestro.refresh_reporting_materialized_views()"
    );

    const statuses: RefreshViewStatus[] = rows.map((row: any) => ({
      viewName: row.view_name,
      refreshedAt: row.refreshed_at ? new Date(row.refreshed_at) : undefined,
      durationMs: row.duration_ms ?? undefined,
      rowCount: row.row_count ?? undefined,
      status: row.status ?? "ok",
      error: row.error ?? null,
    }));

    this.snapshot = {
      lastRunStartedAt: startedAt,
      lastRunCompletedAt: new Date(),
      lastError: undefined,
      views: {
        ...this.snapshot.views,
        ...Object.fromEntries(statuses.map((s) => [s.viewName, s] as const)),
      },
    };

    logger.info("Materialized view refresh completed", {
      views: statuses.map((s) => ({
        view: s.viewName,
        status: s.status,
        durationMs: s.durationMs,
        rows: s.rowCount,
      })),
    });

    return statuses;
  }

  getSnapshot(): RefreshSnapshot {
    return this.snapshot;
  }

  getStalenessSeconds(viewNames?: MaterializedViewSource[]): number | undefined {
    const targets =
      viewNames && viewNames.length > 0 ? viewNames : this.options.viewNames || DEFAULT_VIEWS;

    const timestamps = targets
      .map((name) => this.snapshot.views[name]?.refreshedAt)
      .filter((value): value is Date => Boolean(value));

    if (timestamps.length === 0) {
      return undefined;
    }

    const maxAgeMs = Math.max(...timestamps.map((date) => Date.now() - date.getTime()));
    return Math.round(maxAgeMs / 1000);
  }
}
