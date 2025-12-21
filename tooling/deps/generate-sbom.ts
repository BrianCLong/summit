#!/usr/bin/env -S npx tsx

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import process from 'process';

// Optimized SBOM generator using pnpm-lock.yaml
// Avoids pnpm list --depth=Infinity OOM issues.

const OUTPUT_PATH = process.argv[2] || 'sbom.json';
const LOCKFILE_PATH = path.join(process.cwd(), 'pnpm-lock.yaml');

function generateSerialNumber() {
  return 'urn:uuid:' + require('crypto').randomUUID();
}

function parseLockfile() {
  if (!fs.existsSync(LOCKFILE_PATH)) {
    console.error(`Lockfile not found at ${LOCKFILE_PATH}`);
    process.exit(1);
  }
  try {
    return yaml.load(fs.readFileSync(LOCKFILE_PATH, 'utf-8'));
  } catch (e) {
    console.error('Error parsing lockfile:', e);
    process.exit(1);
  }
}

function normalizePackageName(key: string): { name: string, version: string } {
  // Key format in pnpm lockfile: /name@version or /@scope/name@version
  // Sometimes it has peers suffix like (...).

  // Remove peer dependency suffix e.g. _@babel+core@7.0.0
  const cleanKey = key.split('_')[0];

  // Extract version (last part after @)
  const lastAt = cleanKey.lastIndexOf('@');
  if (lastAt <= 0) return { name: cleanKey, version: 'unknown' };

  const name = cleanKey.substring(cleanKey.startsWith('/') ? 1 : 0, lastAt);
  const version = cleanKey.substring(lastAt + 1);

  return { name, version };
}

function generateSbom() {
  console.log('Parsing pnpm-lock.yaml...');
  const lockfile: any = parseLockfile();
  const components = new Map<string, any>();

  const packages = lockfile.packages || {};

  for (const [key, pkg] of Object.entries(packages)) {
    const { name, version } = normalizePackageName(key);

    // Check for "resolution" to get integrity/etc if needed
    // const resolution = (pkg as any).resolution;

    // We try to find license if possible, but lockfile doesn't always have it.
    // We can lookup package.json in node_modules/.pnpm/... if we really want licenses,
    // but that is slow and complex.
    // For now, we generate basic inventory.

    const component = {
      type: 'library',
      name: name,
      version: version,
      purl: `pkg:npm/${name}@${version}`
    };

    // Deduplicate by purl/id
    const id = `${name}@${version}`;
    if (!components.has(id)) {
        components.set(id, component);
    }
  }

  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    serialNumber: generateSerialNumber(),
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tool: {
        vendor: 'IntelGraph',
        name: 'generate-sbom',
        version: '1.0.0'
      },
      component: {
        type: 'application',
        name: 'intelgraph-platform',
        version: '1.0.0'
      }
    },
    components: Array.from(components.values())
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sbom, null, 2));
  console.log(`SBOM generated at ${OUTPUT_PATH} with ${components.size} components.`);
}

generateSbom();
