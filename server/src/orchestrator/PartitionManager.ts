import { Pool } from 'pg';
import logger from '../config/logger.js';
import { getTracer } from '../observability/tracer.js';

const tracer = getTracer();

export class PartitionManager {
    constructor(private pool: Pool) { }

    async ensurePartitions() {
        return tracer.withSpan('PartitionManager.ensurePartitions', async () => {
            try {
                const now = new Date();
                await this.ensureMonthPartition('orchestrator_events_p', now);
                await this.ensureMonthPartition('orchestrator_outbox_p', now);

                const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                await this.ensureMonthPartition('orchestrator_events_p', nextMonth);
                await this.ensureMonthPartition('orchestrator_outbox_p', nextMonth);

                const monthAfterNext = new Date(now.getFullYear(), now.getMonth() + 2, 1);
                await this.ensureMonthPartition('orchestrator_events_p', monthAfterNext);
                await this.ensureMonthPartition('orchestrator_outbox_p', monthAfterNext);

                logger.info('Partition check/creation completed');
            } catch (error: any) {
                logger.error({ err: error }, 'Failed to ensure partitions');
                throw error;
            }
        });
    }

    private async ensureMonthPartition(parentTable: string, date: Date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthStr = month.toString().padStart(2, '0');

        const baseName = parentTable.replace('_p', '');
        const partitionName = `${baseName}_${year}_${monthStr}`;

        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 1);

        const startStr = startOfMonth.toISOString().split('T')[0];
        const endStr = endOfMonth.toISOString().split('T')[0];

        const query = `
      CREATE TABLE IF NOT EXISTS ${partitionName}
      PARTITION OF ${parentTable}
      FOR VALUES FROM ('${startStr}') TO ('${endStr}');
    `;

        await this.pool.query(query);
        logger.debug({ partitionName, parentTable }, 'Ensured partition exists');
    }
}
