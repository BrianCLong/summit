import * as fs from 'fs';
import * as path from 'path';

/**
 * Basic regex for forbidden fields (PII, raw handles, phone numbers).
 * This is a minimal implementation for the "never-log" scanner.
 */
const FORBIDDEN_PATTERNS = [
  /(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
];

const FORBIDDEN_FIELDS = [
  'pii',
  'phone_number',
  'email_address',
  'private_handle',
];

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  let found = false;

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      console.error(`❌ Forbidden pattern found in ${filePath}: ${pattern}`);
      found = true;
    }
  }

  try {
    const json = JSON.parse(content);
    const keys = Object.keys(json).map(k => k.toLowerCase());
    for (const field of FORBIDDEN_FIELDS) {
      if (keys.includes(field)) {
        console.error(`❌ Forbidden field found in ${filePath}: ${field}`);
        found = true;
      }
    }
  } catch (e) {
  }

  return !found;
}

function main() {
  const targetDir = process.argv[2] || 'artifacts';
  if (!fs.existsSync(targetDir)) {
    console.log(`Directory not found: ${targetDir}. Skipping scan.`);
    process.exit(0);
  }

  const files = fs.readdirSync(targetDir, { recursive: true }) as string[];
  let allValid = true;

  for (const file of files) {
    const filePath = path.join(targetDir, file);
    if (fs.statSync(filePath).isFile()) {
      const valid = scanFile(filePath);
      if (!valid) allValid = false;
    }
  }

  if (!allValid) {
    process.exit(1);
  }

  console.log('✅ Never-log scan passed.');
}

main();
