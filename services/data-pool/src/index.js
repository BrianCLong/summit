"use strict";
/**
 * Data Pool Service
 *
 * Manages decentralized data pools with automatic verification,
 * content-addressed storage, and auditable permissions.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionAuditor = exports.contributionTracker = exports.poolManager = void 0;
const fastify_1 = __importDefault(require("fastify"));
const zod_1 = require("zod");
const data_pool_manager_js_1 = require("./data-pool-manager.js");
const contribution_tracker_js_1 = require("./contribution-tracker.js");
const permission_auditor_js_1 = require("./permission-auditor.js");
const ContributionSchema = zod_1.z.object({
    poolId: zod_1.z.string(),
    contributorId: zod_1.z.string(),
    data: zod_1.z.unknown(),
    metadata: zod_1.z.object({
        contentHash: zod_1.z.string(),
        size: zod_1.z.number(),
        mimeType: zod_1.z.string().optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    signature: zod_1.z.string(),
});
const AccessRequestSchema = zod_1.z.object({
    poolId: zod_1.z.string(),
    requesterId: zod_1.z.string(),
    purpose: zod_1.z.string(),
    attestations: zod_1.z.array(zod_1.z.string()).optional(),
    signature: zod_1.z.string(),
});
const fastify = (0, fastify_1.default)({ logger: true });
const poolManager = new data_pool_manager_js_1.DataPoolManager();
exports.poolManager = poolManager;
const contributionTracker = new contribution_tracker_js_1.ContributionTracker();
exports.contributionTracker = contributionTracker;
const permissionAuditor = new permission_auditor_js_1.PermissionAuditor();
exports.permissionAuditor = permissionAuditor;
fastify.get('/health', async () => ({ status: 'healthy', service: 'data-pool' }));
// Contribute data to pool
fastify.post('/pools/:poolId/contribute', async (request) => {
    const contribution = ContributionSchema.parse({
        ...request.body,
        poolId: request.params.poolId,
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
        ...request.body,
        poolId: request.params.poolId,
    });
    const accessResult = await poolManager.requestAccess(accessRequest);
    await permissionAuditor.logAccessRequest(accessRequest, accessResult);
    return accessResult;
});
// Query pool data
fastify.get('/pools/:poolId/data', async (request) => {
    const { poolId } = request.params;
    const { query, accessToken } = request.query;
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
    const { poolId } = request.params;
    const stats = await poolManager.getPoolStats(poolId);
    return { stats };
});
// Get contribution history
fastify.get('/pools/:poolId/contributions', async (request) => {
    const { poolId } = request.params;
    const contributions = await contributionTracker.getContributions(poolId);
    return { contributions };
});
// Audit trail
fastify.get('/pools/:poolId/audit', async (request) => {
    const { poolId } = request.params;
    const { from, to } = request.query;
    const auditLog = await permissionAuditor.getAuditLog(poolId, from, to);
    return { auditLog };
});
const start = async () => {
    const port = parseInt(process.env.PORT || '3101');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Data Pool Service listening on port ${port}`);
};
start().catch(console.error);
