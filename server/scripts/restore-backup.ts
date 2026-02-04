import { RestoreService } from '../src/backup/RestoreService.js';
import pino from 'pino';

const logger = (pino as any)();

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: ts-node restore-backup.ts <postgres|neo4j> <filepath>');
    process.exit(1);
  }

  const type = args[0];
  const filepath = args[1];

  const restoreService = new RestoreService();

  try {
    if (type === 'postgres') {
      await restoreService.restorePostgres(filepath);
    } else if (type === 'neo4j') {
      await restoreService.restoreNeo4j(filepath);
    } else {
      console.error(`Unknown restore type: ${type}`);
      process.exit(1);
    }
    logger.info('Restore operation finished successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('Restore operation failed', error);
    process.exit(1);
  }
}

run();
