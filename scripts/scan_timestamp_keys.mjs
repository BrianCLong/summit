/**
 * scan_timestamp_keys.mjs
 * 
 * Scans source code and configs for legacy/non-standard timestamp keys.
 * Enforces use of 'createdAt' or 'timestamp' in ISO format.
 */
import fs from 'fs';
import { execSync } from 'child_process';

const FORBIDDEN_KEYS = ['unix_time', 'epoch_ms', 'creation_date'];
const SEARCH_PATHS = ['server/src', 'services', 'packages'];

let errors = 0;

console.log("Scanning for non-standard timestamp keys...");

for (const key of FORBIDDEN_KEYS) {
    try {
        // Use grep to find forbidden keys
        const output = execSync(`grep -r "${key}" ${SEARCH_PATHS.join(' ')} --exclude-dir=node_modules || true`, { encoding: 'utf8' });
        if (output.trim()) {
            console.error(`❌ Forbidden timestamp key '${key}' found in:\n${output}`);
            errors++;
        }
    } catch (e) {
        // Ignore errors from grep
    }
}

if (errors > 0) {
    console.error(`\nFound ${errors} timestamp standard violations.`);
    process.exit(1);
} else {
    console.log('✅ Timestamp standards validated.');
}
