import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const ARTIFACTS_DIR = 'artifacts/evidence';

function hasUnstableTimestamps(obj: any): boolean {
  if (obj === null || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) {
    return obj.some(hasUnstableTimestamps);
  }
  for (const key in obj) {
    const val = obj[key];
    // Check keys related to time
    if (key.toLowerCase().includes('at') || key.toLowerCase().includes('timestamp') || key.toLowerCase().includes('time')) {
       if (typeof val === 'string') {
           // Allow the canonical epoch or EVID references
           if (val === "2026-01-23T00:00:00Z" || val.startsWith("EVID-")) {
               continue;
           }
           // Block anything that looks like a current ISO timestamp
           const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
           if (isoRegex.test(val)) {
               console.warn(`[DETERMINISM] Unstable timestamp detected in key "${key}": ${val}`);
               return true;
           }
       }
    }
    if (hasUnstableTimestamps(val)) return true;
  }
  return false;
}

if (existsSync(ARTIFACTS_DIR)) {
    const files = readdirSync(ARTIFACTS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const content = JSON.parse(readFileSync(join(ARTIFACTS_DIR, file), 'utf-8'));
      if (hasUnstableTimestamps(content)) {
        console.error(`::error::File ${file} contains unstable timestamps - CI BLOCKED`);
        process.exit(1);
      }
    }
    console.log("✅ Evidence determinism check passed");
} else {
    console.log("No evidence to check");
}
