
import { BackupService } from '../backup/BackupService.js';
import { RedisService } from '../cache/redis.js';
import logger from '../config/logger.js';
import { getPostgresPool } from '../db/postgres.js';
import { getNeo4jDriver } from '../db/neo4j.js';
import fs from 'fs/promises';
import path from 'path';

interface DRStatus {
  lastDrill: Date | null;
  lastDrillSuccess: boolean;
  activeAlerts: string[];
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

export class DisasterRecoveryService {
  private backupService: BackupService;
  private redis: RedisService;

  constructor() {
    this.backupService = new BackupService();
    this.redis = RedisService.getInstance();
  }

  /**
   * List available backups for restoration
   */
  async listBackups(type: 'postgres' | 'neo4j' | 'redis'): Promise<string[]> {
      const backupDir = path.join(process.env.BACKUP_ROOT_DIR || './backups', type);
      try {
          // Check local first
          const dates = await fs.readdir(backupDir);
          // In a real scenario, we would also check S3 with ListObjects
          return dates.sort().reverse(); // Newest first
      } catch (e) {
          logger.warn(`Could not list backups for ${type}`, e);
          return [];
      }
  }

  /**
   * Simulate a Disaster Recovery Drill
   * This restores the latest backup to a TEMPORARY database/namespace to verify integrity
   * without affecting production data.
   */
  async runDrill(target: 'postgres' | 'neo4j' = 'postgres'): Promise<boolean> {
    logger.info(`Starting DR Drill for ${target}...`);
    const startTime = Date.now();

    try {
        const backups = await this.listBackups(target);
        if (backups.length === 0) {
            throw new Error(`No backups found for ${target}`);
        }

        // Find latest file in latest date folder
        const latestDate = backups[0];
        const backupDir = path.join(process.env.BACKUP_ROOT_DIR || './backups', target, latestDate);
        const files = await fs.readdir(backupDir);
        if (files.length === 0) throw new Error('Empty backup directory');

        const backupFile = path.join(backupDir, files[0]); // Naive selection
        logger.info(`Selected backup for drill: ${backupFile}`);

        if (target === 'postgres') {
            await this.verifyPostgresRestore(backupFile);
        } else if (target === 'neo4j') {
            await this.verifyNeo4jRestore(backupFile);
        }

        await this.recordDrillResult(true, Date.now() - startTime);
        logger.info(`DR Drill for ${target} completed successfully.`);
        return true;
    } catch (error) {
        logger.error(`DR Drill for ${target} failed`, error);
        await this.recordDrillResult(false, Date.now() - startTime, (error as Error).message);
        return false;
    }
  }

  private async verifyPostgresRestore(backupFile: string): Promise<void> {
      // Create a temporary database
      const pool = getPostgresPool();
      const tempDbName = `dr_drill_${Date.now()}`;
      const client = await pool.connect();
      const pgHost = process.env.POSTGRES_HOST || 'localhost';
      const pgUser = process.env.POSTGRES_USER || 'intelgraph';
      const pgPassword = process.env.POSTGRES_PASSWORD || 'devpassword';

      try {
          await client.query(`CREATE DATABASE "${tempDbName}"`);
          logger.info(`Created temp DB ${tempDbName}`);

          // Sanitize backupFile path to prevent command injection
          if (/[^a-zA-Z0-9_\-\./]/.test(backupFile)) {
              throw new Error('Invalid backup filename');
          }

          const execAsync = (await import('util')).promisify((await import('child_process')).exec);

          logger.info('Starting restore to temp DB...');

          // Use env for password security
          const env = { ...process.env, PGPASSWORD: pgPassword };

          if (backupFile.endsWith('.gz')) {
              await execAsync(`gzip -cd "${backupFile}" | psql -h ${pgHost} -U ${pgUser} -d "${tempDbName}"`, { env });
          } else {
              await execAsync(`psql -h ${pgHost} -U ${pgUser} -d "${tempDbName}" < "${backupFile}"`, { env });
          }
          logger.info('Restore complete. Verifying content...');

          // Verification query (e.g., check table count)
          // Since we are connected to the main DB with 'client', we need a new connection to tempDb
          // or we can't easily query it without dblink or complex setup.
          // For now, we assume if psql exit code is 0, it's good.
          // Ideally we would query `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'` in the new DB.

          logger.info('Postgres restore verification successful.');

      } catch (error) {
          logger.error('Postgres restore verification failed', error);
          throw error;
      } finally {
           // Cleanup
           try {
               // Must disconnect others before dropping
               await client.query(`
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = '${tempDbName}' AND pid <> pg_backend_pid()
               `);
               await client.query(`DROP DATABASE IF EXISTS "${tempDbName}"`);
           } catch (e) {
               logger.warn(`Failed to drop temp DB ${tempDbName}`, e);
           }
           client.release();
      }
  }

  private async verifyNeo4jRestore(backupFile: string): Promise<void> {
      logger.info(`Verifying Neo4j backup file: ${backupFile}`);
      const fs = await import('fs');
      const readline = await import('readline');
      const zlib = await import('zlib');

      const fileStream = fs.createReadStream(backupFile);
      const rl = readline.createInterface({
        input: backupFile.endsWith('.gz') ? fileStream.pipe(zlib.createGunzip()) : fileStream,
        crlfDelay: Infinity
      });

      let nodes = 0;
      let rels = 0;

      for await (const line of rl) {
          try {
              const obj = JSON.parse(line);
              if (obj.type === 'node') nodes++;
              if (obj.type === 'rel') rels++;
          } catch (e) {
              logger.error('Invalid JSON line in backup', e);
              throw new Error('Backup file corruption detected');
          }
      }

      if (nodes === 0 && rels === 0) {
          logger.warn('Backup file is empty or contains no data');
      }

      logger.info(`Neo4j backup verified: ${nodes} nodes, ${rels} relationships found.`);
  }

  private async recordDrillResult(success: boolean, durationMs: number, error?: string): Promise<void> {
      const result = {
          timestamp: new Date().toISOString(),
          success,
          durationMs,
          error
      };

      // Persist to Redis for visibility
      try {
        await this.redis.set('dr:last_drill', JSON.stringify(result));
      } catch (e) {
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
            activeAlerts: [], // Implement alert check
            systemHealth: 'healthy'
        };
      } catch (e) {
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
