/**
 * PBFT (Practical Byzantine Fault Tolerance) Consensus Engine
 */

import EventEmitter from 'eventemitter3';
import { Logger } from 'pino';
import {
  Block,
  ConsensusState,
  ConsensusStep,
  Vote,
  ValidatorInfo,
  GenesisConfig,
} from '../core/types.js';

export class ConsensusEngine extends EventEmitter {
  private state: ConsensusState;
  private logger: Logger;
  private config: GenesisConfig;
  private votes: Map<string, Vote[]> = new Map();
  private committedBlocks: Set<string> = new Set();

  constructor(config: GenesisConfig, logger: Logger) {
    super();

    this.config = config;
    this.logger = logger;

    this.state = {
      validators: config.initialValidators,
      currentHeight: 0,
      currentRound: 0,
      currentStep: ConsensusStep.PROPOSE,
    };
  }

  /**
   * Start consensus for new height
   */
  async startHeight(height: number): Promise<void> {
    this.state.currentHeight = height;
    this.state.currentRound = 0;
    this.state.currentStep = ConsensusStep.PROPOSE;
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
  async proposeBlock(block: Block): Promise<void> {
    if (this.state.currentStep !== ConsensusStep.PROPOSE) {
      throw new Error('Not in propose step');
    }

    const proposer = this.getProposer(this.state.currentHeight, this.state.currentRound);

    this.logger.info(
      { height: block.header.height, proposer: proposer.address },
      'Block proposed'
    );

    this.emit('blockProposed', block, proposer);
    await this.enterPrevote(block);
  }

  /**
   * Enter prevote step
   */
  private async enterPrevote(block: Block): Promise<void> {
    this.state.currentStep = ConsensusStep.PREVOTE;

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
  async processPrevote(vote: Vote): Promise<void> {
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
  private async enterPrecommit(blockHash: string | null): Promise<void> {
    this.state.currentStep = ConsensusStep.PRECOMMIT;

    if (blockHash) {
      const block = await this.getBlockByHash(blockHash);
      if (block) {
        this.state.lockedValue = block;
        this.state.lockedRound = this.state.currentRound;
      }
    }

    await this.broadcastVote(
      blockHash ? await this.getBlockByHash(blockHash) : null,
      'precommit'
    );
  }

  /**
   * Process precommit
   */
  async processPrecommit(vote: Vote): Promise<void> {
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
  private async commitBlock(blockHash: string): Promise<void> {
    if (this.committedBlocks.has(blockHash)) {
      return;
    }

    this.state.currentStep = ConsensusStep.COMMIT;
    this.committedBlocks.add(blockHash);

    const block = await this.getBlockByHash(blockHash);
    if (!block) {
      this.logger.error({ blockHash }, 'Cannot commit block: not found');
      return;
    }

    this.logger.info(
      { height: block.header.height, hash: blockHash },
      'Block committed'
    );

    this.emit('blockCommitted', block);

    // Start new height
    await this.startHeight(this.state.currentHeight + 1);
  }

  /**
   * Enter new round
   */
  private async enterNewRound(round: number): Promise<void> {
    this.state.currentRound = round;
    this.state.currentStep = ConsensusStep.PROPOSE;

    this.logger.info(
      { height: this.state.currentHeight, round },
      'Entering new round'
    );

    this.emit('newRound', this.state.currentHeight, round);
  }

  /**
   * Broadcast vote
   */
  private async broadcastVote(
    block: Block | null,
    voteType: 'prevote' | 'precommit'
  ): Promise<void> {
    const vote: Vote = {
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
  private getProposer(height: number, round: number): ValidatorInfo {
    const index = (height + round) % this.state.validators.length;
    return this.state.validators[index];
  }

  /**
   * Calculate consensus threshold (2/3+)
   */
  private calculateThreshold(): number {
    return Math.floor((this.state.validators.length * 2) / 3) + 1;
  }

  /**
   * Validate vote
   */
  private validateVote(vote: Vote, expectedType: 'prevote' | 'precommit'): boolean {
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
  private addVote(vote: Vote): void {
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
  private getVotes(
    height: number,
    round: number,
    voteType: 'prevote' | 'precommit'
  ): Vote[] {
    const key = `${height}:${round}:${voteType}`;
    return this.votes.get(key) || [];
  }

  /**
   * Get block by hash (to be implemented by blockchain)
   */
  private async getBlockByHash(hash: string): Promise<Block | null> {
    // This will be injected or accessed via blockchain instance
    return null;
  }

  /**
   * Get current consensus state
   */
  getState(): ConsensusState {
    return { ...this.state };
  }

  /**
   * Get validators
   */
  getValidators(): ValidatorInfo[] {
    return [...this.state.validators];
  }

  /**
   * Check if validator is active
   */
  isActiveValidator(address: string): boolean {
    return this.state.validators.some(v => v.address === address);
  }
}
