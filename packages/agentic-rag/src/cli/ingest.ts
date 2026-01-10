#!/usr/bin/env ts-node
import { Pool } from 'pg';
import { ingestCorpus } from '../ingestion/ingest.js';

const args = process.argv.slice(2);
const sourceIndex = args.indexOf('--source');
const workspaceIndex = args.indexOf('--workspace');
const rebuild = args.includes('--rebuild');

const sourceDir = sourceIndex !== -1 ? args[sourceIndex + 1] : process.env.AGENTIC_RAG_CORPUS_DIR || './simulated_ingestion';
const workspaceId = workspaceIndex !== -1 ? args[workspaceIndex + 1] : 'default';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const result = await ingestCorpus({ sourceDir, workspaceId, pool, rebuild });
  console.log(JSON.stringify(result, null, 2));
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

