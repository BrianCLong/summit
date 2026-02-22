import fs from 'fs';
import crypto from 'crypto';
import { execSync } from 'child_process';

const sbomFile = 'sbom.json';
const manifestFile = 'sbom.manifest.json';

const getFileHash = (file: string) => {
  if (!fs.existsSync(file)) return 'MISSING';
  const content = fs.readFileSync(file);
  return crypto.createHash('sha256').update(content).digest('hex');
};

const getToolVersion = (cmd: string) => {
  try {
    return execSync(cmd).toString().trim();
  } catch (e) {
    return 'UNKNOWN';
  }
};

const generateManifest = () => {
  const manifest = {
    repository: process.env.GITHUB_REPOSITORY || 'unknown',
    commit: process.env.GITHUB_SHA || 'unknown',
    workflow: process.env.GITHUB_WORKFLOW || 'unknown',
    runner_os: process.env.RUNNER_OS || 'unknown',
    tools: {
      syft: 'managed-by-action', // Can't easily get syft version from inside the action step unless we run it
      sbom_action_ref: '62ad5284b8ced813296287a0b63906cb364b73ee', // Hardcoded to match workflow
    },
    artifacts: {
      [sbomFile]: getFileHash(sbomFile),
    },
    // No timestamps for determinism
  };

  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  console.log(`Manifest generated at ${manifestFile}`);
};

generateManifest();
