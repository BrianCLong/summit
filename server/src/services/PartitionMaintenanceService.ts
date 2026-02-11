
import { Client } from 'pg';
import { BackupService } from '../backup/BackupService.js';
import { logger } from '../config/logger.js';

export class PartitionMaintenanceService {
  private client: Client;
  private backupService: BackupService;

  constructor(client: Client, backupService?: BackupService) {
    this.client = client;
    this.backupService = backupService || new BackupService();
  }

  async ensurePartitions(tenantId: string | undefined, monthsAhead: number, retentionMonths: number): Promise<void> {
    if (tenantId) {
      await this.ensureTenantPartitions(tenantId, monthsAhead, retentionMonths);
    } else {
      await this.ensureAllPartitions(monthsAhead, retentionMonths);
    }
  }

  private async ensureTenantPartitions(tenantId: string, monthsAhead: number, retentionMonths: number) {
      logger.info(`Ensuring partitions for tenant ${tenantId}`);
      // Event Store
      await this.client.query('SELECT ensure_event_store_partition($1, $2, $3)', [tenantId, monthsAhead, retentionMonths]);
      // HIPAA Log
      await this.client.query('SELECT ensure_hipaa_log_partition($1)', [tenantId]);
  }

  private async ensureAllPartitions(monthsAhead: number, retentionMonths: number) {
      logger.info(`Ensuring partitions for all tenants and global tables`);

      const { rows: eventRows } = await this.client.query(
        'SELECT ensure_event_store_partitions_for_all($1, $2) AS tenants_touched',
        [monthsAhead, retentionMonths],
      );

      const { rows: hipaaRows } = await this.client.query(
        'SELECT ensure_hipaa_log_partitions_for_all() AS tenants_touched'
      );

      // Outbox
      await this.client.query(
        'SELECT ensure_outbox_partition($1, $2)',
        [monthsAhead, retentionMonths],
      );

      logger.info({
          eventStoreTenants: eventRows[0]?.tenants_touched ?? 0,
          hipaaLogTenants: hipaaRows[0]?.tenants_touched ?? 0
      }, 'Partition maintenance complete');
  }

  /**
   * Identifies partitions older than retention policy and archives them to S3 before dropping.
   * This is a simulated implementation for the "Data Partitioning Strategies" requirement.
   */
  async archiveOldPartitions(retentionMonths: number, dryRun: boolean = false): Promise<void> {
    logger.info('Checking for partitions to archive...');

    // Logic to find old partitions would go here.
    // Example query (pseudo-code):
    // SELECT tablename FROM pg_tables WHERE tablename LIKE 'event_store_%' AND extract(epoch from age(to_date(suffix, 'YYYY_MM'))) > retention_seconds

    // For now, we verify the strategy logic by listing partitions
    const res = await this.client.query(`
        SELECT
            nmsp_child.nspname AS child_schema,
            child.relname      AS child
        FROM pg_inherits
            JOIN pg_class parent            ON pg_inherits.inhparent = parent.oid
            JOIN pg_class child             ON pg_inherits.inhrelid   = child.oid
            JOIN pg_namespace nmsp_parent   ON nmsp_parent.oid  = parent.relnamespace
            JOIN pg_namespace nmsp_child    ON nmsp_child.oid   = child.relnamespace
        WHERE parent.relname IN ('event_store', 'hipaa_audit_log', 'outbox_events');
    `);

    const partitions = res.rows.map(r => r.child);
    logger.info({ partitionsCount: partitions.length }, 'Found active partitions');

    // Filter for "old" partitions based on naming convention _YYYY_MM or similar
    const oldPartitions = partitions.filter(p => this.isPartitionExpired(p, retentionMonths));

    for (const partition of oldPartitions) {
        if (dryRun) {
            logger.info(`[DRY RUN] Would archive and drop partition: ${partition}`);
            continue;
        }

        logger.info(`Archiving partition ${partition}...`);

        // 1. Export to file
        // Note: Using pg_dump for specific table
        try {
            await this.backupService.backupTable(partition, { compress: true, uploadToS3: true });
        } catch (e) {
            logger.error({ error: e, partition }, 'Failed to archive partition. Aborting drop.');
            continue; // Skip dropping if backup fails
        }

        logger.info(`Dropping partition ${partition}...`);
        // Use double quotes to handle case sensitivity if needed, though partition names are usually lowercase
        await this.client.query(`DROP TABLE IF EXISTS "${partition}"`);
    }
  }

  private isPartitionExpired(partitionName: string, retentionMonths: number): boolean {
      // Regex to extract date from partition name (e.g., event_store_t123_2023_01)
      // Assuming format suffix is _YYYY_MM or _yYYYYmMM
      const dateMatch = partitionName.match(/_(\d{4})_(\d{2})$/) || partitionName.match(/_y(\d{4})m(\d{2})$/);

      if (!dateMatch) return false;

      const year = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);

      const partitionDate = new Date(year, month - 1, 1); // 1st of the month
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

      return partitionDate < cutoffDate;
  }
}
