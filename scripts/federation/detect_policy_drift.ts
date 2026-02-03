import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

/**
 * Detects policy drift between a target repository and the central repository.
 * @param centralRepo The URL of the central repository.
 * @param targetRepo The path to the target repository.
 * @param centralRepoPath The path to clone the central repository to.
 */
export async function detectPolicyDrift(
  centralRepo = 'https://github.com/BrianCLong/summit.git',
  targetRepo = '.',
  centralRepoPath = '/tmp/summit'
): Promise<void> {
  // Clone the central repository
  execSync(`git clone ${centralRepo} ${centralRepoPath}`);

  // Get the hashes of the central policies
  const centralPoliciesPath = resolve(centralRepoPath, 'policies');
  const centralHashes = getPolicyHashes(centralPoliciesPath);

  // Get the hashes of the target policies
  const targetPoliciesPath = resolve(targetRepo, 'policies');
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
  } else {
    console.log('No policy drift detected.');
  }

  // Clean up
  execSync(`rm -rf ${centralRepoPath}`);
}

/**
 * Gets the hashes of all policy files in a directory.
 * @param path The path to the directory.
 * @returns A map of file paths to their hashes.
 */
function getPolicyHashes(path: string): { [path: string]: string } {
  const hashes: { [path: string]: string } = {};
  const files = execSync(`find ${path} -type f`).toString().trim().split('\n');
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const hash = createHash('sha256').update(content).digest('hex');
    hashes[file.replace(path, '')] = hash;
  }
  return hashes;
}

// Example usage:
if (require.main === module) {
  (async () => {
    try {
      await detectPolicyDrift();
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  })();
}
