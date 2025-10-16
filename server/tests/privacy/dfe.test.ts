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
  type DSARDeletionResponse,
  type DSARExportResponse,
  type DSARRectificationResponse,
} from '../../src/privacy/dsar';

const subjectId = 'sub-001';
const tenantId = 'tenant-a';

const buildEngine = () => {
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

  return { engine, postgres, elastic, kafka, storage, signer };
};

describe('DataSubjectFulfillmentEngine', () => {
  it('produces deterministic export packs with offline-verifiable signatures', async () => {
    const { engine, postgres, elastic, storage, signer } = buildEngine();

    const request = {
      requestId: 'req-export-1',
      subjectId,
      tenantId,
      operation: 'export' as const,
      identityProof: { method: 'email', token: 'token-123' },
      replayKey: 'case-1',
    };

    const first = await engine.execute(request);
    expect(first.type).toBe('export');
    const exportResult = (first as DSARExportResponse).result;
    expect(first.meta.idempotentReplay).toBe(false);
    expect(exportResult.pack.manifest.connectors).toHaveLength(2);

    const stored = await storage.getObject(
      `${tenantId}/${request.requestId}.json`,
    );
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored!);
    expect(signer.verify(parsed.payload, parsed.signature)).toBe(true);

    const second = await engine.execute(request);
    expect(second.meta.idempotentReplay).toBe(true);
    expect((second as DSARExportResponse).result).toEqual(exportResult);
    expect(postgres.calls.collect).toBe(1);
    expect(elastic.calls.collect).toBe(1);
  });

  it('rectifies records and emits validating proofs', async () => {
    const { engine, postgres } = buildEngine();

    const rectify = await engine.execute({
      requestId: 'req-rectify-1',
      subjectId,
      tenantId,
      operation: 'rectify',
      identityProof: { method: 'email', token: 'token-123' },
      payload: {
        postgres: {
          profile: { email: 'updated@example.com' },
        },
        elasticsearch: {
          activity: { email: 'updated@example.com' },
        },
      },
    });

    expect(rectify.type).toBe('rectify');
    const rectifyResult = (rectify as DSARRectificationResponse).result;
    expect(rectifyResult.proofs).toHaveLength(2);
    rectifyResult.proofs.forEach((proof) => {
      expect(validateRectificationProof(proof)).toBe(true);
    });

    const rows = postgres.getRows(subjectId, tenantId);
    const updatedProfile = rows.find((row) => row.table === 'profile');
    expect(updatedProfile?.data.email).toBe('updated@example.com');
  });

  it('deletes records and produces inclusion-failure proofs', async () => {
    const { engine, postgres, elastic } = buildEngine();

    await engine.execute({
      requestId: 'req-rectify-setup',
      subjectId,
      tenantId,
      operation: 'rectify',
      identityProof: { method: 'email', token: 'token-123' },
      payload: {
        postgres: { profile: { email: 'rectify@example.com' } },
      },
    });

    const deletion = await engine.execute({
      requestId: 'req-delete-1',
      subjectId,
      tenantId,
      operation: 'delete',
      identityProof: { method: 'email', token: 'token-123' },
    });

    expect(deletion.type).toBe('delete');
    const deletionResult = (deletion as DSARDeletionResponse).result;
    expect(deletionResult.proofs).toHaveLength(2);
    deletionResult.proofs.forEach((proof) => {
      expect(validateDeletionProof(proof)).toBe(true);
    });

    const postgresSnapshot = await postgres.snapshot();
    const elasticSnapshot = await elastic.snapshot();

    deletionResult.proofs.forEach((proof) => {
      const snapshot =
        proof.connector === 'postgres' ? postgresSnapshot : elasticSnapshot;
      expect(validateDeletionProofAgainstSnapshot(proof, snapshot)).toBe(true);
    });
  });
});
