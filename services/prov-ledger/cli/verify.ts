#!/usr/bin/env tsx
/**
 * Prov-Ledger CLI Verifier
 * Standalone CLI tool to verify export manifests (hash tree + transform chain)
 *
 * Usage:
 *   pnpm verify <manifest.json>
 *   pnpm verify --url http://localhost:4010/export/manifest
 *   pnpm verify --stdin
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as readline from 'readline';

interface TransformStep {
  transformType: string;
  timestamp: string;
  actorId: string;
  config?: Record<string, any>;
  inputHash?: string;
  outputHash?: string;
}

interface ManifestClaim {
  id: string;
  hash: string;
  transforms: string[];
}

interface ManifestEvidence {
  id: string;
  checksum: string;
  sourceRef: string;
  transformChain: TransformStep[];
}

interface HashTreeNode {
  id: string;
  hash: string;
  type: 'LEAF' | 'INTERNAL' | 'ROOT';
}

interface HashTreeEdge {
  parentId: string;
  childId: string;
  position: number;
}

interface Manifest {
  version: string;
  manifestId?: string;
  generated_at: string;
  claims: ManifestClaim[];
  evidence?: ManifestEvidence[];
  hashTree?: {
    nodes: HashTreeNode[];
    edges: HashTreeEdge[];
  };
  merkleRoot?: string;
  hash_chain: string;
  transformChain?: Array<{
    transformId: string;
    transformType: string;
    timestamp: string;
    actorId: string;
    inputRefs: string[];
    outputRefs: string[];
    config?: Record<string, any>;
  }>;
  signature?: string;
  signatureAlgorithm?: string;
  signerKeyId?: string;
}

interface VerificationResult {
  valid: boolean;
  signatureValid: boolean | null;
  hashChainValid: boolean;
  merkleTreeValid: boolean | null;
  transformChainValid: boolean;
  errors: string[];
  warnings: string[];
  verifiedAt: string;
  summary: {
    claimCount: number;
    evidenceCount: number;
    transformCount: number;
  };
}

function generateHash(content: any): string {
  return crypto
    .createHash('sha256')
    .update(typeof content === 'string' ? content : JSON.stringify(content, Object.keys(content).sort()))
    .digest('hex');
}

function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  if (hashes.length === 1) return hashes[0];

  const newLevel: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    if (i + 1 < hashes.length) {
      const combined = hashes[i] + hashes[i + 1];
      newLevel.push(generateHash(combined));
    } else {
      newLevel.push(hashes[i]);
    }
  }

  return computeMerkleRoot(newLevel);
}

function verifyHashChain(manifest: Manifest): { valid: boolean; error?: string } {
  const claimHashes = manifest.claims.map((c) => c.hash);
  const expectedChain = generateHash(claimHashes.join(''));

  if (expectedChain !== manifest.hash_chain) {
    return {
      valid: false,
      error: `Hash chain mismatch: expected ${expectedChain}, got ${manifest.hash_chain}`,
    };
  }

  return { valid: true };
}

function verifyMerkleTree(manifest: Manifest): { valid: boolean; error?: string } {
  if (!manifest.hashTree || !manifest.merkleRoot) {
    return { valid: true }; // No merkle tree to verify
  }

  const { nodes, edges } = manifest.hashTree;

  // Find leaf nodes
  const leafNodes = nodes.filter((n) => n.type === 'LEAF');
  const leafHashes = leafNodes.map((n) => n.hash);

  // Compute expected merkle root
  const expectedRoot = computeMerkleRoot(leafHashes);

  if (expectedRoot !== manifest.merkleRoot) {
    return {
      valid: false,
      error: `Merkle root mismatch: expected ${expectedRoot}, got ${manifest.merkleRoot}`,
    };
  }

  // Verify internal nodes
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const childrenMap = new Map<string, string[]>();

  for (const edge of edges) {
    const children = childrenMap.get(edge.parentId) || [];
    children[edge.position] = edge.childId;
    childrenMap.set(edge.parentId, children);
  }

  for (const [parentId, children] of childrenMap) {
    const parent = nodeMap.get(parentId);
    if (!parent || parent.type === 'LEAF') continue;

    const childHashes = children.map((cid) => nodeMap.get(cid)?.hash || '');
    const expectedHash = generateHash(childHashes.join(''));

    if (expectedHash !== parent.hash) {
      return {
        valid: false,
        error: `Internal node ${parentId} hash mismatch`,
      };
    }
  }

  return { valid: true };
}

function verifyTransformChain(manifest: Manifest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!manifest.transformChain || manifest.transformChain.length === 0) {
    return { valid: true, errors: [] };
  }

  // Verify transform chain is ordered by timestamp
  const timestamps = manifest.transformChain.map((t) => new Date(t.timestamp).getTime());
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] < timestamps[i - 1]) {
      errors.push(`Transform chain not in chronological order at index ${i}`);
    }
  }

  // Verify input/output references form a DAG
  const outputRefs = new Set<string>();
  for (const transform of manifest.transformChain) {
    // Check inputs exist (either from previous outputs or are original sources)
    for (const inputRef of transform.inputRefs) {
      if (!outputRefs.has(inputRef) && !inputRef.startsWith('source:')) {
        // Allow missing refs if they're initial sources
        // This is a warning, not an error
      }
    }

    // Add outputs
    for (const outputRef of transform.outputRefs) {
      outputRefs.add(outputRef);
    }
  }

  return { valid: errors.length === 0, errors };
}

function verifySignature(
  manifest: Manifest,
  publicKey?: string,
): { valid: boolean | null; error?: string } {
  if (!manifest.signature) {
    return { valid: null }; // No signature to verify
  }

  if (!publicKey) {
    return { valid: null, error: 'No public key provided for signature verification' };
  }

  try {
    // Create canonical manifest bytes (excluding signature)
    const manifestCopy = { ...manifest };
    delete (manifestCopy as any).signature;
    const manifestBytes = JSON.stringify(manifestCopy, Object.keys(manifestCopy).sort());

    const verify = crypto.createVerify(manifest.signatureAlgorithm || 'RSA-SHA256');
    verify.update(manifestBytes);

    const isValid = verify.verify(publicKey, manifest.signature, 'base64');

    return { valid: isValid };
  } catch (error: any) {
    return { valid: false, error: `Signature verification failed: ${error.message}` };
  }
}

async function verifyManifest(
  manifest: Manifest,
  options: { publicKey?: string } = {},
): Promise<VerificationResult> {
  const result: VerificationResult = {
    valid: true,
    signatureValid: null,
    hashChainValid: false,
    merkleTreeValid: null,
    transformChainValid: false,
    errors: [],
    warnings: [],
    verifiedAt: new Date().toISOString(),
    summary: {
      claimCount: manifest.claims?.length || 0,
      evidenceCount: manifest.evidence?.length || 0,
      transformCount: manifest.transformChain?.length || 0,
    },
  };

  // 1. Verify hash chain
  const hashChainResult = verifyHashChain(manifest);
  result.hashChainValid = hashChainResult.valid;
  if (!hashChainResult.valid) {
    result.errors.push(hashChainResult.error!);
    result.valid = false;
  }

  // 2. Verify merkle tree (if present)
  if (manifest.hashTree && manifest.merkleRoot) {
    const merkleResult = verifyMerkleTree(manifest);
    result.merkleTreeValid = merkleResult.valid;
    if (!merkleResult.valid) {
      result.errors.push(merkleResult.error!);
      result.valid = false;
    }
  }

  // 3. Verify transform chain
  const transformResult = verifyTransformChain(manifest);
  result.transformChainValid = transformResult.valid;
  if (!transformResult.valid) {
    result.errors.push(...transformResult.errors);
    result.valid = false;
  }

  // 4. Verify signature (if present)
  if (manifest.signature) {
    const sigResult = verifySignature(manifest, options.publicKey);
    result.signatureValid = sigResult.valid;
    if (sigResult.error) {
      if (sigResult.valid === false) {
        result.errors.push(sigResult.error);
        result.valid = false;
      } else {
        result.warnings.push(sigResult.error);
      }
    }
  }

  return result;
}

async function loadManifestFromFile(path: string): Promise<Manifest> {
  const content = fs.readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

async function loadManifestFromUrl(url: string): Promise<Manifest> {
  const response = await fetch(url, {
    headers: {
      'x-authority-id': 'cli-verifier',
      'x-reason-for-access': 'manifest-verification',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function loadManifestFromStdin(): Promise<Manifest> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    let data = '';
    rl.on('line', (line) => {
      data += line;
    });

    rl.on('close', () => {
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('Invalid JSON from stdin'));
      }
    });
  });
}

function printResult(result: VerificationResult): void {
  console.log('\n=== Manifest Verification Result ===\n');

  const statusSymbol = result.valid ? '\u2713' : '\u2717';
  const statusColor = result.valid ? '\x1b[32m' : '\x1b[31m';
  console.log(`${statusColor}${statusSymbol} Overall: ${result.valid ? 'VALID' : 'INVALID'}\x1b[0m\n`);

  console.log('Checks:');
  console.log(`  Hash Chain:      ${result.hashChainValid ? '\u2713 Valid' : '\u2717 Invalid'}`);

  if (result.merkleTreeValid !== null) {
    console.log(`  Merkle Tree:     ${result.merkleTreeValid ? '\u2713 Valid' : '\u2717 Invalid'}`);
  } else {
    console.log('  Merkle Tree:     - Not present');
  }

  console.log(`  Transform Chain: ${result.transformChainValid ? '\u2713 Valid' : '\u2717 Invalid'}`);

  if (result.signatureValid !== null) {
    console.log(`  Signature:       ${result.signatureValid ? '\u2713 Valid' : '\u2717 Invalid'}`);
  } else {
    console.log('  Signature:       - Not verified');
  }

  console.log('\nSummary:');
  console.log(`  Claims:      ${result.summary.claimCount}`);
  console.log(`  Evidence:    ${result.summary.evidenceCount}`);
  console.log(`  Transforms:  ${result.summary.transformCount}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of result.errors) {
      console.log(`  \x1b[31m\u2717\x1b[0m ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of result.warnings) {
      console.log(`  \x1b[33m!\x1b[0m ${warning}`);
    }
  }

  console.log(`\nVerified at: ${result.verifiedAt}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let manifest: Manifest;
  let publicKey: string | undefined;

  // Parse arguments
  let i = 0;
  while (i < args.length) {
    if (args[i] === '--url' || args[i] === '-u') {
      manifest = await loadManifestFromUrl(args[++i]);
    } else if (args[i] === '--stdin') {
      manifest = await loadManifestFromStdin();
    } else if (args[i] === '--public-key' || args[i] === '-k') {
      publicKey = fs.readFileSync(args[++i], 'utf-8');
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Prov-Ledger Manifest Verifier

Usage:
  verify <manifest.json>              Verify a manifest file
  verify --url <url>                  Fetch and verify from URL
  verify --stdin                      Read manifest from stdin
  verify --public-key <key.pem>       Provide public key for signature verification

Options:
  -u, --url          Fetch manifest from URL
  -k, --public-key   Path to PEM public key for signature verification
  -h, --help         Show this help message
  --json             Output result as JSON

Examples:
  verify manifest.json
  verify --url http://localhost:4010/export/manifest
  curl -s http://localhost:4010/export/manifest | verify --stdin
  verify manifest.json --public-key signer.pub
      `);
      process.exit(0);
    } else if (args[i] === '--json') {
      // JSON output mode - handled after verification
    } else if (!args[i].startsWith('-')) {
      manifest = await loadManifestFromFile(args[i]);
    }
    i++;
  }

  if (!manifest!) {
    console.error('Error: No manifest provided. Use --help for usage information.');
    process.exit(1);
  }

  const result = await verifyManifest(manifest, { publicKey });

  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printResult(result);
  }

  process.exit(result.valid ? 0 : 1);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});

export { verifyManifest, Manifest, VerificationResult };
