/**
 * CI wrapper for migrations
 * Redirects to managed-migrate.ts
 */
import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Use --no-backup in CI as we start with a fresh DB
  execSync('npx tsx scripts/managed-migrate.ts up --no-backup', {
    stdio: 'inherit',
    cwd: join(__dirname, '..')
  });
} catch (e) {
  process.exit(1);
}
