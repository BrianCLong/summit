#!/usr/bin/env node
import { logicalStream } from './capture/logical';
import { reconcileEvent } from './reconcile/upsert';
import { buildReport, runAllChecks } from './validate';
import { ReservationProjector } from './projectors/ReservationProjector';
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

(async () => {
  const pgUrl = process.env.PG_URL;
  const neoUrl = process.env.NEO4J_URL;
  const neoUser = process.env.NEO4J_USER;
  const neoPass = process.env.NEO4J_PASS;

  if (!pgUrl || !neoUrl || !neoUser || !neoPass) {
    console.error('Missing environment variables: PG_URL, NEO4J_URL, NEO4J_USER, NEO4J_PASS');
    process.exit(1);
  }

  const driver = neo4j.driver(neoUrl, neo4j.auth.basic(neoUser, neoPass));

  // Initialize Projector
  const projector = new ReservationProjector();

  // 1) Reconcile stream
  console.log('Starting stream capture...');
  for await (const ev of logicalStream(pgUrl)) {
    console.log('Processing event:', ev);
    await reconcileEvent(driver, projector, ev);
  }

  // 2) Validate
  console.log('Running validation checks...');
  const report = buildReport();
  await runAllChecks(driver, report);

  // 3) Exit non‑zero on errors (CI‑failable)
  if (report.hasErrors()) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  console.log('Graph PG Guard: OK');

  await driver.close();
})();
