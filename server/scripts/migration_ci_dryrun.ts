import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MANAGED_MIGRATE = path.resolve(__dirname, 'managed-migrate.ts');

function runCommand(cmd: string) {
    try {
        console.log(`Running: ${cmd}`);
        execSync(cmd, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Command failed: ${cmd}`);
        process.exit(1);
    }
}

async function ciDryRun() {
    console.log('🏗️  Starting CI Dry-Run for Migrations...');

    // We assume the DB is available (e.g., service container in CI).
    // The dry-run command in db_manager handles the transaction rollback logic.
    // We use the new managed-migrate script which supports 'test' (dry-run).

    const cmd = `npx tsx ${MANAGED_MIGRATE} test`;
    runCommand(cmd);

    console.log('✅ CI Dry-Run Passed: Migrations can be applied and rolled back safely.');
}

ciDryRun();
