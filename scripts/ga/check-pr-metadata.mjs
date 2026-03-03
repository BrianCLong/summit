
import { readFileSync } from 'fs';
import { join } from 'path';

const contractPath = join(process.cwd(), 'agent-contract.json');
let contract;

try {
  contract = JSON.parse(readFileSync(contractPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse agent-contract.json:', e);
  process.exit(1);
}

const prBody = process.env.PR_BODY || '';
const metadataRegex = /(?:<!-- AGENT-METADATA:START -->|AGENT-METADATA)([\s\S]*?)(?:<!-- AGENT-METADATA:END -->|$)/;
const match = prBody.match(metadataRegex);

if (!match) {
  console.error('Missing AGENT-METADATA block in PR body.');
  console.error('Please include a block like this:');
  console.error('AGENT-METADATA\n{\n  "promptId": "...",\n  "taskId": "...",\n  "tags": ["..."]\n}');
  process.exit(1);
}

try {
  const metadata = JSON.parse(match[1]);
  console.log('AGENT-METADATA found and valid:', metadata);
} catch (e) {
  console.error('Failed to parse AGENT-METADATA content as JSON:', e);
  process.exit(1);
}

console.log('PR metadata check passed.');
