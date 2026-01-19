import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function getDirectoryHashes(dirPath) {
  const results = [];
  if (!fs.existsSync(dirPath)) return results;

  const files = fs.readdirSync(dirPath, { recursive: true });
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isFile()) {
      results.push({
        file: path.relative(dirPath, fullPath).replace(/\\/g, '/'),
        sha256: getFileHash(fullPath)
      });
    }
  }
  return results.sort((a, b) => a.file.localeCompare(b.file));
}

function main() {
  const args = process.argv.slice(2);
  const verifyEvidenceDir = args[args.indexOf('--verify-evidence') + 1];
  const sbomFile = args[args.indexOf('--sbom') + 1];
  const outFile = args[args.indexOf('--out') + 1];

  if (!verifyEvidenceDir || !sbomFile || !outFile) {
    console.error('Usage: node generate_provenance_bundle.mjs --verify-evidence DIR --sbom FILE --out FILE');
    process.exit(1);
  }

  const verifyArtifacts = [];
  if (fs.existsSync(verifyEvidenceDir)) {
    const lanes = fs.readdirSync(verifyEvidenceDir);
    for (const lane of lanes) {
      const lanePath = path.join(verifyEvidenceDir, lane);
      if (fs.statSync(lanePath).isDirectory()) {
        verifyArtifacts.push({
          lane: lane.replace('verify-', ''),
          artifacts: getDirectoryHashes(lanePath)
        });
      }
    }
  }

  const sbomDigest = fs.existsSync(sbomFile) ? getFileHash(sbomFile) : null;
  const rebuildDigest = process.env.GITHUB_SHA || 'local-dev-' + crypto.randomBytes(4).toString('hex');

  let pnpmVersion = 'unknown';
  try {
    pnpmVersion = execSync('pnpm -v').toString().trim();
  } catch (e) {
    // pnpm might not be in path
  }

  const bundle = {
    schemaVersion: '1.0.0',
    repo: process.env.GITHUB_REPOSITORY || 'unknown',
    sha: process.env.GITHUB_SHA || 'unknown',
    toolchain: {
      node: process.version,
      pnpm: pnpmVersion,
    },
    verifyArtifacts: verifyArtifacts.sort((a, b) => a.lane.localeCompare(b.lane)),
    sbom: {
      path: path.basename(sbomFile),
      sha256: sbomDigest
    },
    rebuild: {
      digest: rebuildDigest
    }
  };

  // Deterministic stringify
  const content = JSON.stringify(bundle, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((sorted, k) => {
        sorted[k] = value[k];
        return sorted;
      }, {});
    }
    return value;
  }, 2) + '\n';

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, content);
  console.log(`✅ Provenance bundle written to ${outFile}`);
}

main();
