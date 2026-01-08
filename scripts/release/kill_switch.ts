import { existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const FREEZE_FILE = join(REPO_ROOT, 'ci', 'release-freeze');

function checkKillSwitch() {
  console.log('🛡️ Checking Emergency Stop / Kill Switch...');

  // Option A: Check environment variable
  const killSwitchEnv = process.env.RELEASE_KILL_SWITCH;
  if (killSwitchEnv === '1' || killSwitchEnv === 'true') {
    console.error('❌ Emergency Stop: RELEASE_KILL_SWITCH environment variable is active.');
    process.exit(1);
  }

  // Option B: Check freeze file
  if (existsSync(FREEZE_FILE)) {
    console.error(`❌ Emergency Stop: Freeze file found at ${FREEZE_FILE}.`);
    process.exit(1);
  }

  console.log('✅ Kill switch check passed. No emergency stop active.');
}

checkKillSwitch();
