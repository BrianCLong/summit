import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || 'artifacts';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

function getCommitSha() {
  return process.env.GITHUB_SHA || execSync('git rev-parse HEAD').toString().trim();
}

function getBranch() {
  return process.env.GITHUB_REF_NAME || execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
}

function getBuildTimestamp() {
  return new Date().toISOString();
}

const manifest = {
  repo: process.env.GITHUB_REPOSITORY || 'BrianCLong/summit',
  commit: getCommitSha(),
  branch: getBranch(),
  buildNumber: process.env.GITHUB_RUN_ID || 'local',
  builtAt: getBuildTimestamp(),
  nodeVersion: process.version,
  pnpmVersion: execSync('pnpm --version').toString().trim(),
  artifacts: [] as any[],
};

// Process arguments for artifacts: name:path:sbom
// Example: node generate-build-manifest.js server:dist/server.js:sbom.json
const args = process.argv.slice(2);

args.forEach(arg => {
  const [name, filePath, sbomPath] = arg.split(':');
  manifest.artifacts.push({
    name,
    path: filePath,
    sbom: sbomPath
  });
});

const manifestPath = path.join(ARTIFACTS_DIR, `build-manifest.${manifest.commit.substring(0, 7)}.json`);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`Build manifest generated at ${manifestPath}`);
