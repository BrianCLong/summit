import { Pool } from 'pg';
import logger from '../config/logger.js';
import { getTracer } from '../observability/tracer.js';

const tracer = getTracer();

export interface PartitionOptions {
    suffixFormat?: string; // e.g., '_yYYYYmMM' or '_YYYY_MM'
    stripSuffix?: string; // e.g., '_p' to be removed from parent table name for partition naming
}

export class PartitionManager {
    constructor(private pool: Pool) { }

    async ensurePartitions() {
        return tracer.withSpan('PartitionManager.ensurePartitions', async () => {
            try {
                const now = new Date();
                const options = { stripSuffix: '_p', suffixFormat: '_YYYY_MM' };

                await this.ensureMonthlyPartition('orchestrator_events_p', now, options);
                await this.ensureMonthlyPartition('orchestrator_outbox_p', now, options);

                const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                await this.ensureMonthlyPartition('orchestrator_events_p', nextMonth, options);
                await this.ensureMonthlyPartition('orchestrator_outbox_p', nextMonth, options);

                const monthAfterNext = new Date(now.getFullYear(), now.getMonth() + 2, 1);
                await this.ensureMonthlyPartition('orchestrator_events_p', monthAfterNext, options);
                await this.ensureMonthlyPartition('orchestrator_outbox_p', monthAfterNext, options);

                logger.info('Partition check/creation completed');
            } catch (error: any) {
                logger.error({ err: error }, 'Failed to ensure partitions');
                throw error;
            }
        });
    }

    public async ensureMonthlyPartition(parentTable: string, date: Date, options: PartitionOptions = {}) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthStr = month.toString().padStart(2, '0');

        let baseName = parentTable;
        if (options.stripSuffix && parentTable.endsWith(options.stripSuffix)) {
            baseName = parentTable.slice(0, -options.stripSuffix.length);
        }

        const format = options.suffixFormat || '_yYYYYmMM';
        const suffix = format.replace('YYYY', year.toString()).replace('MM', monthStr);
        const partitionName = `${baseName}${suffix}`;

        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 1); // Automatically handles year rollover

        const startStr = startOfMonth.toISOString().split('T')[0];
        const endStr = endOfMonth.toISOString().split('T')[0];

        // Sanitize partitionName just in case, though it's generated from safe components
        // Sanitize inputs for SQL
        // Actually, table names in CREATE TABLE can't be parameterized easily in node-postgres
        // But we trust the inputs (parentTable is internal, date is date).

        const query = `
      CREATE TABLE IF NOT EXISTS "${partitionName}"
      PARTITION OF "${parentTable}"
      FOR VALUES FROM ('${startStr}') TO ('${endStr}');
    `;

        try {
            await this.pool.query(query);
            logger.debug({ partitionName, parentTable }, 'Ensured partition exists');
        } catch (error) {
            logger.error({ error, partitionName, parentTable }, 'Failed to create partition');
            throw error;
        }
    }
}
