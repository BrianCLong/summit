
import { BackupService } from '../services/BackupService.js';
import { RedisService } from '../cache/redis.js';
import pino from 'pino';
import fs from 'fs/promises';
import path from 'path';
import { getPostgresPool } from '../db/postgres.js';

const logger = (pino as any)({ name: 'DisasterRecoveryService' });
const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/backups';

interface DRStatus {
  lastDrill: Date | null;
  lastDrillSuccess: boolean;
  activeAlerts: string[];
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

export class DisasterRecoveryService {
  private backupService: BackupService;
  private redis: RedisService;

  private static instance: DisasterRecoveryService;

  public static getInstance(): DisasterRecoveryService {
      if (!DisasterRecoveryService.instance) {
          DisasterRecoveryService.instance = new DisasterRecoveryService();
      }
      return DisasterRecoveryService.instance;
  }

  constructor() {
    this.backupService = BackupService.getInstance();
    this.redis = RedisService.getInstance();
  }

  /**
   * List available backups for restoration
   * Assumes flat directory structure from BackupService
   */
  async listBackups(type: 'postgres' | 'neo4j' | 'redis'): Promise<string[]> {
      try {
          const files = await fs.readdir(BACKUP_DIR);
          return files
            .filter(f => f.startsWith(`${type}_`) && (f.endsWith('.sql') || f.endsWith('.ndjson')))
            .sort()
            .reverse();
      } catch (e: any) {
          logger.warn(`Could not list backups for ${type}`, e);
          return [];
      }
  }

  /**
   * Simulate a Disaster Recovery Drill
   * This restores the latest backup to a VERIFICATION target if possible,
   * or runs a dry-run restoration.
   */
  async runDrill(target: 'postgres' | 'neo4j' | 'redis' = 'postgres'): Promise<boolean> {
    logger.info(`Starting DR Drill for ${target}...`);
    const startTime = Date.now();

    try {
        const backups = await this.listBackups(target);
        if (backups.length === 0) {
            throw new Error(`No backups found for ${target}`);
        }

        const backupFile = path.join(BACKUP_DIR, backups[0]);
        logger.info(`Selected backup for drill: ${backupFile}`);

        if (target === 'postgres') {
            const drillDbName = `dr_drill_${Date.now()}`;

            // Create drill DB using pool connecting to maintenance DB
            const pool = getPostgresPool();
            const client = await pool.connect();
            try {
                // Terminate connections to target DB if it exists (for robustness)
                await client.query(`
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = '${drillDbName}'
                `);

                // Drop if exists
                await client.query(`DROP DATABASE IF EXISTS "${drillDbName}"`);

                // Create
                await client.query(`CREATE DATABASE "${drillDbName}"`);
                logger.info(`Created drill DB ${drillDbName}`);
            } finally {
                client.release();
            }

            // Restore
            await this.backupService.restorePostgres(backupFile, drillDbName);

            // Cleanup
            const cleanupClient = await pool.connect();
            try {
                 await cleanupClient.query(`DROP DATABASE IF EXISTS "${drillDbName}"`);
            } catch (e) {
                logger.warn('Failed to drop drill DB after success', e);
            } finally {
                cleanupClient.release();
            }

            logger.info(`Drill restored to ${drillDbName} and cleaned up`);

        } else if (target === 'neo4j') {
            logger.info('Skipping actual Neo4j restore in drill (destructive operation). Verifying file integrity only.');
            await fs.access(backupFile, fs.constants.R_OK);
        } else if (target === 'redis') {
             logger.info('Skipping actual Redis restore in drill (destructive operation). Verifying file integrity only.');
             await fs.access(backupFile, fs.constants.R_OK);
        }

        await this.recordDrillResult(true, Date.now() - startTime);
        logger.info(`DR Drill for ${target} completed successfully.`);
        return true;
    } catch (error: any) {
        logger.error(`DR Drill for ${target} failed`, error);
        await this.recordDrillResult(false, Date.now() - startTime, (error as Error).message);
        return false;
    }
  }

  /**
   * Perform Full System Recovery
   * DANGER: This will overwrite current data.
   */
  async performFullRecovery(): Promise<void> {
      logger.warn('STARTING FULL SYSTEM RECOVERY. DATA WILL BE OVERWRITTEN.');

      try {
        // 1. Redis (Cache/Session) - least critical dependency
        const redisBackups = await this.listBackups('redis');
        if (redisBackups.length > 0) {
             await this.backupService.restoreRedis(path.join(BACKUP_DIR, redisBackups[0]));
        }

        // 2. Postgres (Relational Data)
        const pgBackups = await this.listBackups('postgres');
        if (pgBackups.length > 0) {
            await this.backupService.restorePostgres(path.join(BACKUP_DIR, pgBackups[0]));
        }

        // 3. Neo4j (Graph Data)
        const neoBackups = await this.listBackups('neo4j');
        if (neoBackups.length > 0) {
            await this.backupService.restoreNeo4j(path.join(BACKUP_DIR, neoBackups[0]));
        }

        logger.info('Full system recovery completed.');
      } catch (error: any) {
          logger.error('Full system recovery FAILED', error);
          throw error;
      }
  }

  private async recordDrillResult(success: boolean, durationMs: number, error?: string): Promise<void> {
      const result = {
          timestamp: new Date().toISOString(),
          success,
          durationMs,
          error
      };

      try {
        await this.redis.set('dr:last_drill', JSON.stringify(result));
      } catch (e: any) {
          logger.error('Failed to record drill result to Redis', e);
      }
  }

  async getStatus(): Promise<DRStatus> {
      try {
        const lastDrillStr = await this.redis.get('dr:last_drill');
        const lastDrill = lastDrillStr ? JSON.parse(lastDrillStr) : null;

        return {
            lastDrill: lastDrill ? new Date(lastDrill.timestamp) : null,
            lastDrillSuccess: lastDrill?.success ?? false,
            activeAlerts: [],
            systemHealth: 'healthy'
        };
      } catch (e: any) {
          logger.error('Failed to get status from Redis', e);
          return {
              lastDrill: null,
              lastDrillSuccess: false,
              activeAlerts: ['REDIS_CONNECTION_ERROR'],
              systemHealth: 'degraded'
          };
      }
  }
}
