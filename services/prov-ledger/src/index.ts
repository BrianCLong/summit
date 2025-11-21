/**
 * Provenance and Claims Ledger Service
 * Handles evidence/claim registration, provenance chains, and export manifests
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { z } from 'zod';
import { Pool } from 'pg';
import crypto from 'crypto';

const PORT = parseInt(process.env.PORT || '4010');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database connection with retry logic
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/provenance',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Helper for flexible records
const anyRecord = () => z.record(z.string(), z.any());

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const CreateClaimSchema = z.object({
  content: anyRecord(),
  signature: z.string().optional(),
  metadata: anyRecord().optional(),
  sourceRef: z.string().optional(),
  licenseId: z.string().optional(),
  policyLabels: z.array(z.string()).optional(),
});

const ClaimSchema = z.object({
  id: z.string(),
  content: anyRecord(),
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
  content: z.any().optional(), // For computing checksum if not provided
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

const ProvenanceChainSchema = z.object({
  id: z.string(),
  claim_id: z.string(),
  transforms: z.array(z.string()),
  sources: z.array(z.string()),
  lineage: anyRecord(),
  created_at: z.string().datetime(),
});

const DisclosureBundleSchema = z.object({
  caseId: z.string(),
  version: z.string(),
  evidence: z.array(
    z.object({
      id: z.string(),
      sourceRef: z.string(),
      checksum: z.string(),
      transformChain: z.array(TransformStepSchema),
    }),
  ),
  hashTree: z.array(z.string()),
  merkleRoot: z.string(),
  generated_at: z.string().datetime(),
});

const ManifestSchema = z.object({
  version: z.string(),
  claims: z.array(
    z.object({
      id: z.string(),
      hash: z.string(),
      transforms: z.array(z.string()),
    }),
  ),
  hash_chain: z.string(),
  signature: z.string().optional(),
  generated_at: z.string().datetime(),
});

// ============================================================================
// TypeScript Types
// ============================================================================

type CreateClaim = z.infer<typeof CreateClaimSchema>;
type Claim = z.infer<typeof ClaimSchema>;
type TransformStep = z.infer<typeof TransformStepSchema>;
type CreateEvidence = z.infer<typeof CreateEvidenceSchema>;
type Evidence = z.infer<typeof EvidenceSchema>;
type ProvenanceChain = z.infer<typeof ProvenanceChainSchema>;
type DisclosureBundle = z.infer<typeof DisclosureBundleSchema>;
type Manifest = z.infer<typeof ManifestSchema>;

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

function generateClaimId(): string {
  return `claim_${crypto.randomUUID()}`;
}

function generateEvidenceId(): string {
  return `evidence_${crypto.randomUUID()}`;
}

function generateProvenanceId(): string {
  return `prov_${crypto.randomUUID()}`;
}

function generateCaseId(): string {
  return `case_${crypto.randomUUID()}`;
}

function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  if (hashes.length === 1) return hashes[0];

  // Simple merkle tree: hash pairs recursively
  const newLevel: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    if (i + 1 < hashes.length) {
      const combined = hashes[i] + hashes[i + 1];
      newLevel.push(generateChecksum(combined));
    } else {
      newLevel.push(hashes[i]);
    }
  }

  return computeMerkleRoot(newLevel);
}

// Policy enforcement middleware
async function policyMiddleware(request: any, reply: any) {
  const authorityId = request.headers['x-authority-id'];
  const reasonForAccess = request.headers['x-reason-for-access'];

  if (!authorityId || !reasonForAccess) {
    const dryRun = process.env.POLICY_DRY_RUN === 'true';

    if (dryRun) {
      request.log.warn({
        missingAuth: !authorityId,
        missingReason: !reasonForAccess,
      }, 'Policy violation in dry-run mode');
      request.policyWarnings = request.policyWarnings || [];
      request.policyWarnings.push({
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

  request.authorityId = authorityId;
  request.reasonForAccess = reasonForAccess;
}

// Create Fastify instance
const server: FastifyInstance = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'debug' : 'info',
    ...(NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty' } }
      : {}),
  },
});

// Register plugins
server.register(helmet);
server.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
});

// Add policy middleware to all routes
server.addHook('preHandler', policyMiddleware);

// Health check
server.get('/health', async (request, reply) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      dependencies: {
        database: 'healthy',
      },
    };
  } catch (error) {
    reply.status(503);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: 'unhealthy',
      },
    };
  }
});

// ============================================================================
// Claims Endpoints
// ============================================================================

// Create claim
server.post<{ Body: CreateClaim }>(
  '/claims',
  {
    schema: {
      body: CreateClaimSchema,
    },
  },
  async (request, reply) => {
    try {
      const { content, signature, metadata, sourceRef, licenseId, policyLabels } = request.body;
      const id = generateClaimId();
      const hash = generateHash(content);
      const createdAt = new Date().toISOString();

      const result = await pool.query(
        `INSERT INTO claims (id, content, hash, signature, metadata, source_ref, license_id, policy_labels, created_at, authority_id, reason_for_access)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
        [
          id,
          JSON.stringify(content),
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

      const claim: Claim = {
        id: result.rows[0].id,
        content: result.rows[0].content,
        hash: result.rows[0].hash,
        signature: result.rows[0].signature,
        metadata: result.rows[0].metadata,
        sourceRef: result.rows[0].source_ref,
        licenseId: result.rows[0].license_id,
        policyLabels: result.rows[0].policy_labels || [],
        created_at: result.rows[0].created_at,
      };

      server.log.info({
        claimId: id,
        hash,
        authority: (request as any).authorityId,
      }, 'Created claim');

      return claim;
    } catch (error) {
      server.log.error(error, 'Failed to create claim');
      reply.status(500);
      return { error: 'Failed to create claim' };
    }
  },
);

// Get claim by ID
server.get<{ Params: { id: string } }>(
  '/claims/:id',
  async (request, reply) => {
    try {
      const { id } = request.params;

      const result = await pool.query(
        'SELECT id, content, hash, signature, metadata, source_ref, license_id, policy_labels, created_at FROM claims WHERE id = $1',
        [id],
      );

      if (result.rows.length === 0) {
        reply.status(404);
        return { error: 'Claim not found' };
      }

      const claim: Claim = {
        id: result.rows[0].id,
        content: result.rows[0].content,
        hash: result.rows[0].hash,
        signature: result.rows[0].signature,
        metadata: result.rows[0].metadata,
        sourceRef: result.rows[0].source_ref,
        licenseId: result.rows[0].license_id,
        policyLabels: result.rows[0].policy_labels || [],
        created_at: result.rows[0].created_at,
      };

      return claim;
    } catch (error) {
      server.log.error(error, 'Failed to get claim');
      reply.status(500);
      return { error: 'Failed to retrieve claim' };
    }
  },
);

// Get provenance by claim ID
server.get<{ Querystring: { claimId: string } }>(
  '/provenance',
  async (request, reply) => {
    try {
      const { claimId } = request.query;

      const result = await pool.query(
        'SELECT * FROM provenance_chains WHERE claim_id = $1 ORDER BY created_at DESC',
        [claimId],
      );

      const chains: ProvenanceChain[] = result.rows.map((row) => ({
        id: row.id,
        claim_id: row.claim_id,
        transforms: row.transforms,
        sources: row.sources,
        lineage: row.lineage,
        created_at: row.created_at,
      }));

      return chains;
    } catch (error) {
      server.log.error(error, 'Failed to get provenance');
      reply.status(500);
      return { error: 'Failed to retrieve provenance' };
    }
  },
);

// Create provenance chain
server.post<{
  Body: {
    claimId: string;
    transforms: string[];
    sources: string[];
    lineage: any;
  };
}>('/provenance', async (request, reply) => {
  try {
    const { claimId, transforms, sources, lineage } = request.body;
    const id = generateProvenanceId();
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

    const chain: ProvenanceChain = {
      id: result.rows[0].id,
      claim_id: result.rows[0].claim_id,
      transforms: result.rows[0].transforms,
      sources: result.rows[0].sources,
      lineage: result.rows[0].lineage,
      created_at: result.rows[0].created_at,
    };

    server.log.info({
      provenanceId: id,
      claimId,
      authority: (request as any).authorityId,
    }, 'Created provenance chain');

    return chain;
  } catch (error) {
    server.log.error(error, 'Failed to create provenance chain');
    reply.status(500);
    return { error: 'Failed to create provenance chain' };
  }
});

// ============================================================================
// Evidence Endpoints
// ============================================================================

// Register evidence
server.post<{ Body: CreateEvidence }>(
  '/evidence',
  {
    schema: {
      body: CreateEvidenceSchema,
    },
  },
  async (request, reply) => {
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

      // Compute checksum if not provided
      let checksum = providedChecksum;
      if (!checksum && content) {
        checksum = generateChecksum(content, checksumAlgorithm);
      }

      if (!checksum) {
        reply.status(400);
        return { error: 'Either checksum or content must be provided' };
      }

      const id = generateEvidenceId();
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

      // Link to case if caseId provided
      if (caseId) {
        await pool.query(
          `INSERT INTO case_evidence (case_id, evidence_id, added_by)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [caseId, id, (request as any).authorityId],
        );
      }

      const evidence: Evidence = {
        id: result.rows[0].id,
        caseId: result.rows[0].case_id,
        sourceRef: result.rows[0].source_ref,
        checksum: result.rows[0].checksum,
        checksumAlgorithm: result.rows[0].checksum_algorithm,
        contentType: result.rows[0].content_type,
        fileSize: result.rows[0].file_size,
        transformChain: result.rows[0].transform_chain,
        licenseId: result.rows[0].license_id,
        policyLabels: result.rows[0].policy_labels || [],
        authorityId: result.rows[0].authority_id,
        created_at: result.rows[0].created_at,
        metadata: result.rows[0].metadata,
      };

      server.log.info({
        evidenceId: id,
        caseId,
        checksum,
        authority: (request as any).authorityId,
      }, 'Registered evidence');

      return evidence;
    } catch (error: any) {
      server.log.error(error, 'Failed to register evidence');
      if (error.code === '23505') {
        // Unique constraint violation
        reply.status(409);
        return { error: 'Evidence with this checksum already exists' };
      }
      reply.status(500);
      return { error: 'Failed to register evidence' };
    }
  },
);

// Get evidence by ID
server.get<{ Params: { id: string } }>(
  '/evidence/:id',
  async (request, reply) => {
    try {
      const { id } = request.params;

      const result = await pool.query(
        'SELECT * FROM evidence WHERE id = $1',
        [id],
      );

      if (result.rows.length === 0) {
        reply.status(404);
        return { error: 'Evidence not found' };
      }

      const row = result.rows[0];
      const evidence: Evidence = {
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

      return evidence;
    } catch (error) {
      server.log.error(error, 'Failed to get evidence');
      reply.status(500);
      return { error: 'Failed to retrieve evidence' };
    }
  },
);

// ============================================================================
// Bundle Endpoints
// ============================================================================

// Get disclosure bundle for a case
server.get<{ Params: { caseId: string } }>(
  '/bundles/:caseId',
  async (request, reply) => {
    try {
      const { caseId } = request.params;

      // Verify case exists
      const caseResult = await pool.query(
        'SELECT id FROM cases WHERE id = $1',
        [caseId],
      );

      if (caseResult.rows.length === 0) {
        reply.status(404);
        return { error: 'Case not found' };
      }

      // Get all evidence for the case
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

      // Build hash tree (list of all checksums)
      const hashTree = evidenceResult.rows.map((row) => row.checksum);

      // Compute merkle root
      const merkleRoot = computeMerkleRoot(hashTree);

      const bundle: DisclosureBundle = {
        caseId,
        version: '1.0',
        evidence,
        hashTree,
        merkleRoot,
        generated_at: new Date().toISOString(),
      };

      server.log.info({
        caseId,
        evidenceCount: evidence.length,
        authority: (request as any).authorityId,
      }, 'Generated disclosure bundle');

      return bundle;
    } catch (error) {
      server.log.error(error, 'Failed to generate bundle');
      reply.status(500);
      return { error: 'Failed to generate disclosure bundle' };
    }
  },
);

// ============================================================================
// Verification Endpoints
// ============================================================================

// Verify hash
server.post<{ Body: { content: any; expectedHash: string } }>(
  '/hash/verify',
  async (request, reply) => {
    try {
      const { content, expectedHash } = request.body;
      const actualHash = generateHash(content);
      const isValid = actualHash === expectedHash;

      return {
        valid: isValid,
        expected_hash: expectedHash,
        actual_hash: actualHash,
        verified_at: new Date().toISOString(),
      };
    } catch (error) {
      server.log.error(error, 'Failed to verify hash');
      reply.status(500);
      return { error: 'Hash verification failed' };
    }
  },
);

// Export manifest
server.get('/export/manifest', async (request, reply) => {
  try {
    // Get all claims with provenance
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

    // Generate hash chain
    const hashChain = generateHash(claims.map((c) => c.hash).join(''));

    const manifest: Manifest = {
      version: '1.0',
      claims,
      hash_chain: hashChain,
      generated_at: new Date().toISOString(),
    };

    server.log.info({
      claimCount: claims.length,
      authority: (request as any).authorityId,
    }, 'Generated export manifest');

    return manifest;
  } catch (error) {
    server.log.error(error, 'Failed to generate manifest');
    reply.status(500);
    return { error: 'Failed to generate manifest' };
  }
});

// Start server
const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(
      `🗃️  Prov-Ledger service ready at http://localhost:${PORT}`,
    );
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
