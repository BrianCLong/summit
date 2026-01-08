
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { BundleManifest } from './types.js';

export interface LoadedBundle {
  manifest: BundleManifest;
  files: Map<string, string>; // path -> content
  verified: boolean;
}

export class BundleLoader {
  private bundlePath: string;
  private publicKeyPath?: string;

  constructor(bundlePath: string, publicKeyPath?: string) {
    this.bundlePath = bundlePath;
    this.publicKeyPath = publicKeyPath;
  }

  async load(): Promise<LoadedBundle> {
    const bundleJsonPath = path.join(this.bundlePath, 'bundle.json');
    const bundleContent = await fs.readFile(bundleJsonPath, 'utf8');
    const manifest: BundleManifest = JSON.parse(bundleContent);

    // Verify Signature if public key is provided or present in bundle
    let verified = false;
    const publicKeyPath = this.publicKeyPath || path.join(this.bundlePath, 'signatures', 'public-key.pem');

    if (await fs.stat(publicKeyPath).catch(() => false)) {
      const publicKey = await fs.readFile(publicKeyPath, 'utf8');
      const signaturePath = path.join(this.bundlePath, 'signatures', 'bundle.sig');

      if (await fs.stat(signaturePath).catch(() => false)) {
        const signature = await fs.readFile(signaturePath, 'utf8');
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(bundleContent);
        verified = verifier.verify(publicKey, signature, 'hex');

        if (!verified) {
          throw new Error('Bundle signature verification failed');
        }
      }
    }

    const files = new Map<string, string>();
    for (const file of manifest.files) {
        // file.path in manifest is relative to bundle root e.g. "policies/foo.rego" or "schemas/bar.json"
        // We must join with bundlePath, not bundlePath/policies
        const filePath = path.join(this.bundlePath, file.path);
        const content = await fs.readFile(filePath, 'utf8');

        // Verify hash on load for strictness
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        if (hash !== file.sha256) {
            throw new Error(`Integrity check failed for ${file.path}`);
        }

        files.set(file.path, content);
    }

    return {
      manifest,
      files,
      verified
    };
  }
}
