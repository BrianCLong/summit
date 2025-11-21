import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import pino from 'pino';
import crypto from 'crypto';

import { BallotLedger } from './blockchain/ballot-ledger.js';
import { DifferentialPrivacyEngine, HomomorphicTallying } from './privacy/differential-privacy.js';
import { RealTimeAggregator, RankedChoiceTabulator } from './results/real-time-aggregator.js';
import { CitizenDeliberationPlatform, ContentModerator } from './feedback/citizen-deliberation.js';
import {
  ElectionSchema,
  EncryptedBallotSchema,
  VoteSelectionSchema,
  type Election,
  type EncryptedBallot,
} from './types/election.js';

const PORT = parseInt(process.env.PORT || '4020', 10);
const HOST = process.env.HOST || '0.0.0.0';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

// Initialize core services
const ballotLedger = new BallotLedger(4, 50);
const privacyEngine = new DifferentialPrivacyEngine({ epsilon: 1.0, delta: 1e-5, sensitivity: 1 });
const homomorphicTally = new HomomorphicTallying();
const resultsAggregator = new RealTimeAggregator();
const deliberationPlatform = new CitizenDeliberationPlatform();
const contentModerator = new ContentModerator();
const rankedChoiceTabulator = new RankedChoiceTabulator();

const fastify = Fastify({ logger });

async function main() {
  await fastify.register(cors, { origin: true });
  await fastify.register(helmet);

  // Health endpoints
  fastify.get('/health', async () => ({ status: 'healthy', service: 'secure-elections' }));

  fastify.get('/health/detailed', async () => ({
    status: 'healthy',
    service: 'secure-elections',
    version: '1.0.0',
    components: {
      ballotLedger: ballotLedger.getStats(),
      privacyBudget: privacyEngine.getRemainingBudget(),
    },
    timestamp: new Date().toISOString(),
  }));

  // ============== Election Management ==============

  fastify.post('/api/v1/elections', async (request, reply) => {
    try {
      const election = ElectionSchema.parse(request.body);
      resultsAggregator.registerElection(election, ['precinct-1', 'precinct-2', 'precinct-3']);
      logger.info({ electionId: election.electionId }, 'Election registered');
      return { success: true, electionId: election.electionId };
    } catch (error) {
      reply.status(400);
      return { error: 'Invalid election data', details: String(error) };
    }
  });

  // ============== Ballot Submission ==============

  fastify.post('/api/v1/ballots', async (request, reply) => {
    try {
      const ballot = EncryptedBallotSchema.parse(request.body);
      const result = ballotLedger.recordBallot(ballot);
      logger.info({ ballotId: ballot.ballotId }, 'Ballot recorded');
      return {
        success: true,
        position: result.position,
        receipt: {
          ballotHash: crypto.createHash('sha256')
            .update(ballot.encryptedPayload)
            .digest('hex'),
          confirmationCode: crypto.randomBytes(8).toString('hex').toUpperCase(),
        },
      };
    } catch (error) {
      reply.status(400);
      return { error: 'Ballot recording failed', details: String(error) };
    }
  });

  fastify.get('/api/v1/ballots/:ballotId/receipt', async (request, reply) => {
    const { ballotId } = request.params as { ballotId: string };
    const receipt = ballotLedger.generateReceipt(ballotId);

    if (!receipt.found) {
      reply.status(404);
      return { error: 'Ballot not found' };
    }

    return receipt;
  });

  // ============== Blockchain Operations ==============

  fastify.post('/api/v1/blockchain/mine', async () => {
    const block = ballotLedger.mineBlock();
    if (!block) {
      return { message: 'No pending ballots to mine' };
    }
    logger.info({ blockIndex: block.index, ballotCount: block.ballots.length }, 'Block mined');
    return { success: true, blockIndex: block.index, hash: block.hash };
  });

  fastify.get('/api/v1/blockchain/verify', async () => {
    const result = ballotLedger.verifyChain();
    return result;
  });

  fastify.get('/api/v1/blockchain/stats', async () => {
    return ballotLedger.getStats();
  });

  fastify.get('/api/v1/blockchain/audit', async () => {
    return ballotLedger.exportForAudit();
  });

  // ============== Privacy Operations ==============

  fastify.post('/api/v1/privacy/anonymize', async (request) => {
    const { voterId, jurisdictionId, electionSalt } = request.body as {
      voterId: string;
      jurisdictionId: string;
      electionSalt: string;
    };
    return privacyEngine.anonymizeVoter(voterId, jurisdictionId, electionSalt);
  });

  fastify.post('/api/v1/privacy/eligibility-proof', async (request) => {
    const { voterCredential, eligibilityRoot } = request.body as {
      voterCredential: string;
      eligibilityRoot: string;
    };
    return privacyEngine.generateEligibilityProof(voterCredential, eligibilityRoot);
  });

  fastify.get('/api/v1/privacy/budget', async () => ({
    remaining: privacyEngine.getRemainingBudget(),
  }));

  // ============== Real-Time Results ==============

  fastify.get('/api/v1/elections/:electionId/results', async (request, reply) => {
    const { electionId } = request.params as { electionId: string };
    const results = resultsAggregator.getResults(electionId);

    if (!results) {
      reply.status(404);
      return { error: 'Election not found' };
    }

    return results;
  });

  fastify.post('/api/v1/elections/:electionId/precinct-report', async (request) => {
    const { electionId } = request.params as { electionId: string };
    const { precinctId, results } = request.body as {
      precinctId: string;
      results: Record<string, Record<string, number>>;
    };

    const resultsMap = new Map(
      Object.entries(results).map(([k, v]) => [k, new Map(Object.entries(v))])
    );

    resultsAggregator.reportPrecinct(electionId, precinctId, resultsMap);
    return { success: true };
  });

  fastify.post('/api/v1/elections/:electionId/certify', async (request, reply) => {
    const { electionId } = request.params as { electionId: string };
    try {
      const result = resultsAggregator.certifyResults(electionId);
      return result;
    } catch (error) {
      reply.status(400);
      return { error: String(error) };
    }
  });

  // Ranked Choice Voting
  fastify.post('/api/v1/tabulate/ranked-choice', async (request) => {
    const { ballots, candidates } = request.body as {
      ballots: Array<{ rankings: string[] }>;
      candidates: string[];
    };
    return rankedChoiceTabulator.tabulate(ballots, candidates);
  });

  // ============== Citizen Deliberation ==============

  fastify.post('/api/v1/proposals', async (request) => {
    const { title, description, category, authorId, closesAt, tags } = request.body as {
      title: string;
      description: string;
      category: 'policy' | 'budget' | 'initiative' | 'feedback';
      authorId: string;
      closesAt: string;
      tags?: string[];
    };

    return deliberationPlatform.createProposal(title, description, category, authorId, {
      closesAt,
      tags,
    });
  });

  fastify.post('/api/v1/proposals/:proposalId/comments', async (request, reply) => {
    const { proposalId } = request.params as { proposalId: string };
    const { authorId, content, sentiment, parentId } = request.body as {
      authorId: string;
      content: string;
      sentiment: 'support' | 'oppose' | 'neutral' | 'question';
      parentId?: string;
    };

    // Moderate content
    const moderation = contentModerator.moderate(content);
    if (!moderation.approved) {
      reply.status(400);
      return { error: 'Content flagged', flags: moderation.flags };
    }

    return deliberationPlatform.addComment(proposalId, authorId, content, sentiment, parentId || null);
  });

  fastify.post('/api/v1/proposals/:proposalId/preference', async (request) => {
    const { proposalId } = request.params as { proposalId: string };
    const { citizenId, preference, reasoning } = request.body as {
      citizenId: string;
      preference: 'strongly_support' | 'support' | 'neutral' | 'oppose' | 'strongly_oppose';
      reasoning: string;
    };

    return deliberationPlatform.recordPreference(proposalId, citizenId, preference, reasoning);
  });

  fastify.get('/api/v1/proposals/:proposalId/analytics', async (request, reply) => {
    const { proposalId } = request.params as { proposalId: string };
    const analytics = deliberationPlatform.getProposalAnalytics(proposalId);

    if (!analytics) {
      reply.status(404);
      return { error: 'Proposal not found' };
    }

    return analytics;
  });

  // Participatory Budgeting
  fastify.post('/api/v1/budget/allocate', async (request) => {
    const { citizenId, allocations, totalBudget } = request.body as {
      citizenId: string;
      allocations: Record<string, number>;
      totalBudget: number;
    };

    return deliberationPlatform.submitBudgetAllocation(
      citizenId,
      new Map(Object.entries(allocations)),
      totalBudget
    );
  });

  fastify.get('/api/v1/budget/results', async () => {
    const results = deliberationPlatform.aggregateBudgetResults();
    return Object.fromEntries(results);
  });

  // Start server
  await fastify.listen({ port: PORT, host: HOST });
  logger.info({ port: PORT }, 'Secure Elections Platform running');
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});

export {
  BallotLedger,
  DifferentialPrivacyEngine,
  HomomorphicTallying,
  RealTimeAggregator,
  RankedChoiceTabulator,
  CitizenDeliberationPlatform,
  ContentModerator,
};
