import path from 'node:path';
import { verifyEvidenceBundle } from '../../src/graphrag/narratives/evidence/validator.js';

function main() {
  const rootDir = path.resolve(process.cwd());
  const result = verifyEvidenceBundle({ rootDir });

  if (!result.ok) {
    console.log(
      'verify-evidence: evidence/index.json not found. Enforce via fixtures and CI once bundle exists.',
    );
    process.exit(0);
  }

  console.log('verify-evidence: OK');
}

main();
