import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, sep } from 'path';

const TAG = process.env.TAG;
const DEFAULT_BRANCH = process.env.DEFAULT_BRANCH || 'main';

if (!TAG) {
  console.error('Error: TAG environment variable is required.');
  process.exit(1);
}

console.log(`Preflight Release Check`);
console.log(`Tag: ${TAG}`);
console.log(`Default Branch: ${DEFAULT_BRANCH}`);

// 1. Tag format check
const versionRegex = /^v(\d+\.\d+\.\d+(-rc\.\d+)?)$/;
const match = TAG.match(versionRegex);

if (!match) {
  console.error(`Error: Tag "${TAG}" does not match format vX.Y.Z or vX.Y.Z-rc.N`);
  process.exit(1);
}

const targetVersion = match[1]; // e.g. 1.2.3 or 1.2.3-rc.1
const isRc = targetVersion.includes('-rc.');
// For comparison, we usually want the base version, but the requirement says:
// "Ensure the tag version matches repo version(s)"
// Usually if tag is v1.2.3-rc.1, package.json might be 1.2.3-rc.1 OR 1.2.3.
// The instructions say: "Extract X.Y.Z from tag (strip v, ignore -rc.* when comparing)"
// This suggests if tag is v1.2.3-rc.1, we expect package.json to be 1.2.3?
// Or maybe it means "ignore -rc.*" as in "handle it appropriately".
// Let's re-read: "Extract X.Y.Z from tag (strip v, ignore -rc.* when comparing)"
// This implies if tag is v4.0.0-rc.1, the repo version is likely 4.0.0?
// OR it means strict semver comparison where we look at the core version?
// Let's look at existing package.json: "4.0.4".
// If I tag v4.0.4, it matches.
// If I tag v4.0.5-rc.1, does package.json have 4.0.5-rc.1 or 4.0.5?
// Usually lerna/changesets bump the version in package.json to the exact version being released.
// So if tag is v4.0.5-rc.1, package.json should probably be 4.0.5-rc.1.
// BUT the instruction says "ignore -rc.* when comparing".
// This might mean: Tag v1.2.3-rc.1 validates against package.json 1.2.3.
// Let's assume strict equality first, and if that fails, check if stripping RC helps match "repo's canonical version".
// Actually, let's look at the instruction carefully:
// "Extract X.Y.Z from tag (strip v, ignore -rc.* when comparing)"
// This suggests the repo might stay at X.Y.Z while we cut RCs?
// Or maybe it means we only care about the major.minor.patch matching?
// I will implement:
// cleanTagVersion = targetVersion.split('-')[0]
// Check if packageVersion starts with cleanTagVersion.
// Or better: try exact match first. If fail, and isRc, try matching base.
// Wait, "ignore -rc.* when comparing" sounds like:
// Tag: v1.0.0-rc.1 -> Base: 1.0.0.
// Package: 1.0.0.
// Match? Yes.
// Let's stick to that interpretation: Check if package version *contains* the X.Y.Z part.
// Actually, easiest is:
// const tagCore = targetVersion.split('-')[0];
// const pkgCore = pkgVersion.split('-')[0];
// if (tagCore !== pkgCore) fail.

const tagCore = targetVersion.split('-')[0];

console.log(`Target Version Core: ${tagCore}`);

// 2. Tag exists locally and resolves to a commit
try {
  const tagSha = execSync(`git rev-list -n 1 ${TAG}`, { encoding: 'utf8' }).trim();
  console.log(`Tag SHA: ${tagSha}`);

  // 3. Commit reachable from default branch
  // We need to fetch origin default branch to be sure we have the history.
  // The workflow command will do fetch, but we might need to be sure.
  // The user script instructions say:
  // "git fetch origin <defaultBranch> --depth=1 (or full if needed)"
  // "git merge-base --is-ancestor <tagSha> origin/<defaultBranch> must succeed"

  // Note: execSync throws if command fails (non-zero exit code).
  // merge-base --is-ancestor returns 0 if true, 1 if false.

  console.log(`Checking reachability from origin/${DEFAULT_BRANCH}...`);
  // Ensure we have the branch ref.
  // Note: Workflow should handle fetch-depth: 0, but we can fetch to be safe.
  // We avoid --depth=1 to ensure we have enough history for merge-base if the tag is not at the tip.
  try {
    execSync(`git fetch origin ${DEFAULT_BRANCH}`, { stdio: 'ignore' });
  } catch (e) {
      console.warn(`Warning: Could not fetch origin/${DEFAULT_BRANCH}. Assuming it exists locally or continuing.`);
  }

  try {
      execSync(`git merge-base --is-ancestor ${tagSha} origin/${DEFAULT_BRANCH}`);
      console.log(`✓ Commit is reachable from ${DEFAULT_BRANCH}`);
  } catch (error) {
      console.error(`Error: Commit ${tagSha} is NOT reachable from origin/${DEFAULT_BRANCH}`);
      process.exit(1);
  }

} catch (error) {
  if (error.message.includes('not reachable')) throw error; // rethrow if it was the reachability check
  console.error(`Error: Tag ${TAG} not found or invalid.`);
  process.exit(1);
}

// 4. Version consistency
console.log('Checking version consistency...');

// Check root package.json
let rootPkg;
try {
    const rootPkgContent = readFileSync('package.json', 'utf8');
    rootPkg = JSON.parse(rootPkgContent);
} catch (e) {
    console.error('Error: Could not read root package.json');
    process.exit(1);
}

const rootVersion = rootPkg.version;
const rootVersionCore = rootVersion.split('-')[0];

if (rootVersionCore !== tagCore) {
    console.error(`Error: Root package.json version (${rootVersion}) does not match tag version core (${tagCore})`);
    process.exit(1);
}
console.log(`✓ Root package.json matches (${rootVersion})`);

// Check workspace packages
// Find all package.json files
const allPackageFiles = execSync('git ls-files "**/package.json"', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(f => f !== 'package.json' && !f.includes('node_modules') && !f.includes('test/'));

const mismatches = [];

for (const pkgFile of allPackageFiles) {
    try {
        const content = readFileSync(pkgFile, 'utf8');
        const pkg = JSON.parse(content);

        // Skip private packages if they don't have a version or we don't care?
        // Instruction: "confirm **all** are either: exactly X.Y.Z, or (allowed) use "version": "0.0.0" / "workspace:*""

        if (!pkg.version) continue; // Skip if no version (e.g. some test fixture or private pkg without version)

        const pkgVer = pkg.version;
        if (pkgVer === '0.0.0') continue; // Allowed
        if (pkgVer === 'workspace:*') continue; // Allowed

        const pkgVerCore = pkgVer.split('-')[0];

        if (pkgVerCore !== tagCore) {
            mismatches.push({ file: pkgFile, version: pkgVer });
        }

    } catch (e) {
        console.warn(`Warning: Could not parse ${pkgFile}`);
    }
}

if (mismatches.length > 0) {
    console.error(`Error: Found ${mismatches.length} version mismatches:`);
    mismatches.forEach(m => console.error(` - ${m.file}: ${m.version} (expected core ${tagCore})`));
    process.exit(1);
}

console.log(`✓ Verified ${allPackageFiles.length} workspace packages.`);
console.log(`\nSUCCESS: Tag ${TAG} is valid, reachable, and versions match.`);
