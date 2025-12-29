
// purge-data.ts
// Stub script for purging receipts/provenance data.
// Defaults to dry-run mode.

interface PurgeOptions {
  olderThanDays: number | null;
  execute: boolean;
}

export function parseArgs(args: string[]): PurgeOptions {
  const execute = args.includes('--execute');
  const olderThanIndex = args.indexOf('--older-than');
  let olderThanDays: number | null = null;

  if (olderThanIndex !== -1 && olderThanIndex + 1 < args.length) {
    const val = parseInt(args[olderThanIndex + 1], 10);
    if (!isNaN(val)) {
      olderThanDays = val;
    }
  }

  return { olderThanDays, execute };
}

export function runPurge(options: PurgeOptions) {
  if (options.olderThanDays === null) {
    console.error('Error: --older-than <days> is required.');
    // In a real script we might exit, but for testability we might want to return or throw.
    // For this stub script, we'll just return if running in test context, or exit if main.
    // We'll throw an error which is easier to test.
    throw new Error('--older-than <days> is required');
  }

  console.log(`Configuration: Older Than = ${options.olderThanDays} days`);
  console.log(`Mode: ${options.execute ? 'EXECUTE' : 'DRY-RUN'}`);

  if (!options.execute) {
    console.log(`[DRY-RUN] Would search for receipts/provenance older than ${options.olderThanDays} days.`);
    console.log('[DRY-RUN] Found 0 records to purge (stub).');
    console.log('[DRY-RUN] No changes made.');
  } else {
    console.log(`[EXECUTE] Searching for receipts/provenance older than ${options.olderThanDays} days...`);
    console.log('[EXECUTE] Purging records... (stub)');
    console.log('[EXECUTE] Done.');
  }
}

// Only run if called directly
// In Node ESM, checking if main is tricky.
// A common pattern is checking process.argv[1] against import.meta.url
import { fileURLToPath } from 'url';

// Helper to check if this module is being run directly
const isMainModule = () => {
    if (!import.meta.url) return false;
    // Check if the current file path matches the executed script path
    const currentPath = fileURLToPath(import.meta.url);
    const executedPath = process.argv[1];
    return currentPath === executedPath;
};

if (isMainModule()) {
   try {
      const options = parseArgs(process.argv.slice(2));
      runPurge(options);
   } catch (error: any) {
       console.error(error.message);
       process.exit(1);
   }
}
