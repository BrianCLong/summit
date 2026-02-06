import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEvidenceBundle } from '../../src/graphrag/narratives/evidence/verifyEvidence.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = new Map<string, string>();
process.argv.slice(2).forEach((arg) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    args.set(key.replace(/^--/, ''), value);
  }
});

const evidenceDir =
  args.get('evidence-dir') ??
  path.resolve(__dirname, '../../evidence');

try {
  validateEvidenceBundle(evidenceDir);
  console.log('verify-evidence: OK');
} catch (error) {
  console.error('verify-evidence: FAILED');
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}
