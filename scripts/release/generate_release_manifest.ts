import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface Artifact {
  name: string;
  type: 'docker-image' | 'binary' | 'archive' | 'other';
  digest: string;
  uri?: string;
}

interface ReleaseManifest {
  schemaVersion: string;
  gitSha: string;
  buildTimestamp: string;
  artifacts: Artifact[];
  sbomReference: {
    uri: string;
    digest?: string;
  };
  evidenceReference: {
    uri: string;
    digest?: string;
  };
  attestation: {
    status: 'enabled' | 'disabled';
    signatures?: {
      artifact: string;
      signatureUri: string;
      keyId?: string;
    }[];
    issueLink?: string;
  };
  promotionHistory?: {
    environment: string;
    timestamp: string;
    actor: string;
    notes?: string;
  }[];
}

function calculateFileDigest(filepath: string): string {
  if (!fs.existsSync(filepath)) return '';
  const fileBuffer = fs.readFileSync(filepath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return 'sha256:' + hashSum.digest('hex');
}

const run = async () => {
  const args = process.argv.slice(2);
  // Simple arg parsing: --sha, --image-digest, --image-uri, --sbom, --evidence, --out

  const getArg = (name: string) => {
    const idx = args.indexOf(name);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const gitSha = getArg('--sha') || process.env.GITHUB_SHA || 'unknown';
  const imageDigest = getArg('--image-digest');
  const imageUri = getArg('--image-uri');
  const sbomPath = getArg('--sbom');
  const evidencePath = getArg('--evidence');
  const outPath = getArg('--out') || 'release/out/release-manifest.json';

  // Create output dir if not exists
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const artifacts: Artifact[] = [];

  if (imageDigest && imageUri) {
    artifacts.push({
      name: 'primary-image',
      type: 'docker-image',
      digest: imageDigest,
      uri: imageUri
    });
  }

  const manifest: ReleaseManifest = {
    schemaVersion: '1.0.0',
    gitSha,
    buildTimestamp: new Date().toISOString(),
    artifacts,
    sbomReference: {
      uri: sbomPath ? path.basename(sbomPath) : 'STUB_SBOM',
      digest: sbomPath ? calculateFileDigest(sbomPath) : undefined
    },
    evidenceReference: {
      uri: evidencePath ? path.basename(evidencePath) : 'STUB_EVIDENCE',
      digest: evidencePath ? calculateFileDigest(evidencePath) : undefined
    },
    attestation: {
      status: 'disabled',
      issueLink: 'https://github.com/BrianCLong/summit/issues/TEST-123'
    }
  };

  // If signing is simulated via env var
  if (process.env.SIGNING_ENABLED === 'true') {
     manifest.attestation.status = 'enabled';
     manifest.attestation.signatures = []; // Would populate with real signatures
  }

  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`Release manifest generated at ${outPath}`);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
