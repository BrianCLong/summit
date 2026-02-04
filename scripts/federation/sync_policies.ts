import { execSync } from 'child_process';
import { resolve } from 'path';

/**
 * Synchronizes policies from the central repository to the current repository by generating a patch file.
 * @param centralRepo The URL of the central repository.
 * @param centralRepoPath The path to clone the central repository to.
 */
export async function syncPolicies(
  centralRepo = 'https://github.com/BrianCLong/summit.git',
  centralRepoPath = '/tmp/summit'
): Promise<void> {
  // Clone the central repository
  execSync(`git clone ${centralRepo} ${centralRepoPath}`);

  // Generate a patch file
  const policiesPath = resolve(centralRepoPath, 'policies');
  const destPath = resolve(__dirname, '../../policies');
  const patchPath = resolve(__dirname, '../../artifacts/federation/policy-sync.patch');
  execSync(`diff -urN ${policiesPath} ${destPath} > ${patchPath} || true`);

  // Clean up
  execSync(`rm -rf ${centralRepoPath}`);
}

// Example usage:
if (require.main === module) {
  (async () => {
    try {
      await syncPolicies();
      console.log('Policy synchronization patch generated successfully.');
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  })();
}
