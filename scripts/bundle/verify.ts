#!/usr/bin/env ts-node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface HashEntry {
  path: string;
  sha256: string;
}

export interface HashesDocument {
  algorithm: 'sha256';
  files: HashEntry[];
}

export interface SignatureDocument {
  algorithm: string;
  keyId: string;
  target: string;
  signature: string;
  signedAt?: string;
}

export interface VerificationOptions {
  /** Whether a signature.json file must be present. */
  requireSignature?: boolean;
}

export interface VerificationResult {
  ok: boolean;
  errors: string[];
  checkedFiles: string[];
  signatureVerified: boolean;
}

function readJsonFile<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(content) as T;
  } catch (err) {
    throw new Error(`Invalid JSON in ${filePath}: ${(err as Error).message}`);
  }
}

function computeSha256(buffer: Buffer | string): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function validateHashesDocument(doc: HashesDocument): void {
  if (doc.algorithm !== 'sha256') {
    throw new Error(`Unsupported hash algorithm: ${doc.algorithm}`);
  }

  if (!Array.isArray(doc.files) || doc.files.length === 0) {
    throw new Error('hashes.json must include at least one file entry');
  }

  for (const entry of doc.files) {
    if (!entry.path || !entry.sha256) {
      throw new Error('Each hash entry requires path and sha256');
    }
  }
}

function validateSignatureDocument(doc: SignatureDocument): void {
  const requiredFields: (keyof SignatureDocument)[] = ['algorithm', 'keyId', 'target', 'signature'];
  for (const field of requiredFields) {
    if (!doc[field]) {
      throw new Error(`signature.json missing field: ${field}`);
    }
  }
}

function computePlaceholderSignature(targetDigest: string, signature: SignatureDocument): string {
  return crypto
    .createHash('sha256')
    .update(`${signature.algorithm}:${signature.keyId}:${targetDigest}`)
    .digest('base64');
}

export function verifyBundle(bundleDir: string, options: VerificationOptions = {}): VerificationResult {
  const errors: string[] = [];
  const manifestPath = path.join(bundleDir, 'manifest.json');
  const hashesPath = path.join(bundleDir, 'hashes.json');
  const signaturePath = path.join(bundleDir, 'signature.json');
  const checkedFiles: string[] = [];

  try {
    // Ensure manifest exists and is valid JSON. The structure is validated elsewhere; here we just require readability.
    readJsonFile<Record<string, unknown>>(manifestPath);
  } catch (err) {
    errors.push((err as Error).message);
    return { ok: false, errors, checkedFiles, signatureVerified: false };
  }

  let hashes: HashesDocument;
  try {
    hashes = readJsonFile<HashesDocument>(hashesPath);
    validateHashesDocument(hashes);
  } catch (err) {
    errors.push((err as Error).message);
    return { ok: false, errors, checkedFiles, signatureVerified: false };
  }

  for (const entry of hashes.files) {
    const filePath = path.join(bundleDir, entry.path);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing file referenced in hashes.json: ${entry.path}`);
      continue;
    }

    const digest = computeSha256(fs.readFileSync(filePath));
    checkedFiles.push(entry.path);

    if (digest !== entry.sha256) {
      errors.push(`Hash mismatch for ${entry.path}: expected ${entry.sha256}, found ${digest}`);
    }
  }

  let signatureVerified = false;
  if (fs.existsSync(signaturePath)) {
    try {
      const signatureDoc = readJsonFile<SignatureDocument>(signaturePath);
      validateSignatureDocument(signatureDoc);

      if (signatureDoc.target !== 'hashes.json') {
        errors.push(`signature.json target must be "hashes.json" but was "${signatureDoc.target}"`);
      } else {
        const targetDigest = computeSha256(fs.readFileSync(hashesPath));
        const expectedSignature = computePlaceholderSignature(targetDigest, signatureDoc);

        if (expectedSignature !== signatureDoc.signature) {
          errors.push('Signature verification failed: placeholder signature mismatch');
        } else {
          signatureVerified = true;
        }
      }
    } catch (err) {
      errors.push((err as Error).message);
    }
  } else if (options.requireSignature) {
    errors.push('Signature is required but signature.json was not found.');
  }

  return {
    ok: errors.length === 0,
    errors,
    checkedFiles,
    signatureVerified,
  };
}

if (require.main === module) {
  const bundleDir = process.argv[2];
  if (!bundleDir) {
    console.error('Usage: ts-node scripts/bundle/verify.ts <bundle-directory>');
    process.exit(1);
  }

  const result = verifyBundle(bundleDir);
  if (!result.ok) {
    console.error('Bundle verification failed:');
    result.errors.forEach((err) => console.error(`- ${err}`));
    process.exit(1);
  }

  console.log(`Bundle verified. Checked ${result.checkedFiles.length} files.`);
  if (result.signatureVerified) {
    console.log('Signature placeholder verified.');
  }
}
