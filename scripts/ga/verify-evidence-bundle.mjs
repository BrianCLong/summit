#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { accessSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const options = {
  dir: { type: 'string', default: 'release-artifacts' },
  checksums: { type: 'string', default: 'checksums.txt' },
};

const requiredFiles = ['sbom.json', 'provenance.json'];

function ensureReadable(filePath, errors) {
  try {
    accessSync(filePath);
    return true;
  } catch (error) {
    errors.push(`Missing required file: ${path.basename(filePath)}`);
    return false;
  }
}

function parseJson(filePath, label, errors) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`Invalid JSON in ${label}: ${error.message}`);
    return null;
  }
}

function sha256For(filePath) {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function parseChecksums(filePath, errors) {
  if (!ensureReadable(filePath, errors)) {
    return new Map();
  }

  const entries = new Map();
  const lines = readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    const match = line.trim().match(/^([a-f0-9]{64})\s+(.+)$/i);
    if (!match) {
      errors.push(`Invalid checksum line: ${line}`);
      continue;
    }
    const [, hash, filename] = match;
    entries.set(filename.trim(), hash.toLowerCase());
  }
  return entries;
}

function validateSbom(sbom, errors) {
  if (!sbom) return;
  if (sbom.bomFormat !== 'CycloneDX') {
    errors.push('SBOM bomFormat must be CycloneDX.');
  }
  if (!sbom.specVersion) {
    errors.push('SBOM specVersion is required.');
  }
  if (!sbom.metadata?.component?.name) {
    errors.push('SBOM metadata.component.name is required.');
  }
}

function validateProvenance(provenance, errors) {
  if (!provenance) return;
  if (!provenance._type) {
    errors.push('Provenance _type is required.');
  }
  if (!provenance.predicateType) {
    errors.push('Provenance predicateType is required.');
  }
  if (!Array.isArray(provenance.subject) || provenance.subject.length === 0) {
    errors.push('Provenance subject must include at least one entry.');
  }
}

function verifyChecksums(bundleDir, checksums, errors) {
  for (const fileName of requiredFiles) {
    const filePath = path.join(bundleDir, fileName);
    if (!ensureReadable(filePath, errors)) {
      continue;
    }
    const expected = checksums.get(fileName);
    if (!expected) {
      errors.push(`Missing checksum entry for ${fileName}.`);
      continue;
    }
    const actual = sha256For(filePath);
    if (actual !== expected) {
      errors.push(`Checksum mismatch for ${fileName}. Expected ${expected}, got ${actual}.`);
    }
  }
}

export function verifyEvidenceBundle({ dir, checksumsFile }) {
  const errors = [];
  const bundleDir = path.resolve(dir);
  const checksumsPath = path.join(bundleDir, checksumsFile);

  if (!ensureReadable(bundleDir, errors)) {
    errors.push(`Evidence bundle directory not found: ${bundleDir}`);
    return { success: false, errors };
  }

  const checksums = parseChecksums(checksumsPath, errors);
  const sbomPath = path.join(bundleDir, 'sbom.json');
  const provenancePath = path.join(bundleDir, 'provenance.json');

  const sbom = ensureReadable(sbomPath, errors)
    ? parseJson(sbomPath, 'sbom.json', errors)
    : null;
  const provenance = ensureReadable(provenancePath, errors)
    ? parseJson(provenancePath, 'provenance.json', errors)
    : null;

  validateSbom(sbom, errors);
  validateProvenance(provenance, errors);
  verifyChecksums(bundleDir, checksums, errors);

  return { success: errors.length === 0, errors };
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const { values } = parseArgs({ options, strict: false });
  const resolvedDir = path.resolve(values.dir);
  const result = verifyEvidenceBundle({
    dir: resolvedDir,
    checksumsFile: values.checksums,
  });
  if (!result.success) {
    console.error('Evidence bundle verification failed:');
    result.errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`Evidence bundle verified at ${resolvedDir}.`);
}
