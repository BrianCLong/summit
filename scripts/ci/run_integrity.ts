import { PostgresCollector } from '../../src/run_integrity/postgres_fetch';
import { Neo4jCollector } from '../../src/run_integrity/neo4j_fetch';
import { IntegrityComparer } from '../../src/run_integrity/compare';
import { writeReportArtifacts } from '../../src/run_integrity/report';
import * as path from 'path';

async function main() {
  const runId = process.env.RUN_ID;
  const pgDsn = process.env.PG_DSN;
  const neoUri = process.env.NEO4J_URI;
  const neoUser = process.env.NEO4J_USER;
  const neoPass = process.env.NEO4J_PASS;
  const namespace = process.env.OPENLINEAGE_NAMESPACE || 'summit';
  const mode = process.env.INTEGRITY_MODE || 'warn'; // 'warn' or 'enforce'
  const outDir = process.env.ARTIFACTS_DIR || 'artifacts/run-integrity/run-integrity-sanity-card';

  if (!runId || !pgDsn || !neoUri || !neoUser || !neoPass) {
    console.error('Missing required environment variables: RUN_ID, PG_DSN, NEO4J_URI, NEO4J_USER, NEO4J_PASS');
    process.exit(1);
  }

  console.log(`Starting Run Integrity Check for RunID: ${runId} (Mode: ${mode})`);

  const pgCollector = new PostgresCollector(pgDsn);
  const neoCollector = new Neo4jCollector(neoUri, neoUser, neoPass);
  const comparer = new IntegrityComparer(namespace);

  try {
    console.log('Fetching from Postgres...');
    const pgItems = await pgCollector.fetchEvidence(runId);
    console.log(`Fetched ${pgItems.length} items from Postgres.`);

    console.log('Fetching from Neo4j...');
    const neoItems = await neoCollector.fetchEvidence(runId);
    console.log(`Fetched ${neoItems.length} items from Neo4j.`);

    console.log('Comparing...');
    const report = await comparer.compare(runId, pgItems, neoItems);

    console.log(`Status: ${report.status}`);
    console.log(`Mismatches: ${report.mismatches.length}`);

    console.log(`Writing artifacts to ${outDir}...`);
    writeReportArtifacts(outDir, report);

    if (report.status === 'FAIL') {
      if (mode === 'enforce') {
        console.error('Integrity Check FAILED. Enforce mode enabled. Exiting with error.');
        process.exit(1);
      } else {
        console.warn('Integrity Check FAILED. Warn mode enabled. Exiting with success (warning).');
      }
    } else {
      console.log('Integrity Check PASSED.');
    }

  } catch (error) {
    console.error('An error occurred during integrity check:', error);
    process.exit(1);
  } finally {
    await pgCollector.close();
    await neoCollector.close();
  }
}

main();
