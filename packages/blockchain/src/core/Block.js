"use strict";
/**
 * Block implementation for private permissioned blockchain
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockImpl = void 0;
const crypto_1 = require("crypto");
const MerkleTree_js_1 = require("./MerkleTree.js");
class BlockImpl {
    header;
    transactions;
    hash;
    proposer;
    validators;
    signatures;
    constructor(height, previousHash, transactions, proposer, validators) {
        // Build merkle tree for transactions
        const merkleTree = new MerkleTree_js_1.MerkleTree(transactions.map(tx => this.hashTransaction(tx)));
        this.header = {
            version: 1,
            height,
            timestamp: Date.now(),
            previousHash,
            merkleRoot: merkleTree.getRoot(),
            stateRoot: '', // Will be computed after state transitions
            transactionsCount: transactions.length,
            nonce: 0,
            difficulty: 0,
        };
        this.transactions = transactions;
        this.proposer = proposer;
        this.validators = validators;
        this.signatures = [];
        this.hash = this.calculateHash();
    }
    /**
     * Calculate block hash
     */
    calculateHash() {
        const headerData = {
            version: this.header.version,
            height: this.header.height,
            timestamp: this.header.timestamp,
            previousHash: this.header.previousHash,
            merkleRoot: this.header.merkleRoot,
            stateRoot: this.header.stateRoot,
            transactionsCount: this.header.transactionsCount,
            nonce: this.header.nonce,
        };
        return (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(headerData))
            .digest('hex');
    }
    /**
     * Hash a transaction
     */
    hashTransaction(tx) {
        return (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify({
            id: tx.id,
            type: tx.type,
            timestamp: tx.timestamp,
            from: tx.from,
            to: tx.to,
            payload: tx.payload,
            nonce: tx.nonce,
        }))
            .digest('hex');
    }
    /**
     * Add validator signature
     */
    addSignature(signature) {
        if (!this.signatures.find(s => s.validator === signature.validator)) {
            this.signatures.push(signature);
        }
    }
    /**
     * Check if block has sufficient signatures for finality
     */
    hasConsensus(requiredSignatures) {
        return this.signatures.length >= requiredSignatures;
    }
    /**
     * Get transaction merkle proof
     */
    getTransactionProof(txId) {
        const txHashes = this.transactions.map(tx => this.hashTransaction(tx));
        const txIndex = this.transactions.findIndex(tx => tx.id === txId);
        if (txIndex === -1) {
            throw new Error(`Transaction ${txId} not found in block`);
        }
        const merkleTree = new MerkleTree_js_1.MerkleTree(txHashes);
        return merkleTree.getProof(txIndex);
    }
    /**
     * Verify transaction is in block
     */
    verifyTransaction(txId, proof) {
        const txIndex = this.transactions.findIndex(tx => tx.id === txId);
        if (txIndex === -1)
            return false;
        const txHash = this.hashTransaction(this.transactions[txIndex]);
        const merkleTree = new MerkleTree_js_1.MerkleTree(this.transactions.map(tx => this.hashTransaction(tx)));
        return merkleTree.verify(proof, txHash, this.header.merkleRoot);
    }
    /**
     * Serialize block to JSON
     */
    toJSON() {
        return JSON.stringify({
            header: this.header,
            transactions: this.transactions,
            hash: this.hash,
            proposer: this.proposer,
            validators: this.validators,
            signatures: this.signatures,
        });
    }
    /**
     * Deserialize block from JSON
     */
    static fromJSON(json) {
        const data = JSON.parse(json);
        const block = Object.create(BlockImpl.prototype);
        Object.assign(block, data);
        return block;
    }
    /**
     * Validate block structure and integrity
     */
    validate() {
        const errors = [];
        // Validate header
        if (this.header.height < 0) {
            errors.push('Invalid block height');
        }
        if (this.header.timestamp > Date.now() + 60000) {
            errors.push('Block timestamp too far in future');
        }
        // Validate hash
        const calculatedHash = this.calculateHash();
        if (this.hash !== calculatedHash) {
            errors.push('Block hash mismatch');
        }
        // Validate merkle root
        const merkleTree = new MerkleTree_js_1.MerkleTree(this.transactions.map(tx => this.hashTransaction(tx)));
        if (this.header.merkleRoot !== merkleTree.getRoot()) {
            errors.push('Merkle root mismatch');
        }
        // Validate transaction count
        if (this.header.transactionsCount !== this.transactions.length) {
            errors.push('Transaction count mismatch');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Get block size in bytes
     */
    getSize() {
        return Buffer.from(this.toJSON()).length;
    }
}
exports.BlockImpl = BlockImpl;
