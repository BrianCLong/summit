#!/usr/bin/env node
import { driver as createDriver, auth } from 'neo4j-driver';
import { runAllChecks } from './validate/index.js';

const driver = createDriver(
  process.env.NEO4J_URL!,
  auth.basic(
    process.env.NEO4J_USER!,
    process.env.NEO4J_PASS!
  )
);

const report = await runAllChecks(driver);
await driver.close();

if (report.hasErrors()) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(2);
}

console.log('Graph PG Guard: OK');
