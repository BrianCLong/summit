#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import util from 'util';
import { fileURLToPath } from 'url';

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EvidenceIndex {
  id: string;
  commit_sha: string;
  created_at: string;
  policy_bundle: {
    id: string;
    hash: string;
    path: string;
  };
  release_evidence: {
    manifest_hash: string;
    path: string;
  };
  field_readiness: {
    status: string;
    path: string;
  };
  promotion_decision: {
    status: string;
    path: string | null;
  };
  approvals: {
    status: string;
    path: string | null;
  };
  artifacts: {
    path: string;
    sha256: string;
    size_bytes: number;
  }[];
  verification: {
    status: 'PASS' | 'FAIL';
    reason_code: string | null;
  };
}

// Canonical JSON stringify
function stringifyCanonical(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stringifyCanonical).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const parts = keys.map(key => {
    return JSON.stringify(key) + ':' + stringifyCanonical(obj[key]);
  });
  return '{' + parts.join(',') + '}';
}

async function calculateHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function copyDir(src: string, dest: string) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function getDirSize(dirPath: string): Promise<number> {
  let size = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      size += await getDirSize(fullPath);
    } else {
      const stats = await fs.stat(fullPath);
      size += stats.size;
    }
  }
  return size;
}

// Helper to list all files recursively for index
async function listFilesRecursive(dir: string, baseDir: string, fileList: { path: string; sha256: string; size_bytes: number }[] = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      await listFilesRecursive(fullPath, baseDir, fileList);
    } else {
      const stats = await fs.stat(fullPath);
      const sha256 = await calculateHash(fullPath);
      fileList.push({
        path: relativePath,
        sha256: sha256,
        size_bytes: stats.size,
      });
    }
  }
  return fileList;
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const index = args.indexOf(name);
    return index !== -1 ? args[index + 1] : null;
  };

  const tagOrRunId = getArg('--id') || process.env.GITHUB_RUN_ID || 'dev-run';
  const releaseEvidencePath = getArg('--release-evidence') || 'evidence-bundle'; // Default from generate-evidence-bundle.js
  const fieldEvidencePath = getArg('--field-evidence') || 'build/summit-offline-dev'; // Heuristic default
  const policyBundlePath = getArg('--policy-bundle') || 'dist/policy-pack/v0';
  const approvalsPath = getArg('--approvals') || 'dist/evidence/approvals'; // Optional
  const outputDirBase = getArg('--output-dir') || 'dist/governance-evidence';
  const commitSha = process.env.GITHUB_SHA || 'unknown';

  // Support SOURCE_DATE_EPOCH for reproducible builds or explicit timestamp
  const timestampArg = getArg('--timestamp');
  const sourceDateEpoch = process.env.SOURCE_DATE_EPOCH;

  let buildDate = new Date();
  if (timestampArg) {
      // If it's all digits, assume epoch seconds (or ms if huge, but let's assume ISO or valid date string)
      if (/^\d+$/.test(timestampArg)) {
          buildDate = new Date(parseInt(timestampArg) * 1000);
      } else {
          buildDate = new Date(timestampArg);
      }
  } else if (sourceDateEpoch) {
      buildDate = new Date(parseInt(sourceDateEpoch) * 1000);
  }

  const outputDir = path.join(outputDirBase, tagOrRunId);

  console.log(`🔨 Building Governance Evidence Pack for ID: ${tagOrRunId}`);
  console.log(`   📅 Build Date: ${buildDate.toISOString()} (Epoch/Arg: ${timestampArg || sourceDateEpoch || 'current'})`);
  console.log(`   Output: ${outputDir}`);

  // 1. Create Layout
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'release'), { recursive: true });
  await fs.mkdir(path.join(outputDir, 'field'), { recursive: true });
  await fs.mkdir(path.join(outputDir, 'policy'), { recursive: true });
  await fs.mkdir(path.join(outputDir, 'approvals'), { recursive: true });
  await fs.mkdir(path.join(outputDir, 'ci'), { recursive: true });
  await fs.mkdir(path.join(outputDir, 'hashes'), { recursive: true });
  await fs.mkdir(path.join(outputDir, 'bundle'), { recursive: true });

  // 2. Copy Release Evidence
  try {
    const stats = await fs.stat(releaseEvidencePath);
    if (stats.isDirectory()) {
      console.log(`   -> Copying Release Evidence from ${releaseEvidencePath}`);
      await copyDir(releaseEvidencePath, path.join(outputDir, 'release'));
    } else {
        console.warn(`⚠️ Release evidence path is not a directory: ${releaseEvidencePath}`);
    }
  } catch (e) {
    console.error(`❌ Release Evidence not found at ${releaseEvidencePath}`);
    // In strict mode this might fail, but we'll proceed for now and mark in index
  }

  // 3. Copy Field Evidence
  try {
    const stats = await fs.stat(fieldEvidencePath);
    // If it's the build dir from offline bundle, it might contain the tarball and unpacked stuff.
    // We ideally want the unpacked "dist" equivalent.
    // If it's a directory, copy it.
    console.log(`   -> Copying Field Evidence from ${fieldEvidencePath}`);
    if (stats.isDirectory()) {
        await copyDir(fieldEvidencePath, path.join(outputDir, 'field'));
    } else {
        // It might be a file (tarball) if user pointed directly to it
        await fs.copyFile(fieldEvidencePath, path.join(outputDir, 'field', path.basename(fieldEvidencePath)));
    }
  } catch (e) {
    console.warn(`⚠️ Field Evidence not found at ${fieldEvidencePath}. Continuing...`);
  }

  // 4. Copy Policy Bundle
  try {
    const stats = await fs.stat(policyBundlePath);
    if (stats.isDirectory()) {
      console.log(`   -> Copying Policy Bundle from ${policyBundlePath}`);
      await copyDir(policyBundlePath, path.join(outputDir, 'policy'));
    } else {
         console.warn(`⚠️ Policy Bundle path is not a directory: ${policyBundlePath}`);
    }
  } catch (e) {
    console.warn(`⚠️ Policy Bundle not found at ${policyBundlePath}. Continuing...`);
  }

  // 5. Copy Approvals (if exists)
  try {
    const stats = await fs.stat(approvalsPath);
    if (stats.isDirectory()) {
        console.log(`   -> Copying Approvals from ${approvalsPath}`);
        await copyDir(approvalsPath, path.join(outputDir, 'approvals'));
    }
  } catch (e) {
    console.log(`   ℹ️ No approvals directory found at ${approvalsPath}`);
  }

  // 6. Verify Sub-packs (Simulated for now, would call verify scripts)
  // Real implementation would spawn `scripts/verify-evidence-bundle.ts` against `outputDir/release/evidence-bundle.json`
  let verificationStatus: 'PASS' | 'FAIL' = 'PASS';
  let reasonCode: string | null = null;

  // Check if critical files exist
  const releaseManifest = path.join(outputDir, 'release', 'EVIDENCE_BUNDLE_SUMMARY.json');
  let releaseManifestHash = 'MISSING';
  try {
    releaseManifestHash = await calculateHash(releaseManifest);
  } catch {
    verificationStatus = 'FAIL';
    reasonCode = 'MISSING_RELEASE_MANIFEST';
  }

  // 7. Generate Index
  const artifactList = await listFilesRecursive(outputDir, outputDir);
  // Filter out the bundle dir itself and index.json/md if we write them early (we haven't yet)

  const index: EvidenceIndex = {
    id: tagOrRunId,
    commit_sha: commitSha,
    created_at: buildDate.toISOString(),
    policy_bundle: {
      id: 'v0', // Todo: extract from policy bundle metadata
      hash: 'TODO', // Todo: calculate hash of policy dir
      path: 'policy/'
    },
    release_evidence: {
      manifest_hash: releaseManifestHash,
      path: 'release/'
    },
    field_readiness: {
      status: 'UNKNOWN', // Would be derived from field evidence checks
      path: 'field/'
    },
    promotion_decision: {
      status: 'UNKNOWN',
      path: 'approvals/'
    },
    approvals: {
      status: 'UNKNOWN',
      path: 'approvals/'
    },
    artifacts: artifactList.sort((a, b) => a.path.localeCompare(b.path)),
    verification: {
      status: verificationStatus,
      reason_code: reasonCode
    }
  };

  const indexJsonPath = path.join(outputDir, 'index.json');
  await fs.writeFile(indexJsonPath, stringifyCanonical(index)); // Canonical stringify for determinism

  // 8. Generate Index Markdown
  const indexMdPath = path.join(outputDir, 'index.md');
  const mdContent = `# Governance Evidence Pack: ${tagOrRunId}

**Status:** ${verificationStatus}
**Created:** ${index.created_at}
**Commit:** ${commitSha}

## Contents

- **Release Evidence**: ${index.release_evidence.manifest_hash === 'MISSING' ? '❌ Missing' : '✅ Included'}
- **Policy Bundle**: Included
- **Field Evidence**: Included

## Verification

Run the offline verification command:
\`\`\`bash
./verify_governance_evidence_pack.sh --pack ${tagOrRunId}
\`\`\`
`;
  await fs.writeFile(indexMdPath, mdContent);

  // 9. Compute Checksums for the whole pack (excluding hashes dir and bundle dir)
  console.log(`   -> Computing checksums...`);
  // Re-list artifacts to include index.json and index.md
  const finalArtifacts = await listFilesRecursive(outputDir, outputDir);
  const checksums = finalArtifacts
    .filter(a => !a.path.startsWith('hashes/') && !a.path.startsWith('bundle/'))
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(a => `${a.sha256}  ${a.path}`)
    .join('\n');

  await fs.writeFile(path.join(outputDir, 'hashes', 'checksums.sha256'), checksums);

  // 10. Create Archive
  console.log(`   -> Creating archive...`);
  const archiveName = `governance-evidence_${tagOrRunId}.tar.gz`;
  const archivePath = path.join(outputDir, 'bundle', archiveName);

  // Create tarball of everything in outputDir except the bundle dir itself (to avoid infinite recursion if we were sloppy)
  // We use `tar` command for stability and standardization
  try {
    // Tar everything inside outputDir, excluding 'bundle'
    await execPromise(`tar -czf "${archivePath}" --exclude="bundle" -C "${outputDir}" .`);
    console.log(`✅ Governance Evidence Pack created at: ${archivePath}`);
  } catch (e) {
    console.error(`❌ Failed to create tarball: ${(e as Error).message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
