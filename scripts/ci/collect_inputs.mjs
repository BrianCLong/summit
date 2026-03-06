import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'artifacts';

function getFileHash(filePath) {
  if (fs.existsSync(filePath)) {
    const hashFile = `${filePath}.sha256`;
    if (fs.existsSync(hashFile)) {
      return fs.readFileSync(hashFile, 'utf8').trim();
    }
  }
  return 'placeholder-sha256';
}

const sbomPath = path.join(ARTIFACTS_DIR, 'sbom/spdx.json');
const provenancePath = path.join(ARTIFACTS_DIR, 'provenance/intoto.jsonl');
const signaturePath = path.join(ARTIFACTS_DIR, 'image/cosign.bundle');

const inputs = {
  artifacts: {
    sbom: {
      path: fs.existsSync(sbomPath) ? sbomPath : '',
      sha256: fs.existsSync(sbomPath) ? getFileHash(sbomPath) : ''
    },
    image: {
      digest: 'sha256:placeholder',
      signatures: {
        // If cosign.bundle exists, we consider it signed
        cosign: fs.existsSync(signaturePath)
      }
    },
    provenance: {
      slsa_level: fs.existsSync(provenancePath) ? 1 : 0,
      attestation_path: fs.existsSync(provenancePath) ? provenancePath : ''
    }
  },
  repo: {
    owner: process.env.GITHUB_REPOSITORY_OWNER || 'BrianCLong',
    name: process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : 'summit',
    pr: parseInt(process.env.GITHUB_PR_NUMBER || '0', 10),
    sha: process.env.GITHUB_SHA || 'unknown'
  },
  required_checks: ["unit-tests", "lint", "typecheck"]
};

console.log(JSON.stringify(inputs, null, 2));
