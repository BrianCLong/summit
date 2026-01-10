import { execSync } from 'node:child_process';

const command = 'node scripts/ci/console-log-scan.cjs';

execSync(command, { stdio: 'inherit' });
