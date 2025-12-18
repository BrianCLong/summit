import { ProvenanceHasher } from './hasher.js';
import type {
  ProvenanceManifest,
  ProvenanceNode,
  Transform,
  TransformDAG,
} from './types.js';

/**
 * Provenance Manifest Builder
 * Creates signed, hash-tree manifests for analytics pipelines
 */

export class ManifestBuilder {
  private hasher: ProvenanceHasher;
  private nodes: ProvenanceNode[] = [];

  constructor(algorithm: string = 'sha256') {
    this.hasher = new ProvenanceHasher(algorithm);
  }

  /**
   * Record input data
   */
  addInput(data: any, metadata?: Record<string, any>): string {
    const hash = this.hasher.hash(data);
    this.nodes.push({
      hash,
      type: 'input',
      timestamp: new Date().toISOString(),
      metadata,
    });
    return hash;
  }

  /**
   * Record transform execution
   */
  addTransform(
    transform: Transform,
    inputHash: string,
    outputData: any,
  ): string {
    const outputHash = this.hasher.hash(outputData);
    const transformHash = this.hasher.hashTransform(
      transform.id,
      transform.type,
      transform.version,
      transform.params,
      inputHash,
    );

    this.nodes.push({
      hash: transformHash,
      type: 'transform',
      timestamp: new Date().toISOString(),
      transform: {
        ...transform,
        inputHash,
        outputHash,
      },
    });

    return outputHash;
  }

  /**
   * Record final output
   */
  addOutput(data: any, metadata?: Record<string, any>): string {
    const hash = this.hasher.hash(data);
    this.nodes.push({
      hash,
      type: 'output',
      timestamp: new Date().toISOString(),
      metadata,
    });
    return hash;
  }

  /**
   * Build complete manifest with Merkle root
   */
  build(tolerance?: number): ProvenanceManifest {
    const allHashes = this.nodes.map((n) => n.hash);
    const rootHash = this.hasher.merkleRoot(allHashes);

    const manifest: ProvenanceManifest = {
      version: '1.0',
      created: new Date().toISOString(),
      rootHash,
      nodes: this.nodes,
      verifier: {
        algorithm: 'sha256',
        tolerance,
      },
    };

    return manifest;
  }

  /**
   * Sign manifest (placeholder - in production use real key management)
   */
  sign(manifest: ProvenanceManifest, privateKey?: string): ProvenanceManifest {
    // For dev/demo: simple HMAC signature
    // In production: use RSA/ECDSA with proper key management
    const key = privateKey || 'dev-only-key-DO-NOT-USE-IN-PROD';
    const signableContent = JSON.stringify({
      version: manifest.version,
      created: manifest.created,
      rootHash: manifest.rootHash,
    });

    const signature = this.hasher.hash({ content: signableContent, key });

    return {
      ...manifest,
      signature,
    };
  }

  /**
   * Build manifest from DAG execution
   */
  static async buildFromDAG(
    dag: TransformDAG,
    inputData: any,
    executor: (transform: Transform, input: any) => Promise<any>,
    tolerance?: number,
  ): Promise<ProvenanceManifest> {
    const builder = new ManifestBuilder();
    let currentHash = builder.addInput(inputData, { source: 'csv' });
    let currentData = inputData;

    // Topologically execute transforms
    const executed = new Set<string>();
    const outputs = new Map<string, any>();

    const canExecute = (transformId: string): boolean => {
      const deps = dag.dependencies.get(transformId) || [];
      return deps.every((dep) => executed.has(dep));
    };

    while (executed.size < dag.transforms.length) {
      const ready = dag.transforms.find(
        (t) => !executed.has(t.id) && canExecute(t.id),
      );

      if (!ready) {
        throw new Error('Cyclic dependency or missing transform in DAG');
      }

      // Execute transform
      const output = await executor(ready, currentData);
      outputs.set(ready.id, output);

      // Record in manifest
      const outputHash = builder.addTransform(ready, currentHash, output);
      currentHash = outputHash;
      currentData = output;
      executed.add(ready.id);
    }

    builder.addOutput(currentData, { finalTransform: dag.transforms[dag.transforms.length - 1]?.id });

    return builder.sign(builder.build(tolerance));
  }
}
