
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

export interface BackupOptions {
  outputDir: string;
  timestamp?: boolean;
}

export class BackupManager {
  private getTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  private ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async backupPostgres(options: BackupOptions): Promise<string> {
    const timestamp = this.getTimestamp();
    const filename = `postgres-backup-${timestamp}.sql`;
    const outputPath = path.join(options.outputDir, filename);
    this.ensureDir(options.outputDir);

    logger.info(`Starting PostgreSQL backup to ${outputPath}`);

    try {
        // Use DATABASE_URL if available, otherwise assume local defaults or env vars
        const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';

        // Use pg_dump. Note: requires pg_dump to be installed in the environment
        await execAsync(`pg_dump "${dbUrl}" -f "${outputPath}"`);

        logger.info('PostgreSQL backup completed successfully');
        return outputPath;
    } catch (error: any) {
        logger.error({ error }, 'PostgreSQL backup failed');
        throw error;
    }
  }

  async backupRedis(options: BackupOptions): Promise<string> {
    const timestamp = this.getTimestamp();
    const filename = `redis-backup-${timestamp}.rdb`;
    const outputPath = path.join(options.outputDir, filename);
    this.ensureDir(options.outputDir);

    logger.info(`Starting Redis backup to ${outputPath}`);

    try {
        // Redis backup usually involves SAVE command or copying dump.rdb
        // Here we'll try to trigger a SAVE and then copy the dump file if local,
        // or use --rdb if redis-cli is available and remote.

        const redisHost = process.env.REDIS_HOST || 'localhost';
        const redisPort = process.env.REDIS_PORT || '6379';
        const redisPassword = process.env.REDIS_PASSWORD;

        let command = `redis-cli -h ${redisHost} -p ${redisPort}`;
        if (redisPassword) {
            // Warning: Process list might show password. Use config file in real prod if strict.
            command += ` -a "${redisPassword}"`;
        }
        command += ` --rdb "${outputPath}"`;

        await execAsync(command);

        logger.info('Redis backup completed successfully');
        return outputPath;
    } catch (error: any) {
        logger.error({ error }, 'Redis backup failed');
        throw error;
    }
  }

  async backupNeo4j(options: BackupOptions): Promise<string> {
      const timestamp = this.getTimestamp();
      const filename = `neo4j-backup-${timestamp}.dump`;
      const outputPath = path.join(options.outputDir, filename);
      this.ensureDir(options.outputDir);

      logger.info(`Starting Neo4j backup to ${outputPath}`);

      try {
          // neo4j-admin is the standard way, but requires being on the server or having access.
          // If we are in a container, we might need to exec into the neo4j container or use cypher-shell to export.
          // Given the constraints, we will attempt to use `neo4j-admin database dump` if available,
          // or fallback to a warning if not running locally/accessible.

          // Check if neo4j-admin exists
          try {
              await execAsync('neo4j-admin --version');
              await execAsync(`neo4j-admin database dump neo4j --to-path="${options.outputDir}"`);
              // Rename to include timestamp if needed, or just return the dir
              // neo4j-admin dump creates a file named <database>.dump
              const defaultDump = path.join(options.outputDir, 'neo4j.dump');
              if (fs.existsSync(defaultDump)) {
                  fs.renameSync(defaultDump, outputPath);
              }
              logger.info('Neo4j backup completed successfully');
              return outputPath;
          } catch (e) {
              logger.warn('neo4j-admin not found. Attempting Cypher export via APOC (if available) is complex via CLI. Skipping native dump.');
              throw new Error('neo4j-admin tool not found or failed');
          }

      } catch (error: any) {
          logger.error({ error }, 'Neo4j backup failed');
          throw error;
      }
  }

  async backupAll(options: BackupOptions): Promise<string[]> {
      const results = [];
      try {
          results.push(await this.backupPostgres(options));
      } catch (e) { logger.error('Skipping Postgres due to error'); }

      try {
          results.push(await this.backupRedis(options));
      } catch (e) { logger.error('Skipping Redis due to error'); }

      try {
          results.push(await this.backupNeo4j(options));
      } catch (e) { logger.error('Skipping Neo4j due to error'); }

      return results;
  }
}
