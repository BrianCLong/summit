"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const hasher_1 = require("../src/hasher");
const manifest_1 = require("../src/manifest");
const verifier_1 = require("../src/verifier");
const transforms_1 = require("../src/transforms");
(0, globals_1.describe)('ProvenanceHasher', () => {
    let hasher;
    (0, globals_1.beforeEach)(() => {
        hasher = new hasher_1.ProvenanceHasher();
    });
    (0, globals_1.it)('should hash data deterministically', () => {
        const data = { a: 1, b: 2 };
        const hash1 = hasher.hash(data);
        const hash2 = hasher.hash(data);
        (0, globals_1.expect)(hash1).toBe(hash2);
    });
    (0, globals_1.it)('should normalize object key order', () => {
        const data1 = { b: 2, a: 1 };
        const data2 = { a: 1, b: 2 };
        (0, globals_1.expect)(hasher.hash(data1)).toBe(hasher.hash(data2));
    });
    (0, globals_1.it)('should build merkle root', () => {
        const hashes = ['hash1', 'hash2', 'hash3'];
        const root = hasher.merkleRoot(hashes);
        (0, globals_1.expect)(root).toBeTruthy();
        (0, globals_1.expect)(root.length).toBe(64); // SHA-256 hex length
    });
    (0, globals_1.it)('should handle empty merkle tree', () => {
        const root = hasher.merkleRoot([]);
        (0, globals_1.expect)(root).toBeTruthy();
    });
    (0, globals_1.it)('should handle single-node merkle tree', () => {
        const root = hasher.merkleRoot(['single']);
        (0, globals_1.expect)(root).toBe('single');
    });
});
(0, globals_1.describe)('ManifestBuilder', () => {
    let builder;
    (0, globals_1.beforeEach)(() => {
        builder = new manifest_1.ManifestBuilder();
    });
    (0, globals_1.it)('should add input and generate hash', () => {
        const data = 'test input';
        const hash = builder.addInput(data);
        (0, globals_1.expect)(hash).toBeTruthy();
        (0, globals_1.expect)(hash.length).toBe(64);
    });
    (0, globals_1.it)('should add transform and generate hash', () => {
        const inputData = 'input';
        const inputHash = builder.addInput(inputData);
        const transform = {
            id: 'test-1',
            type: 'parse',
            version: '1.0.0',
            params: {},
        };
        const outputData = ['parsed'];
        const outputHash = builder.addTransform(transform, inputHash, outputData);
        (0, globals_1.expect)(outputHash).toBeTruthy();
    });
    (0, globals_1.it)('should build complete manifest', () => {
        builder.addInput('input');
        const manifest = builder.build();
        (0, globals_1.expect)(manifest.version).toBe('1.0');
        (0, globals_1.expect)(manifest.rootHash).toBeTruthy();
        (0, globals_1.expect)(manifest.nodes.length).toBeGreaterThan(0);
        (0, globals_1.expect)(manifest.verifier.algorithm).toBe('sha256');
    });
    (0, globals_1.it)('should sign manifest', () => {
        builder.addInput('input');
        const manifest = builder.build();
        const signed = builder.sign(manifest);
        (0, globals_1.expect)(signed.signature).toBeTruthy();
    });
});
(0, globals_1.describe)('ManifestBuilder.buildFromDAG', () => {
    (0, globals_1.it)('should build manifest from simple DAG', async () => {
        const inputData = 'id,name\n1,Alice\n2,Bob';
        const dag = {
            transforms: [
                {
                    id: 'parse-1',
                    type: 'parse',
                    version: '1.0.0',
                    params: { delimiter: ',', hasHeader: true },
                },
            ],
            dependencies: new Map([['parse-1', []]]),
        };
        const manifest = await manifest_1.ManifestBuilder.buildFromDAG(dag, inputData, transforms_1.defaultExecutor);
        (0, globals_1.expect)(manifest.nodes.length).toBeGreaterThan(0);
        (0, globals_1.expect)(manifest.rootHash).toBeTruthy();
        (0, globals_1.expect)(manifest.signature).toBeTruthy();
    });
    (0, globals_1.it)('should handle multi-step DAG', async () => {
        const inputData = 'id,category,value\n1,A,100\n1,A,100\n2,B,200';
        const dag = {
            transforms: [
                {
                    id: 'parse-1',
                    type: 'parse',
                    version: '1.0.0',
                    params: { delimiter: ',', hasHeader: true },
                },
                {
                    id: 'dedupe-1',
                    type: 'dedupe',
                    version: '1.0.0',
                    params: { key: 'id' },
                },
            ],
            dependencies: new Map([
                ['parse-1', []],
                ['dedupe-1', ['parse-1']],
            ]),
        };
        const manifest = await manifest_1.ManifestBuilder.buildFromDAG(dag, inputData, transforms_1.defaultExecutor);
        const transformNodes = manifest.nodes.filter((n) => n.type === 'transform');
        (0, globals_1.expect)(transformNodes.length).toBe(2);
    });
});
(0, globals_1.describe)('ProvenanceVerifier', () => {
    let verifier;
    (0, globals_1.beforeEach)(() => {
        verifier = new verifier_1.ProvenanceVerifier();
    });
    (0, globals_1.it)('should verify valid manifest', async () => {
        const inputData = 'id,name\n1,Alice\n2,Bob';
        const dag = {
            transforms: [
                {
                    id: 'parse-1',
                    type: 'parse',
                    version: '1.0.0',
                    params: { delimiter: ',', hasHeader: true },
                },
            ],
            dependencies: new Map([['parse-1', []]]),
        };
        const manifest = await manifest_1.ManifestBuilder.buildFromDAG(dag, inputData, transforms_1.defaultExecutor);
        const result = await verifier.verify(manifest, inputData, transforms_1.defaultExecutor);
        (0, globals_1.expect)(result.valid).toBe(true);
        (0, globals_1.expect)(result.errors.length).toBe(0);
    });
    (0, globals_1.it)('should detect input tampering', async () => {
        const originalInput = 'id,name\n1,Alice';
        const tamperedInput = 'id,name\n1,Bob';
        const dag = {
            transforms: [
                {
                    id: 'parse-1',
                    type: 'parse',
                    version: '1.0.0',
                    params: { delimiter: ',', hasHeader: true },
                },
            ],
            dependencies: new Map([['parse-1', []]]),
        };
        const manifest = await manifest_1.ManifestBuilder.buildFromDAG(dag, originalInput, transforms_1.defaultExecutor);
        const result = await verifier.verify(manifest, tamperedInput, transforms_1.defaultExecutor);
        (0, globals_1.expect)(result.valid).toBe(false);
        (0, globals_1.expect)(result.errors.some((e) => e.includes('Input hash mismatch'))).toBe(true);
    });
    (0, globals_1.it)('should extract DAG from manifest', async () => {
        const inputData = 'id,name\n1,Alice';
        const originalDAG = {
            transforms: [
                {
                    id: 'parse-1',
                    type: 'parse',
                    version: '1.0.0',
                    params: {},
                },
                {
                    id: 'dedupe-1',
                    type: 'dedupe',
                    version: '1.0.0',
                    params: { key: 'id' },
                },
            ],
            dependencies: new Map([
                ['parse-1', []],
                ['dedupe-1', ['parse-1']],
            ]),
        };
        const manifest = await manifest_1.ManifestBuilder.buildFromDAG(originalDAG, inputData, transforms_1.defaultExecutor);
        const extractedDAG = verifier.extractDAG(manifest);
        (0, globals_1.expect)(extractedDAG.transforms.length).toBe(2);
        (0, globals_1.expect)(extractedDAG.transforms[0].id).toBe('parse-1');
        (0, globals_1.expect)(extractedDAG.transforms[1].id).toBe('dedupe-1');
    });
});
(0, globals_1.describe)('Transform Execution', () => {
    (0, globals_1.it)('should execute parse transform', async () => {
        const transform = {
            id: 'parse-1',
            type: 'parse',
            version: '1.0.0',
            params: { delimiter: ',', hasHeader: true },
        };
        const input = 'id,name\n1,Alice\n2,Bob';
        const output = await (0, transforms_1.defaultExecutor)(transform, input);
        (0, globals_1.expect)(Array.isArray(output)).toBe(true);
        (0, globals_1.expect)(output.length).toBe(2);
        (0, globals_1.expect)(output[0]).toEqual({ id: '1', name: 'Alice' });
    });
    (0, globals_1.it)('should execute dedupe transform', async () => {
        const transform = {
            id: 'dedupe-1',
            type: 'dedupe',
            version: '1.0.0',
            params: { key: 'id' },
        };
        const input = [
            { id: '1', name: 'Alice' },
            { id: '1', name: 'Alice Duplicate' },
            { id: '2', name: 'Bob' },
        ];
        const output = await (0, transforms_1.defaultExecutor)(transform, input);
        (0, globals_1.expect)(output.length).toBe(2);
        (0, globals_1.expect)(output[0].name).toBe('Alice');
    });
    (0, globals_1.it)('should execute aggregate transform', async () => {
        const transform = {
            id: 'agg-1',
            type: 'aggregate',
            version: '1.0.0',
            params: {
                groupBy: 'category',
                aggregateField: 'value',
                operation: 'sum',
            },
        };
        const input = [
            { category: 'A', value: '100' },
            { category: 'A', value: '50' },
            { category: 'B', value: '200' },
        ];
        const output = await (0, transforms_1.defaultExecutor)(transform, input);
        (0, globals_1.expect)(output.length).toBe(2);
        (0, globals_1.expect)(output[0].value).toBe(150);
        (0, globals_1.expect)(output[1].value).toBe(200);
    });
});
