import { promises as fs } from 'fs';
import path from 'path';
import {
  ClaimMetadata,
  DerivativeStampOptions,
  ProvenanceManifest,
  StampAssetOptions,
  ToolChainEntry,
} from '../types';
import { manifestCanonicalString } from '../common/manifest';
import {
  computeManifestHash,
  defaultManifestPath,
  determineMime,
  ensureDirectory,
  fingerprintPublicKey,
  hashFile,
} from './utils';
import { signPayload } from './signature';
import { verifyProvenance } from './verify';

function sanitizeToolChain(toolChain: ToolChainEntry[]): ToolChainEntry[] {
  return toolChain.map((entry) => ({
    name: entry.name,
    version: entry.version,
    parameters: entry.parameters && Object.fromEntries(Object.entries(entry.parameters).sort()),
  }));
}

function buildClaimMetadata(metadata: ClaimMetadata): ClaimMetadata {
  return {
    toolChain: sanitizeToolChain(metadata.toolChain),
    datasetLineageId: metadata.datasetLineageId,
    policyHash: metadata.policyHash,
    notes: metadata.notes,
  };
}

export async function stampAsset(options: StampAssetOptions): Promise<{ manifestPath: string; manifest: ProvenanceManifest }>
{
  const assetHash = await hashFile(options.assetPath);
  const mimeType = determineMime(options.assetPath, options.signer.mimeType);
  const fingerprint = fingerprintPublicKey(options.signer.publicKey);
  const claimMetadata = buildClaimMetadata(options.metadata);
  const timestamp = new Date().toISOString();

  const manifest: ProvenanceManifest = {
    version: '1.0',
    asset: {
      name: path.basename(options.assetPath),
      hash: assetHash,
      mimeType,
    },
    claim: {
      toolChain: claimMetadata.toolChain,
      datasetLineageId: claimMetadata.datasetLineageId,
      policyHash: claimMetadata.policyHash,
      timestamp,
      signer: {
        id: options.signer.id,
        algorithm: options.signer.algorithm,
        publicKeyFingerprint: fingerprint,
      },
      notes: claimMetadata.notes,
    },
    signature: '',
  };

  const payload = manifestCanonicalString(manifest);
  manifest.signature = signPayload(payload, options.signer.privateKey, options.signer.algorithm);

  const manifestPath = options.outputPath ?? defaultManifestPath(options.assetPath);
  await ensureDirectory(manifestPath);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  return { manifestPath, manifest };
}

export async function createDerivativeStamp(
  options: DerivativeStampOptions,
): Promise<{ manifestPath: string; manifest: ProvenanceManifest }>
{
  const parentRaw = await fs.readFile(options.parentManifestPath, 'utf8');
  const parentManifest: ProvenanceManifest = JSON.parse(parentRaw);

  const parentVerification = await verifyProvenance({
    manifestPath: options.parentManifestPath,
    publicKey: options.parentPublicKey,
    assetPath: options.parentAssetPath,
  });

  if (!parentVerification.validSignature) {
    throw new Error('Parent manifest signature verification failed.');
  }

  if (options.parentAssetPath && !parentVerification.validAssetHash) {
    throw new Error('Parent asset hash verification failed.');
  }

  if (parentVerification.issues.some((issue) => issue.level === 'error')) {
    throw new Error('Parent manifest contains blocking verification issues.');
  }

  const parentManifestHash = computeManifestHash(parentManifest);
  const assetHash = await hashFile(options.assetPath);
  const fingerprint = fingerprintPublicKey(options.signer.publicKey);
  const mimeType = determineMime(options.assetPath, options.signer.mimeType);
  const timestamp = new Date().toISOString();

  const combinedToolChain = [
    ...parentManifest.claim.toolChain,
    ...(options.metadata?.toolChain ? sanitizeToolChain(options.metadata.toolChain) : []),
  ];

  const manifest: ProvenanceManifest = {
    version: '1.0',
    asset: {
      name: path.basename(options.assetPath),
      hash: assetHash,
      mimeType,
    },
    claim: {
      toolChain: combinedToolChain,
      datasetLineageId: options.metadata?.datasetLineageId ?? parentManifest.claim.datasetLineageId,
      policyHash: options.metadata?.policyHash ?? parentManifest.claim.policyHash,
      timestamp,
      signer: {
        id: options.signer.id,
        algorithm: options.signer.algorithm,
        publicKeyFingerprint: fingerprint,
      },
      redactions: options.redactions && options.redactions.length > 0 ? [...options.redactions] : undefined,
      notes: options.metadata?.notes ?? parentManifest.claim.notes,
    },
    parent: {
      manifestHash: parentManifestHash,
      assetHash: parentManifest.asset.hash,
      signerId: parentManifest.claim.signer.id,
      timestamp: parentManifest.claim.timestamp,
    },
    signature: '',
  };

  const payload = manifestCanonicalString(manifest);
  manifest.signature = signPayload(payload, options.signer.privateKey, options.signer.algorithm);

  const manifestPath = options.outputPath ?? defaultManifestPath(options.assetPath);
  await ensureDirectory(manifestPath);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  return { manifestPath, manifest };
}
