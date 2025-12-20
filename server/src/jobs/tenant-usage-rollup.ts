import { meteringPipeline } from '../metering/pipeline.js';
import { tenantUsageDailyRepository } from '../metering/repository.js';

/**
 * Persists the in-memory rollups from the metering pipeline into the repository.
 * Intended to be triggered by a scheduler/cron.
 */
export async function runTenantUsageRollup(): Promise<void> {
  const rows = meteringPipeline.getDailyRollups();
  await tenantUsageDailyRepository.saveAll(rows);
}
