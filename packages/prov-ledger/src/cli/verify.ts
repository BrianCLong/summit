#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  type ManifestSignature,
  type ProvenanceManifest,
  verifyManifestSignature,
} from '../index.js';

function readManifest(bundleDir: string): ProvenanceManifest {
  const manifestPath = join(bundleDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`manifest.json not found in ${bundleDir}`);
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as ProvenanceManifest;
}

function readSignature(bundleDir: string): ManifestSignature {
  const signaturePath = join(bundleDir, 'manifest.sig');
  if (!existsSync(signaturePath)) {
    throw new Error(`manifest.sig not found in ${bundleDir}`);
  }
  return JSON.parse(readFileSync(signaturePath, 'utf8')) as ManifestSignature;
}

function usage(): never {
  console.error('Usage: prov-verify <bundle-dir> <public-key-file>');
  process.exit(1);
}

function main(): void {
  const [bundleDir, publicKeyFile] = process.argv.slice(2);
  if (!bundleDir || !publicKeyFile) {
    usage();
  }

  try {
    const manifest = readManifest(bundleDir);
    const signature = readSignature(bundleDir);
    const publicKey = readFileSync(publicKeyFile);
    const verified = verifyManifestSignature(manifest, signature, publicKey);
    if (!verified) {
      console.error('❌ Verification failed – signature mismatch');
      process.exit(2);
    }

    console.log('✅ Provenance bundle verified successfully');
  } catch (error) {
    console.error(
      '❌ Verification failed:',
      error instanceof Error ? error.message : error,
    );
    process.exit(2);
  }
}

main();
