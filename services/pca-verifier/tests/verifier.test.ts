import { describe, it, expect, beforeEach } from '@jest/globals';
import { ProvenanceHasher } from '../src/hasher';
import { ManifestBuilder } from '../src/manifest';
import { ProvenanceVerifier } from '../src/verifier';
import { defaultExecutor } from '../src/transforms';
import type { TransformDAG, Transform } from '../src/types';

describe('ProvenanceHasher', () => {
  let hasher: ProvenanceHasher;

  beforeEach(() => {
    hasher = new ProvenanceHasher();
  });

  it('should hash data deterministically', () => {
    const data = { a: 1, b: 2 };
    const hash1 = hasher.hash(data);
    const hash2 = hasher.hash(data);
    expect(hash1).toBe(hash2);
  });

  it('should normalize object key order', () => {
    const data1 = { b: 2, a: 1 };
    const data2 = { a: 1, b: 2 };
    expect(hasher.hash(data1)).toBe(hasher.hash(data2));
  });

  it('should build merkle root', () => {
    const hashes = ['hash1', 'hash2', 'hash3'];
    const root = hasher.merkleRoot(hashes);
    expect(root).toBeTruthy();
    expect(root.length).toBe(64); // SHA-256 hex length
  });

  it('should handle empty merkle tree', () => {
    const root = hasher.merkleRoot([]);
    expect(root).toBeTruthy();
  });

  it('should handle single-node merkle tree', () => {
    const root = hasher.merkleRoot(['single']);
    expect(root).toBe('single');
  });
});

describe('ManifestBuilder', () => {
  let builder: ManifestBuilder;

  beforeEach(() => {
    builder = new ManifestBuilder();
  });

  it('should add input and generate hash', () => {
    const data = 'test input';
    const hash = builder.addInput(data);
    expect(hash).toBeTruthy();
    expect(hash.length).toBe(64);
  });

  it('should add transform and generate hash', () => {
    const inputData = 'input';
    const inputHash = builder.addInput(inputData);

    const transform: Transform = {
      id: 'test-1',
      type: 'parse',
      version: '1.0.0',
      params: {},
    };

    const outputData = ['parsed'];
    const outputHash = builder.addTransform(transform, inputHash, outputData);
    expect(outputHash).toBeTruthy();
  });

  it('should build complete manifest', () => {
    builder.addInput('input');
    const manifest = builder.build();

    expect(manifest.version).toBe('1.0');
    expect(manifest.rootHash).toBeTruthy();
    expect(manifest.nodes.length).toBeGreaterThan(0);
    expect(manifest.verifier.algorithm).toBe('sha256');
  });

  it('should sign manifest', () => {
    builder.addInput('input');
    const manifest = builder.build();
    const signed = builder.sign(manifest);

    expect(signed.signature).toBeTruthy();
  });
});

describe('ManifestBuilder.buildFromDAG', () => {
  it('should build manifest from simple DAG', async () => {
    const inputData = 'id,name\n1,Alice\n2,Bob';
    const dag: TransformDAG = {
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

    const manifest = await ManifestBuilder.buildFromDAG(
      dag,
      inputData,
      defaultExecutor,
    );

    expect(manifest.nodes.length).toBeGreaterThan(0);
    expect(manifest.rootHash).toBeTruthy();
    expect(manifest.signature).toBeTruthy();
  });

  it('should handle multi-step DAG', async () => {
    const inputData = 'id,category,value\n1,A,100\n1,A,100\n2,B,200';
    const dag: TransformDAG = {
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

    const manifest = await ManifestBuilder.buildFromDAG(
      dag,
      inputData,
      defaultExecutor,
    );

    const transformNodes = manifest.nodes.filter((n) => n.type === 'transform');
    expect(transformNodes.length).toBe(2);
  });
});

describe('ProvenanceVerifier', () => {
  let verifier: ProvenanceVerifier;

  beforeEach(() => {
    verifier = new ProvenanceVerifier();
  });

  it('should verify valid manifest', async () => {
    const inputData = 'id,name\n1,Alice\n2,Bob';
    const dag: TransformDAG = {
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

    const manifest = await ManifestBuilder.buildFromDAG(
      dag,
      inputData,
      defaultExecutor,
    );

    const result = await verifier.verify(manifest, inputData, defaultExecutor);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should detect input tampering', async () => {
    const originalInput = 'id,name\n1,Alice';
    const tamperedInput = 'id,name\n1,Bob';

    const dag: TransformDAG = {
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

    const manifest = await ManifestBuilder.buildFromDAG(
      dag,
      originalInput,
      defaultExecutor,
    );

    const result = await verifier.verify(manifest, tamperedInput, defaultExecutor);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Input hash mismatch'))).toBe(true);
  });

  it('should extract DAG from manifest', async () => {
    const inputData = 'id,name\n1,Alice';
    const originalDAG: TransformDAG = {
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

    const manifest = await ManifestBuilder.buildFromDAG(
      originalDAG,
      inputData,
      defaultExecutor,
    );

    const extractedDAG = verifier.extractDAG(manifest);
    expect(extractedDAG.transforms.length).toBe(2);
    expect(extractedDAG.transforms[0].id).toBe('parse-1');
    expect(extractedDAG.transforms[1].id).toBe('dedupe-1');
  });
});

describe('Transform Execution', () => {
  it('should execute parse transform', async () => {
    const transform: Transform = {
      id: 'parse-1',
      type: 'parse',
      version: '1.0.0',
      params: { delimiter: ',', hasHeader: true },
    };

    const input = 'id,name\n1,Alice\n2,Bob';
    const output = await defaultExecutor(transform, input);

    expect(Array.isArray(output)).toBe(true);
    expect(output.length).toBe(2);
    expect(output[0]).toEqual({ id: '1', name: 'Alice' });
  });

  it('should execute dedupe transform', async () => {
    const transform: Transform = {
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

    const output = await defaultExecutor(transform, input);
    expect(output.length).toBe(2);
    expect(output[0].name).toBe('Alice');
  });

  it('should execute aggregate transform', async () => {
    const transform: Transform = {
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

    const output = await defaultExecutor(transform, input);
    expect(output.length).toBe(2);
    expect(output[0].value).toBe(150);
    expect(output[1].value).toBe(200);
  });
});
