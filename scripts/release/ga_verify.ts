#!/usr/bin/env -S npx tsx
import fs from 'fs';
import path from 'path';

// Configuration
const REQUIRED_STEPS = [
    'iac_validation',
    'security_scan',
    'smoke_test',
    'integration_test'
];

const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts/ga-verify');
const CURRENT_SHA = process.env.GITHUB_SHA || 'dev-sha';
const STAMP_PATH = path.join(ARTIFACTS_DIR, CURRENT_SHA, 'stamp.json');

interface Stamp {
    [key: string]: boolean | string;
}

async function main() {
    console.log(`Starting GA Verification for SHA: ${CURRENT_SHA}`);

    // Ensure directory exists
    if (!fs.existsSync(path.dirname(STAMP_PATH))) {
        fs.mkdirSync(path.dirname(STAMP_PATH), { recursive: true });
    }

    // Load or initialize stamp
    let stamp: Stamp = {};
    if (fs.existsSync(STAMP_PATH)) {
        stamp = JSON.parse(fs.readFileSync(STAMP_PATH, 'utf8'));
    }

    // Check prerequisites (simulated for now, would read from actual CI artifacts/logs)
    console.log("Verifying required steps...");

    // In a real scenario, we would check for existence of specific artifact files
    // produced by previous CI jobs. For this script, we just validate the stamp structure.

    const missingSteps = REQUIRED_STEPS.filter(step => !stamp[step] && stamp[step] !== 'passed');

    if (missingSteps.length > 0) {
        console.warn(`WARNING: Missing verification steps: ${missingSteps.join(', ')}`);
        console.warn("This release is NOT ready for GA.");
        // We don't exit 1 here yet, as this might be run incrementally
    } else {
        console.log("All required verification steps present.");
        stamp['ga_ready'] = true;
    }

    // Update stamp
    stamp['last_verified'] = new Date().toISOString();
    fs.writeFileSync(STAMP_PATH, JSON.stringify(stamp, null, 2));
    console.log(`Stamp updated at ${STAMP_PATH}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
