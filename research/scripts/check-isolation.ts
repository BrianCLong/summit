import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
// import * as yaml from 'js-yaml'; // We don't need yaml if we are just grepping, removed to fix build error

const ROOT_DIR = path.resolve(__dirname, '../../');
const RESEARCH_PACKAGE = '@summit/research';
const RESEARCH_PATH_FRAGMENT = 'research/';

console.log('Running Research Isolation Check...');

// Function to find all relevant directories based on workspace config or conventions
// Since we don't have a reliable yaml parser in devDependencies guaranteed, we'll try to rely on `find` or `glob` patterns
// simulating what pnpm does, or just hardcode the known workspace roots from the file list we saw earlier.
// Better: Use `pnpm ls -r --json` to get all package locations if possible, but that might be slow.
// Let's use a broad exclusion approach: Check EVERYTHING except `research/`, `node_modules/`, `.git/`, `dist/`, `build/`.

// We will use `find` command to list all .ts, .js, .tsx, .jsx files in the repo, excluding specific dirs.
// This is more robust than listing folders.

const EXCLUDE_DIRS = [
  'research',
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo'
];

const excludeArgs = EXCLUDE_DIRS.map(dir => `--exclude-dir=${dir}`).join(' ');

let hasErrors = false;

// Check for package imports
try {
  console.log('Scanning codebase for @summit/research imports...');
  // grep -r "@summit/research" . --exclude-dir=research --exclude-dir=node_modules ...
  const grepCommand = `grep -r "${RESEARCH_PACKAGE}" "${ROOT_DIR}" ${excludeArgs} --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"`;

  const result = execSync(grepCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });

  if (result.trim()) {
    console.error(`ERROR: Research package imported in the following files:`);
    console.error(result);
    hasErrors = true;
  }
} catch (e) {
  // grep returns non-zero if no matches found
}

// Check for relative path imports
try {
  console.log('Scanning codebase for relative research imports...');
  // This is harder to grep perfectly without false positives, but we look for "../research" or "/research/" in imports
  // We can look for `from '.*research.*'` patterns but that's complex with grep.
  // Let's stick to looking for the string "research/" inside files, and then filter lines that look like imports.

  const grepCommand = `grep -r "research/" "${ROOT_DIR}" ${excludeArgs} --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx"`;
  const result = execSync(grepCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });

  const lines = result.split('\n');
  for (const line of lines) {
     if (!line.trim()) continue;
     // Check if it's an import or require
     if ((line.includes('import ') || line.includes('require(')) &&
         (line.includes('../research') || line.includes('/research/'))) {

         // Double check it's not a false positive (like a string in a log) - heuristics apply
         // But for a hard gate, false positives are better than false negatives.
         console.error(`ERROR: Suspicious relative research import found:`);
         console.error(line);
         hasErrors = true;
     }
  }
} catch (e) {
  // grep returns non-zero if no matches found
}

if (hasErrors) {
  console.error('FAILED: Research isolation violations detected.');
  process.exit(1);
} else {
  console.log('SUCCESS: No research isolation violations found.');
}
