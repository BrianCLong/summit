#!/usr/bin/env node
/**
 * CJS CommonJS Syntax Guard
 *
 * Scans all .cjs files in the repo and detects ESM syntax that would cause runtime errors.
 * .cjs files MUST use CommonJS (require/module.exports), not ESM (import/export).
 *
 * Usage: node scripts/check-cjs-commonjs.cjs
 * Exit code: 0 if no violations, 1 if ESM syntax found in .cjs files
 */

const fs = require('fs');
const path = require('path');

// Directories to exclude from scanning
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '_worktrees',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  '.cache',
]);

// Files that are allowed to contain ESM-like syntax (e.g., test fixtures with string literals)
const ALLOWED_FILES = new Set([
  '.github/scripts/golden-pr-test.cjs', // Contains ESM syntax as string literals in test fixtures
]);

// ESM syntax patterns to detect (with line-based regex)
// We try to avoid false positives in strings/comments by checking context
const ESM_PATTERNS = [
  {
    name: 'export default',
    // Match 'export default' at start of line or after whitespace, not inside strings
    regex: /^\s*export\s+default\b/,
    description: 'ESM export default statement',
  },
  {
    name: 'export {',
    regex: /^\s*export\s*\{/,
    description: 'ESM named export statement',
  },
  {
    name: 'export const/let/var/function/class',
    regex: /^\s*export\s+(const|let|var|function|class|async\s+function)\b/,
    description: 'ESM export declaration',
  },
  {
    name: 'import from',
    // Match import ... from at start of line
    regex: /^\s*import\s+.*\s+from\s+['"]/,
    description: 'ESM static import statement',
  },
  {
    name: 'import side-effect',
    // Match import 'module' or import "module"
    regex: /^\s*import\s+['"][^'"]+['"]\s*;?\s*$/,
    description: 'ESM side-effect import statement',
  },
];

/**
 * Check if a line appears to be inside a string literal or comment
 * This is a best-effort heuristic, not a full parser
 */
function isLikelyCodeLine(line, allLines, lineIndex) {
  const trimmed = line.trim();

  // Skip single-line comments
  if (trimmed.startsWith('//')) {
    return false;
  }

  // Skip lines that are clearly inside template literals or strings
  // Look for unbalanced backticks, quotes before the ESM keyword
  const beforeKeyword = line.split(/\b(export|import)\b/)[0] || '';

  // Count quotes to detect if we're inside a string
  const singleQuotes = (beforeKeyword.match(/'/g) || []).length;
  const doubleQuotes = (beforeKeyword.match(/"/g) || []).length;
  const backticks = (beforeKeyword.match(/`/g) || []).length;

  // If odd number of quotes before the keyword, likely inside a string
  if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1 || backticks % 2 === 1) {
    return false;
  }

  // Check if we're inside a multi-line comment by looking at previous lines
  let inBlockComment = false;
  for (let i = 0; i <= lineIndex; i++) {
    const checkLine = allLines[i];
    // Count comment starts and ends
    const starts = (checkLine.match(/\/\*/g) || []).length;
    const ends = (checkLine.match(/\*\//g) || []).length;

    if (i < lineIndex) {
      // For previous lines, track block comment state
      inBlockComment = inBlockComment ? ends < starts || (starts === ends && inBlockComment) : starts > ends;
    } else {
      // For current line, check if comment started before our position
      const keywordPos = line.search(/\b(export|import)\b/);
      const commentStartPos = line.indexOf('/*');
      const commentEndPos = line.indexOf('*/');

      if (inBlockComment && (commentEndPos === -1 || commentEndPos > keywordPos)) {
        return false;
      }
      if (commentStartPos !== -1 && commentStartPos < keywordPos &&
          (commentEndPos === -1 || commentEndPos > keywordPos)) {
        return false;
      }
    }
  }

  return !inBlockComment;
}

/**
 * Recursively find all .cjs files
 */
function findCjsFiles(dir, rootDir = dir) {
  const results = [];

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        results.push(...findCjsFiles(fullPath, rootDir));
      }
    } else if (entry.isFile() && entry.name.endsWith('.cjs')) {
      // Normalize path separators for cross-platform comparison
      const normalizedPath = relativePath.replace(/\\/g, '/');
      if (!ALLOWED_FILES.has(normalizedPath)) {
        results.push({ fullPath, relativePath: normalizedPath });
      }
    }
  }

  return results;
}

/**
 * Check a single file for ESM syntax violations
 */
function checkFile(filePath) {
  const violations = [];

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`  Warning: Could not read ${filePath}: ${err.message}`);
    return violations;
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (const pattern of ESM_PATTERNS) {
      if (pattern.regex.test(line)) {
        // Verify this looks like actual code, not a string/comment
        if (isLikelyCodeLine(line, lines, i)) {
          violations.push({
            line: lineNum,
            pattern: pattern.name,
            description: pattern.description,
            content: line.trim().substring(0, 80) + (line.trim().length > 80 ? '...' : ''),
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Main entry point
 */
function main() {
  const rootDir = process.cwd();

  console.log('🔍 Scanning for ESM syntax in .cjs files...\n');

  const cjsFiles = findCjsFiles(rootDir);
  console.log(`Found ${cjsFiles.length} .cjs files to check\n`);

  let totalViolations = 0;
  const fileViolations = [];

  for (const { fullPath, relativePath } of cjsFiles) {
    const violations = checkFile(fullPath);
    if (violations.length > 0) {
      totalViolations += violations.length;
      fileViolations.push({ relativePath, violations });
    }
  }

  if (totalViolations === 0) {
    console.log('✅ No ESM syntax found in .cjs files\n');
    console.log('All .cjs files correctly use CommonJS syntax (require/module.exports)');
    process.exit(0);
  }

  // Report violations
  console.log('❌ ESM syntax detected in .cjs files:\n');

  for (const { relativePath, violations } of fileViolations) {
    console.log(`📄 ${relativePath}`);
    for (const v of violations) {
      console.log(`   Line ${v.line}: ${v.pattern}`);
      console.log(`   └─ ${v.content}`);
    }
    console.log('');
  }

  console.log('─'.repeat(60));
  console.log(`\n❌ Found ${totalViolations} ESM syntax violation(s) in ${fileViolations.length} file(s)\n`);
  console.log('Fix: Replace ESM syntax with CommonJS equivalents:');
  console.log('  - export default { ... }  →  module.exports = { ... }');
  console.log('  - export { foo }          →  module.exports = { foo }');
  console.log('  - import x from "y"       →  const x = require("y")');
  console.log('');

  process.exit(1);
}

main();
