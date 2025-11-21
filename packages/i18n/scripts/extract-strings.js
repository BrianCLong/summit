#!/usr/bin/env node

/**
 * String Extraction Tool
 *
 * Scans source code for hardcoded strings and extracts them to translation files.
 * Supports React components, JavaScript/TypeScript files.
 *
 * Usage:
 *   node extract-strings.js <source-dir> [options]
 *
 * Options:
 *   --output <dir>     Output directory for extracted strings (default: ./extracted)
 *   --pattern <glob>   File pattern to scan (default: **\/*.{js,jsx,ts,tsx})
 *   --namespace <ns>   Namespace for extracted strings (default: extracted)
 *   --dry-run          Preview extraction without writing files
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Patterns to match translatable strings
const STRING_PATTERNS = [
  // String literals in JSX
  />([^<>{]+)</g,
  // String props
  /\w+="([^"]+)"/g,
  /\w+='([^']+)'/g,
  // Template literals (simple)
  /`([^`$]+)`/g,
  // Regular strings
  /"([^"\\]+(\\.[^"\\]*)*)"/g,
  /'([^'\\]+(\\.[^'\\]*)*)'/g,
];

// Strings to exclude from extraction
const EXCLUDE_PATTERNS = [
  /^$/,                          // Empty strings
  /^\s+$/,                       // Whitespace only
  /^[0-9]+$/,                    // Numbers only
  /^[!@#$%^&*(),.?":{}|<>]+$/,   // Symbols only
  /^(true|false|null|undefined)$/i, // Literals
  /^(const|let|var|function|class|import|export|from|return)$/i, // Keywords
  /^[a-z][a-zA-Z0-9]*$/,         // camelCase identifiers
  /^[A-Z][A-Z_0-9]*$/,           // CONSTANT_CASE
  /^[A-Z][a-z]+([A-Z][a-z]+)*$/, // PascalCase
  /^https?:\/\//,                // URLs
  /^\/[^\s]*$/,                  // Paths
  /^\./,                         // Relative paths
  /^@/,                          // Package names
];

function shouldExtractString(str) {
  if (!str || str.length < 2) return false;
  if (str.length > 200) return false; // Too long, probably not a UI string

  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(str.trim())) {
      return false;
    }
  }

  return true;
}

function extractStringsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const strings = new Set();

  for (const pattern of STRING_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const str = match[1]?.trim();
      if (str && shouldExtractString(str)) {
        strings.add(str);
      }
    }
  }

  return Array.from(strings);
}

function generateKey(str) {
  // Generate a translation key from string
  const cleaned = str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 5) // Max 5 words
    .join('_');

  return cleaned || `string_${Math.random().toString(36).slice(2, 9)}`;
}

async function extractStrings(sourceDir, options = {}) {
  const {
    output = './extracted',
    pattern = '**/*.{js,jsx,ts,tsx}',
    namespace = 'extracted',
    dryRun = false,
  } = options;

  console.log(`🔍 Scanning ${sourceDir} for translatable strings...`);
  console.log(`   Pattern: ${pattern}`);

  const files = await glob(pattern, {
    cwd: sourceDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.test.*', '**/*.spec.*'],
  });

  console.log(`📂 Found ${files.length} files to scan\n`);

  const allExtracted = new Map();
  let totalStrings = 0;

  for (const file of files) {
    const strings = extractStringsFromFile(file);
    if (strings.length > 0) {
      const relativePath = path.relative(sourceDir, file);
      console.log(`   ${relativePath}: ${strings.length} strings`);

      for (const str of strings) {
        const key = generateKey(str);
        allExtracted.set(key, {
          value: str,
          files: [...(allExtracted.get(key)?.files || []), relativePath],
        });
      }

      totalStrings += strings.length;
    }
  }

  console.log(`\n✨ Extracted ${totalStrings} total strings (${allExtracted.size} unique)\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN - Preview of extracted strings:\n');
    for (const [key, { value, files }] of Array.from(allExtracted.entries()).slice(0, 20)) {
      console.log(`   ${key}: "${value}"`);
      console.log(`      Found in: ${files.slice(0, 3).join(', ')}${files.length > 3 ? ` (+${files.length - 3} more)` : ''}\n`);
    }
    if (allExtracted.size > 20) {
      console.log(`   ... and ${allExtracted.size - 20} more\n`);
    }
    return;
  }

  // Write to file
  const outputPath = path.join(output, `${namespace}.json`);
  fs.mkdirSync(output, { recursive: true });

  const translations = {};
  for (const [key, { value }] of allExtracted.entries()) {
    translations[key] = value;
  }

  fs.writeFileSync(
    outputPath,
    JSON.stringify(translations, null, 2),
    'utf-8'
  );

  console.log(`💾 Saved extracted strings to: ${outputPath}`);
  console.log(`\n✅ Extraction complete!`);
  console.log(`\nNext steps:`);
  console.log(`  1. Review ${outputPath} and organize keys`);
  console.log(`  2. Replace hardcoded strings with t('${namespace}.<key>')`);
  console.log(`  3. Translate strings to other locales\n`);
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const sourceDir = args[0] || '.';

  const options = {
    output: args.find((arg, i) => args[i - 1] === '--output'),
    pattern: args.find((arg, i) => args[i - 1] === '--pattern'),
    namespace: args.find((arg, i) => args[i - 1] === '--namespace'),
    dryRun: args.includes('--dry-run'),
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
String Extraction Tool

Scans source code for hardcoded strings and extracts them to translation files.

Usage:
  node extract-strings.js <source-dir> [options]

Options:
  --output <dir>     Output directory (default: ./extracted)
  --pattern <glob>   File pattern (default: **/*.{js,jsx,ts,tsx})
  --namespace <ns>   Namespace (default: extracted)
  --dry-run          Preview without writing files
  --help, -h         Show this help

Examples:
  node extract-strings.js ./src
  node extract-strings.js ./src --output ./locales/extracted --namespace ui
  node extract-strings.js ./src --dry-run
    `);
    process.exit(0);
  }

  extractStrings(sourceDir, options).catch(console.error);
}

export { extractStrings, extractStringsFromFile, generateKey };
