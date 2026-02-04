import fs from 'fs';

const ledgerPath = 'docs/security/SECURITY_LEDGER.md';

if (!fs.existsSync(ledgerPath)) {
  // Try fallback if I rename it
  if (!fs.existsSync('docs/security/SECURITY-ISSUE-LEDGER.md')) {
    console.error(`Error: Security Ledger not found at ${ledgerPath}`);
    process.exit(1);
  }
}

console.log('Security Ledger verified.');
