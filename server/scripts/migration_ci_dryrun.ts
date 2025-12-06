import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_MANAGER = path.resolve(__dirname, 'db_manager.ts');

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

    const cmd = `npx tsx ${DB_MANAGER} dry-run`;
    runCommand(cmd);

    console.log('✅ CI Dry-Run Passed: Migrations can be applied and rolled back safely.');
}

ciDryRun();
