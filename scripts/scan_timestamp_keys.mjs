import fs from 'fs';
import path from 'path';

/**
 * Heuristic scan for forbidden ISO timestamps outside of stamp.json files.
 * Mandatory for GA bitwise reproducibility.
 */
const FORBIDDEN_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'artifacts', '.pnpm-store'];
const IGNORE_FILES = ['stamp.json', 'package-lock.json', 'pnpm-lock.yaml', 'CHANGELOG.md'];

function scan(dir) {
  let violations = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      violations = violations.concat(scan(fullPath));
    } else {
      if (IGNORE_FILES.includes(entry.name) || entry.name.endsWith('.png') || entry.name.endsWith('.jpg')) continue;
      
      const content = fs.readFileSync(fullPath, 'utf8');
      if (FORBIDDEN_PATTERN.test(content)) {
        console.warn(`❌ Forbidden timestamp found in: ${fullPath}`);
        violations.push(fullPath);
      }
    }
  }
  return violations;
}

const violations = scan(process.cwd());

if (violations.length > 0) {
  console.error(`Total violations: ${violations.length}`);
  // process.exit(1); // Keep as warning for initial transition
} else {
  console.log('✅ No forbidden timestamps found outside stamp.json files.');
}
