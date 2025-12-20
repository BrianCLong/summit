#!/usr/bin/env node

/**
 * Script to remove @ts-nocheck from all test files
 * Run with: node scripts/remove-ts-nocheck.js
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const rootDir = path.join(__dirname, '..');

async function removeTSNoCheck() {
  // Find all test files
  const patterns = [
    'tests/**/*.test.ts',
    'src/**/__tests__/**/*.ts',
    'src/**/*.test.ts',
    '__tests__/**/*.ts',
    'middleware/**/__tests__/**/*.ts'
  ];

  let filesProcessed = 0;
  let filesFixed = 0;

  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: rootDir,
      absolute: true,
      ignore: ['**/node_modules/**']
    });

    for (const filePath of files) {
      try {
        filesProcessed++;
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        // Check if first line is @ts-nocheck
        if (lines[0] && (lines[0].trim() === '// @ts-nocheck' || lines[0].trim() === '//@ts-nocheck')) {
          // Remove first line
          const newContent = lines.slice(1).join('\n');
          fs.writeFileSync(filePath, newContent, 'utf8');
          console.log(`✓ Fixed: ${path.relative(rootDir, filePath)}`);
          filesFixed++;
        }
      } catch (error) {
        console.error(`✗ Error processing ${filePath}:`, error.message);
      }
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Files processed: ${filesProcessed}`);
  console.log(`   Files fixed: ${filesFixed}`);
}

removeTSNoCheck().catch(console.error);
