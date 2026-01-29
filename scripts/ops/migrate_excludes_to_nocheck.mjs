import { readFileSync, writeFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { glob } from 'glob';

/**
 * MIGRATION SCRIPT: Phase 2 - Debt Surfacing
 * 
 * Purpose: Move files from 'hidden' tsconfig excludes to 'explicit' // @ts-nocheck debt.
 * This makes the files visible to the compiler (handling imports/renames) 
 * while suppressing type errors inside the files.
 */

const SERVER_DIR = resolve(process.cwd(), 'server');
const TSCONFIG_PATH = join(SERVER_DIR, 'tsconfig.json');

// Standard exclusions we want to KEEP
const PROTECTED_EXCLUDES = [
  'node_modules',
  'dist',
  'tests/**' // Keep massive test suites excluded for performance until ready
];

async function migrate() {
  console.log('🚀 Starting Exclude -> @ts-nocheck migration...');

  const tsconfigContent = readFileSync(TSCONFIG_PATH, 'utf8');
  const jsonContent = tsconfigContent
    .replace(/\/\/.*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  
  const tsconfig = JSON.parse(jsonContent);
  const originalExcludes = tsconfig.exclude || [];
  
  const toMigrate = originalExcludes.filter(p => !PROTECTED_EXCLUDES.includes(p));
  const remainingExcludes = originalExcludes.filter(p => PROTECTED_EXCLUDES.includes(p));

  console.log(`Found ${toMigrate.length} patterns to migrate.`);

  let filesModified = 0;

  for (const pattern of toMigrate) {
    // Expand glob within server dir
    const files = await glob(pattern, {
      cwd: SERVER_DIR,
      absolute: true,
      nodir: true,
      ignore: ['**/node_modules/**', '**/dist/**']
    });

    for (const filePath of files) {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) continue;

      try {
        const content = readFileSync(filePath, 'utf8');
        if (content.startsWith('// @ts-nocheck')) {
          console.log(`- Skipping (already has nocheck): ${filePath}`);
          continue;
        }

        const newContent = `// @ts-nocheck\n${content}`;
        writeFileSync(filePath, newContent, 'utf8');
        filesModified++;
        console.log(`✓ Added @ts-nocheck: ${filePath}`);
      } catch (err) {
        console.error(`✗ Error processing ${filePath}:`, err.message);
      }
    }
  }

  // Update tsconfig.json
  tsconfig.exclude = remainingExcludes;
  
  // Note: This loses comments in the original JSON. 
  // In a real scenario, we might want to use a JSONC parser or regex to preserve comments.
  writeFileSync(TSCONFIG_PATH, JSON.stringify(tsconfig, null, 2), 'utf8');

  console.log('\n✅ Migration Complete!');
  console.log(`   Files modified: ${filesModified}`);
  console.log(`   Remaining excludes: ${remainingExcludes.join(', ')}`);
  console.log('\nNEXT STEPS:');
  console.log('1. Update the hash in scripts/ci/verify_tsconfig_excludes_frozen.mjs');
  console.log('2. Run npm run typecheck in server/ to verify baseline.');
}

migrate().catch(console.error);
