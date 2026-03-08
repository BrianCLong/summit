#!/usr/bin/env node
"use strict";
/**
 * Diligence Readiness Sweep Script
 *
 * This script checks the 'docs/diligence' directory for missing or stale artifacts.
 * It is intended to be run weekly.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
// Fix for __dirname in ESM
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const DILIGENCE_ROOT = path_1.default.resolve(__dirname, '../docs/diligence');
// Expected artifacts configuration
const EXPECTED_ARTIFACTS = [
    { path: 'README.md', maxAgeDays: 30, name: 'Diligence Index' },
    { path: 'OWNERS.yaml', maxAgeDays: 90, name: 'Owners List' },
    { path: 'TIMELINE.md', maxAgeDays: 30, name: 'Corporate Timeline' },
    { path: 'RED_FLAGS.md', maxAgeDays: 7, name: 'Red Flags List' }, // Weekly update expected
    { path: 'FAQ.md', maxAgeDays: 30, name: 'FAQ' },
    { path: 'RETENTION_POLICY.md', maxAgeDays: 365, name: 'Retention Policy' },
    { path: 'COMMS_RULES.md', maxAgeDays: 180, name: 'Comms Rules' },
    { path: 'legal/README.md', maxAgeDays: 90, name: 'Legal Section' },
    { path: 'finance/README.md', maxAgeDays: 90, name: 'Finance Section' },
    { path: 'security/README.md', maxAgeDays: 90, name: 'Security Section' },
    { path: 'product/README.md', maxAgeDays: 90, name: 'Product Section' },
    { path: 'hr/README.md', maxAgeDays: 90, name: 'HR Section' },
];
function checkReadiness() {
    console.log('Starting Diligence Readiness Sweep...');
    console.log(`Checking root: ${DILIGENCE_ROOT}`);
    let errors = 0;
    let warnings = 0;
    if (!fs_1.default.existsSync(DILIGENCE_ROOT)) {
        console.error(`ERROR: Diligence root directory not found at ${DILIGENCE_ROOT}`);
        process.exit(1);
    }
    const now = new Date();
    EXPECTED_ARTIFACTS.forEach((artifact) => {
        const filePath = path_1.default.join(DILIGENCE_ROOT, artifact.path);
        if (!fs_1.default.existsSync(filePath)) {
            console.error(`[MISSING] ${artifact.name} is missing at ${artifact.path}`);
            errors++;
        }
        else {
            const stats = fs_1.default.statSync(filePath);
            const mtime = new Date(stats.mtime);
            const ageInDays = (now.getTime() - mtime.getTime()) / (1000 * 3600 * 24);
            if (ageInDays > artifact.maxAgeDays) {
                console.warn(`[STALE] ${artifact.name} is ${Math.floor(ageInDays)} days old (Max: ${artifact.maxAgeDays} days)`);
                warnings++;
            }
            else {
                console.log(`[OK] ${artifact.name} is current (${Math.floor(ageInDays)} days old)`);
            }
        }
    });
    console.log('\n--- Summary ---');
    console.log(`Missing Artifacts: ${errors}`);
    console.log(`Stale Artifacts: ${warnings}`);
    if (errors > 0) {
        console.log('\nFAILED: Critical diligence artifacts are missing.');
        process.exit(1);
    }
    else if (warnings > 0) {
        console.log('\nWARNING: Some artifacts are stale. Please update them.');
        // Don't fail the build on warnings, just notify
        process.exit(0);
    }
    else {
        console.log('\nSUCCESS: Diligence room is ready.');
        process.exit(0);
    }
}
checkReadiness();
