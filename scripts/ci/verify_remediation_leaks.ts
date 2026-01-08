
import * as fs from 'fs';
import * as path from 'path';

const REMEDIATION_DIR = path.join(process.cwd(), 'dist/remediation');

const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/, // OpenAI keys
  /ghp_[a-zA-Z0-9]{20,}/, // GitHub tokens
  /ey[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/, // JWTs
  /AWS[A-Z0-9]{10,}/, // AWS IDs potentially
  /BEGIN PRIVATE KEY/, // Keys
  /password\s*[:=]\s*[^\s]+/, // Passwords
];

function scanDirectory(dir: string) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  let failed = false;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(content)) {
          console.error(`❌ Sensitive data pattern detected in ${fullPath}: ${pattern}`);
          failed = true;
        }
      }
    }
  }

  if (failed) {
    console.error('Compliance Scan Failed: Sensitive data found in remediation artifacts.');
    process.exit(1);
  }
}

console.log(`Scanning ${REMEDIATION_DIR} for leaks...`);
scanDirectory(REMEDIATION_DIR);
console.log('✅ No leaks detected.');
