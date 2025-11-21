/**
 * Distributed Registry Service
 *
 * Provides peer discovery, DHT-based routing, and coordination
 * for the decentralized data ecosystem.
 */

import Fastify from 'fastify';
import { z } from 'zod';
import { PeerRegistry } from './peer-registry.js';
import { ConsensusManager } from './consensus-manager.js';
import { VerificationService } from './verification-service.js';

const PeerSchema = z.object({
  peerId: z.string(),
  publicKey: z.string(),
  endpoints: z.array(z.string()),
  capabilities: z.array(z.string()),
  attestations: z.array(z.object({
    issuer: z.string(),
    claim: z.string(),
    signature: z.string(),
    expiresAt: z.string().datetime(),
  })).optional(),
});

const DataPoolSchema = z.object({
  poolId: z.string(),
  name: z.string(),
  description: z.string(),
  owner: z.string(),
  contributors: z.array(z.string()),
  accessPolicy: z.object({
    type: z.enum(['public', 'permissioned', 'private']),
    requiredAttestations: z.array(z.string()).optional(),
    minTrustScore: z.number().optional(),
  }),
  dataSchema: z.record(z.unknown()),
  createdAt: z.string().datetime(),
});

export type Peer = z.infer<typeof PeerSchema>;
export type DataPool = z.infer<typeof DataPoolSchema>;

const fastify = Fastify({ logger: true });
const peerRegistry = new PeerRegistry();
const consensusManager = new ConsensusManager();
const verificationService = new VerificationService();

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
  const { capability, minTrust } = request.query as { capability?: string; minTrust?: string };
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
  const { owner, accessType } = request.query as { owner?: string; accessType?: string };
  const pools = await peerRegistry.discoverPools({ owner, accessType });
  return { pools };
});

// Consensus participation
fastify.post('/consensus/vote', async (request) => {
  const { proposalId, vote, signature } = request.body as {
    proposalId: string;
    vote: boolean;
    signature: string;
  };
  await consensusManager.submitVote(proposalId, vote, signature);
  return { success: true };
});

const start = async () => {
  const port = parseInt(process.env.PORT || '3100');
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`Distributed Registry listening on port ${port}`);
};

start().catch(console.error);

export { peerRegistry, consensusManager, verificationService };
