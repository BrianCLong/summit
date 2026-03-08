"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPolicyDrift = detectPolicyDrift;
const fs_1 = require("fs");
const path_1 = require("path");
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
/**
 * Detects policy drift between a target repository and the central repository.
 * @param centralRepo The URL of the central repository.
 * @param targetRepo The path to the target repository.
 * @param centralRepoPath The path to clone the central repository to.
 */
async function detectPolicyDrift(centralRepo = 'https://github.com/BrianCLong/summit.git', targetRepo = '.', centralRepoPath = '/tmp/summit') {
    // Clone the central repository
    (0, child_process_1.execSync)(`git clone ${centralRepo} ${centralRepoPath}`);
    // Get the hashes of the central policies
    const centralPoliciesPath = (0, path_1.resolve)(centralRepoPath, 'policies');
    const centralHashes = getPolicyHashes(centralPoliciesPath);
    // Get the hashes of the target policies
    const targetPoliciesPath = (0, path_1.resolve)(targetRepo, 'policies');
    const targetHashes = getPolicyHashes(targetPoliciesPath);
    // Compare the hashes
    const drift = [];
    for (const path in centralHashes) {
        if (targetHashes[path] !== centralHashes[path]) {
            drift.push(path);
        }
    }
    // Report the drift
    if (drift.length > 0) {
        console.log('Policy drift detected:');
        for (const path of drift) {
            console.log(`- ${path}`);
        }
    }
    else {
        console.log('No policy drift detected.');
    }
    // Clean up
    (0, child_process_1.execSync)(`rm -rf ${centralRepoPath}`);
}
/**
 * Gets the hashes of all policy files in a directory.
 * @param path The path to the directory.
 * @returns A map of file paths to their hashes.
 */
function getPolicyHashes(path) {
    const hashes = {};
    const files = (0, child_process_1.execSync)(`find ${path} -type f`).toString().trim().split('\n');
    for (const file of files) {
        const content = (0, fs_1.readFileSync)(file, 'utf-8');
        const hash = (0, crypto_1.createHash)('sha256').update(content).digest('hex');
        hashes[file.replace(path, '')] = hash;
    }
    return hashes;
}
// Example usage:
if (require.main === module) {
    (async () => {
        try {
            await detectPolicyDrift();
        }
        catch (error) {
            console.error(error.message);
            process.exit(1);
        }
    })();
}
