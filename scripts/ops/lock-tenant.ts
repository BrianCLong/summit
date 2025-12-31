#!/usr/bin/env -S npx tsx

const args = process.argv.slice(2);
const tenantId = args.indexOf('--tenant-id') > -1 ? args[args.indexOf('--tenant-id') + 1] : null;

if (!tenantId) {
    console.error('Error: --tenant-id required');
    process.exit(1);
}

console.log(`[OPS] Locking Tenant ${tenantId}...`);
console.log(`[OPS] (Mock) Tenant access disabled.`);
