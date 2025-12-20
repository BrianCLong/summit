import { promises as fs } from 'fs';
import { ProvenanceManifest, VerificationIssue, VerificationResult, VerifyProvenanceOptions } from '../types';
import { manifestCanonicalString } from '../common/manifest';
import { computeClaimHash, computeManifestHash, fingerprintPublicKey, hashFile } from './utils';
import { verifyPayload } from './signature';

async function readManifest(filePath: string): Promise<ProvenanceManifest> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as ProvenanceManifest;
}

function collectIssue(message: string, level: VerificationIssue['level'] = 'error'): VerificationIssue {
  return { message, level };
}

export async function verifyProvenance(options: VerifyProvenanceOptions): Promise<VerificationResult> {
  const manifest = await readManifest(options.manifestPath);
  const payload = manifestCanonicalString(manifest);
  const issues: VerificationIssue[] = [];

  const validSignature = verifyPayload(payload, manifest.signature, options.publicKey, manifest.claim.signer.algorithm);
  if (!validSignature) {
    issues.push(collectIssue('Signature verification failed'));
  }

  const providedFingerprint = fingerprintPublicKey(options.publicKey);
  if (providedFingerprint !== manifest.claim.signer.publicKeyFingerprint) {
    issues.push(collectIssue('Signer fingerprint mismatch with provided public key', 'warning'));
  }

  let validAssetHash = true;
  if (options.assetPath) {
    const assetHash = await hashFile(options.assetPath);
    if (assetHash !== manifest.asset.hash) {
      validAssetHash = false;
      issues.push(collectIssue('Asset hash does not match manifest'));
    }
  } else {
    validAssetHash = false;
    issues.push(collectIssue('Asset path not provided for verification', 'warning'));
  }

  const manifestHash = computeManifestHash(manifest);
  const claimHash = computeClaimHash(manifest);

  let parent: VerificationResult | undefined;
  if (manifest.parent) {
    if (!options.parentManifestPath || !options.parentPublicKey) {
      issues.push(collectIssue('Parent manifest/public key required for chain verification', 'warning'));
    } else {
      parent = await verifyProvenance({
        manifestPath: options.parentManifestPath,
        publicKey: options.parentPublicKey,
        assetPath: options.parentAssetPath,
      });
      const expectedHash = manifest.parent.manifestHash;
      if (parent.manifestHash !== expectedHash) {
        issues.push(collectIssue('Parent manifest hash mismatch'));
      }
      if (manifest.parent.assetHash !== parent.manifest.asset.hash) {
        issues.push(collectIssue('Parent asset hash mismatch'));
      }
      if (manifest.parent.signerId !== parent.manifest.claim.signer.id) {
        issues.push(collectIssue('Parent signer mismatch'));
      }
    }
  }

  return {
    manifest,
    manifestHash,
    claimHash,
    validSignature,
    validAssetHash,
    issues,
    signerId: manifest.claim.signer.id,
    parent,
  };
}
