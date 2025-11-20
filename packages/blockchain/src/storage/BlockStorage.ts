/**
 * Block storage implementation using LevelDB
 */

import { Level } from 'level';
import { Logger } from 'pino';
import { Block, Transaction } from '../core/types.js';
import { BlockImpl } from '../core/Block.js';

export class BlockStorage {
  private db: Level<string, string>;
  private logger: Logger;

  constructor(dbPath: string, logger: Logger) {
    this.db = new Level(dbPath, { valueEncoding: 'json' });
    this.logger = logger;
  }

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    try {
      await this.db.open();
      this.logger.info('Block storage initialized');
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize block storage');
      throw error;
    }
  }

  /**
   * Save block to storage
   */
  async saveBlock(block: Block): Promise<void> {
    try {
      const batch = this.db.batch();

      // Save block by height
      batch.put(`block:height:${block.header.height}`, JSON.stringify(block));

      // Save block by hash
      batch.put(`block:hash:${block.hash}`, JSON.stringify(block));

      // Index transactions
      for (const tx of block.transactions) {
        batch.put(`tx:${tx.id}`, JSON.stringify({
          transaction: tx,
          blockHeight: block.header.height,
          blockHash: block.hash,
        }));
      }

      // Update last block pointer
      batch.put('meta:lastBlock', JSON.stringify({
        height: block.header.height,
        hash: block.hash,
      }));

      await batch.write();

      this.logger.debug(
        { height: block.header.height, hash: block.hash },
        'Block saved to storage'
      );
    } catch (error) {
      this.logger.error({ error }, 'Failed to save block');
      throw error;
    }
  }

  /**
   * Get block by height
   */
  async getBlockByHeight(height: number): Promise<Block | null> {
    try {
      const data = await this.db.get(`block:height:${height}`);
      return BlockImpl.fromJSON(data);
    } catch (error: any) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get block by hash
   */
  async getBlockByHash(hash: string): Promise<Block | null> {
    try {
      const data = await this.db.get(`block:hash:${hash}`);
      return BlockImpl.fromJSON(data);
    } catch (error: any) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get last block
   */
  async getLastBlock(): Promise<Block | null> {
    try {
      const meta = await this.db.get('meta:lastBlock');
      const { height } = JSON.parse(meta);
      return await this.getBlockByHeight(height);
    } catch (error: any) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get transaction
   */
  async getTransaction(txId: string): Promise<Transaction | null> {
    try {
      const data = await this.db.get(`tx:${txId}`);
      const { transaction } = JSON.parse(data);
      return transaction;
    } catch (error: any) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get transaction with block info
   */
  async getTransactionBlock(txId: string): Promise<{
    transaction: Transaction;
    block: Block;
  } | null> {
    try {
      const data = await this.db.get(`tx:${txId}`);
      const { transaction, blockHeight } = JSON.parse(data);
      const block = await this.getBlockByHeight(blockHeight);

      if (!block) return null;

      return { transaction, block };
    } catch (error: any) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get blocks in range
   */
  async getBlockRange(startHeight: number, endHeight: number): Promise<Block[]> {
    const blocks: Block[] = [];

    for (let height = startHeight; height <= endHeight; height++) {
      const block = await this.getBlockByHeight(height);
      if (block) {
        blocks.push(block);
      }
    }

    return blocks;
  }

  /**
   * Close storage
   */
  async close(): Promise<void> {
    await this.db.close();
    this.logger.info('Block storage closed');
  }
}
