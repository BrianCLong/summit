#!/usr/bin/env node
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import {
  REPO_ROOT,
  loadControlMap,
  resolveEvidenceEntry
} from './lib/control-evidence-utils.mjs';

function parseArgs(argv) {
  const args = {
    evidenceDir: null,
    controlMap: 'compliance/control-map.yaml'
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--evidence-dir') args.evidenceDir = argv[i + 1];
    if (arg === '--control-map') args.controlMap = argv[i + 1];
  }
  return args;
}

async function listFiles(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

async function createStubEvidenceBundle({ evidenceDir, controlMapPath }) {
  const controlMap = await loadControlMap(controlMapPath);
  const evidenceRoot = path.resolve(REPO_ROOT, evidenceDir);
  await fsp.mkdir(evidenceRoot, { recursive: true });

  for (const control of Object.values(controlMap.controls || {})) {
    const evidenceEntries = Array.isArray(control.evidence) ? control.evidence : [];
    for (const entry of evidenceEntries) {
      const resolved = resolveEvidenceEntry(entry);
      if (resolved.artifact_location !== 'bundle') continue;
      const artifactPath = path.join(evidenceRoot, resolved.artifact_path);
      await fsp.mkdir(path.dirname(artifactPath), { recursive: true });
      const stub = {
        stub: true,
        source: resolved.artifact_path,
        generated_at_utc: new Date().toISOString()
      };
      await fsp.writeFile(artifactPath, JSON.stringify(stub, null, 2));
    }
  }

  const meta = {
    sha: process.env.GITHUB_SHA || 'unknown',
    repo: process.env.GITHUB_REPOSITORY || 'unknown',
    generated_at_utc: new Date().toISOString(),
    stub: true
  };
  await fsp.writeFile(path.join(evidenceRoot, 'meta.json'), JSON.stringify(meta, null, 2));

  const files = (await listFiles(evidenceRoot)).filter((file) => {
    return path.basename(file) !== 'checksums.sha256';
  });
  const checksumLines = [];
  for (const file of files) {
    const content = await fsp.readFile(file);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const relative = path.relative(evidenceRoot, file).split(path.sep).join('/');
    checksumLines.push(`${hash}  ${relative}`);
  }
  checksumLines.sort();
  await fsp.writeFile(path.join(evidenceRoot, 'checksums.sha256'), `${checksumLines.join('\n')}\n`);
  return evidenceRoot;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.evidenceDir) {
    console.error('Missing --evidence-dir');
    process.exit(2);
  }
  const controlMapPath = path.resolve(REPO_ROOT, args.controlMap);
  const evidenceRoot = await createStubEvidenceBundle({
    evidenceDir: args.evidenceDir,
    controlMapPath
  });
  console.log(`Stub evidence bundle created at ${evidenceRoot}`);
}

const entryUrl = pathToFileURL(process.argv[1] || '').href;
if (import.meta.url === entryUrl) {
  main().catch((error) => {
    console.error('Failed to create stub evidence bundle:', error.message);
    process.exit(2);
  });
}

export { createStubEvidenceBundle };
