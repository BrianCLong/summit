#!/usr/bin/env -S npx tsx

const args = process.argv.slice(2);
const all = args.includes('--all');

if (all) {
    console.log('[OPS] Revoking ALL user sessions...');
    console.log('[OPS] (Mock) Cleared Redis session store.');
} else {
    console.log('[OPS] No target specified. Use --all or --user-id');
}
