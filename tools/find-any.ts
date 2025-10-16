#!/usr/bin/env ts-node
/**
 * Find and flag explicit 'any' types in TypeScript files
 * Used in CI to prevent introduction of unsafe types
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface AnyUsage {
  file: string;
  line: number;
  column: number;
  context: string;
}

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  '.next',
  '__pycache__',
]);

const EXCLUDED_FILES = new Set([
  'types.d.ts',
  'global.d.ts',
  'vite-env.d.ts',
  'jest.config.ts',
]);

function isExcluded(path: string): boolean {
  const segments = path.split('/');
  return (
    segments.some((segment) => EXCLUDED_DIRS.has(segment)) ||
    EXCLUDED_FILES.has(segments[segments.length - 1])
  );
}

function findTypescriptFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      if (isExcluded(fullPath)) {
        continue;
      }

      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findTypescriptFiles(fullPath));
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories we can't read
    console.warn(
      `Warning: Could not read directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  return files;
}

function findExplicitAny(filePath: string): AnyUsage[] {
  const usages: AnyUsage[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineNumber = lineIndex + 1;

      // Look for explicit 'any' keyword
      // Match word boundaries to avoid false positives like 'company', 'many', etc.
      const anyRegex = /\bany\b/g;
      let match;

      while ((match = anyRegex.exec(line)) !== null) {
        const column = match.index + 1;

        // Skip if it's in a comment
        const beforeMatch = line.substring(0, match.index);
        if (beforeMatch.includes('//') || beforeMatch.includes('/*')) {
          continue;
        }

        // Skip if it's in a string literal
        const inString = isInStringLiteral(line, match.index);
        if (inString) {
          continue;
        }

        // Skip common false positives
        if (isFalsePositive(line, match.index)) {
          continue;
        }

        usages.push({
          file: filePath,
          line: lineNumber,
          column,
          context: line.trim(),
        });
      }
    }
  } catch (error) {
    console.warn(
      `Warning: Could not read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  return usages;
}

function isInStringLiteral(line: string, position: number): boolean {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;

  for (let i = 0; i < position; i++) {
    const char = line[i];
    const prevChar = i > 0 ? line[i - 1] : '';

    if (char === "'" && prevChar !== '\\' && !inDoubleQuote && !inTemplate) {
      inSingleQuote = !inSingleQuote;
    } else if (
      char === '"' &&
      prevChar !== '\\' &&
      !inSingleQuote &&
      !inTemplate
    ) {
      inDoubleQuote = !inDoubleQuote;
    } else if (
      char === '`' &&
      prevChar !== '\\' &&
      !inSingleQuote &&
      !inDoubleQuote
    ) {
      inTemplate = !inTemplate;
    }
  }

  return inSingleQuote || inDoubleQuote || inTemplate;
}

function isFalsePositive(line: string, position: number): boolean {
  const before = line.substring(0, position);
  const after = line.substring(position + 3); // 'any'.length = 3

  // Skip 'any' in import statements for type definitions
  if (
    before.includes('import') &&
    (after.includes('from') || before.includes('type'))
  ) {
    return true;
  }

  // Skip 'any' in module declarations
  if (before.includes('declare') || before.includes('module')) {
    return true;
  }

  // Skip 'any' in JSDoc comments
  if (before.trim().startsWith('*') || before.trim().startsWith('//')) {
    return true;
  }

  // Skip common words containing 'any'
  const wordBefore = before.match(/\w+$/)?.[0] || '';
  const wordAfter = after.match(/^\w+/)?.[0] || '';
  const fullWord = wordBefore + 'any' + wordAfter;

  const commonWords = [
    'company',
    'many',
    'germany',
    'anyone',
    'anywhere',
    'anyway',
    'anything',
    'anyone',
    'anybody',
    'anytime',
    'anyhow',
  ];

  if (
    commonWords.some((word) =>
      fullWord.toLowerCase().includes(word.toLowerCase()),
    )
  ) {
    return true;
  }

  return false;
}

function main(): void {
  const rootDir = process.argv[2] || '.';
  const files = findTypescriptFiles(rootDir);

  let totalUsages = 0;
  const fileUsages: Record<string, AnyUsage[]> = {};

  console.log(
    `🔍 Scanning ${files.length} TypeScript files for explicit 'any' types...\n`,
  );

  for (const file of files) {
    const usages = findExplicitAny(file);
    if (usages.length > 0) {
      fileUsages[file] = usages;
      totalUsages += usages.length;
    }
  }

  // Report findings
  if (totalUsages === 0) {
    console.log('✅ No explicit "any" types found!');
    process.exit(0);
  }

  console.log(
    `❌ Found ${totalUsages} explicit 'any' type${totalUsages === 1 ? '' : 's'} in ${Object.keys(fileUsages).length} file${Object.keys(fileUsages).length === 1 ? '' : 's'}:\n`,
  );

  for (const [file, usages] of Object.entries(fileUsages)) {
    console.log(`📄 ${file}:`);
    for (const usage of usages) {
      console.log(`   ${usage.line}:${usage.column} -> ${usage.context}`);
    }
    console.log('');
  }

  console.log('💡 Suggestions:');
  console.log(
    '  • Replace with specific types: string, number, object, unknown, etc.',
  );
  console.log(
    '  • Use generic constraints: <T extends Record<string, unknown>>',
  );
  console.log('  • Use union types: string | number | boolean');
  console.log('  • Use type assertions: value as SpecificType');
  console.log('  • Use type guards for runtime type checking\n');

  process.exit(totalUsages > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}

export { findExplicitAny, findTypescriptFiles };
