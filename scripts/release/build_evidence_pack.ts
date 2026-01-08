import { program } from 'commander';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { generateSBOM } from '../compliance/generate_sbom';

interface EvidenceManifest {
  version: string;
  metadata: {
    timestamp: string;
    git_sha: string;
    git_tag: string;
    workflow_run_id: string;
    node_version: string;
  };
  files: {
    [filepath: string]: {
      sha256: string;
    };
  };
}

const main = () => {
  program
    .option('--out-dir <dir>', 'Output directory for evidence pack', 'dist/evidence')
    .option('--artifacts-dir <dir>', 'Directory containing build artifacts', 'dist')
    .option('--ci-info-dir <dir>', 'Directory containing CI reports (junit, summaries)', 'ci-reports')
    .option('--tag <tag>', 'Git tag', process.env.GITHUB_REF_NAME || 'unknown')
    .option('--run-id <id>', 'GitHub Run ID', process.env.GITHUB_RUN_ID || 'unknown')
    .option('--sha <sha>', 'Git SHA', process.env.GITHUB_SHA || 'unknown')
    .parse(process.argv);

  const options = program.opts();
  const outDir = path.resolve(options.outDir);
  const artifactsDir = path.resolve(options.artifactsDir);
  const ciInfoDir = path.resolve(options.ciInfoDir);

  console.log(`Building Evidence Pack in ${outDir}...`);
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Generate Build Info
  const buildInfo = {
    tag: options.tag,
    sha: options.sha,
    run_id: options.run_id,
    timestamp: new Date().toISOString(),
    env: {
       node: process.version,
    }
  };
  fs.writeFileSync(path.join(outDir, 'build-info.json'), JSON.stringify(buildInfo, null, 2));

  // 2. Generate SBOM
  const sbomDir = path.join(outDir, 'sbom');
  fs.mkdirSync(sbomDir, { recursive: true });
  try {
     generateSBOM(sbomDir);
  } catch (e) {
     console.error("Failed to generate SBOM:", e);
  }

  // 3. Copy CI Summaries
  const ciDir = path.join(outDir, 'ci');
  fs.mkdirSync(ciDir, { recursive: true });
  if (fs.existsSync(ciInfoDir)) {
      fs.cpSync(ciInfoDir, ciDir, { recursive: true });
  } else {
      console.log(`No CI info dir found at ${ciInfoDir}, creating placeholder.`);
      fs.writeFileSync(path.join(ciDir, 'summary.json'), JSON.stringify({ status: 'placeholder', message: 'Real CI reports would be here in CI environment' }));
  }

  // 4. Check for Attestations (expected to be pre-populated)
  const attestationDir = path.join(outDir, 'attestations');
  if (!fs.existsSync(attestationDir)) {
      console.log("Attestations directory not found, creating empty.");
      fs.mkdirSync(attestationDir, { recursive: true });
  }

  // Ensure trusted-roots.json exists (placeholder if not fetched by workflow)
  const trustedRootPath = path.join(attestationDir, 'trusted-roots.json');
  if (!fs.existsSync(trustedRootPath)) {
      // In a real environment, we might want to fetch this via curl/cosign if possible, or assume the workflow did it.
      // Since we need it for offline verification compliance, we add a placeholder or instructions.
      // GitHub's offline verification guide suggests downloading TUF root.
      const placeholderRoot = {
          note: "Sigstore Trusted Root Placeholder",
          instructions: "To perform full offline verification, replace this file with the Sigstore TUF root (trusted_root.json) obtained via `cosign initialize` or from the Sigstore repository."
      };
      fs.writeFileSync(trustedRootPath, JSON.stringify(placeholderRoot, null, 2));
  }

  // If in local dev (non-CI) and empty, create a placeholder bundle for testing
  if (!process.env.CI) {
       const placeholderBundlePath = path.join(attestationDir, 'placeholder.bundle.json');
       if (!fs.existsSync(placeholderBundlePath)) {
          const placeholderBundle = {
              mediaType: "application/vnd.dev.sigstore.bundle+json;version=0.1",
              dsseEnvelope: {
                  payload: "eyJwcmVkaWNhdGUiOnt9fQ==", // base64 of {"predicate":{}}
                  payloadType: "application/vnd.in-toto+json",
                  signatures: []
              }
          };
          fs.writeFileSync(placeholderBundlePath, JSON.stringify(placeholderBundle, null, 2));
       }
  }

  // 5. Generate Manifest and Checksums
  const manifest: EvidenceManifest = {
    version: '1.0.0',
    metadata: {
      timestamp: new Date().toISOString(),
      git_sha: options.sha,
      git_tag: options.tag,
      workflow_run_id: options.run_id,
      node_version: process.version,
    },
    files: {}
  };

  const allFiles: string[] = [];

  function scanDir(dir: string, base: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
              scanDir(fullPath, base);
          } else {
              // Exclude the manifest and checksums file we are about to write
              if (entry.name === 'manifest.json') return;
              if (entry.name === 'checksums.sha256') return;
              allFiles.push(path.relative(base, fullPath));
          }
      }
  }

  scanDir(outDir, outDir);

  let checksumsContent = '';

  for (const relPath of allFiles) {
      const fullPath = path.join(outDir, relPath);
      const content = fs.readFileSync(fullPath);
      const sha256 = crypto.createHash('sha256').update(content).digest('hex');
      manifest.files[relPath] = { sha256 };
      checksumsContent += `${sha256}  ${relPath}\n`;
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Add manifest to checksums
  const manifestContent = fs.readFileSync(manifestPath);
  const manifestSha = crypto.createHash('sha256').update(manifestContent).digest('hex');
  checksumsContent += `${manifestSha}  manifest.json\n`;

  const signaturesDir = path.join(outDir, 'signatures');
  fs.mkdirSync(signaturesDir, { recursive: true });
  const checksumsPath = path.join(signaturesDir, 'checksums.sha256');
  fs.writeFileSync(checksumsPath, checksumsContent);

  console.log(`Evidence Pack generated at ${outDir}`);
};

main();
