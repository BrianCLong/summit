#!/usr/bin/env ts-node

import { pg } from '../../server/src/db/pg';
import {
  allocateCostBuckets,
  defaultMeteringRatios,
  MeteredUsage,
} from '../../finops/allocation';

interface UsageRow {
  tenant_id: string;
  compute_units: number;
  storage_gb: number;
  network_gb: number;
  api_calls: number;
}

interface RollupWindow {
  usageDate: string;
  start: Date;
  end: Date;
}

function parseWindow(): RollupWindow {
  const args = process.argv.slice(2);
  const dateArg = args.find((a) => a.startsWith('--date='));
  const targetDate = dateArg
    ? new Date(`${dateArg.split('=')[1]}T00:00:00Z`)
    : new Date();

  // Default to yesterday to avoid partial data for the current day
  if (!dateArg) {
    targetDate.setUTCDate(targetDate.getUTCDate() - 1);
  }

  const start = new Date(
    Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    usageDate: start.toISOString().slice(0, 10),
    start,
    end,
  };
}

async function fetchTenantUsage(window: RollupWindow): Promise<UsageRow[]> {
  const result = (await pg.readMany(
    `
    SELECT
      tenant_id,
      COALESCE(SUM(compute_units), 0) AS compute_units,
      COALESCE(AVG(storage_gb), 0) AS storage_gb,
      COALESCE(SUM(network_gb), 0) AS network_gb,
      COALESCE(SUM(api_calls), 0) AS api_calls
    FROM tenant_resource_usage
    WHERE timestamp >= $1 AND timestamp < $2
    GROUP BY tenant_id
  `,
    [window.start, window.end],
  )) as UsageRow[];

  return result;
}

async function upsertRollup(
  window: RollupWindow,
  row: UsageRow,
  meteringSnapshot = defaultMeteringRatios,
): Promise<void> {
  const usage: MeteredUsage = {
    computeUnits: Number(row.compute_units || 0),
    storageGbHours: Number(row.storage_gb || 0) * 24, // daily attribution
    egressGb: Number(row.network_gb || 0),
    thirdPartyRequests: Number(row.api_calls || 0),
  };

  const allocation = allocateCostBuckets(usage, meteringSnapshot);
  const bucketMap = Object.fromEntries(
    allocation.buckets.map((b) => [b.bucket, b]),
  );

  await pg.write(
    `
    INSERT INTO finops_cost_rollups (
      tenant_id, usage_date, window_start, window_end,
      compute_units, storage_gb_hours, egress_gb, third_party_requests,
      compute_cost_usd, storage_cost_usd, egress_cost_usd, third_party_cost_usd,
      total_cost_usd, metering_snapshot, updated_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14::jsonb, NOW()
    )
    ON CONFLICT (tenant_id, usage_date) DO UPDATE SET
      window_start = EXCLUDED.window_start,
      window_end = EXCLUDED.window_end,
      compute_units = EXCLUDED.compute_units,
      storage_gb_hours = EXCLUDED.storage_gb_hours,
      egress_gb = EXCLUDED.egress_gb,
      third_party_requests = EXCLUDED.third_party_requests,
      compute_cost_usd = EXCLUDED.compute_cost_usd,
      storage_cost_usd = EXCLUDED.storage_cost_usd,
      egress_cost_usd = EXCLUDED.egress_cost_usd,
      third_party_cost_usd = EXCLUDED.third_party_cost_usd,
      total_cost_usd = EXCLUDED.total_cost_usd,
      metering_snapshot = EXCLUDED.metering_snapshot,
      updated_at = NOW()
  `,
    [
      row.tenant_id,
      window.usageDate,
      window.start,
      window.end,
      usage.computeUnits,
      usage.storageGbHours,
      usage.egressGb,
      usage.thirdPartyRequests,
      bucketMap.compute?.costUsd || 0,
      bucketMap.storage?.costUsd || 0,
      bucketMap.egress?.costUsd || 0,
      bucketMap.third_party?.costUsd || 0,
      allocation.totalCostUsd,
      JSON.stringify({
        meteringSnapshot,
        allocationPct: allocation.buckets.reduce(
          (acc, bucket) => ({ ...acc, [bucket.bucket]: bucket.allocationPct }),
          {},
        ),
      }),
    ],
  );
}

async function main() {
  const window = parseWindow();
  const dryRun = process.argv.includes('--dry-run');
  process.stdout.write(`📊 FinOps daily attribution for ${window.usageDate} (dryRun=${dryRun})\n`);

  const usageRows = await fetchTenantUsage(window);
  if (!usageRows.length) {
    process.stdout.write('No tenant usage found for window; nothing to attribute.\n');
    return;
  }

  for (const row of usageRows) {
    if (dryRun) {
      const allocation = allocateCostBuckets(
        {
          computeUnits: Number(row.compute_units || 0),
          storageGbHours: Number(row.storage_gb || 0) * 24,
          egressGb: Number(row.network_gb || 0),
          thirdPartyRequests: Number(row.api_calls || 0),
        },
        defaultMeteringRatios,
      );
      process.stdout.write(
        `${row.tenant_id}: $${allocation.totalCostUsd.toFixed(
          4,
        )} | compute=${allocation.buckets.find((b) => b.bucket === 'compute')?.costUsd ?? 0
        } storage=${allocation.buckets.find((b) => b.bucket === 'storage')?.costUsd ?? 0
        } egress=${allocation.buckets.find((b) => b.bucket === 'egress')?.costUsd ?? 0
        } thirdParty=${allocation.buckets.find((b) => b.bucket === 'third_party')?.costUsd ?? 0
        }`,
      );
      continue;
    }
    await upsertRollup(window, row);
  }

  process.stdout.write(
    `✅ Processed ${usageRows.length} tenant rollups for ${window.usageDate}\n`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    process.stderr.write(`FinOps daily attribution failed ${errorMessage}\n`);
    process.exit(1);
  });
}
