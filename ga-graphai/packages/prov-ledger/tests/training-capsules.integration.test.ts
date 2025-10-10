import { describe, expect, it } from 'vitest';
import {
  CapsuleStorageEngine as PublicCapsuleStorageEngine,
  CapsuleVersioningAPI as PublicCapsuleVersioningAPI,
  LineageGraphGenerator,
  type ComplianceAttestation,
  type DifferentialPrivacyGuarantee
} from '../src/index';
import {
  CapsuleStorageEngine as InternalCapsuleStorageEngine,
  CapsuleVersioningAPI as InternalCapsuleVersioningAPI
} from '../src/capsules';

describe('immutable training capsules', () => {
  const dataset = [
    { id: 1, amount: 42.5, region: 'us-east', label: 0 },
    { id: 2, amount: 87.25, region: 'eu-west', label: 1 }
  ];

  const dp: DifferentialPrivacyGuarantee = {
    epsilon: 2.5,
    delta: 1e-6,
    mechanism: 'gaussian',
    certifiedBy: 'privacy-review-board',
    certifiedAt: '2024-01-01T00:00:00.000Z',
    rationale: 'Meets release policy'
  };

  const compliance: ComplianceAttestation = {
    framework: 'GDPR',
    attestedBy: 'compliance-office',
    attestedAt: '2024-01-02T00:00:00.000Z',
    certificateUri: 's3://compliance/gdpr-cert.pdf',
    notes: 'Quarterly audit'
  };

  it('stores datasets in a content-addressed, integrity-protected capsule', () => {
    expect(PublicCapsuleStorageEngine).toBe(InternalCapsuleStorageEngine);
    const storage = new InternalCapsuleStorageEngine();
    const capsule = storage.storeDataset('payments-v1', dataset, {
      metadata: { description: 'Payments dataset', recordCount: dataset.length },
      differentialPrivacy: dp,
      compliance
    });

    expect(capsule.datasetName).toBe('payments-v1');
    expect(capsule.capsuleId).toEqual(capsule.contentHash);
    expect(storage.verifyCapsuleIntegrity(capsule.contentHash)).toBe(true);
    expect(storage.verifyAgainstPayload(capsule.contentHash, dataset)).toBe(true);
    expect(storage.listVersions('payments-v1')).toHaveLength(1);

    // Tampering should be detectable via the hash.
    const tampered = [...dataset, { id: 3, amount: 1, region: 'apac', label: 0 }];
    expect(storage.verifyAgainstPayload(capsule.contentHash, tampered)).toBe(false);
  });

  it('tracks transformations, snapshots, and model links immutably', () => {
    expect(PublicCapsuleVersioningAPI).toBe(InternalCapsuleVersioningAPI);
    const versioning = new InternalCapsuleVersioningAPI();
    const capsule = versioning.versionDataset('payments-v1', dataset, {
      metadata: { description: 'Baseline dataset', tags: ['finance'] },
      differentialPrivacy: dp,
      compliance
    });

    const normalization = versioning.recordTransformation(capsule.contentHash, {
      name: 'normalize-columns',
      description: 'Z-score normalization on amount field',
      operator: 'feature-engineering',
      parameters: { column: 'amount', strategy: 'zscore' },
      outputMetrics: { stddev: 1, mean: 0 }
    });

    const filtering = versioning.recordTransformation(capsule.contentHash, {
      name: 'filter-outliers',
      description: 'Removed transactions over 3 std dev',
      operator: 'quality-pipeline',
      parameters: { sigma: 3 },
      outputMetrics: { removed: 1 },
      differentialPrivacyBudget: 0.1
    });

    expect(filtering.previousHash).toEqual(normalization.transformationHash);
    expect(versioning.verifyTransformationChain(capsule.contentHash)).toBe(true);

    const snapshot = versioning.createSnapshot({
      capsuleHash: capsule.contentHash,
      transformationHashes: [normalization.transformationHash, filtering.transformationHash],
      trainingConfig: {
        algorithm: 'xgboost',
        hyperparameters: { learningRate: 0.01, depth: 6 },
        seed: 1337
      },
      runtimeConfig: {
        orchestratorCommit: 'abc1234',
        environment: 'gpu-a100',
        containerImage: 'registry.example.com/trainer:1.2.3'
      },
      metadata: {
        initiatedBy: 'ml-platform',
        ticket: 'ML-42'
      }
    });

    expect(snapshot.snapshotId).toEqual(snapshot.integrityHash);
    expect(snapshot.transformationHashes).toEqual([
      normalization.transformationHash,
      filtering.transformationHash
    ]);
    expect(snapshot.trainingConfig).toMatchObject({ algorithm: 'xgboost', seed: 1337 });

    const registryLink = versioning.linkModelToSnapshot('models/churn/v1', snapshot.snapshotId, {
      artifactUri: 's3://models/churn/v1'
    });

    expect(registryLink.snapshotId).toBe(snapshot.snapshotId);
    expect(versioning.listModelLinks('models/churn/v1')).toHaveLength(1);

    const graph = new LineageGraphGenerator(versioning).generate({ modelId: 'models/churn/v1' });
    const nodeTypes = graph.nodes.reduce<Record<string, number>>((acc, node) => {
      acc[node.type] = (acc[node.type] ?? 0) + 1;
      return acc;
    }, {});

    expect(nodeTypes.capsule).toBe(1);
    expect(nodeTypes.transformation).toBe(2);
    expect(nodeTypes.snapshot).toBe(1);
    expect(nodeTypes.model).toBe(1);

    const modelEdge = graph.edges.find(edge => edge.type === 'model-link');
    expect(modelEdge?.to).toContain('model:models/churn/v1');

    const graphByCapsule = new LineageGraphGenerator(versioning).generate({
      capsuleHash: capsule.contentHash
    });
    expect(graphByCapsule.nodes.length).toBe(graph.nodes.length);
  });
});
