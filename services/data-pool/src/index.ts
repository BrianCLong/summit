/**
 * Data Pool Service
 *
 * Manages decentralized data pools with automatic verification,
 * content-addressed storage, and auditable permissions.
 */

import Fastify from 'fastify';
import { z } from 'zod';
import { DataPoolManager } from './data-pool-manager.js';
import { ContributionTracker } from './contribution-tracker.js';
import { PermissionAuditor } from './permission-auditor.js';

const ContributionSchema = z.object({
  poolId: z.string(),
  contributorId: z.string(),
  data: z.unknown(),
  metadata: z.object({
    contentHash: z.string(),
    size: z.number(),
    mimeType: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  signature: z.string(),
});

const AccessRequestSchema = z.object({
  poolId: z.string(),
  requesterId: z.string(),
  purpose: z.string(),
  attestations: z.array(z.string()).optional(),
  signature: z.string(),
});

export type Contribution = z.infer<typeof ContributionSchema>;
export type AccessRequest = z.infer<typeof AccessRequestSchema>;

const fastify = Fastify({ logger: true });
const poolManager = new DataPoolManager();
const contributionTracker = new ContributionTracker();
const permissionAuditor = new PermissionAuditor();

fastify.get('/health', async () => ({ status: 'healthy', service: 'data-pool' }));

// Contribute data to pool
fastify.post('/pools/:poolId/contribute', async (request) => {
  const contribution = ContributionSchema.parse({
    ...(request.body as object),
    poolId: (request.params as { poolId: string }).poolId,
  });

  const result = await poolManager.addContribution(contribution);
  await contributionTracker.track(contribution, result);
  await permissionAuditor.logContribution(contribution);

  return {
    success: true,
    contributionId: result.contributionId,
    merkleProof: result.merkleProof,
  };
});

// Request data access
fastify.post('/pools/:poolId/access', async (request) => {
  const accessRequest = AccessRequestSchema.parse({
    ...(request.body as object),
    poolId: (request.params as { poolId: string }).poolId,
  });

  const accessResult = await poolManager.requestAccess(accessRequest);
  await permissionAuditor.logAccessRequest(accessRequest, accessResult);

  return accessResult;
});

// Query pool data
fastify.get('/pools/:poolId/data', async (request) => {
  const { poolId } = request.params as { poolId: string };
  const { query, accessToken } = request.query as { query?: string; accessToken: string };

  const verified = await poolManager.verifyAccessToken(poolId, accessToken);
  if (!verified) {
    throw new Error('Invalid or expired access token');
  }

  const data = await poolManager.queryData(poolId, query);
  await permissionAuditor.logDataAccess(poolId, accessToken, query);

  return { data };
});

// Get pool statistics
fastify.get('/pools/:poolId/stats', async (request) => {
  const { poolId } = request.params as { poolId: string };
  const stats = await poolManager.getPoolStats(poolId);
  return { stats };
});

// Get contribution history
fastify.get('/pools/:poolId/contributions', async (request) => {
  const { poolId } = request.params as { poolId: string };
  const contributions = await contributionTracker.getContributions(poolId);
  return { contributions };
});

// Audit trail
fastify.get('/pools/:poolId/audit', async (request) => {
  const { poolId } = request.params as { poolId: string };
  const { from, to } = request.query as { from?: string; to?: string };
  const auditLog = await permissionAuditor.getAuditLog(poolId, from, to);
  return { auditLog };
});

const start = async () => {
  const port = parseInt(process.env.PORT || '3101');
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`Data Pool Service listening on port ${port}`);
};

start().catch(console.error);

export { poolManager, contributionTracker, permissionAuditor };
