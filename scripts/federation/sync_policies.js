"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncPolicies = syncPolicies;
const child_process_1 = require("child_process");
const path_1 = require("path");
/**
 * Synchronizes policies from the central repository to the current repository by generating a patch file.
 * @param centralRepo The URL of the central repository.
 * @param centralRepoPath The path to clone the central repository to.
 */
async function syncPolicies(centralRepo = 'https://github.com/BrianCLong/summit.git', centralRepoPath = '/tmp/summit') {
    // Clone the central repository
    (0, child_process_1.execSync)(`git clone ${centralRepo} ${centralRepoPath}`);
    // Generate a patch file
    const policiesPath = (0, path_1.resolve)(centralRepoPath, 'policies');
    const destPath = (0, path_1.resolve)(__dirname, '../../policies');
    const patchPath = (0, path_1.resolve)(__dirname, '../../artifacts/federation/policy-sync.patch');
    (0, child_process_1.execSync)(`diff -urN ${policiesPath} ${destPath} > ${patchPath} || true`);
    // Clean up
    (0, child_process_1.execSync)(`rm -rf ${centralRepoPath}`);
}
// Example usage:
if (require.main === module) {
    (async () => {
        try {
            await syncPolicies();
            console.log('Policy synchronization patch generated successfully.');
        }
        catch (error) {
            console.error(error.message);
            process.exit(1);
        }
    })();
}
