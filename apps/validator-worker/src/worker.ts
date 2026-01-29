import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import neo4j from 'neo4j-driver';
import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { load as loadYaml } from 'js-yaml';
import {
    PgLoader,
    Neo4jLoader,
    diffStream,
    createReport,
    generatePlan,
    Selector,
    DriftFinding
} from '@intelgraph/graph-sync-validator';

dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379
};

const worker = new Worker('graph-sync-validator', async job => {
  console.log(`Processing job ${job.id}`);
  const { selectorsGlob, pgUrlSecret, neo4jUrlSecret, outPath, apply } = job.data;

  // In a real env, resolve secrets. Here assuming they are the connection strings.
  const pgUrl = pgUrlSecret;
  const neo4jUrl = neo4jUrlSecret;

  const files = await glob(selectorsGlob);
  const pool = new Pool({ connectionString: pgUrl });
  const driver = neo4j.driver(neo4jUrl);

  const pgLoader = new PgLoader(pool);
  const neoLoader = new Neo4jLoader(driver);

  const severityWeights = { MISSING_NODE: 10, MISSING_REL: 7, PROP_MISMATCH: 6, ORPHAN_NODE: 3, ORPHAN_REL: 3 };

  const allFindings: DriftFinding[] = [];
  const aggregatedPlan: any = { cypher: [], sql: [] };
  const metrics = { scannedRows: 0, scannedNodes: 0, scannedRels: 0, durationMs: 0 };

  const startTime = Date.now();

  try {
      await driver.verifyConnectivity();

      for (const file of files) {
          const content = await readFile(file, 'utf-8');
          const selector = loadYaml(content) as Selector;

          const selectorFindings: DriftFinding[] = [];
          const pgStream = pgLoader.load(selector, 1000);
          const neoStream = neoLoader.load(selector, 1000);

          const diffIter = diffStream(pgStream, neoStream, selector, severityWeights);

          for await (const finding of diffIter) {
              selectorFindings.push(finding);
              allFindings.push(finding);
          }

          const plan = generatePlan(selectorFindings, selector);
          aggregatedPlan.cypher.push(...plan.cypher);
          aggregatedPlan.sql.push(...plan.sql);
      }
  } finally {
      await pool.end();
      await driver.close();
  }

  metrics.durationMs = Date.now() - startTime;

  const report = createReport(job.id || 'unknown', allFindings, aggregatedPlan, metrics);

  console.log(`Job ${job.id} completed. Drift hash: ${report.deterministicHash}`);

  return report;

}, { connection });

console.log('Worker started');
