"use strict";
// @ts-nocheck
/**
 * PBFT (Practical Byzantine Fault Tolerance) Consensus Engine
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsensusEngine = void 0;
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const types_js_1 = require("../core/types.js");
class ConsensusEngine extends eventemitter3_1.default {
    state;
    logger;
    config;
    votes = new Map();
    committedBlocks = new Set();
    constructor(config, logger) {
        super();
        this.config = config;
        this.logger = logger;
        this.state = {
            validators: config.initialValidators,
            currentHeight: 0,
            currentRound: 0,
            currentStep: types_js_1.ConsensusStep.PROPOSE,
        };
    }
    /**
     * Start consensus for new height
     */
    async startHeight(height) {
        this.state.currentHeight = height;
        this.state.currentRound = 0;
        this.state.currentStep = types_js_1.ConsensusStep.PROPOSE;
        this.state.lockedValue = undefined;
        this.state.lockedRound = undefined;
        this.state.validValue = undefined;
        this.state.validRound = undefined;
        this.logger.info({ height }, 'Starting consensus for height');
        this.emit('heightStarted', height);
    }
    /**
     * Propose block (proposer only)
     */
    async proposeBlock(block) {
        if (this.state.currentStep !== types_js_1.ConsensusStep.PROPOSE) {
            throw new Error('Not in propose step');
        }
        const proposer = this.getProposer(this.state.currentHeight, this.state.currentRound);
        this.logger.info({ height: block.header.height, proposer: proposer.address }, 'Block proposed');
        this.emit('blockProposed', block, proposer);
        await this.enterPrevote(block);
    }
    /**
     * Enter prevote step
     */
    async enterPrevote(block) {
        this.state.currentStep = types_js_1.ConsensusStep.PREVOTE;
        // Validate block
        const validation = block.validate();
        if (!validation.valid) {
            this.logger.warn({ errors: validation.errors }, 'Block validation failed in prevote');
            // Vote nil
            await this.broadcastVote(null, 'prevote');
            return;
        }
        // Vote for block
        await this.broadcastVote(block, 'prevote');
    }
    /**
     * Process prevote
     */
    async processPrevote(vote) {
        if (!this.validateVote(vote, 'prevote')) {
            return;
        }
        this.addVote(vote);
        // Check if we have 2/3+ prevotes
        const prevotes = this.getVotes(vote.height, vote.round, 'prevote');
        const threshold = this.calculateThreshold();
        // 2/3+ prevotes for a block
        const blockVotes = prevotes.filter(v => v.blockHash === vote.blockHash);
        if (blockVotes.length >= threshold) {
            this.state.validValue = await this.getBlockByHash(vote.blockHash);
            this.state.validRound = vote.round;
            await this.enterPrecommit(vote.blockHash);
        }
        // 2/3+ prevotes total (including nil)
        if (prevotes.length >= threshold) {
            await this.enterPrecommit(null);
        }
    }
    /**
     * Enter precommit step
     */
    async enterPrecommit(blockHash) {
        this.state.currentStep = types_js_1.ConsensusStep.PRECOMMIT;
        if (blockHash) {
            const block = await this.getBlockByHash(blockHash);
            if (block) {
                this.state.lockedValue = block;
                this.state.lockedRound = this.state.currentRound;
            }
        }
        await this.broadcastVote(blockHash ? await this.getBlockByHash(blockHash) : null, 'precommit');
    }
    /**
     * Process precommit
     */
    async processPrecommit(vote) {
        if (!this.validateVote(vote, 'precommit')) {
            return;
        }
        this.addVote(vote);
        // Check if we have 2/3+ precommits
        const precommits = this.getVotes(vote.height, vote.round, 'precommit');
        const threshold = this.calculateThreshold();
        // 2/3+ precommits for a block
        const blockVotes = precommits.filter(v => v.blockHash === vote.blockHash);
        if (blockVotes.length >= threshold && vote.blockHash) {
            await this.commitBlock(vote.blockHash);
        }
        // 2/3+ precommits total (including nil)
        if (precommits.length >= threshold) {
            await this.enterNewRound(this.state.currentRound + 1);
        }
    }
    /**
     * Commit block
     */
    async commitBlock(blockHash) {
        if (this.committedBlocks.has(blockHash)) {
            return;
        }
        this.state.currentStep = types_js_1.ConsensusStep.COMMIT;
        this.committedBlocks.add(blockHash);
        const block = await this.getBlockByHash(blockHash);
        if (!block) {
            this.logger.error({ blockHash }, 'Cannot commit block: not found');
            return;
        }
        this.logger.info({ height: block.header.height, hash: blockHash }, 'Block committed');
        this.emit('blockCommitted', block);
        // Start new height
        await this.startHeight(this.state.currentHeight + 1);
    }
    /**
     * Enter new round
     */
    async enterNewRound(round) {
        this.state.currentRound = round;
        this.state.currentStep = types_js_1.ConsensusStep.PROPOSE;
        this.logger.info({ height: this.state.currentHeight, round }, 'Entering new round');
        this.emit('newRound', this.state.currentHeight, round);
    }
    /**
     * Broadcast vote
     */
    async broadcastVote(block, voteType) {
        const vote = {
            validator: '', // Will be filled by validator
            height: this.state.currentHeight,
            round: this.state.currentRound,
            blockHash: block ? block.hash : '',
            voteType,
            signature: '', // Will be signed by validator
            timestamp: Date.now(),
        };
        this.emit('vote', vote);
    }
    /**
     * Get proposer for height and round
     */
    getProposer(height, round) {
        const index = (height + round) % this.state.validators.length;
        return this.state.validators[index];
    }
    /**
     * Calculate consensus threshold (2/3+)
     */
    calculateThreshold() {
        return Math.floor((this.state.validators.length * 2) / 3) + 1;
    }
    /**
     * Validate vote
     */
    validateVote(vote, expectedType) {
        if (vote.voteType !== expectedType) {
            return false;
        }
        if (vote.height !== this.state.currentHeight) {
            return false;
        }
        if (vote.round !== this.state.currentRound) {
            return false;
        }
        // Verify validator signature
        // TODO: Implement signature verification
        return true;
    }
    /**
     * Add vote to collection
     */
    addVote(vote) {
        const key = `${vote.height}:${vote.round}:${vote.voteType}`;
        const votes = this.votes.get(key) || [];
        // Check if vote already exists
        if (votes.find(v => v.validator === vote.validator)) {
            return;
        }
        votes.push(vote);
        this.votes.set(key, votes);
    }
    /**
     * Get votes for height/round/type
     */
    getVotes(height, round, voteType) {
        const key = `${height}:${round}:${voteType}`;
        return this.votes.get(key) || [];
    }
    /**
     * Get block by hash (to be implemented by blockchain)
     */
    async getBlockByHash(hash) {
        // This will be injected or accessed via blockchain instance
        return null;
    }
    /**
     * Get current consensus state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Get validators
     */
    getValidators() {
        return [...this.state.validators];
    }
    /**
     * Check if validator is active
     */
    isActiveValidator(address) {
        return this.state.validators.some(v => v.address === address);
    }
}
exports.ConsensusEngine = ConsensusEngine;
