import { GraphConsistencyReporter } from '../services/drivers/GraphConsistencyReporter.js';
import { closePostgresPool } from '../db/postgres.js';
import { closeNeo4jDriver } from '../db/neo4j.js';
import logger from '../config/logger.js';

const run = async () => {
  const reporter = new GraphConsistencyReporter();

  // Parse args
  const autoRepair = process.argv.includes('--auto-repair');
  const pruneOrphans = process.argv.includes('--prune-orphans');
  const jsonOutput = process.argv.includes('--json');
  const outputPathIndex = process.argv.indexOf('--output');
  const outputPath = outputPathIndex > -1 ? process.argv[outputPathIndex + 1] : null;

  try {
    logger.info('Starting Graph Consistency Check Script...');
    await reporter.generateReport(
      outputPath,
      jsonOutput ? 'json' : 'console',
      autoRepair,
      pruneOrphans
    );
    logger.info('Check completed successfully.');
    process.exit(0);
  } catch (error: any) {
    logger.error('Graph consistency check failed or drift detected.', error);
    process.exit(1);
  } finally {
    await closePostgresPool();
    await closeNeo4jDriver();
  }
};

run();
