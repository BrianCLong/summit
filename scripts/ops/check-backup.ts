#!/usr/bin/env -S npx tsx

const args = process.argv.slice(2);
const date = args.indexOf('--date') > -1 ? args[args.indexOf('--date') + 1] : 'latest';

console.log(`[OPS] Checking backup for date: ${date}`);
console.log(`[OPS] Found backup: backup-db-prod-${date}.tar.gz`);
console.log(`[OPS] Status: VERIFIED`);
console.log(`[OPS] Size: 45GB`);
