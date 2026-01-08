#!/usr/bin/env -S npx tsx

const args = process.argv.slice(2);
const userId = args.indexOf("--user-id") > -1 ? args[args.indexOf("--user-id") + 1] : null;

if (!userId) {
  console.error("Error: --user-id required");
  process.exit(1);
}

console.log(`[OPS] Suspending user ${userId}...`);
console.log(`[OPS] (Mock) User status set to SUSPENDED`);
console.log(`[OPS] (Mock) All active tokens revoked.`);
