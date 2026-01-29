import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

const CRITICAL_FILES = [
  'scripts/agentic_policy/config.json',
  'scripts/agentic_policy/agentic_plan_gate.ts',
  '.github/workflows/agentic-plan-gate.yml',
  'docs/standards/on-programming-with-agents.md'
];

function checkFiles() {
  let missing = [];
  for (const file of CRITICAL_FILES) {
    if (!fs.existsSync(path.join(REPO_ROOT, file))) {
      missing.push(file);
    }
  }
  return missing;
}

function checkConfig() {
  const configPath = path.join(REPO_ROOT, 'scripts/agentic_policy/config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.mode === 'off') {
        return 'Config mode is OFF';
      }
    } catch (e) {
      return 'Config is invalid JSON';
    }
  }
  return null;
}

function main() {
  console.log('Starting Agentic Policy Drift Check...');

  const missingFiles = checkFiles();
  if (missingFiles.length > 0) {
    console.error('DRIFT DETECTED: Missing critical files:', missingFiles);
    process.exit(1);
  }

  const configError = checkConfig();
  if (configError) {
    console.error('DRIFT DETECTED: Config issue:', configError);
    process.exit(1);
  }

  console.log('Policy is active and intact.');

  // Emit artifact for evidence
  const artifactPath = path.join(REPO_ROOT, 'artifacts/agentic_policy/drift_report.json');
  // Ensure dir exists
  const artifactDir = path.dirname(artifactPath);
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  fs.writeFileSync(artifactPath, JSON.stringify({
    status: 'pass',
    timestamp: new Date().toISOString(),
    checked_files: CRITICAL_FILES
  }, null, 2));
}

main();
