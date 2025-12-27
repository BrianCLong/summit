#!/usr/bin/env node
import {
  buildMigrationRiskReport,
  formatMigrationRiskReport,
  resolveMigrationDir,
} from '../src/db/migrations/migration-checker.js';

const args = process.argv.slice(2);
const formatIndex = args.indexOf('--format');
const format =
  formatIndex !== -1 && args[formatIndex + 1]
    ? args[formatIndex + 1]
    : 'human';
const dirIndex = args.indexOf('--dir');
const migrationsDir =
  dirIndex !== -1 && args[dirIndex + 1] ? args[dirIndex + 1] : undefined;

const overridden = process.env.MIGRATION_DESTRUCTIVE_OK === '1';

const report = buildMigrationRiskReport({
  migrationsDir: resolveMigrationDir(migrationsDir),
  overridden,
});

if (format === 'json') {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(formatMigrationRiskReport(report));
}

if (report.summary.findings > 0 && !overridden) {
  process.exit(1);
}
