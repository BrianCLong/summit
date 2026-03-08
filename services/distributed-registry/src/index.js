"use strict";
/**
 * Distributed Registry Service
 *
 * Provides peer discovery, DHT-based routing, and coordination
 * for the decentralized data ecosystem.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationService = exports.consensusManager = exports.peerRegistry = void 0;
const fastify_1 = __importDefault(require("fastify"));
const zod_1 = require("zod");
const peer_registry_js_1 = require("./peer-registry.js");
const consensus_manager_js_1 = require("./consensus-manager.js");
const verification_service_js_1 = require("./verification-service.js");
const PeerSchema = zod_1.z.object({
    peerId: zod_1.z.string(),
    publicKey: zod_1.z.string(),
    endpoints: zod_1.z.array(zod_1.z.string()),
    capabilities: zod_1.z.array(zod_1.z.string()),
    attestations: zod_1.z.array(zod_1.z.object({
        issuer: zod_1.z.string(),
        claim: zod_1.z.string(),
        signature: zod_1.z.string(),
        expiresAt: zod_1.z.string().datetime(),
    })).optional(),
});
const DataPoolSchema = zod_1.z.object({
    poolId: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    owner: zod_1.z.string(),
    contributors: zod_1.z.array(zod_1.z.string()),
    accessPolicy: zod_1.z.object({
        type: zod_1.z.enum(['public', 'permissioned', 'private']),
        requiredAttestations: zod_1.z.array(zod_1.z.string()).optional(),
        minTrustScore: zod_1.z.number().optional(),
    }),
    dataSchema: zod_1.z.record(zod_1.z.unknown()),
    createdAt: zod_1.z.string().datetime(),
});
const fastify = (0, fastify_1.default)({ logger: true });
const peerRegistry = new peer_registry_js_1.PeerRegistry();
exports.peerRegistry = peerRegistry;
const consensusManager = new consensus_manager_js_1.ConsensusManager();
exports.consensusManager = consensusManager;
const verificationService = new verification_service_js_1.VerificationService();
exports.verificationService = verificationService;
// Health check
fastify.get('/health', async () => ({ status: 'healthy', service: 'distributed-registry' }));
// Peer registration
fastify.post('/peers/register', async (request) => {
    const peer = PeerSchema.parse(request.body);
    const verified = await verificationService.verifyPeer(peer);
    if (!verified) {
        throw new Error('Peer verification failed');
    }
    await peerRegistry.register(peer);
    return { success: true, peerId: peer.peerId };
});
// Peer discovery
fastify.get('/peers', async (request) => {
    const { capability, minTrust } = request.query;
    const peers = await peerRegistry.discover({
        capability,
        minTrustScore: minTrust ? parseFloat(minTrust) : undefined,
    });
    return { peers };
});
// Data pool registration
fastify.post('/pools/register', async (request) => {
    const pool = DataPoolSchema.parse(request.body);
    const consensusResult = await consensusManager.proposePoolRegistration(pool);
    if (!consensusResult.accepted) {
        throw new Error('Consensus not reached for pool registration');
    }
    return { success: true, poolId: pool.poolId, consensusProof: consensusResult.proof };
});
// Pool discovery
fastify.get('/pools', async (request) => {
    const { owner, accessType } = request.query;
    const pools = await peerRegistry.discoverPools({ owner, accessType });
    return { pools };
});
// Consensus participation
fastify.post('/consensus/vote', async (request) => {
    const { proposalId, vote, signature } = request.body;
    await consensusManager.submitVote(proposalId, vote, signature);
    return { success: true };
});
const start = async () => {
    const port = parseInt(process.env.PORT || '3100');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Distributed Registry listening on port ${port}`);
};
start().catch(console.error);
