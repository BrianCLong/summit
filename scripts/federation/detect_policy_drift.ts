import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { simpleGit } from 'simple-git';
import { glob } from 'glob';

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
  const git = simpleGit();
  await git.clone(centralRepo, centralRepoPath);

  // Get the hashes of the central policies
  const centralPoliciesPath = resolve(centralRepoPath, 'policies');
  const centralHashes = await getPolicyHashes(centralPoliciesPath);

  // Get the hashes of the target policies
  const targetPoliciesPath = resolve(targetRepo, 'policies');
  const targetHashes = await getPolicyHashes(targetPoliciesPath);

  // Compare the hashes
  const drift = [];
  for (const path in centralHashes) {
    if (targetHashes[path] !== centralHashes[path]) {
      drift.push(path);
    }
  }

  // Write the drift report
  const date = new Date().toISOString().split('T')[0];
  const reportDir = resolve(__dirname, `../../artifacts/federation/policy-drift/${date}`);
  mkdirSync(reportDir, { recursive: true });
  const report = {
    [targetRepo]: {
      drift,
    },
  };
  writeFileSync(resolve(reportDir, 'report.json'), JSON.stringify(report, null, 2));

  // Clean up
  await git.raw(['rm', '-rf', centralRepoPath]);
}

/**
 * Gets the hashes of all policy files in a directory.
 * @param path The path to the directory.
 * @returns A map of file paths to their hashes.
 */
async function getPolicyHashes(path: string): Promise<{ [path: string]: string }> {
  const hashes: { [path: string]: string } = {};
  const files = await glob(`${path}/**/*`, { nodir: true });
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
      console.log('Policy drift detection complete.');
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  })();
}
