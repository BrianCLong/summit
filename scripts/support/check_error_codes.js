#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const errorCodesPath = path.resolve('docs/support/ERROR_CODES.md');

if (!fs.existsSync(errorCodesPath)) {
  console.error(`ERROR: unable to find ${errorCodesPath}`);
  process.exit(1);
}

const contents = fs.readFileSync(errorCodesPath, 'utf8');
const codePattern = /^\|\s*([A-Z0-9_]+)\s*\|/gm;
const seen = new Map();
let match;

while ((match = codePattern.exec(contents)) !== null) {
  const code = match[1];
  if (code === 'Code') continue;
  const count = seen.get(code) || 0;
  seen.set(code, count + 1);
}

const duplicates = Array.from(seen.entries()).filter(([, count]) => count > 1);

if (duplicates.length > 0) {
  duplicates.forEach(([code]) => {
    console.error(`Duplicate error code detected: ${code}`);
  });
  process.exit(1);
}

if (seen.size === 0) {
  console.error('No error codes found to validate.');
  process.exit(1);
}

console.log(`Validated ${seen.size} unique error codes from docs/support/ERROR_CODES.md`);
