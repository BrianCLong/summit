/**
 * Core Blockchain implementation - Private Permissioned Blockchain
 */

import EventEmitter from 'eventemitter3';
import { Logger } from 'pino';
import { BlockImpl } from './Block.js';
import {
  Block,
  Transaction,
  BlockchainState,
  ValidatorInfo,
  ChainConfig,
  ProofOfExistence,
} from './types.js';
import { BlockStorage } from '../storage/BlockStorage.js';
import { TransactionPool } from './TransactionPool.js';
import { ConsensusEngine } from '../consensus/ConsensusEngine.js';

export class Blockchain extends EventEmitter {
  private chain: Block[] = [];
  private storage: BlockStorage;
  private txPool: TransactionPool;
  private consensus: ConsensusEngine;
  private config: ChainConfig;
  private logger: Logger;
  private isValidator: boolean;
  private validatorInfo?: ValidatorInfo;

  constructor(
    config: ChainConfig,
    storage: BlockStorage,
    consensus: ConsensusEngine,
    logger: Logger,
    isValidator: boolean = false,
    validatorInfo?: ValidatorInfo
  ) {
    super();

    this.config = config;
    this.storage = storage;
    this.consensus = consensus;
    this.logger = logger;
    this.isValidator = isValidator;
    this.validatorInfo = validatorInfo;
    this.txPool = new TransactionPool(logger);
  }

  /**
   * Initialize blockchain with genesis block
   */
  async initialize(): Promise<void> {
    try {
      // Try to load existing chain
      const lastBlock = await this.storage.getLastBlock();

      if (lastBlock) {
        this.logger.info({ height: lastBlock.header.height }, 'Loaded existing blockchain');
        this.chain = await this.loadChain();
      } else {
        // Create genesis block
        const genesisBlock = this.createGenesisBlock();
        await this.storage.saveBlock(genesisBlock);
        this.chain.push(genesisBlock);
        this.logger.info('Created genesis block');
      }

      this.emit('initialized');
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize blockchain');
      throw error;
    }
  }

  /**
   * Create genesis block
   */
  private createGenesisBlock(): Block {
    const genesisBlock = new BlockImpl(
      0,
      '0'.repeat(64),
      [],
      this.config.genesis.initialValidators[0].address,
      this.config.genesis.initialValidators.map(v => v.address)
    );

    genesisBlock.header.timestamp = Date.now();
    genesisBlock.hash = genesisBlock.calculateHash();

    return genesisBlock;
  }

  /**
   * Add transaction to pool
   */
  async addTransaction(tx: Transaction): Promise<void> {
    try {
      // Validate transaction
      if (!this.validateTransaction(tx)) {
        throw new Error('Invalid transaction');
      }

      // Add to pool
      await this.txPool.addTransaction(tx);

      this.emit('transactionAdded', tx);
      this.logger.debug({ txId: tx.id }, 'Transaction added to pool');
    } catch (error) {
      this.logger.error({ error, txId: tx.id }, 'Failed to add transaction');
      throw error;
    }
  }

  /**
   * Propose new block (validator only)
   */
  async proposeBlock(): Promise<Block | null> {
    if (!this.isValidator || !this.validatorInfo) {
      throw new Error('Only validators can propose blocks');
    }

    try {
      // Get transactions from pool
      const transactions = await this.txPool.getPendingTransactions(
        this.config.genesis.maxBlockSize
      );

      if (transactions.length === 0) {
        return null;
      }

      const lastBlock = this.getLastBlock();
      const newBlock = new BlockImpl(
        lastBlock.header.height + 1,
        lastBlock.hash,
        transactions,
        this.validatorInfo.address,
        this.config.genesis.initialValidators.map(v => v.address)
      );

      this.logger.info(
        { height: newBlock.header.height, txCount: transactions.length },
        'Proposed new block'
      );

      return newBlock;
    } catch (error) {
      this.logger.error({ error }, 'Failed to propose block');
      return null;
    }
  }

  /**
   * Add block to chain
   */
  async addBlock(block: Block): Promise<boolean> {
    try {
      // Validate block
      const validation = block.validate();
      if (!validation.valid) {
        this.logger.warn({ errors: validation.errors }, 'Block validation failed');
        return false;
      }

      // Verify block connects to chain
      const lastBlock = this.getLastBlock();
      if (block.header.previousHash !== lastBlock.hash) {
        this.logger.warn('Block does not connect to chain');
        return false;
      }

      if (block.header.height !== lastBlock.header.height + 1) {
        this.logger.warn('Invalid block height');
        return false;
      }

      // Check consensus
      const requiredSignatures = Math.floor(
        (this.config.genesis.initialValidators.length * 2) / 3
      ) + 1;

      if (!block.hasConsensus(requiredSignatures)) {
        this.logger.warn(
          { signatures: block.signatures.length, required: requiredSignatures },
          'Insufficient signatures'
        );
        return false;
      }

      // Save block
      await this.storage.saveBlock(block);
      this.chain.push(block);

      // Remove transactions from pool
      for (const tx of block.transactions) {
        await this.txPool.removeTransaction(tx.id);
      }

      this.emit('blockAdded', block);
      this.logger.info(
        { height: block.header.height, hash: block.hash },
        'Block added to chain'
      );

      return true;
    } catch (error) {
      this.logger.error({ error }, 'Failed to add block');
      return false;
    }
  }

  /**
   * Get blockchain state
   */
  getState(): BlockchainState {
    const lastBlock = this.getLastBlock();

    return {
      currentHeight: lastBlock.header.height,
      bestBlockHash: lastBlock.hash,
      totalTransactions: this.getTotalTransactions(),
      validators: this.config.genesis.initialValidators,
      pendingTransactions: this.txPool.getAllTransactions(),
    };
  }

  /**
   * Get block by height
   */
  async getBlockByHeight(height: number): Promise<Block | null> {
    try {
      return await this.storage.getBlockByHeight(height);
    } catch (error) {
      this.logger.error({ error, height }, 'Failed to get block by height');
      return null;
    }
  }

  /**
   * Get block by hash
   */
  async getBlockByHash(hash: string): Promise<Block | null> {
    try {
      return await this.storage.getBlockByHash(hash);
    } catch (error) {
      this.logger.error({ error, hash }, 'Failed to get block by hash');
      return null;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(txId: string): Promise<Transaction | null> {
    try {
      // Check pool first
      const poolTx = this.txPool.getTransaction(txId);
      if (poolTx) return poolTx;

      // Search blocks
      return await this.storage.getTransaction(txId);
    } catch (error) {
      this.logger.error({ error, txId }, 'Failed to get transaction');
      return null;
    }
  }

  /**
   * Generate proof of existence
   */
  async generateProofOfExistence(txId: string): Promise<ProofOfExistence | null> {
    try {
      const result = await this.storage.getTransactionBlock(txId);
      if (!result) return null;

      const { block, transaction } = result;
      const merkleProof = block.getTransactionProof(txId);

      return {
        documentHash: txId,
        blockHeight: block.header.height,
        blockHash: block.hash,
        timestamp: block.header.timestamp,
        merkleProof,
        transactionId: txId,
      };
    } catch (error) {
      this.logger.error({ error, txId }, 'Failed to generate proof of existence');
      return null;
    }
  }

  /**
   * Verify proof of existence
   */
  async verifyProofOfExistence(proof: ProofOfExistence): Promise<boolean> {
    try {
      const block = await this.getBlockByHeight(proof.blockHeight);
      if (!block) return false;

      if (block.hash !== proof.blockHash) return false;

      return block.verifyTransaction(proof.transactionId, proof.merkleProof);
    } catch (error) {
      this.logger.error({ error }, 'Failed to verify proof of existence');
      return false;
    }
  }

  /**
   * Verify chain integrity
   */
  async verifyChainIntegrity(): Promise<{
    valid: boolean;
    invalidBlocks: number[];
    errors: string[];
  }> {
    const invalidBlocks: number[] = [];
    const errors: string[] = [];

    try {
      for (let i = 1; i < this.chain.length; i++) {
        const currentBlock = this.chain[i];
        const previousBlock = this.chain[i - 1];

        // Verify hash
        const calculatedHash = currentBlock.calculateHash();
        if (currentBlock.hash !== calculatedHash) {
          invalidBlocks.push(i);
          errors.push(`Block ${i}: Hash mismatch`);
        }

        // Verify previous hash
        if (currentBlock.header.previousHash !== previousBlock.hash) {
          invalidBlocks.push(i);
          errors.push(`Block ${i}: Previous hash mismatch`);
        }

        // Verify height
        if (currentBlock.header.height !== previousBlock.header.height + 1) {
          invalidBlocks.push(i);
          errors.push(`Block ${i}: Invalid height`);
        }

        // Verify block structure
        const validation = currentBlock.validate();
        if (!validation.valid) {
          invalidBlocks.push(i);
          errors.push(`Block ${i}: ${validation.errors.join(', ')}`);
        }
      }

      return {
        valid: invalidBlocks.length === 0,
        invalidBlocks,
        errors,
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to verify chain integrity');
      return {
        valid: false,
        invalidBlocks: [],
        errors: [error.message],
      };
    }
  }

  /**
   * Get last block
   */
  getLastBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Get chain height
   */
  getHeight(): number {
    return this.chain.length - 1;
  }

  /**
   * Get total transactions
   */
  private getTotalTransactions(): number {
    return this.chain.reduce((sum, block) => sum + block.header.transactionsCount, 0);
  }

  /**
   * Load chain from storage
   */
  private async loadChain(): Promise<Block[]> {
    const blocks: Block[] = [];
    const lastBlock = await this.storage.getLastBlock();

    if (!lastBlock) {
      return blocks;
    }

    for (let i = 0; i <= lastBlock.header.height; i++) {
      const block = await this.storage.getBlockByHeight(i);
      if (block) {
        blocks.push(block);
      }
    }

    return blocks;
  }

  /**
   * Validate transaction
   */
  private validateTransaction(tx: Transaction): boolean {
    // Basic validation
    if (!tx.id || !tx.signature || !tx.publicKey) {
      return false;
    }

    if (tx.timestamp > Date.now() + 60000) {
      return false;
    }

    // Verify signature (implement in crypto module)
    // TODO: Implement signature verification

    return true;
  }
}
