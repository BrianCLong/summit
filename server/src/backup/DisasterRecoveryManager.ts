
import { BackupService } from './BackupService.js';
import logger from '../utils/logger.js';

export class DisasterRecoveryManager {
  private backupService: BackupService;

  constructor() {
    this.backupService = new BackupService();
  }

  /**
   * Orchestrates a full system recovery from backups
   * @param postgresBackupPath Path to Postgres SQL dump (can be .gz)
   * @param neo4jBackupPath Path to Neo4j JSONL dump (can be .gz)
   */
  async performFullRecovery(postgresBackupPath: string, neo4jBackupPath?: string): Promise<void> {
    logger.warn('STARTING FULL DISASTER RECOVERY PROCEDURE');
    logger.warn('This operation will overwrite current data!');

    try {
        // 1. Stop consumers/producers if possible (manual step usually, or via API)

        // 2. Restore PostgreSQL
        if (postgresBackupPath) {
            await this.backupService.restorePostgres(postgresBackupPath);
        } else {
            logger.warn('Skipping PostgreSQL restore (no path provided)');
        }

        // 3. Restore Neo4j
        if (neo4jBackupPath) {
            await this.backupService.restoreNeo4j(neo4jBackupPath);
        } else {
            logger.warn('Skipping Neo4j restore (no path provided)');
        }

        logger.info('DISASTER RECOVERY COMPLETED SUCCESSFULLY');
    } catch (error) {
        logger.error('DISASTER RECOVERY FAILED', error);
        throw error;
    }
  }
}

export const drManager = new DisasterRecoveryManager();
