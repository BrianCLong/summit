/**
 * Provenance and Claims Ledger Service
 * Consolidated from multiple scattered prov-ledger implementations
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { z } from 'zod';
import { Pool } from 'pg';
import crypto from 'crypto';

const PORT = parseInt(process.env.PORT || '4010');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database connection
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/provenance',
});

// Schemas
const CreateClaimSchema = z.object({
  content: z.record(z.any()),
  signature: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const ClaimSchema = z.object({
  id: z.string(),
  content: z.record(z.any()),
  hash: z.string(),
  signature: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime(),
});

const ProvenanceChainSchema = z.object({
  id: z.string(),
  claim_id: z.string(),
  transforms: z.array(z.string()),
  sources: z.array(z.string()),
  lineage: z.record(z.any()),
  created_at: z.string().datetime(),
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

type CreateClaim = z.infer<typeof CreateClaimSchema>;
type Claim = z.infer<typeof ClaimSchema>;
type ProvenanceChain = z.infer<typeof ProvenanceChainSchema>;
type Manifest = z.infer<typeof ManifestSchema>;

// Utility functions
function generateHash(content: any): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(content, Object.keys(content).sort()))
    .digest('hex');
}

function generateClaimId(): string {
  return `claim_${crypto.randomUUID()}`;
}

function generateProvenanceId(): string {
  return `prov_${crypto.randomUUID()}`;
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
      const { content, signature, metadata } = request.body;
      const id = generateClaimId();
      const hash = generateHash(content);
      const createdAt = new Date().toISOString();

      const result = await pool.query(
        `INSERT INTO claims (id, content, hash, signature, metadata, created_at, authority_id, reason_for_access)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
        [
          id,
          JSON.stringify(content),
          hash,
          signature,
          JSON.stringify(metadata),
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
        'SELECT id, content, hash, signature, metadata, created_at FROM claims WHERE id = $1',
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
