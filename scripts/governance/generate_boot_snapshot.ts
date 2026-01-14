
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts/governance/runtime/local');
const POLICY_VERSION_FILE = path.join(ROOT_DIR, 'docs/governance/policies/policy_version.txt');

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

console.log('Generating Boot Snapshot...');

let policyVersion = 'unknown';
if (fs.existsSync(POLICY_VERSION_FILE)) {
  policyVersion = fs.readFileSync(POLICY_VERSION_FILE, 'utf8').trim();
}

// Simulate reading env vars
const killSwitchState = process.env.KILL_SWITCH_ENABLED === 'true';

const snapshot = {
  policy_version: policyVersion,
  kill_switch_state: killSwitchState,
  timestamp: new Date().toISOString(),
  env: {
     NODE_ENV: process.env.NODE_ENV || 'development'
  }
};

fs.writeFileSync(path.join(ARTIFACTS_DIR, 'boot_snapshot.json'), JSON.stringify(snapshot, null, 2));

console.log('Boot snapshot generated.');
