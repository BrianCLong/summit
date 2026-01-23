import { randomUUID } from 'crypto';
import { pool } from '../../db/pg.js';
import { billingWebhookService } from './BillingWebhookService.js';

export type MeteringExportFormat = 'csv' | 'json';

export interface BillingExportItem {
  kind: string;
  unit: string;
  totalQuantity: number;
}

export interface BillingExportSnapshot {
  snapshotId: string;
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  items: BillingExportItem[];
}

export interface MeteringExportResult {
  snapshotId: string;
  format: MeteringExportFormat;
  content: string;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class MeteringExportService {
  private static instance: MeteringExportService;

  static getInstance(): MeteringExportService {
    if (!MeteringExportService.instance) {
      MeteringExportService.instance = new MeteringExportService();
    }
    return MeteringExportService.instance;
  }

  async exportUsage(options: {
    tenantId: string;
    periodEnd: Date;
    periodStart?: Date;
    format: MeteringExportFormat;
    emitWebhook?: boolean;
  }): Promise<MeteringExportResult> {
    const { periodStart, periodEnd } = this.resolvePeriod(options.periodStart, options.periodEnd);
    const snapshot = await this.createOrLoadSnapshot(options.tenantId, periodStart, periodEnd);
    const content = this.renderExport(snapshot, options.format);

    if (options.emitWebhook) {
      await billingWebhookService.enqueueEvent(options.tenantId, 'billing.export.ready', {
        snapshotId: snapshot.snapshotId,
        tenantId: snapshot.tenantId,
        periodStart: snapshot.periodStart.toISOString(),
        periodEnd: snapshot.periodEnd.toISOString(),
        totals: snapshot.items.map((item) => ({
          kind: item.kind,
          unit: item.unit,
          totalQuantity: item.totalQuantity,
        })),
      });
    }

    return {
      snapshotId: snapshot.snapshotId,
      format: options.format,
      content,
    };
  }

  async getSnapshot(snapshotId: string): Promise<BillingExportSnapshot> {
    const snapshotResult = await pool.query(
      `
        SELECT id, tenant_id, period_start, period_end, created_at
        FROM billing_export_snapshots
        WHERE id = $1
      `,
      [snapshotId],
    );

    if (snapshotResult.rows.length === 0) {
      throw new Error(`Billing export snapshot ${snapshotId} not found.`);
    }

    const snapshotRow = snapshotResult.rows[0];
    const items = await this.loadSnapshotItems(snapshotId);

    return {
      snapshotId: snapshotRow.id,
      tenantId: snapshotRow.tenant_id,
      periodStart: snapshotRow.period_start,
      periodEnd: snapshotRow.period_end,
      createdAt: snapshotRow.created_at,
      items,
    };
  }

  private resolvePeriod(periodStart: Date | undefined, periodEnd: Date): { periodStart: Date; periodEnd: Date } {
    const end = new Date(periodEnd);
    const start = periodStart ? new Date(periodStart) : new Date(end.getTime() - THIRTY_DAYS_MS);
    const diff = end.getTime() - start.getTime();

    if (diff !== THIRTY_DAYS_MS) {
      throw new Error('Billing exports require a 30-day aligned period.');
    }

    return { periodStart: start, periodEnd: end };
  }

  private async createOrLoadSnapshot(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<BillingExportSnapshot> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        `
          SELECT id, created_at
          FROM billing_export_snapshots
          WHERE tenant_id = $1 AND period_start = $2 AND period_end = $3
        `,
        [tenantId, periodStart, periodEnd],
      );

      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        const snapshotId = existing.rows[0].id;
        const items = await this.loadSnapshotItems(snapshotId);
        return {
          snapshotId,
          tenantId,
          periodStart,
          periodEnd,
          createdAt: existing.rows[0].created_at,
          items,
        };
      }

      const aggregation = await client.query(
        `
          SELECT kind, unit, SUM(quantity) AS total_quantity
          FROM usage_events
          WHERE tenant_id = $1
            AND occurred_at >= $2
            AND occurred_at <= $3
          GROUP BY kind, unit
          ORDER BY kind ASC, unit ASC
        `,
        [tenantId, periodStart, periodEnd],
      );

      const snapshotId = randomUUID();
      const createdAt = new Date();

      await client.query(
        `
          INSERT INTO billing_export_snapshots (
            id, tenant_id, period_start, period_end, created_at
          ) VALUES ($1, $2, $3, $4, $5)
        `,
        [snapshotId, tenantId, periodStart, periodEnd, createdAt],
      );

      for (const row of aggregation.rows) {
        await client.query(
          `
            INSERT INTO billing_export_snapshot_items (
              id, snapshot_id, kind, unit, total_quantity
            ) VALUES ($1, $2, $3, $4, $5)
          `,
          [randomUUID(), snapshotId, row.kind, row.unit, row.total_quantity],
        );
      }

      await client.query('COMMIT');

      return {
        snapshotId,
        tenantId,
        periodStart,
        periodEnd,
        createdAt,
        items: aggregation.rows.map((row: any) => ({
          kind: row.kind,
          unit: row.unit,
          totalQuantity: parseFloat(row.total_quantity),
        })),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async loadSnapshotItems(snapshotId: string): Promise<BillingExportItem[]> {
    const itemResult = await pool.query(
      `
        SELECT kind, unit, total_quantity
        FROM billing_export_snapshot_items
        WHERE snapshot_id = $1
        ORDER BY kind ASC, unit ASC
      `,
      [snapshotId],
    );

    return itemResult.rows.map((row: any) => ({
      kind: row.kind,
      unit: row.unit,
      totalQuantity: parseFloat(row.total_quantity),
    }));
  }

  private renderExport(snapshot: BillingExportSnapshot, format: MeteringExportFormat): string {
    if (format === 'json') {
      return JSON.stringify(
        {
          snapshotId: snapshot.snapshotId,
          tenantId: snapshot.tenantId,
          periodStart: snapshot.periodStart.toISOString(),
          periodEnd: snapshot.periodEnd.toISOString(),
          createdAt: snapshot.createdAt.toISOString(),
          items: snapshot.items.map((item) => ({
            kind: item.kind,
            unit: item.unit,
            totalQuantity: item.totalQuantity,
          })),
        },
        null,
        2,
      );
    }

    const header = 'snapshot_id,tenant_id,period_start,period_end,kind,unit,total_quantity';
    const rows = snapshot.items.map((item) =>
      [
        snapshot.snapshotId,
        snapshot.tenantId,
        snapshot.periodStart.toISOString(),
        snapshot.periodEnd.toISOString(),
        item.kind,
        item.unit,
        item.totalQuantity.toString(),
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }
}

export const meteringExportService = MeteringExportService.getInstance();
