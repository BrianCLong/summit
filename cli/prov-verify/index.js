#!/usr/bin/env node

import fs from 'fs';
import crypto from 'crypto';
import { Command } from 'commander';

const program = new Command();

program
  .name('prov-verify')
  .description('Offline verification tool for Provenance & Claim Ledger manifests')
  .version('1.0.0')
  .option('--key <path>', 'Path to public key for signature verification');

function generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function verifySignature(content, signature, publicKeyPath) {
    try {
        if (!fs.existsSync(publicKeyPath)) {
            console.error(`Public key not found at ${publicKeyPath}`);
            return false;
        }
        const publicKey = fs.readFileSync(publicKeyPath, 'utf-8');

        const contentBuffer = Buffer.from(content);
        const signatureBuffer = Buffer.from(signature, 'base64');

        return crypto.verify(null, contentBuffer, publicKey, signatureBuffer);
    } catch (e) {
        // console.error('Signature verification error:', e.message);
        return false;
    }
}

program
  .command('verify')
  .argument('<manifestPath>', 'Path to the manifest JSON file')
  .option('--verbose', 'Show detailed verification steps')
  .action((manifestPath, options) => {
    try {
      if (!fs.existsSync(manifestPath)) {
        console.error(`Error: File not found at ${manifestPath}`);
        process.exit(1);
      }

      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      const parentOptions = program.opts();

      if (options.verbose) {
        console.log(`Verifying manifest version: ${manifest.version}`);
        console.log(`Generated at: ${manifest.generatedAt}`);
      }

      // 1. Verify Hash Chain
      const claims = manifest.claims;
      if (!claims || !Array.isArray(claims)) {
          console.error('Error: Invalid manifest structure (missing claims)');
          process.exit(1);
      }

      const joinedHashes = claims.map((c) => c.hash).join('');
      const computedChain = generateHash(joinedHashes);

      if (computedChain === manifest.hashChain) {
          if (options.verbose) console.log('✅ Hash Chain Verified');
      } else {
          console.error('❌ Hash Chain Mismatch');
          console.error(`Expected: ${manifest.hashChain}`);
          console.error(`Computed: ${computedChain}`);
          process.exit(1);
      }

      // 2. Verify Signature
      if (manifest.signature) {
          if (parentOptions.key) {
              const valid = verifySignature(manifest.hashChain, manifest.signature, parentOptions.key);
              if (valid) {
                  if (options.verbose) console.log('✅ Signature Verified');
              } else {
                  console.error('❌ Signature Invalid');
                  process.exit(1);
              }
          } else {
              console.log('ℹ️  Signature present but no public key provided (--key). Skipping signature check.');
          }
      } else {
          console.log('⚠️  No signature found in manifest');
      }

      console.log('✅ PASS: Manifest Verified Successfully');

    } catch (error) {
      console.error('Error verifying manifest:', error.message);
      process.exit(1);
    }
  });

program.parse();
