import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { MigrationSafetySimulator } from '../src/migrations/safety/MigrationSafetySimulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface CliArgs {
  target?: string;
  reportDir?: string;
  patchDir?: string;
  connection?: string;
  continueOnError?: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {};

  for (const arg of args) {
    if (arg.startsWith('--target=')) {
      parsed.target = arg.split('=')[1];
    } else if (arg.startsWith('--report=')) {
      parsed.reportDir = arg.split('=')[1];
    } else if (arg.startsWith('--patches=')) {
      parsed.patchDir = arg.split('=')[1];
    } else if (arg === '--continue-on-error') {
      parsed.continueOnError = true;
    } else if (arg.startsWith('--connection=')) {
      parsed.connection = arg.split('=')[1];
    }
  }

  return parsed;
}

async function main() {
  const cliArgs = parseArgs();

  const migrationsDir = path.resolve(__dirname, '../db/migrations/postgres');
  const reportDir = path.resolve(
    cliArgs.reportDir ?? path.join(__dirname, '../tmp/migration-safety'),
  );
  const patchDir = path.resolve(cliArgs.patchDir ?? path.join(reportDir, 'patches'));
  const connectionString =
    cliArgs.connection || process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('POSTGRES_URL or DATABASE_URL is required to run the simulator.');
    process.exit(1);
  }

  const simulator = new MigrationSafetySimulator({
    migrationsDir,
    connectionString,
    reportDir,
    patchDir,
    targetMigration: cliArgs.target,
    continueOnError: cliArgs.continueOnError,
  });

  try {
    const report = await simulator.run();

    console.log('\nMigration Safety Simulation Complete');
    console.log('-----------------------------------');
    console.log(`Migrations tested: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Unsafe findings: ${report.summary.unsafeFindings}`);
    console.log(`Patches generated: ${report.summary.patchesGenerated}`);
    console.log(`Report saved to: ${path.join(reportDir, 'migration-safety-report.json')}`);

    for (const migration of report.migrations) {
      console.log(`\n• ${migration.file} -> ${migration.status.toUpperCase()}`);
      migration.unsafePatterns.forEach((pattern) => {
        console.log(`  - [${pattern.severity}] ${pattern.pattern}: ${pattern.detail}`);
      });
      if (migration.patchGenerated) {
        console.log(`  - Patch created at ${migration.patchGenerated}`);
      }
      if (migration.message) {
        console.log(`  - Note: ${migration.message}`);
      }
    }
  } catch (error) {
    console.error('Migration simulation failed:', (error as Error).message);
    process.exit(1);
  }
}

main();
