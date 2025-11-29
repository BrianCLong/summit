import { ProvenanceHasher } from './hasher.js';
import type {
  ProvenanceManifest,
  Transform,
  TransformDAG,
  VerificationResult,
} from './types.js';

/**
 * Provenance Verification Engine
 * Deterministically replays transforms and validates hashes
 */

export class ProvenanceVerifier {
  private hasher: ProvenanceHasher;

  constructor() {
    this.hasher = new ProvenanceHasher();
  }

  /**
   * Verify manifest by replaying transforms
   */
  async verify(
    manifest: ProvenanceManifest,
    inputData: any,
    executor: (transform: Transform, input: any) => Promise<any>,
  ): Promise<VerificationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate manifest structure
    try {
      const { version, created, rootHash, nodes, verifier } = manifest;
      if (version !== '1.0') {
        errors.push(`Unsupported manifest version: ${version}`);
      }
      if (!rootHash || !nodes || nodes.length === 0) {
        errors.push('Invalid manifest: missing rootHash or nodes');
      }
    } catch (e) {
      errors.push(`Manifest parsing error: ${e}`);
      return { valid: false, manifest, errors, warnings };
    }

    // 2. Verify input hash
    const inputNodes = manifest.nodes.filter((n) => n.type === 'input');
    if (inputNodes.length === 0) {
      errors.push('No input nodes in manifest');
    } else {
      const expectedInputHash = inputNodes[0].hash;
      const actualInputHash = this.hasher.hash(inputData);
      if (expectedInputHash !== actualInputHash) {
        errors.push(
          `Input hash mismatch: expected ${expectedInputHash}, got ${actualInputHash}`,
        );
      }
    }

    // 3. Replay transforms
    const transformNodes = manifest.nodes.filter((n) => n.type === 'transform');
    let currentData = inputData;
    let currentHash = this.hasher.hash(inputData);

    for (const node of transformNodes) {
      if (!node.transform) {
        errors.push(`Transform node missing transform data: ${node.hash}`);
        continue;
      }

      const transform = node.transform;

      // Verify input hash matches
      if (transform.inputHash !== currentHash) {
        errors.push(
          `Transform ${transform.id} input hash mismatch: expected ${transform.inputHash}, got ${currentHash}`,
        );
      }

      try {
        // Execute transform
        const output = await executor(transform, currentData);
        const outputHash = this.hasher.hash(output);

        // Verify output hash with tolerance if specified
        const tolerance = manifest.verifier.tolerance;
        const hashMatch = this.hasher.verifyHash(
          transform.outputHash || '',
          outputHash,
          output,
          tolerance,
        );

        if (!hashMatch) {
          errors.push(
            `Transform ${transform.id} output hash mismatch: expected ${transform.outputHash}, got ${outputHash}`,
          );
        }

        currentData = output;
        currentHash = outputHash;
      } catch (e) {
        errors.push(`Transform ${transform.id} execution error: ${e}`);
      }
    }

    // 4. Verify final output
    const outputNodes = manifest.nodes.filter((n) => n.type === 'output');
    if (outputNodes.length > 0) {
      const expectedOutputHash = outputNodes[0].hash;
      const actualOutputHash = this.hasher.hash(currentData);
      if (expectedOutputHash !== actualOutputHash) {
        warnings.push(
          `Final output hash mismatch: expected ${expectedOutputHash}, got ${actualOutputHash}`,
        );
      }
    }

    // 5. Verify Merkle root
    const allHashes = manifest.nodes.map((n) => n.hash);
    const computedRoot = this.hasher.merkleRoot(allHashes);
    if (computedRoot !== manifest.rootHash) {
      errors.push(
        `Merkle root mismatch: expected ${manifest.rootHash}, got ${computedRoot}`,
      );
    }

    // 6. Verify signature (if present)
    if (manifest.signature) {
      // In production, verify with public key
      warnings.push('Signature verification not implemented (dev mode)');
    }

    return {
      valid: errors.length === 0,
      manifest,
      errors,
      warnings,
      replayHash: currentHash,
      tolerance: manifest.verifier.tolerance,
    };
  }

  /**
   * Build DAG from manifest
   */
  extractDAG(manifest: ProvenanceManifest): TransformDAG {
    const transforms: Transform[] = [];
    const dependencies = new Map<string, string[]>();

    const transformNodes = manifest.nodes.filter((n) => n.type === 'transform');

    for (let i = 0; i < transformNodes.length; i++) {
      const node = transformNodes[i];
      if (node.transform) {
        transforms.push(node.transform);
        // Simple linear dependency for now
        if (i > 0 && transformNodes[i - 1].transform) {
          dependencies.set(node.transform.id, [transformNodes[i - 1].transform!.id]);
        } else {
          dependencies.set(node.transform.id, []);
        }
      }
    }

    return { transforms, dependencies };
  }
}
