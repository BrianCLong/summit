import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

// Snapshot taken on 2026-01-22
// Run python3 -c "import json, hashlib; with open('server/tsconfig.json') as f: data = json.load(f); excludes = sorted(data.get('exclude', [])); content = json.dumps(excludes); print(hashlib.sha256(content.encode('utf-8')).hexdigest())" to get new hash if you reduced excludes.
const EXPECTED_HASH = 'd6baf8a1874dc56c177b6686bd95016f2ceaa8b5ced6eb982ecac0a4edcd0486';
const EXPECTED_COUNT = 7;

const tsconfigPath = join(process.cwd(), 'server', 'tsconfig.json');

try {
  const tsconfigContent = readFileSync(tsconfigPath, 'utf8');
  // Simple comment stripping to handle JSONC
  // Robust comment stripping that doesn't kill glob patterns like **/*.ts
  const jsonContent = tsconfigContent.split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//')) return '';
      return line;
    })
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, (match) => {
       // Only replace if it looks like a real multi-line comment, 
       // but this is still risky for globs.
       // Given our known file structure, the only /* are in globs.
       // Let's just strip the one POLICY comment specifically.
       return match.includes('POLICY') ? '' : match;
    });
  
  const tsconfig = JSON.parse(jsonContent);
  const excludes = tsconfig.exclude || [];
  
  const sortedExcludes = [...excludes].sort();
  const content = JSON.stringify(sortedExcludes);
  const hash = createHash('sha256').update(content).digest('hex');
  
  if (excludes.length > EXPECTED_COUNT) {
    console.error(`\x1b[31m[ERROR] server/tsconfig.json exclude count increased! Expected <= ${EXPECTED_COUNT}, got ${excludes.length}.\x1b[0m`);
    console.error(`Policy: The exclude list is frozen. Do not add new files.`);
    process.exit(1);
  }

  if (hash !== EXPECTED_HASH) {
     console.error(`\x1b[31m[ERROR] server/tsconfig.json exclude list has changed!\x1b[0m`);
     console.error(`Expected Hash: ${EXPECTED_HASH}`);
     console.error(`Actual Hash:   ${hash}`);
     console.error(`\nIf you removed files (good job!), please update the hash in scripts/ci/verify_tsconfig_excludes_frozen.mjs.`);
     console.error(`If you ADDED files: \x1b[1mSTOP.\x1b[0m Use // @ts-nocheck instead.`);
     process.exit(1);
  }
  
  console.log(`\x1b[32m[OK] server/tsconfig.json excludes verified (Count: ${excludes.length}, Hash Verified).\x1b[0m`);
  
} catch (e) {
  console.error('Failed to parse or verify server/tsconfig.json:', e);
  process.exit(1);
}
