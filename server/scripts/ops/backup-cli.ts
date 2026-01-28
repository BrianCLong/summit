#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import { BackupManager } from '../../src/ops/BackupManager.js';
import { logger } from '../../src/utils/logger.js';

const program = new Command();

program
  .name('backup-cli')
  .description('Unified Backup CLI for Summit Infrastructure')
  .version('1.0.0');

program
  .command('backup')
  .description('Perform a backup of specified services')
  .option('-t, --target <target>', 'Target service (postgres, redis, neo4j, all)', 'all')
  .option('-o, --output <path>', 'Output directory', './backups')
  .action(async (options) => {
    const manager = new BackupManager();
    const outputDir = path.resolve(process.cwd(), options.output);

    logger.info(`Starting backup for target: ${options.target}`);

    try {
      if (options.target === 'postgres') {
        await manager.backupPostgres({ outputDir });
      } else if (options.target === 'redis') {
        await manager.backupRedis({ outputDir });
      } else if (options.target === 'neo4j') {
        await manager.backupNeo4j({ outputDir });
      } else if (options.target === 'all') {
        await manager.backupAll({ outputDir });
      } else {
        logger.error(`Unknown target: ${options.target}`);
        process.exit(1);
      }
      logger.info('Backup operation completed.');
    } catch (error) {
      logger.error({ error }, 'Backup operation failed');
      process.exit(1);
    }
  });

program.parse(process.argv);
