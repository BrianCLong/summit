import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';

console.log('Starting attestation generation...');

const options = {
  out: { type: 'string', default: 'attestation.json' },
  sha: { type: 'string' },
  'include-dist': { type: 'boolean', default: false },
};

const MAX_BUFFER = 10 * 1024 * 1024; // 10MB

try {
  const { values, positionals } = parseArgs({ options, allowPositionals: true });

  const GIT_SHA = values.sha || execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const EVIDENCE_ID = `EV_ATTESTATION_V1_${GIT_SHA}`;

  function getTrackedFiles() {
    console.log('Running git ls-files...');
    const output = execSync('git ls-files', { encoding: 'utf8', maxBuffer: MAX_BUFFER });
    return output.split('\n').filter(Boolean).sort();
  }

  function getUntrackedFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    const files = [];
    const walk = (currentDir) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const res = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(res);
        } else {
          files.push(res);
        }
      }
    };
    walk(dir);
    return files.sort();
  }

  async function hashFile(filepath) {
    return new Promise((resolve) => {
      const hash = createHash('sha256');
      const stream = fs.createReadStream(filepath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (e) => {
        console.warn(`Warning: Failed to hash ${filepath}: ${e.message}`);
        resolve(null);
      });
    });
  }

  const normalizedPositionals = positionals.map(p => p.replace(/\/+$/, ''));
  const manifest = [];
  const trackedFiles = getTrackedFiles();
  console.log(`Found ${trackedFiles.length} tracked files.`);

  for (const file of trackedFiles) {
    // Improved relevance matching:
    // 1. Matches exact directory or subpath if positionals provided
    // 2. Always matches package.json and pnpm-lock.yaml anywhere
    const isRelevant = normalizedPositionals.length === 0 ||
                       normalizedPositionals.some(dir => file === dir || file.startsWith(dir + '/')) ||
                       file.endsWith('pnpm-lock.yaml') ||
                       file.endsWith('package.json') ||
                       file.includes('lock');

    if (isRelevant) {
      const digest = await hashFile(file);
      if (digest) {
        manifest.push({
          path: file,
          digest: `sha256:${digest}`
        });
      }
    }
  }

  if (values['include-dist'] && fs.existsSync('dist')) {
    console.log('Including dist/ directory...');
    const distFiles = getUntrackedFiles('dist');
    for (const file of distFiles) {
      const digest = await hashFile(file);
      if (digest) {
        manifest.push({
          path: file,
          digest: `sha256:${digest}`
        });
      }
    }
  }

  manifest.sort((a, b) => a.path.localeCompare(b.path));

  const manifestContent = manifest.map(m => `${m.digest}  ${m.path}`).join('\n');
  const manifestSha256 = createHash('sha256').update(manifestContent).digest('hex');

  const attestation = {
    schema_version: '1.0.0',
    evidence_id: EVIDENCE_ID,
    git_sha: GIT_SHA,
    toolchain: {
      node: process.version,
      pnpm: execSync('pnpm --version', { encoding: 'utf8' }).trim(),
    },
    inputs: {
      manifest_sha256: manifestSha256,
      file_count: manifest.length,
    },
    manifest: manifest
  };

  fs.writeFileSync(values.out, JSON.stringify(attestation, null, 2));
  console.log(`Attestation written to ${values.out}`);
  console.log(`Evidence ID: ${EVIDENCE_ID}`);
  console.log(`Manifest SHA256: ${manifestSha256}`);
} catch (error) {
  console.error('Error generating attestation:', error);
  process.exit(1);
}
