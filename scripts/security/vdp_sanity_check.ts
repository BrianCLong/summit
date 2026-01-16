import * as fs from 'fs';
import * as path from 'path';

const REQUIRED_FILES = [
  'docs/security/VULNERABILITY_DISCLOSURE.md',
  'docs/security/SECURITY_CONTACT.md',
  'docs/security/VULN_TRIAGE_RUNBOOK.md'
];

function check() {
  let missing = 0;
  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(file)) {
      console.error(`MISSING: ${file}`);
      missing++;
    } else {
      console.log(`OK: ${file}`);
    }
  }

  if (missing > 0) {
    console.error(`VDP Sanity Check Failed: ${missing} files missing.`);
    process.exit(1);
  }
}

check();
