import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const ledgerPath = path.join(rootDir, 'artifacts/agent-action-ledger.jsonl');

// Ensure artifacts dir exists
if (!fs.existsSync(path.dirname(ledgerPath))) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
}

const action = {
  timestamp: new Date().toISOString(),
  skill: process.argv[2] || 'unknown',
  rule: process.argv[3] || 'unknown',
  files: process.argv[4] ? process.argv[4].split(',') : [],
  rationale: process.argv[5] || 'No rationale provided',
  user: process.env.USER || 'unknown',
};

fs.appendFileSync(ledgerPath, JSON.stringify(action) + '\n');
console.log(`Action logged to ${ledgerPath}`);
