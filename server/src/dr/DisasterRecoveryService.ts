
import { BackupService } from '../services/BackupService.js';
import { RedisService } from '../cache/redis.js';
import logger from '../utils/logger.js';
import { getPostgresPool } from '../db/postgres.js';
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
    this.backupService = BackupService.getInstance();
    this.redis = RedisService.getInstance();
  }

  /**
   * List available backups for restoration
   */
  async listBackups(type: 'postgres' | 'neo4j' | 'redis'): Promise<string[]> {
      const backupDir = path.join(process.env.BACKUP_DIR || '/tmp/backups');
      try {
          // Check local first
          const files = await fs.readdir(backupDir);
          // Filter by type
          return files.filter(f => f.startsWith(`${type}_`)).sort().reverse(); // Newest first
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

        // Find latest file
        const latestFile = backups[0];
        const backupPath = path.join(process.env.BACKUP_DIR || '/tmp/backups', latestFile);
        logger.info(`Selected backup for drill: ${backupPath}`);

        if (target === 'postgres') {
            await this.verifyPostgresRestore(backupPath);
        } else if (target === 'neo4j') {
            await this.verifyNeo4jRestore(backupPath);
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
      // Ensure temp DB name is safe and unique
      const tempDbName = `dr_drill_${Date.now()}`;
      // Connect to 'postgres' db to create new db

      const client = await pool.connect();

      try {
          logger.info(`Creating temp DB ${tempDbName} for verification...`);
          await client.query(`CREATE DATABASE "${tempDbName}"`);

          // Now we need to restore into this new DB.
          const { spawn } = await import('child_process');

          logger.info(`Restoring dump to ${tempDbName}...`);

          await new Promise<void>((resolve, reject) => {
              const env = { ...process.env };
              env.PGDATABASE = tempDbName;

              const psql = spawn('psql', ['-d', tempDbName, '-f', backupFile], { env });

              psql.on('close', (code) => {
                  if (code === 0) resolve();
                  else reject(new Error(`psql restore failed with code ${code}`));
              });

              psql.on('error', reject);
          });

          logger.info('Restore complete. Verifying data...');

          // Ideally: Connect to tempDbName and run `SELECT count(*) FROM users`

          logger.info('Verification successful (Restore process completed without error).');

      } catch (e) {
          logger.error('Verification failed', e);
          throw e;
      } finally {
           // Cleanup
           try {
               logger.info(`Dropping temp DB ${tempDbName}...`);
               await client.query(`DROP DATABASE IF EXISTS "${tempDbName}"`);
           } catch (e) {
               logger.warn(`Failed to drop temp DB ${tempDbName}`, e);
           }
           client.release();
      }
  }

  private async verifyNeo4jRestore(backupFile: string): Promise<void> {
      logger.info('Simulating Neo4j restore verification (not yet fully implemented)...');
      // Just check if JSON is valid
      const content = await fs.readFile(backupFile, 'utf-8');
      try {
          JSON.parse(content);
          logger.info('Neo4j backup file is valid JSON');
      } catch (e) {
          throw new Error('Neo4j backup file is invalid JSON');
      }
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
            activeAlerts: [],
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
