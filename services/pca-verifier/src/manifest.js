"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManifestBuilder = void 0;
const hasher_js_1 = require("./hasher.js");
/**
 * Provenance Manifest Builder
 * Creates signed, hash-tree manifests for analytics pipelines
 */
class ManifestBuilder {
    hasher;
    nodes = [];
    constructor(algorithm = 'sha256') {
        this.hasher = new hasher_js_1.ProvenanceHasher(algorithm);
    }
    /**
     * Record input data
     */
    addInput(data, metadata) {
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
    addTransform(transform, inputHash, outputData) {
        const outputHash = this.hasher.hash(outputData);
        const transformHash = this.hasher.hashTransform(transform.id, transform.type, transform.version, transform.params, inputHash);
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
    addOutput(data, metadata) {
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
    build(tolerance) {
        const allHashes = this.nodes.map((n) => n.hash);
        const rootHash = this.hasher.merkleRoot(allHashes);
        const manifest = {
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
    sign(manifest, privateKey) {
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
    static async buildFromDAG(dag, inputData, executor, tolerance) {
        const builder = new ManifestBuilder();
        let currentHash = builder.addInput(inputData, { source: 'csv' });
        let currentData = inputData;
        // Topologically execute transforms
        const executed = new Set();
        const outputs = new Map();
        const canExecute = (transformId) => {
            const deps = dag.dependencies.get(transformId) || [];
            return deps.every((dep) => executed.has(dep));
        };
        while (executed.size < dag.transforms.length) {
            const ready = dag.transforms.find((t) => !executed.has(t.id) && canExecute(t.id));
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
exports.ManifestBuilder = ManifestBuilder;
