import assert from 'node:assert/strict';
import * as crypto from 'crypto';
import {
  DataSubjectFulfillmentEngine,
  ExportPackSigner,
  InMemoryElasticsearchConnector,
  InMemoryKafkaEventLog,
  InMemoryPostgresConnector,
  InMemoryS3Storage,
  StaticIdentityVerifier,
  createFieldMaskRule,
  validateDeletionProof,
  validateDeletionProofAgainstSnapshot,
  validateRectificationProof,
} from '../../src/privacy/dsar';

const subjectId = 'sub-001';
const tenantId = 'tenant-a';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const signer = new ExportPackSigner(
  privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
  publicKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
);

const postgres = new InMemoryPostgresConnector([
  {
    table: 'profile',
    subjectId,
    tenantId,
    data: {
      email: 'original@example.com',
      name: 'Fixture User',
      ssn: '123-45-6789',
    },
  },
  {
    table: 'sessions',
    subjectId,
    tenantId,
    data: { lastLogin: '2025-09-01T00:00:00.000Z', ip: '203.0.113.5' },
  },
]);

const elastic = new InMemoryElasticsearchConnector([
  {
    id: 'activity-1',
    subjectId,
    tenantId,
    index: 'activity',
    body: {
      action: 'login',
      email: 'original@example.com',
      timestamp: '2025-09-01T00:00:00.000Z',
    },
  },
  {
    id: 'activity-2',
    subjectId,
    tenantId,
    index: 'activity',
    body: { action: 'purchase', amount: 49.99, currency: 'USD' },
  },
]);

const kafka = new InMemoryKafkaEventLog();
const storage = new InMemoryS3Storage('s3://fixtures-dsar');
const engine = new DataSubjectFulfillmentEngine({
  connectors: [postgres, elastic],
  storage,
  kafka,
  signer,
  identityVerifier: new StaticIdentityVerifier({ [subjectId]: 'token-123' }),
  redactionRules: [
    createFieldMaskRule('postgres', ['email', 'ssn'], '***-masked'),
    createFieldMaskRule('elasticsearch', ['email'], '***-masked'),
  ],
});

(async () => {
  const exportRequest = {
    requestId: 'req-export-1',
    subjectId,
    tenantId,
    operation: 'export' as const,
    identityProof: { method: 'email', token: 'token-123' },
    replayKey: 'case-1',
  };
  const first = await engine.execute(exportRequest);
  assert.equal(first.type, 'export');
  assert.equal(first.meta.idempotentReplay, false);
  const stored = await storage.getObject(
    `${tenantId}/${exportRequest.requestId}.json`,
  );
  assert.ok(stored, 'export pack stored in S3');
  const parsed = JSON.parse(stored!);
  assert.ok(
    signer.verify(parsed.payload, parsed.signature),
    'signature verifies',
  );
  const second = await engine.execute(exportRequest);
  assert.equal(second.meta.idempotentReplay, true);
  assert.deepEqual(second.result, first.result);
  assert.equal(postgres.calls.collect, 1);
  assert.equal(elastic.calls.collect, 1);

  const rectify = await engine.execute({
    requestId: 'req-rectify-1',
    subjectId,
    tenantId,
    operation: 'rectify' as const,
    identityProof: { method: 'email', token: 'token-123' },
    payload: {
      postgres: { profile: { email: 'updated@example.com' } },
      elasticsearch: { activity: { email: 'updated@example.com' } },
    },
  });
  assert.equal(rectify.type, 'rectify');
  assert.equal(rectify.result.proofs.length, 2);
  rectify.result.proofs.forEach((proof) =>
    assert.ok(validateRectificationProof(proof)),
  );

  const deletion = await engine.execute({
    requestId: 'req-delete-1',
    subjectId,
    tenantId,
    operation: 'delete' as const,
    identityProof: { method: 'email', token: 'token-123' },
  });
  assert.equal(deletion.type, 'delete');
  assert.equal(deletion.result.proofs.length, 2);
  deletion.result.proofs.forEach((proof) => {
    assert.ok(validateDeletionProof(proof));
  });
  const postgresSnapshot = await postgres.snapshot();
  const elasticSnapshot = await elastic.snapshot();
  deletion.result.proofs.forEach((proof) => {
    const snapshot =
      proof.connector === 'postgres' ? postgresSnapshot : elasticSnapshot;
    assert.ok(validateDeletionProofAgainstSnapshot(proof, snapshot));
  });

  console.log('DFE integration checks completed');
})();
