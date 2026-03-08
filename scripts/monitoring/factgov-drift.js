"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const schema_js_1 = require("../../server/src/graphql/schema.js");
const fs_1 = require("fs");
const path_1 = require("path");
// This script calculates a hash of the current GraphQL schema (including FactGov)
// and compares it against a known "golden" hash to detect drift.
const OUT_DIR = 'scripts/monitoring/out';
const GOLDEN_HASH_FILE = (0, path_1.join)(OUT_DIR, 'factgov-schema.hash');
function calculateHash(str) {
    const content = typeof str === 'string' ? str : JSON.stringify(str);
    return (0, crypto_1.createHash)('sha256').update(content).digest('hex');
}
async function run() {
    // Ensure output directory exists
    if (!(0, fs_1.existsSync)(OUT_DIR)) {
        (0, fs_1.mkdirSync)(OUT_DIR, { recursive: true });
    }
    // typeDefs can be a string or an array of strings/DocumentNodes
    // We normalize to a single string for hashing
    const schemaString = Array.isArray(schema_js_1.typeDefs)
        ? schema_js_1.typeDefs.map(d => {
            if (typeof d === 'string')
                return d;
            if (d && d.loc && d.loc.source)
                return d.loc.source.body;
            return JSON.stringify(d);
        }).join('\n')
        : schema_js_1.typeDefs;
    const currentHash = calculateHash(schemaString);
    console.log(`Current Schema Hash: ${currentHash}`);
    const update = process.argv.includes('--update');
    if (update) {
        (0, fs_1.writeFileSync)(GOLDEN_HASH_FILE, currentHash);
        console.log(`Updated golden hash at ${GOLDEN_HASH_FILE}`);
    }
    else {
        if ((0, fs_1.existsSync)(GOLDEN_HASH_FILE)) {
            const expectedHash = (0, fs_1.readFileSync)(GOLDEN_HASH_FILE, 'utf-8').trim();
            if (currentHash !== expectedHash) {
                console.error(`DRIFT DETECTED! Expected ${expectedHash}, got ${currentHash}`);
                console.error(`Run with --update to accept the new schema state.`);
                process.exit(1);
            }
            else {
                console.log('No drift detected. Schema matches golden hash.');
            }
        }
        else {
            console.warn('No golden hash found. Run with --update to set baseline.');
            // Fail by default if no baseline, to ensure we don't silently pass
            if (!process.env.CI) {
                (0, fs_1.writeFileSync)(GOLDEN_HASH_FILE, currentHash);
                console.log('Created initial golden hash (local dev).');
            }
            else {
                console.error('CI failure: Golden hash missing.');
                process.exit(1);
            }
        }
    }
}
run().catch(err => {
    console.error(err);
    process.exit(1);
});
