#!/usr/bin/env tsx
import logger from '../src/utils/logger.js';
import { AutonomousAgentsIngestionService } from '../src/ingestion/processors/autonomousAgents.js';

async function main() {
  const ref = process.env.AA_REF || 'main';
  const commitSha = process.env.AA_COMMIT;
  const localPath = process.env.AA_LOCAL_PATH;

  const service = new AutonomousAgentsIngestionService();
  const result = await service.ingest({ ref, commitSha, localPath });
  logger.info({ result }, 'Autonomous Agents ingestion completed');
}

main().catch((error) => {
  logger.error({ err: error }, 'Autonomous Agents ingestion failed');
  process.exit(1);
});
