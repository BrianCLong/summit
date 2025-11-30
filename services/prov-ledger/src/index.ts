/**
 * Provenance and Claims Ledger Service
 * Handles evidence/claim registration, provenance chains, contradiction graphs,
 * and export manifests with Merkle proofs and cryptographic signing.
 */

import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { z } from 'zod';
import { Pool } from 'pg';
import crypto from 'crypto';

const PORT = parseInt(process.env.PORT || '4010');
const NODE_ENV = process.env.NODE_ENV || 'development';
const KAFKA_ENABLED = process.env.KAFKA_ENABLED === 'true';
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'localhost:9092';

// Database connection with retry logic
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/provenance',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Kafka producer (lazy init)
let kafkaProducer: any = null;

// Helper for flexible records
const anyRecord = () => z.record(z.string(), z.any());

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const CreateClaimSchema = z.object({
  content: anyRecord(),
  claimType: z
    .enum(['factual', 'inferential', 'predictive', 'evaluative'])
    .default('factual'),
  signature: z.string().optional(),
  metadata: anyRecord().optional(),
  sourceRef: z.string().optional(),
  licenseId: z.string().optional(),
  policyLabels: z.array(z.string()).optional(),
});

const ClaimSchema = z.object({
  id: z.string(),
  content: anyRecord(),
  claimType: z.string(),
  hash: z.string(),
  signature: z.string().optional(),
  metadata: anyRecord().optional(),
  sourceRef: z.string().optional(),
  licenseId: z.string().optional(),
  policyLabels: z.array(z.string()),
  created_at: z.string().datetime(),
});

const TransformStepSchema = z.object({
  transformType: z.string(),
  timestamp: z.string().datetime(),
  actorId: z.string(),
  config: anyRecord().optional(),
});

const CreateEvidenceSchema = z.object({
  caseId: z.string().optional(),
  sourceRef: z.string(),
  content: z.any().optional(),
  checksum: z.string().optional(),
  checksumAlgorithm: z.string().default('sha256'),
  contentType: z.string().optional(),
  fileSize: z.number().optional(),
  transformChain: z.array(TransformStepSchema).optional(),
  licenseId: z.string().optional(),
  policyLabels: z.array(z.string()).optional(),
  metadata: anyRecord().optional(),
});

const EvidenceSchema = z.object({
  id: z.string(),
  caseId: z.string().optional(),
  sourceRef: z.string(),
  checksum: z.string(),
  checksumAlgorithm: z.string(),
  contentType: z.string().optional(),
  fileSize: z.number().optional(),
  transformChain: z.array(TransformStepSchema),
  licenseId: z.string().optional(),
  policyLabels: z.array(z.string()),
  authorityId: z.string().optional(),
  created_at: z.string().datetime(),
  metadata: anyRecord().optional(),
});

const CreateSourceSchema = z.object({
  sourceType: z.enum(['document', 'database', 'api', 'user_input', 'sensor']),
  content: z.any().optional(),
  sourceHash: z.string().optional(),
  originUrl: z.string().optional(),
  licenseId: z.string().optional(),
  metadata: anyRecord().optional(),
  retentionPolicy: z.string().default('STANDARD'),
});

const CreateTransformSchema = z.object({
  transformType: z.string(),
  inputHash: z.string(),
  outputHash: z.string(),
  algorithm: z.string(),
  version: z.string(),
  parameters: anyRecord().optional(),
  durationMs: z.number(),
  confidence: z.number().min(0).max(1).optional(),
  parentTransforms: z.array(z.string()).optional(),
  metadata: anyRecord().optional(),
});

const LinkEvidenceSchema = z.object({
  claimId: z.string(),
  evidenceId: z.string(),
  relationshipType: z.enum(['supports', 'contradicts', 'references']).default('supports'),
  confidence: z.number().min(0).max(1).optional(),
  metadata: anyRecord().optional(),
});

const ClaimRelationshipSchema = z.object({
  sourceClaimId: z.string(),
  targetClaimId: z.string(),
  relationshipType: z.enum(['contradicts', 'supports', 'supersedes', 'refines']),
  strength: z.number().min(0).max(1).optional(),
  rationale: z.string().optional(),
  metadata: anyRecord().optional(),
});

const ExportManifestSchema = z.object({
  caseId: z.string().optional(),
  evidenceIds: z.array(z.string()).optional(),
  claimIds: z.array(z.string()).optional(),
  manifestType: z.enum(['disclosure', 'chain-of-custody', 'selective', 'audit']).default('disclosure'),
  sign: z.boolean().default(false),
  signerKeyId: z.string().optional(),
});

const VerifyManifestSchema = z.object({
  manifestId: z.string(),
  publicKey: z.string().optional(),
});

const ProvenanceChainSchema = z.object({
  id: z.string(),
  claim_id: z.string(),
  transforms: z.array(z.string()),
  sources: z.array(z.string()),
  lineage: anyRecord(),
  created_at: z.string().datetime(),
});

// ============================================================================
// TypeScript Types
// ============================================================================

type CreateClaim = z.infer<typeof CreateClaimSchema>;
type Claim = z.infer<typeof ClaimSchema>;
type TransformStep = z.infer<typeof TransformStepSchema>;
type CreateEvidence = z.infer<typeof CreateEvidenceSchema>;
type Evidence = z.infer<typeof EvidenceSchema>;
type CreateSource = z.infer<typeof CreateSourceSchema>;
type CreateTransform = z.infer<typeof CreateTransformSchema>;
type LinkEvidence = z.infer<typeof LinkEvidenceSchema>;
type ClaimRelationship = z.infer<typeof ClaimRelationshipSchema>;
type ExportManifestRequest = z.infer<typeof ExportManifestSchema>;
type VerifyManifestRequest = z.infer<typeof VerifyManifestSchema>;
type ProvenanceChain = z.infer<typeof ProvenanceChainSchema>;

interface MerkleProof {
  dir: 'L' | 'R';
  hash: string;
}

interface ManifestItem {
  id: string;
  type: 'evidence' | 'claim' | 'source' | 'transform';
  hash: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateHash(content: any): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(content, Object.keys(content).sort()))
    .digest('hex');
}

function generateChecksum(content: any, algorithm: string = 'sha256'): string {
  const hash = crypto.createHash(algorithm);
  if (Buffer.isBuffer(content)) {
    hash.update(content);
  } else if (typeof content === 'string') {
    hash.update(content);
  } else {
    hash.update(JSON.stringify(content));
  }
  return hash.digest('hex');
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

// Merkle tree functions
function buildMerkleTree(leaves: string[]): { root: string; layers: string[][] } {
  if (leaves.length === 0) {
    return { root: sha256Hex(Buffer.from('EMPTY')), layers: [[]] };
  }

  let layer = leaves.slice();
  const layers = [layer];

  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = i + 1 < layer.length ? layer[i + 1] : layer[i];
      next.push(sha256Hex(Buffer.from(a + b)));
    }
    layer = next;
    layers.push(layer);
  }

  return { root: layer[0], layers };
}

function generateMerkleProof(index: number, layers: string[][]): MerkleProof[] {
  const proof: MerkleProof[] = [];
  let idx = index;

  for (let l = 0; l < layers.length - 1; l++) {
    const layer = layers[l];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1 >= layer.length ? idx : idx + 1;
    const dir: 'L' | 'R' = isRight ? 'L' : 'R';
    proof.push({ dir, hash: layer[siblingIdx] });
    idx = Math.floor(idx / 2);
  }

  return proof;
}

function verifyMerkleProof(
  leaf: string,
  proof: MerkleProof[],
  expectedRoot: string,
): boolean {
  let h = leaf;
  for (const p of proof) {
    h = p.dir === 'L' ? sha256Hex(Buffer.from(p.hash + h)) : sha256Hex(Buffer.from(h + p.hash));
  }
  return h === expectedRoot;
}

// Ed25519 signing/verification
function signData(data: Buffer, privateKeyPem: string): string {
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, data, privateKey);
  return signature.toString('base64');
}

function verifySignature(data: Buffer, signature: string, publicKeyPem: string): boolean {
  try {
    const publicKey = crypto.createPublicKey(publicKeyPem);
    return crypto.verify(null, data, publicKey, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

function canonicalizeForSigning(obj: any): Buffer {
  const sortKeys = (value: any): any => {
    if (Array.isArray(value)) {
      return value.map(sortKeys);
    }
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((acc: Record<string, any>, key) => {
          if (value[key] !== undefined) {
            acc[key] = sortKeys(value[key]);
          }
          return acc;
        }, {});
    }
    return value;
  };
  return Buffer.from(JSON.stringify(sortKeys(obj)));
}

// Kafka event publishing
async function publishEvent(
  eventType: string,
  aggregateType: string,
  aggregateId: string,
  payload: any,
): Promise<void> {
  // Always write to outbox table first
  await pool.query(
    `INSERT INTO provenance_events (event_type, aggregate_type, aggregate_id, payload)
     VALUES ($1, $2, $3, $4)`,
    [eventType, aggregateType, aggregateId, JSON.stringify(payload)],
  );

  // If Kafka is enabled, try to publish directly
  if (KAFKA_ENABLED && kafkaProducer) {
    try {
      await kafkaProducer.send({
        topic: `provenance.${aggregateType}.events`,
        messages: [
          {
            key: aggregateId,
            value: JSON.stringify({
              eventType,
              aggregateType,
              aggregateId,
              payload,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });

      // Mark as published
      await pool.query(
        `UPDATE provenance_events SET published_at = now()
         WHERE aggregate_id = $1 AND event_type = $2 AND published_at IS NULL`,
        [aggregateId, eventType],
      );
    } catch (err) {
      // Event is in outbox, will be retried by background process
      console.error('Failed to publish to Kafka, event saved to outbox:', err);
    }
  }
}

// Policy enforcement middleware
async function policyMiddleware(request: FastifyRequest, reply: any) {
  const authorityId = request.headers['x-authority-id'] as string | undefined;
  const reasonForAccess = request.headers['x-reason-for-access'] as string | undefined;

  if (!authorityId || !reasonForAccess) {
    const dryRun = process.env.POLICY_DRY_RUN === 'true';

    if (dryRun) {
      request.log.warn(
        {
          missingAuth: !authorityId,
          missingReason: !reasonForAccess,
        },
        'Policy violation in dry-run mode',
      );
      (request as any).policyWarnings = (request as any).policyWarnings || [];
      (request as any).policyWarnings.push({
        error: 'Policy denial',
        reason: 'Missing authority binding or reason-for-access',
        appealPath: '/ombudsman/appeals',
      });
      return;
    }

    return reply.status(403).send({
      error: 'Policy denial',
      reason: 'Missing authority binding or reason-for-access',
      appealPath: '/ombudsman/appeals',
    });
  }

  (request as any).authorityId = authorityId;
  (request as any).reasonForAccess = reasonForAccess;
}

// Create Fastify instance
const server: FastifyInstance = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'debug' : 'info',
    ...(NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
  },
});

// Register plugins
server.register(helmet);
server.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
});

// Add policy middleware to routes (except health checks)
server.addHook('preHandler', async (request, reply) => {
  if (
    request.url === '/health' ||
    request.url === '/healthz' ||
    request.url === '/readyz' ||
    request.url === '/metrics'
  ) {
    return;
  }
  return policyMiddleware(request, reply);
});

// ============================================================================
// Health Endpoints
// ============================================================================

server.get('/health', async () => {
  try {
    await pool.query('SELECT 1');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      dependencies: {
        database: 'healthy',
        kafka: KAFKA_ENABLED ? (kafkaProducer ? 'healthy' : 'disconnected') : 'disabled',
      },
    };
  } catch {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      dependencies: { database: 'unhealthy' },
    };
  }
});

server.get('/healthz', async () => ({ status: 'ok' }));
server.get('/readyz', async () => {
  await pool.query('SELECT 1');
  return { status: 'ready' };
});

// ============================================================================
// Source Registration Endpoints
// ============================================================================

server.post<{ Body: CreateSource }>('/source/register', async (request, reply) => {
  try {
    const { sourceType, content, sourceHash, originUrl, licenseId, metadata, retentionPolicy } =
      request.body;

    const id = generateId('src');
    const hash = sourceHash || (content ? generateChecksum(content) : null);

    if (!hash) {
      reply.status(400);
      return { error: 'Either sourceHash or content must be provided' };
    }

    // Check for idempotent registration
    const existing = await pool.query('SELECT id FROM sources WHERE source_hash = $1', [hash]);
    if (existing.rows.length > 0) {
      return { id: existing.rows[0].id, hash, idempotent: true };
    }

    const result = await pool.query(
      `INSERT INTO sources (id, source_hash, source_type, origin_url, ingestion_timestamp, metadata, license_id, retention_policy, created_by)
       VALUES ($1, $2, $3, $4, now(), $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        hash,
        sourceType,
        originUrl || null,
        JSON.stringify(metadata || {}),
        licenseId || null,
        retentionPolicy,
        (request as any).authorityId,
      ],
    );

    await publishEvent('source.registered', 'source', id, {
      sourceId: id,
      sourceHash: hash,
      sourceType,
    });

    server.log.info({ sourceId: id, hash }, 'Registered source');
    return {
      id: result.rows[0].id,
      sourceHash: result.rows[0].source_hash,
      sourceType: result.rows[0].source_type,
      originUrl: result.rows[0].origin_url,
      licenseId: result.rows[0].license_id,
      created_at: result.rows[0].created_at,
    };
  } catch (error: any) {
    server.log.error(error, 'Failed to register source');
    if (error.code === '23505') {
      reply.status(409);
      return { error: 'Source with this hash already exists' };
    }
    reply.status(500);
    return { error: 'Failed to register source' };
  }
});

server.get<{ Params: { id: string } }>('/source/:id', async (request, reply) => {
  const { id } = request.params;
  const result = await pool.query('SELECT * FROM sources WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    reply.status(404);
    return { error: 'Source not found' };
  }

  const row = result.rows[0];
  return {
    id: row.id,
    sourceHash: row.source_hash,
    sourceType: row.source_type,
    originUrl: row.origin_url,
    licenseId: row.license_id,
    custodyChain: row.custody_chain,
    retentionPolicy: row.retention_policy,
    metadata: row.metadata,
    created_at: row.created_at,
  };
});

// ============================================================================
// Transform Registration Endpoints
// ============================================================================

server.post<{ Body: CreateTransform }>('/transform/register', async (request, reply) => {
  try {
    const {
      transformType,
      inputHash,
      outputHash,
      algorithm,
      version,
      parameters,
      durationMs,
      confidence,
      parentTransforms,
      metadata,
    } = request.body;

    const id = generateId('tx');

    const result = await pool.query(
      `INSERT INTO transforms (id, transform_type, input_hash, output_hash, algorithm, version, parameters, execution_timestamp, duration_ms, executed_by, confidence, parent_transforms, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now(), $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        transformType,
        inputHash,
        outputHash,
        algorithm,
        version,
        JSON.stringify(parameters || {}),
        durationMs,
        (request as any).authorityId,
        confidence || null,
        JSON.stringify(parentTransforms || []),
        JSON.stringify(metadata || {}),
      ],
    );

    await publishEvent('transform.registered', 'transform', id, {
      transformId: id,
      transformType,
      inputHash,
      outputHash,
    });

    server.log.info({ transformId: id, transformType }, 'Registered transform');
    return {
      id: result.rows[0].id,
      transformType: result.rows[0].transform_type,
      inputHash: result.rows[0].input_hash,
      outputHash: result.rows[0].output_hash,
      algorithm: result.rows[0].algorithm,
      version: result.rows[0].version,
      durationMs: result.rows[0].duration_ms,
      confidence: result.rows[0].confidence,
      created_at: result.rows[0].created_at,
    };
  } catch (error) {
    server.log.error(error, 'Failed to register transform');
    reply.status(500);
    return { error: 'Failed to register transform' };
  }
});

server.get<{ Params: { id: string } }>('/transform/:id', async (request, reply) => {
  const { id } = request.params;
  const result = await pool.query('SELECT * FROM transforms WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    reply.status(404);
    return { error: 'Transform not found' };
  }

  const row = result.rows[0];
  return {
    id: row.id,
    transformType: row.transform_type,
    inputHash: row.input_hash,
    outputHash: row.output_hash,
    algorithm: row.algorithm,
    version: row.version,
    parameters: row.parameters,
    executionTimestamp: row.execution_timestamp,
    durationMs: row.duration_ms,
    executedBy: row.executed_by,
    confidence: row.confidence,
    parentTransforms: row.parent_transforms,
    metadata: row.metadata,
  };
});

// ============================================================================
// Claims Endpoints
// ============================================================================

server.post<{ Body: CreateClaim }>('/claims', async (request, reply) => {
  try {
    const { content, claimType, signature, metadata, sourceRef, licenseId, policyLabels } =
      request.body;
    const id = generateId('claim');
    const hash = generateHash(content);
    const createdAt = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO claims (id, content, claim_type, hash, signature, metadata, source_ref, license_id, policy_labels, created_at, authority_id, reason_for_access)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        JSON.stringify(content),
        claimType,
        hash,
        signature,
        JSON.stringify(metadata || {}),
        sourceRef,
        licenseId,
        JSON.stringify(policyLabels || []),
        createdAt,
        (request as any).authorityId,
        (request as any).reasonForAccess,
      ],
    );

    server.log.info({ claimId: id, hash, claimType }, 'Created claim');

    return {
      id: result.rows[0].id,
      content: result.rows[0].content,
      claimType: result.rows[0].claim_type,
      hash: result.rows[0].hash,
      signature: result.rows[0].signature,
      metadata: result.rows[0].metadata,
      sourceRef: result.rows[0].source_ref,
      licenseId: result.rows[0].license_id,
      policyLabels: result.rows[0].policy_labels || [],
      created_at: result.rows[0].created_at,
    };
  } catch (error) {
    server.log.error(error, 'Failed to create claim');
    reply.status(500);
    return { error: 'Failed to create claim' };
  }
});

server.get<{ Params: { id: string } }>('/claims/:id', async (request, reply) => {
  const { id } = request.params;
  const result = await pool.query(
    'SELECT id, content, claim_type, hash, signature, metadata, source_ref, license_id, policy_labels, created_at FROM claims WHERE id = $1',
    [id],
  );

  if (result.rows.length === 0) {
    reply.status(404);
    return { error: 'Claim not found' };
  }

  const row = result.rows[0];
  return {
    id: row.id,
    content: row.content,
    claimType: row.claim_type,
    hash: row.hash,
    signature: row.signature,
    metadata: row.metadata,
    sourceRef: row.source_ref,
    licenseId: row.license_id,
    policyLabels: row.policy_labels || [],
    created_at: row.created_at,
  };
});

// ============================================================================
// Claim-Evidence Linking Endpoints
// ============================================================================

server.post<{ Body: LinkEvidence }>('/claim/link-evidence', async (request, reply) => {
  try {
    const { claimId, evidenceId, relationshipType, confidence, metadata } = request.body;

    // Verify claim exists
    const claimResult = await pool.query('SELECT id FROM claims WHERE id = $1', [claimId]);
    if (claimResult.rows.length === 0) {
      reply.status(404);
      return { error: 'Claim not found' };
    }

    // Verify evidence exists
    const evidenceResult = await pool.query('SELECT id FROM evidence WHERE id = $1', [evidenceId]);
    if (evidenceResult.rows.length === 0) {
      reply.status(404);
      return { error: 'Evidence not found' };
    }

    const id = generateId('ce');

    const result = await pool.query(
      `INSERT INTO claim_evidence (id, claim_id, evidence_id, relationship_type, confidence, linked_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (claim_id, evidence_id) DO UPDATE SET
         relationship_type = EXCLUDED.relationship_type,
         confidence = EXCLUDED.confidence,
         metadata = EXCLUDED.metadata
       RETURNING *`,
      [
        id,
        claimId,
        evidenceId,
        relationshipType,
        confidence || null,
        (request as any).authorityId,
        JSON.stringify(metadata || {}),
      ],
    );

    await publishEvent('claim.evidence_linked', 'claim', claimId, {
      claimId,
      evidenceId,
      relationshipType,
    });

    server.log.info({ claimId, evidenceId, relationshipType }, 'Linked evidence to claim');

    return {
      id: result.rows[0].id,
      claimId: result.rows[0].claim_id,
      evidenceId: result.rows[0].evidence_id,
      relationshipType: result.rows[0].relationship_type,
      confidence: result.rows[0].confidence,
      linkedAt: result.rows[0].linked_at,
    };
  } catch (error) {
    server.log.error(error, 'Failed to link evidence to claim');
    reply.status(500);
    return { error: 'Failed to link evidence to claim' };
  }
});

server.get<{ Params: { claimId: string } }>(
  '/claim/:claimId/evidence',
  async (request, reply) => {
    const { claimId } = request.params;

    const result = await pool.query(
      `SELECT ce.*, e.checksum, e.source_ref, e.content_type
       FROM claim_evidence ce
       JOIN evidence e ON ce.evidence_id = e.id
       WHERE ce.claim_id = $1
       ORDER BY ce.linked_at DESC`,
      [claimId],
    );

    return {
      claimId,
      evidence: result.rows.map((row) => ({
        id: row.evidence_id,
        relationshipType: row.relationship_type,
        confidence: row.confidence,
        checksum: row.checksum,
        sourceRef: row.source_ref,
        contentType: row.content_type,
        linkedAt: row.linked_at,
      })),
    };
  },
);

// ============================================================================
// Claim Relationship (Contradicts/Supports) Endpoints
// ============================================================================

server.post<{ Body: ClaimRelationship }>('/claim/contradicts', async (request, reply) => {
  const body = { ...request.body, relationshipType: 'contradicts' as const };
  return createClaimRelationship(request, reply, body);
});

server.post<{ Body: ClaimRelationship }>('/claim/supports', async (request, reply) => {
  const body = { ...request.body, relationshipType: 'supports' as const };
  return createClaimRelationship(request, reply, body);
});

server.post<{ Body: ClaimRelationship }>('/claim/relationship', async (request, reply) => {
  return createClaimRelationship(request, reply, request.body);
});

async function createClaimRelationship(
  request: FastifyRequest,
  reply: any,
  body: ClaimRelationship,
): Promise<any> {
  try {
    const { sourceClaimId, targetClaimId, relationshipType, strength, rationale, metadata } = body;

    if (sourceClaimId === targetClaimId) {
      reply.status(400);
      return { error: 'Cannot create relationship between a claim and itself' };
    }

    // Verify both claims exist
    const claimsResult = await pool.query('SELECT id FROM claims WHERE id = ANY($1)', [
      [sourceClaimId, targetClaimId],
    ]);

    if (claimsResult.rows.length < 2) {
      reply.status(404);
      return { error: 'One or both claims not found' };
    }

    const id = generateId('cr');

    const result = await pool.query(
      `INSERT INTO claim_relationships (id, source_claim_id, target_claim_id, relationship_type, strength, rationale, created_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (source_claim_id, target_claim_id, relationship_type) DO UPDATE SET
         strength = EXCLUDED.strength,
         rationale = EXCLUDED.rationale,
         metadata = EXCLUDED.metadata
       RETURNING *`,
      [
        id,
        sourceClaimId,
        targetClaimId,
        relationshipType,
        strength || null,
        rationale || null,
        (request as any).authorityId,
        JSON.stringify(metadata || {}),
      ],
    );

    await publishEvent(`claim.${relationshipType}`, 'claim', sourceClaimId, {
      sourceClaimId,
      targetClaimId,
      relationshipType,
      strength,
    });

    server.log.info({ sourceClaimId, targetClaimId, relationshipType }, 'Created claim relationship');

    return {
      id: result.rows[0].id,
      sourceClaimId: result.rows[0].source_claim_id,
      targetClaimId: result.rows[0].target_claim_id,
      relationshipType: result.rows[0].relationship_type,
      strength: result.rows[0].strength,
      rationale: result.rows[0].rationale,
      createdAt: result.rows[0].created_at,
    };
  } catch (error) {
    server.log.error(error, 'Failed to create claim relationship');
    reply.status(500);
    return { error: 'Failed to create claim relationship' };
  }
}

server.get<{ Params: { claimId: string } }>(
  '/claim/:claimId/contradictions',
  async (request, reply) => {
    const { claimId } = request.params;

    const result = await pool.query(
      `SELECT cr.*, c.content, c.hash
       FROM claim_relationships cr
       JOIN claims c ON (
         (cr.source_claim_id = $1 AND cr.target_claim_id = c.id)
         OR (cr.target_claim_id = $1 AND cr.source_claim_id = c.id)
       )
       WHERE cr.relationship_type = 'contradicts'
       ORDER BY cr.created_at DESC`,
      [claimId],
    );

    return {
      claimId,
      contradictions: result.rows.map((row) => ({
        claimId: row.source_claim_id === claimId ? row.target_claim_id : row.source_claim_id,
        content: row.content,
        hash: row.hash,
        strength: row.strength,
        rationale: row.rationale,
        createdAt: row.created_at,
      })),
    };
  },
);

server.get<{ Params: { claimId: string } }>(
  '/claim/:claimId/supports',
  async (request, reply) => {
    const { claimId } = request.params;

    const result = await pool.query(
      `SELECT cr.*, c.content, c.hash
       FROM claim_relationships cr
       JOIN claims c ON cr.target_claim_id = c.id
       WHERE cr.source_claim_id = $1 AND cr.relationship_type = 'supports'
       ORDER BY cr.created_at DESC`,
      [claimId],
    );

    return {
      claimId,
      supports: result.rows.map((row) => ({
        claimId: row.target_claim_id,
        content: row.content,
        hash: row.hash,
        strength: row.strength,
        rationale: row.rationale,
        createdAt: row.created_at,
      })),
    };
  },
);

// ============================================================================
// Evidence Endpoints
// ============================================================================

server.post<{ Body: CreateEvidence }>('/evidence/register', async (request, reply) => {
  return registerEvidence(request, reply);
});

server.post<{ Body: CreateEvidence }>('/evidence', async (request, reply) => {
  return registerEvidence(request, reply);
});

async function registerEvidence(request: FastifyRequest<{ Body: CreateEvidence }>, reply: any) {
  try {
    const {
      caseId,
      sourceRef,
      content,
      checksum: providedChecksum,
      checksumAlgorithm = 'sha256',
      contentType,
      fileSize,
      transformChain = [],
      licenseId,
      policyLabels = [],
      metadata,
    } = request.body;

    let checksum = providedChecksum;
    if (!checksum && content) {
      checksum = generateChecksum(content, checksumAlgorithm);
    }

    if (!checksum) {
      reply.status(400);
      return { error: 'Either checksum or content must be provided' };
    }

    // Idempotent check
    const existing = await pool.query(
      'SELECT id FROM evidence WHERE checksum = $1',
      [checksum],
    );
    if (existing.rows.length > 0) {
      const existingEvidence = await pool.query('SELECT * FROM evidence WHERE id = $1', [
        existing.rows[0].id,
      ]);
      return {
        ...formatEvidenceResponse(existingEvidence.rows[0]),
        idempotent: true,
      };
    }

    const id = generateId('evidence');
    const createdAt = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO evidence (id, case_id, source_ref, checksum, checksum_algorithm, content_type, file_size,
       transform_chain, license_id, policy_labels, authority_id, created_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id,
        caseId || null,
        sourceRef,
        checksum,
        checksumAlgorithm,
        contentType || null,
        fileSize || null,
        JSON.stringify(transformChain),
        licenseId || null,
        JSON.stringify(policyLabels),
        (request as any).authorityId,
        createdAt,
        JSON.stringify(metadata || {}),
      ],
    );

    if (caseId) {
      await pool.query(
        `INSERT INTO case_evidence (case_id, evidence_id, added_by)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [caseId, id, (request as any).authorityId],
      );
    }

    server.log.info({ evidenceId: id, caseId, checksum }, 'Registered evidence');

    return formatEvidenceResponse(result.rows[0]);
  } catch (error: any) {
    server.log.error(error, 'Failed to register evidence');
    if (error.code === '23505') {
      reply.status(409);
      return { error: 'Evidence with this checksum already exists' };
    }
    reply.status(500);
    return { error: 'Failed to register evidence' };
  }
}

function formatEvidenceResponse(row: any): Evidence {
  return {
    id: row.id,
    caseId: row.case_id,
    sourceRef: row.source_ref,
    checksum: row.checksum,
    checksumAlgorithm: row.checksum_algorithm,
    contentType: row.content_type,
    fileSize: row.file_size,
    transformChain: row.transform_chain,
    licenseId: row.license_id,
    policyLabels: row.policy_labels || [],
    authorityId: row.authority_id,
    created_at: row.created_at,
    metadata: row.metadata,
  };
}

server.get<{ Params: { id: string } }>('/evidence/:id', async (request, reply) => {
  const { id } = request.params;
  const result = await pool.query('SELECT * FROM evidence WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    reply.status(404);
    return { error: 'Evidence not found' };
  }

  return formatEvidenceResponse(result.rows[0]);
});

// ============================================================================
// Provenance Chain Endpoints
// ============================================================================

server.get<{ Querystring: { claimId: string } }>('/provenance', async (request, reply) => {
  const { claimId } = request.query;

  const result = await pool.query(
    'SELECT * FROM provenance_chains WHERE claim_id = $1 ORDER BY created_at DESC',
    [claimId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    claim_id: row.claim_id,
    transforms: row.transforms,
    sources: row.sources,
    lineage: row.lineage,
    created_at: row.created_at,
  }));
});

server.post<{
  Body: { claimId: string; transforms: string[]; sources: string[]; lineage: any };
}>('/provenance', async (request, reply) => {
  try {
    const { claimId, transforms, sources, lineage } = request.body;
    const id = generateId('prov');
    const createdAt = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO provenance_chains (id, claim_id, transforms, sources, lineage, created_at, authority_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        claimId,
        JSON.stringify(transforms),
        JSON.stringify(sources),
        JSON.stringify(lineage),
        createdAt,
        (request as any).authorityId,
      ],
    );

    server.log.info({ provenanceId: id, claimId }, 'Created provenance chain');

    return {
      id: result.rows[0].id,
      claim_id: result.rows[0].claim_id,
      transforms: result.rows[0].transforms,
      sources: result.rows[0].sources,
      lineage: result.rows[0].lineage,
      created_at: result.rows[0].created_at,
    };
  } catch (error) {
    server.log.error(error, 'Failed to create provenance chain');
    reply.status(500);
    return { error: 'Failed to create provenance chain' };
  }
});

// ============================================================================
// Bundle/Manifest Export Endpoints
// ============================================================================

server.get<{ Params: { caseId: string } }>('/bundles/:caseId', async (request, reply) => {
  try {
    const { caseId } = request.params;

    const caseResult = await pool.query('SELECT id FROM cases WHERE id = $1', [caseId]);
    if (caseResult.rows.length === 0) {
      reply.status(404);
      return { error: 'Case not found' };
    }

    const evidenceResult = await pool.query(
      `SELECT e.* FROM evidence e
       INNER JOIN case_evidence ce ON e.id = ce.evidence_id
       WHERE ce.case_id = $1
       ORDER BY e.created_at ASC`,
      [caseId],
    );

    const evidence = evidenceResult.rows.map((row) => ({
      id: row.id,
      sourceRef: row.source_ref,
      checksum: row.checksum,
      transformChain: row.transform_chain,
    }));

    const leaves = evidenceResult.rows.map((row) => row.checksum);
    const { root, layers } = buildMerkleTree(leaves);

    // Generate inclusion proofs for each evidence item
    const proofs = leaves.map((leaf, index) => ({
      evidenceId: evidence[index].id,
      leafHash: leaf,
      proof: generateMerkleProof(index, layers),
    }));

    server.log.info({ caseId, evidenceCount: evidence.length }, 'Generated disclosure bundle');

    return {
      caseId,
      version: '2.0',
      evidence,
      hashTree: leaves,
      merkleRoot: root,
      merkleProofs: proofs,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    server.log.error(error, 'Failed to generate bundle');
    reply.status(500);
    return { error: 'Failed to generate disclosure bundle' };
  }
});

server.post<{ Body: ExportManifestRequest }>('/manifest/export', async (request, reply) => {
  try {
    const { caseId, evidenceIds, claimIds, manifestType, sign, signerKeyId } = request.body;

    let evidenceItems: any[] = [];
    let claimItems: any[] = [];

    // Fetch evidence
    if (evidenceIds && evidenceIds.length > 0) {
      const result = await pool.query(
        'SELECT id, checksum, source_ref, transform_chain FROM evidence WHERE id = ANY($1)',
        [evidenceIds],
      );
      evidenceItems = result.rows;
    } else if (caseId) {
      const result = await pool.query(
        `SELECT e.id, e.checksum, e.source_ref, e.transform_chain
         FROM evidence e
         INNER JOIN case_evidence ce ON e.id = ce.evidence_id
         WHERE ce.case_id = $1`,
        [caseId],
      );
      evidenceItems = result.rows;
    }

    // Fetch claims
    if (claimIds && claimIds.length > 0) {
      const result = await pool.query(
        'SELECT id, hash, content, claim_type FROM claims WHERE id = ANY($1)',
        [claimIds],
      );
      claimItems = result.rows;
    }

    // Build manifest items
    const items: ManifestItem[] = [
      ...evidenceItems.map((e) => ({
        id: e.id,
        type: 'evidence' as const,
        hash: e.checksum,
        metadata: { sourceRef: e.source_ref, transformChain: e.transform_chain },
      })),
      ...claimItems.map((c) => ({
        id: c.id,
        type: 'claim' as const,
        hash: c.hash,
        metadata: { claimType: c.claim_type },
      })),
    ];

    // Build Merkle tree
    const leaves = items.map((item) => item.hash);
    const { root, layers } = buildMerkleTree(leaves);

    // Generate proofs
    const proofs = leaves.map((leaf, index) => ({
      itemId: items[index].id,
      itemType: items[index].type,
      leafHash: leaf,
      proof: generateMerkleProof(index, layers),
    }));

    const manifestId = generateId('manifest');
    const contentHash = generateHash({ items, merkleRoot: root });

    let signature: string | null = null;
    if (sign && process.env.SIGNING_PRIVATE_KEY) {
      const dataToSign = canonicalizeForSigning({
        manifestId,
        contentHash,
        merkleRoot: root,
        items: items.map((i) => ({ id: i.id, type: i.type, hash: i.hash })),
      });
      signature = signData(dataToSign, process.env.SIGNING_PRIVATE_KEY);
    }

    // Store manifest
    await pool.query(
      `INSERT INTO signed_manifests (id, case_id, manifest_type, content_hash, merkle_root, merkle_tree, signature, signer_key_id, evidence_ids, claim_ids, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        manifestId,
        caseId || null,
        manifestType,
        contentHash,
        root,
        JSON.stringify({ root, layers }),
        signature,
        signerKeyId || null,
        evidenceItems.map((e) => e.id),
        claimItems.map((c) => c.id),
        (request as any).authorityId,
      ],
    );

    // Store proofs
    for (const proof of proofs) {
      await pool.query(
        `INSERT INTO manifest_inclusion_proofs (manifest_id, item_id, item_type, leaf_hash, proof_path)
         VALUES ($1, $2, $3, $4, $5)`,
        [manifestId, proof.itemId, proof.itemType, proof.leafHash, JSON.stringify(proof.proof)],
      );
    }

    server.log.info({ manifestId, itemCount: items.length, manifestType }, 'Created export manifest');

    return {
      manifestId,
      manifestVersion: '2.0.0',
      manifestType,
      caseId,
      contentHash,
      merkleRoot: root,
      items,
      proofs,
      signature: signature || undefined,
      signerKeyId: signerKeyId || undefined,
      signatureAlgorithm: signature ? 'ed25519' : undefined,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    server.log.error(error, 'Failed to generate manifest');
    reply.status(500);
    return { error: 'Failed to generate export manifest' };
  }
});

server.get<{ Params: { manifestId: string } }>(
  '/manifest/:manifestId',
  async (request, reply) => {
    const { manifestId } = request.params;

    const result = await pool.query('SELECT * FROM signed_manifests WHERE id = $1', [manifestId]);

    if (result.rows.length === 0) {
      reply.status(404);
      return { error: 'Manifest not found' };
    }

    const row = result.rows[0];

    // Get proofs
    const proofsResult = await pool.query(
      'SELECT * FROM manifest_inclusion_proofs WHERE manifest_id = $1',
      [manifestId],
    );

    return {
      manifestId: row.id,
      manifestVersion: row.manifest_version,
      manifestType: row.manifest_type,
      caseId: row.case_id,
      contentHash: row.content_hash,
      merkleRoot: row.merkle_root,
      evidenceIds: row.evidence_ids,
      claimIds: row.claim_ids,
      signature: row.signature,
      signerKeyId: row.signer_key_id,
      signatureAlgorithm: row.signature_algorithm,
      proofs: proofsResult.rows.map((p) => ({
        itemId: p.item_id,
        itemType: p.item_type,
        leafHash: p.leaf_hash,
        proof: p.proof_path,
      })),
      created_at: row.created_at,
    };
  },
);

// ============================================================================
// Verification Endpoints
// ============================================================================

server.post<{ Body: { content: any; expectedHash: string } }>(
  '/hash/verify',
  async (request, reply) => {
    const { content, expectedHash } = request.body;
    const actualHash = generateHash(content);
    const isValid = actualHash === expectedHash;

    return {
      valid: isValid,
      expected_hash: expectedHash,
      actual_hash: actualHash,
      verified_at: new Date().toISOString(),
    };
  },
);

server.post<{ Body: VerifyManifestRequest }>('/manifest/verify', async (request, reply) => {
  try {
    const { manifestId, publicKey } = request.body;

    const result = await pool.query('SELECT * FROM signed_manifests WHERE id = $1', [manifestId]);

    if (result.rows.length === 0) {
      reply.status(404);
      return { error: 'Manifest not found' };
    }

    const manifest = result.rows[0];
    const merkleTree = manifest.merkle_tree;

    // Verify Merkle root
    const proofsResult = await pool.query(
      'SELECT * FROM manifest_inclusion_proofs WHERE manifest_id = $1',
      [manifestId],
    );

    let merkleValid = true;
    const itemVerifications: any[] = [];

    for (const proof of proofsResult.rows) {
      const isValid = verifyMerkleProof(proof.leaf_hash, proof.proof_path, manifest.merkle_root);
      merkleValid = merkleValid && isValid;
      itemVerifications.push({
        itemId: proof.item_id,
        itemType: proof.item_type,
        leafHash: proof.leaf_hash,
        valid: isValid,
      });
    }

    // Verify signature if present
    let signatureValid: boolean | null = null;
    if (manifest.signature && publicKey) {
      const dataToVerify = canonicalizeForSigning({
        manifestId,
        contentHash: manifest.content_hash,
        merkleRoot: manifest.merkle_root,
        items: itemVerifications.map((i) => ({
          id: i.itemId,
          type: i.itemType,
          hash: i.leafHash,
        })),
      });
      signatureValid = verifySignature(dataToVerify, manifest.signature, publicKey);
    }

    // Log verification attempt
    const verificationId = generateId('verify');
    await pool.query(
      `INSERT INTO verification_logs (id, manifest_id, verified_by, bundle_valid, signature_valid, merkle_valid, items_valid, items_total, verification_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        verificationId,
        manifestId,
        (request as any).authorityId,
        merkleValid && (signatureValid !== false),
        signatureValid ?? true,
        merkleValid,
        itemVerifications.filter((v) => v.valid).length,
        itemVerifications.length,
        JSON.stringify({ itemVerifications }),
      ],
    );

    return {
      valid: merkleValid && (signatureValid !== false),
      manifestId,
      merkleRoot: manifest.merkle_root,
      merkleValid,
      signatureValid,
      itemsVerified: itemVerifications.length,
      itemsValid: itemVerifications.filter((v) => v.valid).length,
      itemVerifications,
      verified_at: new Date().toISOString(),
    };
  } catch (error) {
    server.log.error(error, 'Failed to verify manifest');
    reply.status(500);
    return { error: 'Failed to verify manifest' };
  }
});

server.post<{ Body: { leafHash: string; proof: MerkleProof[]; merkleRoot: string } }>(
  '/proof/verify',
  async (request, reply) => {
    const { leafHash, proof, merkleRoot } = request.body;
    const isValid = verifyMerkleProof(leafHash, proof, merkleRoot);

    return {
      valid: isValid,
      leafHash,
      merkleRoot,
      proofLength: proof.length,
      verified_at: new Date().toISOString(),
    };
  },
);

// ============================================================================
// Legacy Export Endpoint (backward compatibility)
// ============================================================================

server.get('/export/manifest', async (request, reply) => {
  try {
    const claimsResult = await pool.query(`
      SELECT c.id, c.hash,
             COALESCE(array_agg(pc.transforms ORDER BY pc.created_at), ARRAY[]::jsonb[]) as transforms
      FROM claims c
      LEFT JOIN provenance_chains pc ON c.id = pc.claim_id
      GROUP BY c.id, c.hash
      ORDER BY c.created_at DESC
    `);

    const claims = claimsResult.rows.map((row) => ({
      id: row.id,
      hash: row.hash,
      transforms: row.transforms.filter((t: any) => t !== null),
    }));

    const hashChain = generateHash(claims.map((c) => c.hash).join(''));

    return {
      version: '1.0',
      claims,
      hash_chain: hashChain,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    server.log.error(error, 'Failed to generate manifest');
    reply.status(500);
    return { error: 'Failed to generate manifest' };
  }
});

// ============================================================================
// Kafka Event Polling (background job)
// ============================================================================

async function pollAndPublishEvents(): Promise<void> {
  if (!KAFKA_ENABLED || !kafkaProducer) return;

  try {
    const result = await pool.query(
      `SELECT * FROM provenance_events
       WHERE published_at IS NULL
       ORDER BY created_at ASC
       LIMIT 100`,
    );

    for (const event of result.rows) {
      try {
        await kafkaProducer.send({
          topic: `provenance.${event.aggregate_type}.events`,
          messages: [
            {
              key: event.aggregate_id,
              value: JSON.stringify({
                eventType: event.event_type,
                aggregateType: event.aggregate_type,
                aggregateId: event.aggregate_id,
                payload: event.payload,
                timestamp: event.created_at,
              }),
            },
          ],
        });

        await pool.query('UPDATE provenance_events SET published_at = now() WHERE id = $1', [
          event.id,
        ]);
      } catch (err: any) {
        await pool.query('UPDATE provenance_events SET publish_error = $1 WHERE id = $2', [
          err.message,
          event.id,
        ]);
      }
    }
  } catch (error) {
    server.log.error(error, 'Failed to poll and publish events');
  }
}

// ============================================================================
// Server Startup
// ============================================================================

const start = async () => {
  try {
    // Initialize Kafka if enabled
    if (KAFKA_ENABLED) {
      try {
        const { Kafka } = await import('kafkajs');
        const kafka = new Kafka({
          clientId: 'prov-ledger',
          brokers: KAFKA_BROKERS.split(','),
        });
        kafkaProducer = kafka.producer();
        await kafkaProducer.connect();
        server.log.info('Connected to Kafka');

        // Start event polling
        setInterval(pollAndPublishEvents, 5000);
      } catch (err) {
        server.log.warn('Failed to connect to Kafka, events will be stored in outbox only');
      }
    }

    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(`Prov-Ledger service ready at http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
