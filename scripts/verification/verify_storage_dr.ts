import fs from 'fs';
import path from 'path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

function error(msg: string) {
  console.error(`${RED}ERROR: ${msg}${RESET}`);
  process.exitCode = 1;
}

function success(msg: string) {
  console.log(`${GREEN}PASS: ${msg}${RESET}`);
}

const CHECKS = [
    {
        name: "Cache/Tenant Isolation",
        path: "server/src/lib/db/TenantSafePostgres.ts",
        requiredStrings: ["tenantId", "TenantSafePostgres"]
    },
    {
        name: "Partition Plan",
        path: "server/src/services/TenantPartitioningService.ts",
        requiredStrings: ["partition", "tenant"]
    },
    {
        name: "DR Objectives",
        path: "docs/resilience/MULTI_REGION_ARCHITECTURE.md",
        requiredStrings: ["RTO", "RPO"]
    }
];

console.log(`Verifying Storage & DR artifacts...`);

let failure = false;

CHECKS.forEach(check => {
    if (!fs.existsSync(check.path)) {
        error(`[${check.name}] File not found: ${check.path}`);
        failure = true;
        return;
    }

    const content = fs.readFileSync(check.path, 'utf8');

    check.requiredStrings.forEach(str => {
        if (!content.includes(str)) {
             error(`[${check.name}] File ${check.path} missing required string: "${str}"`);
             failure = true;
        }
    });

    if (!failure) success(`[${check.name}] ${check.path} OK`);
});

if (failure) {
    process.exit(1);
}
