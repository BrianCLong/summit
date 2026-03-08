"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentModerator = exports.CitizenDeliberationPlatform = exports.RankedChoiceTabulator = exports.RealTimeAggregator = exports.HomomorphicTallying = exports.DifferentialPrivacyEngine = exports.BallotLedger = void 0;
// @ts-nocheck
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const pino_1 = require("pino");
const node_crypto_1 = __importDefault(require("node:crypto"));
const ballot_ledger_js_1 = require("./blockchain/ballot-ledger.js");
Object.defineProperty(exports, "BallotLedger", { enumerable: true, get: function () { return ballot_ledger_js_1.BallotLedger; } });
const differential_privacy_js_1 = require("./privacy/differential-privacy.js");
Object.defineProperty(exports, "DifferentialPrivacyEngine", { enumerable: true, get: function () { return differential_privacy_js_1.DifferentialPrivacyEngine; } });
Object.defineProperty(exports, "HomomorphicTallying", { enumerable: true, get: function () { return differential_privacy_js_1.HomomorphicTallying; } });
const real_time_aggregator_js_1 = require("./results/real-time-aggregator.js");
Object.defineProperty(exports, "RealTimeAggregator", { enumerable: true, get: function () { return real_time_aggregator_js_1.RealTimeAggregator; } });
Object.defineProperty(exports, "RankedChoiceTabulator", { enumerable: true, get: function () { return real_time_aggregator_js_1.RankedChoiceTabulator; } });
const citizen_deliberation_js_1 = require("./feedback/citizen-deliberation.js");
Object.defineProperty(exports, "CitizenDeliberationPlatform", { enumerable: true, get: function () { return citizen_deliberation_js_1.CitizenDeliberationPlatform; } });
Object.defineProperty(exports, "ContentModerator", { enumerable: true, get: function () { return citizen_deliberation_js_1.ContentModerator; } });
const election_js_1 = require("./types/election.js");
const PORT = parseInt(process.env.PORT || '4020', 10);
const HOST = process.env.HOST || '0.0.0.0';
const logger = (0, pino_1.pino)({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty' }
        : undefined,
});
// Initialize core services
const ballotLedger = new ballot_ledger_js_1.BallotLedger(4, 50);
const privacyEngine = new differential_privacy_js_1.DifferentialPrivacyEngine({ epsilon: 1.0, delta: 1e-5, sensitivity: 1 });
const homomorphicTally = new differential_privacy_js_1.HomomorphicTallying();
const resultsAggregator = new real_time_aggregator_js_1.RealTimeAggregator();
const deliberationPlatform = new citizen_deliberation_js_1.CitizenDeliberationPlatform();
const contentModerator = new citizen_deliberation_js_1.ContentModerator();
const rankedChoiceTabulator = new real_time_aggregator_js_1.RankedChoiceTabulator();
const fastify = (0, fastify_1.default)({ logger });
async function main() {
    await fastify.register(cors_1.default, { origin: true });
    await fastify.register(helmet_1.default);
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
            const election = election_js_1.ElectionSchema.parse(request.body);
            resultsAggregator.registerElection(election, ['precinct-1', 'precinct-2', 'precinct-3']);
            logger.info({ electionId: election.electionId }, 'Election registered');
            return { success: true, electionId: election.electionId };
        }
        catch (error) {
            reply.status(400);
            return { error: 'Invalid election data', details: String(error) };
        }
    });
    // ============== Ballot Submission ==============
    fastify.post('/api/v1/ballots', async (request, reply) => {
        try {
            const ballot = election_js_1.EncryptedBallotSchema.parse(request.body);
            const result = ballotLedger.recordBallot(ballot);
            logger.info({ ballotId: ballot.ballotId }, 'Ballot recorded');
            return {
                success: true,
                position: result.position,
                receipt: {
                    ballotHash: node_crypto_1.default.createHash('sha256')
                        .update(ballot.encryptedPayload)
                        .digest('hex'),
                    confirmationCode: node_crypto_1.default.randomBytes(8).toString('hex').toUpperCase(),
                },
            };
        }
        catch (error) {
            reply.status(400);
            return { error: 'Ballot recording failed', details: String(error) };
        }
    });
    fastify.get('/api/v1/ballots/:ballotId/receipt', async (request, reply) => {
        const { ballotId } = request.params;
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
        const { voterId, jurisdictionId, electionSalt } = request.body;
        return privacyEngine.anonymizeVoter(voterId, jurisdictionId, electionSalt);
    });
    fastify.post('/api/v1/privacy/eligibility-proof', async (request) => {
        const { voterCredential, eligibilityRoot } = request.body;
        return privacyEngine.generateEligibilityProof(voterCredential, eligibilityRoot);
    });
    fastify.get('/api/v1/privacy/budget', async () => ({
        remaining: privacyEngine.getRemainingBudget(),
    }));
    // ============== Real-Time Results ==============
    fastify.get('/api/v1/elections/:electionId/results', async (request, reply) => {
        const { electionId } = request.params;
        const results = resultsAggregator.getResults(electionId);
        if (!results) {
            reply.status(404);
            return { error: 'Election not found' };
        }
        return results;
    });
    fastify.post('/api/v1/elections/:electionId/precinct-report', async (request) => {
        const { electionId } = request.params;
        const { precinctId, results } = request.body;
        const resultsMap = new Map(Object.entries(results).map(([k, v]) => [k, new Map(Object.entries(v))]));
        resultsAggregator.reportPrecinct(electionId, precinctId, resultsMap);
        return { success: true };
    });
    fastify.post('/api/v1/elections/:electionId/certify', async (request, reply) => {
        const { electionId } = request.params;
        try {
            const result = resultsAggregator.certifyResults(electionId);
            return result;
        }
        catch (error) {
            reply.status(400);
            return { error: String(error) };
        }
    });
    // Ranked Choice Voting
    fastify.post('/api/v1/tabulate/ranked-choice', async (request) => {
        const { ballots, candidates } = request.body;
        return rankedChoiceTabulator.tabulate(ballots, candidates);
    });
    // ============== Citizen Deliberation ==============
    fastify.post('/api/v1/proposals', async (request) => {
        const { title, description, category, authorId, closesAt, tags } = request.body;
        return deliberationPlatform.createProposal(title, description, category, authorId, {
            closesAt,
            tags,
        });
    });
    fastify.post('/api/v1/proposals/:proposalId/comments', async (request, reply) => {
        const { proposalId } = request.params;
        const { authorId, content, sentiment, parentId } = request.body;
        // Moderate content
        const moderation = contentModerator.moderate(content);
        if (!moderation.approved) {
            reply.status(400);
            return { error: 'Content flagged', flags: moderation.flags };
        }
        return deliberationPlatform.addComment(proposalId, authorId, content, sentiment, parentId || null);
    });
    fastify.post('/api/v1/proposals/:proposalId/preference', async (request) => {
        const { proposalId } = request.params;
        const { citizenId, preference, reasoning } = request.body;
        return deliberationPlatform.recordPreference(proposalId, citizenId, preference, reasoning);
    });
    fastify.get('/api/v1/proposals/:proposalId/analytics', async (request, reply) => {
        const { proposalId } = request.params;
        const analytics = deliberationPlatform.getProposalAnalytics(proposalId);
        if (!analytics) {
            reply.status(404);
            return { error: 'Proposal not found' };
        }
        return analytics;
    });
    // Participatory Budgeting
    fastify.post('/api/v1/budget/allocate', async (request) => {
        const { citizenId, allocations, totalBudget } = request.body;
        return deliberationPlatform.submitBudgetAllocation(citizenId, new Map(Object.entries(allocations)), totalBudget);
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
