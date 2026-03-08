"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsensusEngine = void 0;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const crypto_1 = require("crypto");
// Simple BFT parameters
const QUORUM_PERCENTAGE = 0.67; // 2/3 majority
// SECURITY: SWARM_SECRET must be set in production environments
const SHARED_SECRET = process.env.SWARM_SECRET;
if (!SHARED_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('SWARM_SECRET environment variable must be set in production');
    }
    logger_js_1.default.warn('SWARM_SECRET not set - using insecure default for development only');
}
class ConsensusEngine {
    gossip;
    nodeId;
    proposals = new Map();
    peerCount = 3; // In a real system, this would be dynamic
    constructor(nodeId, gossip) {
        this.nodeId = nodeId;
        this.gossip = gossip;
    }
    async initialize() {
        this.gossip.on('swarm:consensus', (msg) => this.handleMessage(msg));
    }
    // Sign data
    sign(data) {
        const secret = SHARED_SECRET || 'dev-secret-key-insecure';
        return (0, crypto_1.createHmac)('sha256', secret).update(data).digest('hex');
    }
    // Verify signature
    verify(data, signature) {
        const expected = this.sign(data);
        return expected === signature;
    }
    async propose(action, params) {
        const proposalId = `${this.nodeId}-${Date.now()}`;
        const proposal = {
            id: proposalId,
            proposerId: this.nodeId,
            action,
            params,
            timestamp: Date.now(),
            votes: {},
            status: 'pending'
        };
        // Auto-vote for self
        proposal.votes[this.nodeId] = true;
        this.proposals.set(proposalId, proposal);
        // Sign the proposal ID as proof
        const signature = this.sign(JSON.stringify(proposal));
        await this.gossip.broadcast('swarm:consensus', {
            type: 'proposal',
            payload: proposal,
            signature
        });
        return proposalId;
    }
    async handleMessage(msg) {
        // Basic BFT check: Verify signature of the message payload
        if (msg.signature) {
            const isValid = this.verify(JSON.stringify(msg.payload), msg.signature);
            if (!isValid) {
                logger_js_1.default.warn(`Invalid signature from ${msg.senderId}, ignoring.`);
                return;
            }
        }
        else {
            // In strict BFT mode, reject unsigned messages
            // For now, warn
            logger_js_1.default.warn(`Unsigned message from ${msg.senderId}`);
        }
        switch (msg.type) {
            case 'proposal':
                await this.handleProposal(msg.payload, msg.senderId);
                break;
            case 'vote':
                await this.handleVote(msg.payload);
                break;
            case 'decision':
                await this.handleDecision(msg.payload);
                break;
        }
    }
    async handleProposal(proposal, senderId) {
        // Store the proposal even if we are not the proposer
        if (this.proposals.has(proposal.id))
            return;
        // Validate proposal content (e.g. check if action is allowed)
        // For now, accept all.
        // Create local copy to track state
        this.proposals.set(proposal.id, proposal);
        // Vote YES
        const votePayload = { proposalId: proposal.id, vote: true, voterId: this.nodeId };
        const signature = this.sign(JSON.stringify(votePayload));
        await this.gossip.broadcast('swarm:consensus', {
            type: 'vote',
            payload: votePayload,
            signature
        });
    }
    async handleVote(payload) {
        const { proposalId, vote, voterId } = payload;
        const proposal = this.proposals.get(proposalId);
        // If we don't have the proposal, we can't process the vote yet.
        // In a real system, we might request it.
        if (!proposal)
            return;
        proposal.votes[voterId] = vote;
        // Check quorum
        // We count votes locally.
        const yesVotes = Object.values(proposal.votes).filter(v => v).length;
        const requiredVotes = Math.ceil(this.peerCount * QUORUM_PERCENTAGE);
        if (yesVotes >= requiredVotes && proposal.status === 'pending') {
            proposal.status = 'accepted';
            logger_js_1.default.info(`Proposal ${proposal.id} accepted via BFT consensus (${yesVotes}/${this.peerCount})`);
            // If we are the proposer, or maybe any node, we can broadcast a Commit/Decision message
            // to ensure everyone agrees it is accepted, even if they didn't see all votes.
            // Optimistically, if we see quorum, we accept.
            // Broadcast decision so others who might have missed votes know it passed
            const decisionPayload = { proposalId: proposal.id, status: 'accepted' };
            const signature = this.sign(JSON.stringify(decisionPayload));
            await this.gossip.broadcast('swarm:consensus', {
                type: 'decision',
                payload: decisionPayload,
                signature
            });
            // Execute action here...
        }
    }
    async handleDecision(payload) {
        const { proposalId, status } = payload;
        const proposal = this.proposals.get(proposalId);
        if (proposal && proposal.status !== status) {
            proposal.status = status;
            logger_js_1.default.info(`Proposal ${proposalId} updated to ${status} via Decision message`);
        }
    }
    getProposalStatus(proposalId) {
        return this.proposals.get(proposalId)?.status;
    }
    // For testing
    setPeerCount(count) {
        this.peerCount = count;
    }
}
exports.ConsensusEngine = ConsensusEngine;
