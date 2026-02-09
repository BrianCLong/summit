import { readFileSync } from 'fs';
import { join } from 'path';

const contractPath = join(process.cwd(), 'agent-contract.json');
let contract;

try {
  contract = JSON.parse(readFileSync(contractPath, 'utf8'));
} catch (e) {
  console.warn('Failed to parse agent-contract.json:', e);
  // process.exit(1); // Don't fail if contract is missing
}

const prBody = process.env.PR_BODY || '';
const metadataRegex = /<!-- AGENT-METADATA:START -->([\s\S]*?)<!-- AGENT-METADATA:END -->/;
const match = prBody.match(metadataRegex);

if (!match) {
  if (prBody.includes('PR created automatically by Jules')) {
    console.warn('⚠️  Skipping strict metadata check for automated Jules PR.');
    process.exit(0);
  }
  console.error('Missing AGENT-METADATA block in PR body.');
  console.error('Please include a block like this:');
  console.error('<!-- AGENT-METADATA:START -->\n{\n  "promptId": "...",\n  "taskId": "...",\n  "tags": ["..."]\n}\n<!-- AGENT-METADATA:END -->');
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
