import { readFileSync } from 'fs';
import { join } from 'path';

const tsconfigPath = join(process.cwd(), 'server', 'tsconfig.json');

try {
  const tsconfigContent = readFileSync(tsconfigPath, 'utf8');
  // Simple comment stripping
  const jsonContent = tsconfigContent
    .replace(/\/\/.*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  
  const tsconfig = JSON.parse(jsonContent);

  // Check 1: Inheritance
  const expectedExtends = "../../tsconfig.json";
  if (tsconfig.extends !== expectedExtends) {
    console.warn(`\x1b[33m[WARNING] server/tsconfig.json does not extend root config!\x1b[0m`);
    console.warn(`Expected: "extends": "${expectedExtends}"`);
    console.warn(`Found:    ${tsconfig.extends ? `"extends": "${tsconfig.extends}"` : "missing"}`);
    console.warn(`Plan: This will become an ERROR in Phase 3.`);
  } else {
    console.log(`\x1b[32m[OK] server/tsconfig.json extends root config.\x1b[0m`);
  }

  // Check 2: Exclude Count (Redundant but safe double-check)
  // This logic is also in verify_tsconfig_excludes_frozen.mjs, but this script focuses on structure.
  if (!tsconfig.exclude) {
     console.error(`\x1b[31m[ERROR] server/tsconfig.json is missing 'exclude' block!\x1b[0m`);
     process.exit(1);
  }

} catch (e) {
  console.error('Failed to parse server/tsconfig.json:', e);
  process.exit(1);
}
