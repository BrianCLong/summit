
import fs from 'fs';
import path from 'path';

export interface DiffResult {
  breaking: string[];
  nonBreaking: string[];
}

/**
 * Compares two snapshots and identifies breaking changes.
 *
 * Breaking changes in OpenAPI context (simplified):
 * - Removing a path
 * - Removing a method from a path
 * - Changing a parameter from optional to required (not implemented deeply here, just structural)
 * - Removing a property from a response schema (if strictly checking, but we'll focus on paths/methods first)
 *
 * For this initial version, we detect:
 * - Removed paths
 * - Removed methods
 */
export function compareSnapshots(baseline: any, current: any): DiffResult {
  const result: DiffResult = {
    breaking: [],
    nonBreaking: []
  };

  if (!baseline || !current) {
    return result;
  }

  // Check for removed paths
  if (baseline.paths) {
    for (const pathKey of Object.keys(baseline.paths)) {
      if (!current.paths || !current.paths[pathKey]) {
        result.breaking.push(`Path removed: ${pathKey}`);
        continue;
      }

      // Check for removed methods within the path
      for (const method of Object.keys(baseline.paths[pathKey])) {
        // Skip extension fields like x-something or summary/description at path level if any
        if (['parameters', 'summary', 'description'].includes(method)) continue;

        if (!current.paths[pathKey][method]) {
          result.breaking.push(`Method removed: ${method.toUpperCase()} ${pathKey}`);
        }
      }
    }
  }

  // Check for added paths (non-breaking)
  if (current.paths) {
    for (const pathKey of Object.keys(current.paths)) {
      if (!baseline.paths || !baseline.paths[pathKey]) {
        result.nonBreaking.push(`Path added: ${pathKey}`);
        continue;
      }
       // Check for added methods within the path
       for (const method of Object.keys(current.paths[pathKey])) {
         if (['parameters', 'summary', 'description'].includes(method)) continue;
         if (!baseline.paths[pathKey][method]) {
           result.nonBreaking.push(`Method added: ${method.toUpperCase()} ${pathKey}`);
         }
       }
    }
  }

  // TODO: Deep schema comparison for more granular breaking change detection
  // e.g. required params, response fields removed, etc.

  return result;
}

// Main execution block
if (process.argv[1].endsWith('check-api-compat.ts')) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: tsx scripts/check-api-compat.ts <baseline-file> <current-file>');
    process.exit(1);
  }

  const [baselineFile, currentFile] = args;

  try {
    const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    const current = JSON.parse(fs.readFileSync(currentFile, 'utf8'));

    const diff = compareSnapshots(baseline, current);

    if (diff.nonBreaking.length > 0) {
      console.log('Non-breaking changes:');
      diff.nonBreaking.forEach(msg => console.log(`  - ${msg}`));
    }

    if (diff.breaking.length > 0) {
      console.error('BREAKING CHANGES DETECTED:');
      diff.breaking.forEach(msg => console.error(`  - ${msg}`));
      // For now, warn-only as per requirements ("warn-only initially")
      // So we exit with 0, but maybe log a warning.
      console.warn('Warning: Breaking changes found. Please verify compatibilty.');
    } else {
      console.log('No breaking changes detected.');
    }

  } catch (error) {
    console.error('Error comparing snapshots:', error);
    process.exit(1);
  }
}
