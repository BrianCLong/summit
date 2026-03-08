"use strict";
/**
 * Block storage implementation using LevelDB
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockStorage = void 0;
const level_1 = require("level");
const Block_js_1 = require("../core/Block.js");
class BlockStorage {
    db;
    logger;
    constructor(dbPath, logger) {
        this.db = new level_1.Level(dbPath, { valueEncoding: 'json' });
        this.logger = logger;
    }
    /**
     * Initialize storage
     */
    async initialize() {
        try {
            await this.db.open();
            this.logger.info('Block storage initialized');
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to initialize block storage');
            throw error;
        }
    }
    /**
     * Save block to storage
     */
    async saveBlock(block) {
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
            this.logger.debug({ height: block.header.height, hash: block.hash }, 'Block saved to storage');
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to save block');
            throw error;
        }
    }
    /**
     * Get block by height
     */
    async getBlockByHeight(height) {
        try {
            const data = await this.db.get(`block:height:${height}`);
            return Block_js_1.BlockImpl.fromJSON(data);
        }
        catch (error) {
            if (error.code === 'LEVEL_NOT_FOUND') {
                return null;
            }
            throw error;
        }
    }
    /**
     * Get block by hash
     */
    async getBlockByHash(hash) {
        try {
            const data = await this.db.get(`block:hash:${hash}`);
            return Block_js_1.BlockImpl.fromJSON(data);
        }
        catch (error) {
            if (error.code === 'LEVEL_NOT_FOUND') {
                return null;
            }
            throw error;
        }
    }
    /**
     * Get last block
     */
    async getLastBlock() {
        try {
            const meta = await this.db.get('meta:lastBlock');
            const { height } = JSON.parse(meta);
            return await this.getBlockByHeight(height);
        }
        catch (error) {
            if (error.code === 'LEVEL_NOT_FOUND') {
                return null;
            }
            throw error;
        }
    }
    /**
     * Get transaction
     */
    async getTransaction(txId) {
        try {
            const data = await this.db.get(`tx:${txId}`);
            const { transaction } = JSON.parse(data);
            return transaction;
        }
        catch (error) {
            if (error.code === 'LEVEL_NOT_FOUND') {
                return null;
            }
            throw error;
        }
    }
    /**
     * Get transaction with block info
     */
    async getTransactionBlock(txId) {
        try {
            const data = await this.db.get(`tx:${txId}`);
            const { transaction, blockHeight } = JSON.parse(data);
            const block = await this.getBlockByHeight(blockHeight);
            if (!block)
                return null;
            return { transaction, block };
        }
        catch (error) {
            if (error.code === 'LEVEL_NOT_FOUND') {
                return null;
            }
            throw error;
        }
    }
    /**
     * Get blocks in range
     */
    async getBlockRange(startHeight, endHeight) {
        const blocks = [];
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
    async close() {
        await this.db.close();
        this.logger.info('Block storage closed');
    }
}
exports.BlockStorage = BlockStorage;
