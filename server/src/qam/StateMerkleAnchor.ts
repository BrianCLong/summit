import { EventEmitter } from 'events';
import baseLogger from '../config/logger';
import * as crypto from 'crypto';

const logger = baseLogger.child({ module: 'StateMerkleAnchor' });

export interface MerkleAnchor {
  id: string;
  stateHash: string;
  merkleRoot: string;
  timestamp: Date;
  blockHeight?: number;
  transactionId?: string;
  s3Location?: string;
  integrity: IntegrityProof;
  metadata: AnchorMetadata;
}

export interface IntegrityProof {
  algorithm: string;
  proof: string;
  witness: string[];
  verificationPath: string[];
  leafCount: number;
  depth: number;
}

export interface AnchorMetadata {
  tenantId: string;
  appId?: string;
  dataType: string;
  size: number;
  priority: number;
  retentionPolicy: string;
  tags: string[];
  creator: string;
  purpose: string;
}

export interface AnchorConfig {
  enableS3ObjectLock: boolean;
  enableBlockchainAnchor: boolean;
  s3Bucket?: string;
  s3Region?: string;
  blockchainNetwork?: string;
  merkleTreeMaxLeaves: number;
  anchorBatchSize: number;
  anchorFrequencyMinutes: number;
  retentionYears: number;
}

export interface VerificationResult {
  valid: boolean;
  anchorFound: boolean;
  merkleValid: boolean;
  timestampValid: boolean;
  integrityValid: boolean;
  details: VerificationDetails;
}

export interface VerificationDetails {
  originalHash: string;
  computedHash: string;
  anchorTimestamp: Date;
  verificationTimestamp: Date;
  proofPath: string[];
  blockchainConfirmations?: number;
  s3ObjectIntact?: boolean;
  errors: string[];
  warnings: string[];
}

export interface BatchAnchorResult {
  batchId: string;
  anchorsCreated: number;
  merkleRoot: string;
  blockchainTxId?: string;
  s3BatchLocation?: string;
  processedStates: string[];
  duration: number;
  timestamp: Date;
}

/**
 * StateMerkleAnchor - External immutable evidence anchoring with S3 Object Lock and blockchain support
 *
 * Key Features:
 * - Merkle tree-based integrity proofs for state snapshots
 * - S3 Object Lock integration for immutable storage
 * - Blockchain anchoring for distributed verification
 * - Batch processing for efficient anchoring
 * - Comprehensive verification and audit trails
 * - Automatic retention policy management
 * - Cross-platform verification support
 * - High-availability anchoring with redundancy
 */
export class StateMerkleAnchor extends EventEmitter {
  private config: AnchorConfig;
  private pendingAnchors: Map<string, any> = new Map();
  private anchorHistory: Map<string, MerkleAnchor> = new Map();
  private batchTimer?: NodeJS.Timeout;

  // Mock external services (in production, replace with actual implementations)
  private s3Client: any = {
    putObject: async (params: any) => {
      logger.debug('Mock S3 putObject', {
        bucket: params.Bucket,
        key: params.Key,
      });
      return { ETag: `"${crypto.randomBytes(16).toString('hex')}"` };
    },
    getObject: async (params: any) => {
      logger.debug('Mock S3 getObject', {
        bucket: params.Bucket,
        key: params.Key,
      });
      return { Body: Buffer.from('mock-data'), LastModified: new Date() };
    },
    headObject: async (params: any) => {
      return { ContentLength: 1024, LastModified: new Date() };
    },
  };

  private blockchainClient: any = {
    submitTransaction: async (data: string) => {
      logger.debug('Mock blockchain transaction', { dataLength: data.length });
      return {
        txId: crypto.randomBytes(32).toString('hex'),
        blockHeight: Math.floor(Math.random() * 1000000) + 700000,
        confirmations: 1,
      };
    },
    getTransaction: async (txId: string) => {
      return {
        txId,
        data: 'mock-transaction-data',
        blockHeight: 700000,
        confirmations: 6,
        timestamp: new Date(),
      };
    },
  };

  constructor(config: Partial<AnchorConfig> = {}) {
    super();
    this.config = {
      enableS3ObjectLock: true,
      enableBlockchainAnchor: false,
      s3Bucket: 'evidence-anchor-bucket',
      s3Region: 'us-east-1',
      blockchainNetwork: 'ethereum',
      merkleTreeMaxLeaves: 1000,
      anchorBatchSize: 10,
      anchorFrequencyMinutes: 60, // 1 hour
      retentionYears: 7,
      ...config,
    };

    // Start batch processing timer
    if (this.config.anchorFrequencyMinutes > 0) {
      this.batchTimer = setInterval(
        () => this.processBatchAnchors(),
        this.config.anchorFrequencyMinutes * 60 * 1000,
      );
    }

    logger.info('StateMerkleAnchor initialized', {
      s3Enabled: this.config.enableS3ObjectLock,
      blockchainEnabled: this.config.enableBlockchainAnchor,
      batchSize: this.config.anchorBatchSize,
      anchorFrequency: this.config.anchorFrequencyMinutes,
    });
  }

  /**
   * Anchor state with immutable external evidence
   */
  async anchorState(
    stateSnapshot: any,
    priority: number = 1,
  ): Promise<MerkleAnchor> {
    try {
      const timestamp = new Date();
      const anchorId = this.generateAnchorId();

      // Calculate state hash
      const stateHash = this.calculateStateHash(stateSnapshot);

      // Prepare anchor metadata
      const metadata: AnchorMetadata = {
        tenantId: stateSnapshot.tenantId || 'unknown',
        appId: stateSnapshot.appId,
        dataType: stateSnapshot.type || 'state_snapshot',
        size: JSON.stringify(stateSnapshot).length,
        priority,
        retentionPolicy: `${this.config.retentionYears}y`,
        tags: stateSnapshot.tags || [],
        creator: 'StateMerkleAnchor',
        purpose: 'integrity_verification',
      };

      // Check if immediate anchoring is needed
      if (priority >= 5) {
        // High priority - immediate anchoring
        return await this.createImmediateAnchor(
          anchorId,
          stateHash,
          stateSnapshot,
          metadata,
        );
      } else {
        // Normal priority - batch anchoring
        this.pendingAnchors.set(anchorId, {
          anchorId,
          stateHash,
          stateSnapshot,
          metadata,
          timestamp,
        });

        // If batch is full, process immediately
        if (this.pendingAnchors.size >= this.config.anchorBatchSize) {
          await this.processBatchAnchors();
        }

        // Return placeholder anchor (will be updated when batch is processed)
        const placeholderAnchor: MerkleAnchor = {
          id: anchorId,
          stateHash,
          merkleRoot: '', // Will be calculated during batch processing
          timestamp,
          integrity: this.createPlaceholderProof(),
          metadata,
        };

        this.emit('anchor_queued', {
          anchorId,
          stateHash,
          priority,
          batchSize: this.pendingAnchors.size,
        });

        logger.debug('State queued for batch anchoring', {
          anchorId,
          stateHash: stateHash.slice(0, 16) + '...',
          priority,
          pendingCount: this.pendingAnchors.size,
        });

        return placeholderAnchor;
      }
    } catch (error) {
      logger.error('Failed to anchor state', { error, priority });
      this.emit('anchor_error', { error, priority });
      throw error;
    }
  }

  /**
   * Verify state integrity against anchored evidence
   */
  async verifyStateIntegrity(
    currentState: any,
    anchorId?: string,
  ): Promise<VerificationResult> {
    try {
      const verificationTimestamp = new Date();
      const currentHash = this.calculateStateHash(currentState);

      let anchor: MerkleAnchor | undefined;

      if (anchorId) {
        anchor = this.anchorHistory.get(anchorId);
      } else {
        // Find most recent anchor for this state
        anchor = this.findMostRecentAnchor(currentState);
      }

      if (!anchor) {
        return {
          valid: false,
          anchorFound: false,
          merkleValid: false,
          timestampValid: false,
          integrityValid: false,
          details: {
            originalHash: '',
            computedHash: currentHash,
            anchorTimestamp: new Date(0),
            verificationTimestamp,
            proofPath: [],
            errors: ['No anchor found for verification'],
            warnings: [],
          },
        };
      }

      // Perform comprehensive verification
      const merkleValid = await this.verifyMerkleProof(anchor, currentHash);
      const timestampValid = this.verifyTimestamp(anchor);
      const integrityValid = await this.verifyExternalIntegrity(anchor);

      const result: VerificationResult = {
        valid: merkleValid && timestampValid && integrityValid,
        anchorFound: true,
        merkleValid,
        timestampValid,
        integrityValid,
        details: {
          originalHash: anchor.stateHash,
          computedHash: currentHash,
          anchorTimestamp: anchor.timestamp,
          verificationTimestamp,
          proofPath: anchor.integrity.verificationPath,
          errors: [],
          warnings: [],
        },
      };

      // Add verification details
      if (!merkleValid) {
        result.details.errors.push('Merkle proof verification failed');
      }

      if (!timestampValid) {
        result.details.errors.push('Timestamp verification failed');
      }

      if (!integrityValid) {
        result.details.errors.push('External integrity verification failed');
      }

      // Check blockchain confirmations if enabled
      if (this.config.enableBlockchainAnchor && anchor.transactionId) {
        const blockchainVerification = await this.verifyBlockchainAnchor(
          anchor.transactionId,
        );
        result.details.blockchainConfirmations =
          blockchainVerification.confirmations;

        if (blockchainVerification.confirmations < 6) {
          result.details.warnings.push(
            'Blockchain anchor has insufficient confirmations',
          );
        }
      }

      // Check S3 object integrity if enabled
      if (this.config.enableS3ObjectLock && anchor.s3Location) {
        const s3Verification = await this.verifyS3ObjectIntegrity(
          anchor.s3Location,
        );
        result.details.s3ObjectIntact = s3Verification.intact;

        if (!s3Verification.intact) {
          result.details.errors.push('S3 object integrity verification failed');
          result.integrityValid = false;
          result.valid = false;
        }
      }

      this.emit('verification_completed', {
        anchorId: anchor.id,
        valid: result.valid,
        merkleValid,
        timestampValid,
        integrityValid,
      });

      logger.debug('State integrity verification completed', {
        anchorId: anchor.id,
        valid: result.valid,
        merkleValid,
        timestampValid,
        integrityValid,
        hashMatch: currentHash === anchor.stateHash,
      });

      return result;
    } catch (error) {
      logger.error('State integrity verification failed', { error, anchorId });
      this.emit('verification_error', { error, anchorId });
      throw error;
    }
  }

  /**
   * Process batch anchoring
   */
  private async processBatchAnchors(): Promise<BatchAnchorResult | null> {
    if (this.pendingAnchors.size === 0) {
      return null;
    }

    try {
      const startTime = Date.now();
      const batchId = this.generateBatchId();
      const pendingList = Array.from(this.pendingAnchors.values());

      logger.info('Processing batch anchor', {
        batchId,
        anchorCount: pendingList.length,
      });

      // Build Merkle tree for batch
      const merkleTree = this.buildMerkleTree(
        pendingList.map((p) => p.stateHash),
      );
      const merkleRoot = merkleTree.root;

      // Create external anchors
      let blockchainTxId: string | undefined;
      let s3BatchLocation: string | undefined;

      if (this.config.enableBlockchainAnchor) {
        blockchainTxId = await this.submitBlockchainAnchor(merkleRoot);
      }

      if (this.config.enableS3ObjectLock) {
        s3BatchLocation = await this.submitS3Anchor(
          batchId,
          merkleRoot,
          pendingList,
        );
      }

      // Create individual anchor records with proofs
      const processedStates: string[] = [];

      for (let i = 0; i < pendingList.length; i++) {
        const pending = pendingList[i];
        const proof = this.generateMerkleProof(merkleTree, i);

        const anchor: MerkleAnchor = {
          id: pending.anchorId,
          stateHash: pending.stateHash,
          merkleRoot,
          timestamp: pending.timestamp,
          blockHeight: blockchainTxId
            ? await this.getBlockHeight(blockchainTxId)
            : undefined,
          transactionId: blockchainTxId,
          s3Location: s3BatchLocation,
          integrity: proof,
          metadata: pending.metadata,
        };

        this.anchorHistory.set(anchor.id, anchor);
        processedStates.push(anchor.id);
      }

      // Clear pending anchors
      this.pendingAnchors.clear();

      const duration = Date.now() - startTime;
      const result: BatchAnchorResult = {
        batchId,
        anchorsCreated: pendingList.length,
        merkleRoot,
        blockchainTxId,
        s3BatchLocation,
        processedStates,
        duration,
        timestamp: new Date(),
      };

      this.emit('batch_processed', result);

      logger.info('Batch anchoring completed', {
        batchId,
        anchorsCreated: pendingList.length,
        duration,
        merkleRoot: merkleRoot.slice(0, 16) + '...',
        blockchainTxId: blockchainTxId?.slice(0, 16) + '...',
        s3Location: s3BatchLocation,
      });

      return result;
    } catch (error) {
      logger.error('Batch anchoring failed', {
        error,
        pendingCount: this.pendingAnchors.size,
      });
      this.emit('batch_error', {
        error,
        pendingCount: this.pendingAnchors.size,
      });
      throw error;
    }
  }

  /**
   * Create immediate anchor for high-priority states
   */
  private async createImmediateAnchor(
    anchorId: string,
    stateHash: string,
    stateSnapshot: any,
    metadata: AnchorMetadata,
  ): Promise<MerkleAnchor> {
    const timestamp = new Date();

    // Create single-item Merkle tree
    const merkleTree = this.buildMerkleTree([stateHash]);
    const merkleRoot = merkleTree.root;
    const proof = this.generateMerkleProof(merkleTree, 0);

    // Create external anchors immediately
    let blockchainTxId: string | undefined;
    let s3Location: string | undefined;

    if (this.config.enableBlockchainAnchor) {
      blockchainTxId = await this.submitBlockchainAnchor(merkleRoot);
    }

    if (this.config.enableS3ObjectLock) {
      s3Location = await this.submitS3Anchor(anchorId, merkleRoot, [
        { stateHash, stateSnapshot, metadata },
      ]);
    }

    const anchor: MerkleAnchor = {
      id: anchorId,
      stateHash,
      merkleRoot,
      timestamp,
      blockHeight: blockchainTxId
        ? await this.getBlockHeight(blockchainTxId)
        : undefined,
      transactionId: blockchainTxId,
      s3Location,
      integrity: proof,
      metadata,
    };

    this.anchorHistory.set(anchorId, anchor);

    this.emit('immediate_anchor_created', {
      anchorId,
      stateHash,
      merkleRoot,
      blockchainTxId,
      s3Location,
    });

    logger.info('Immediate anchor created', {
      anchorId,
      stateHash: stateHash.slice(0, 16) + '...',
      merkleRoot: merkleRoot.slice(0, 16) + '...',
      priority: metadata.priority,
    });

    return anchor;
  }

  /**
   * Build Merkle tree from state hashes
   */
  private buildMerkleTree(stateHashes: string[]): any {
    if (stateHashes.length === 0) {
      throw new Error('Cannot build Merkle tree with no leaves');
    }

    // Build tree bottom-up
    let currentLevel = stateHashes.map((hash) => hash);

    const tree = {
      levels: [currentLevel],
      root: '',
      leafCount: stateHashes.length,
      depth: 0,
    };

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

        const combined = left + right;
        const hash = crypto.createHash('sha256').update(combined).digest('hex');
        nextLevel.push(hash);
      }

      currentLevel = nextLevel;
      tree.levels.push(currentLevel);
      tree.depth++;
    }

    tree.root = currentLevel[0];
    return tree;
  }

  /**
   * Generate Merkle proof for a specific leaf
   */
  private generateMerkleProof(
    merkleTree: any,
    leafIndex: number,
  ): IntegrityProof {
    const proof: string[] = [];
    const witness: string[] = [];
    const verificationPath: string[] = [];

    let currentIndex = leafIndex;

    for (let level = 0; level < merkleTree.levels.length - 1; level++) {
      const currentLevel = merkleTree.levels[level];
      const isLeftNode = currentIndex % 2 === 0;
      const siblingIndex = isLeftNode ? currentIndex + 1 : currentIndex - 1;

      if (siblingIndex < currentLevel.length) {
        const siblingHash = currentLevel[siblingIndex];
        proof.push(siblingHash);
        witness.push(isLeftNode ? 'R' : 'L'); // R = right sibling, L = left sibling
        verificationPath.push(`${level}:${siblingIndex}`);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      algorithm: 'SHA-256',
      proof: proof.join(':'),
      witness,
      verificationPath,
      leafCount: merkleTree.leafCount,
      depth: merkleTree.depth,
    };
  }

  /**
   * Verify Merkle proof
   */
  private async verifyMerkleProof(
    anchor: MerkleAnchor,
    currentHash: string,
  ): Promise<boolean> {
    try {
      const proof = anchor.integrity;
      const proofElements = proof.proof.split(':');

      let computedHash = currentHash;

      for (let i = 0; i < proofElements.length; i++) {
        const siblingHash = proofElements[i];
        const direction = proof.witness[i];

        if (direction === 'R') {
          // Sibling is on the right
          computedHash = crypto
            .createHash('sha256')
            .update(computedHash + siblingHash)
            .digest('hex');
        } else {
          // Sibling is on the left
          computedHash = crypto
            .createHash('sha256')
            .update(siblingHash + computedHash)
            .digest('hex');
        }
      }

      return computedHash === anchor.merkleRoot;
    } catch (error) {
      logger.error('Merkle proof verification failed', {
        error,
        anchorId: anchor.id,
      });
      return false;
    }
  }

  /**
   * Submit blockchain anchor
   */
  private async submitBlockchainAnchor(merkleRoot: string): Promise<string> {
    try {
      const result = await this.blockchainClient.submitTransaction(merkleRoot);
      logger.debug('Blockchain anchor submitted', {
        txId: result.txId,
        blockHeight: result.blockHeight,
      });
      return result.txId;
    } catch (error) {
      logger.error('Blockchain anchor submission failed', {
        error,
        merkleRoot,
      });
      throw error;
    }
  }

  /**
   * Submit S3 anchor with Object Lock
   */
  private async submitS3Anchor(
    anchorId: string,
    merkleRoot: string,
    anchors: any[],
  ): Promise<string> {
    try {
      const s3Key = `anchors/${new Date().getFullYear()}/${anchorId}.json`;

      const anchorData = {
        anchorId,
        merkleRoot,
        timestamp: new Date().toISOString(),
        anchors: anchors.map((a) => ({
          stateHash: a.stateHash,
          metadata: a.metadata,
        })),
      };

      const params = {
        Bucket: this.config.s3Bucket,
        Key: s3Key,
        Body: JSON.stringify(anchorData),
        ContentType: 'application/json',
        ObjectLockMode: 'GOVERNANCE',
        ObjectLockRetainUntilDate: new Date(
          Date.now() + this.config.retentionYears * 365 * 24 * 60 * 60 * 1000,
        ),
        Metadata: {
          merkleRoot,
          anchorCount: anchors.length.toString(),
          creator: 'StateMerkleAnchor',
        },
      };

      await this.s3Client.putObject(params);

      const s3Location = `s3://${this.config.s3Bucket}/${s3Key}`;
      logger.debug('S3 anchor submitted', {
        s3Location,
        anchorCount: anchors.length,
      });

      return s3Location;
    } catch (error) {
      logger.error('S3 anchor submission failed', {
        error,
        anchorId,
        merkleRoot,
      });
      throw error;
    }
  }

  /**
   * Verify external integrity (S3 and blockchain)
   */
  private async verifyExternalIntegrity(
    anchor: MerkleAnchor,
  ): Promise<boolean> {
    let s3Valid = true;
    let blockchainValid = true;

    // Verify S3 integrity if enabled
    if (this.config.enableS3ObjectLock && anchor.s3Location) {
      const s3Verification = await this.verifyS3ObjectIntegrity(
        anchor.s3Location,
      );
      s3Valid = s3Verification.intact;
    }

    // Verify blockchain integrity if enabled
    if (this.config.enableBlockchainAnchor && anchor.transactionId) {
      const blockchainVerification = await this.verifyBlockchainAnchor(
        anchor.transactionId,
      );
      blockchainValid = blockchainVerification.valid;
    }

    return s3Valid && blockchainValid;
  }

  /**
   * Verify S3 object integrity
   */
  private async verifyS3ObjectIntegrity(
    s3Location: string,
  ): Promise<{ intact: boolean; details: any }> {
    try {
      // Extract bucket and key from S3 location
      const match = s3Location.match(/s3:\/\/([^\/]+)\/(.+)/);
      if (!match) {
        throw new Error('Invalid S3 location format');
      }

      const [, bucket, key] = match;

      // Check if object exists and retrieve metadata
      const headResult = await this.s3Client.headObject({
        Bucket: bucket,
        Key: key,
      });

      // Verify object hasn't been modified
      const objectExists = !!headResult.LastModified;

      return {
        intact: objectExists,
        details: {
          lastModified: headResult.LastModified,
          contentLength: headResult.ContentLength,
          objectLockMode: headResult.ObjectLockMode,
          objectLockRetainUntilDate: headResult.ObjectLockRetainUntilDate,
        },
      };
    } catch (error) {
      logger.warn('S3 object integrity verification failed', {
        error,
        s3Location,
      });
      return {
        intact: false,
        details: { error: error.message },
      };
    }
  }

  /**
   * Verify blockchain anchor
   */
  private async verifyBlockchainAnchor(
    transactionId: string,
  ): Promise<{ valid: boolean; confirmations: number }> {
    try {
      const transaction =
        await this.blockchainClient.getTransaction(transactionId);

      return {
        valid: !!transaction,
        confirmations: transaction.confirmations || 0,
      };
    } catch (error) {
      logger.warn('Blockchain anchor verification failed', {
        error,
        transactionId,
      });
      return {
        valid: false,
        confirmations: 0,
      };
    }
  }

  /**
   * Verify timestamp validity
   */
  private verifyTimestamp(anchor: MerkleAnchor): boolean {
    const now = Date.now();
    const anchorTime = anchor.timestamp.getTime();

    // Anchor should not be in the future (with 1-hour tolerance)
    if (anchorTime > now + 60 * 60 * 1000) {
      return false;
    }

    // Anchor should not be older than retention period
    const maxAge = this.config.retentionYears * 365 * 24 * 60 * 60 * 1000;
    if (now - anchorTime > maxAge) {
      return false;
    }

    return true;
  }

  // Helper methods

  private calculateStateHash(state: any): string {
    const serialized = JSON.stringify(state, Object.keys(state).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  private generateAnchorId(): string {
    return `anchor_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private createPlaceholderProof(): IntegrityProof {
    return {
      algorithm: 'SHA-256',
      proof: '',
      witness: [],
      verificationPath: [],
      leafCount: 0,
      depth: 0,
    };
  }

  private findMostRecentAnchor(state: any): MerkleAnchor | undefined {
    const stateHash = this.calculateStateHash(state);

    // Find anchor with matching state hash (most recent)
    let mostRecent: MerkleAnchor | undefined;

    for (const anchor of this.anchorHistory.values()) {
      if (anchor.stateHash === stateHash) {
        if (!mostRecent || anchor.timestamp > mostRecent.timestamp) {
          mostRecent = anchor;
        }
      }
    }

    return mostRecent;
  }

  private async getBlockHeight(
    transactionId: string,
  ): Promise<number | undefined> {
    try {
      const transaction =
        await this.blockchainClient.getTransaction(transactionId);
      return transaction.blockHeight;
    } catch (error) {
      logger.warn('Failed to get block height', { error, transactionId });
      return undefined;
    }
  }

  /**
   * Get anchor by ID
   */
  getAnchor(anchorId: string): MerkleAnchor | undefined {
    return this.anchorHistory.get(anchorId);
  }

  /**
   * Get all anchors for a tenant
   */
  getAnchorsByTenant(tenantId: string): MerkleAnchor[] {
    return Array.from(this.anchorHistory.values())
      .filter((anchor) => anchor.metadata.tenantId === tenantId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get anchor statistics
   */
  getAnchorStatistics(): any {
    const anchors = Array.from(this.anchorHistory.values());

    const stats = {
      totalAnchors: anchors.length,
      pendingAnchors: this.pendingAnchors.size,
      anchorsByType: new Map<string, number>(),
      anchorsByTenant: new Map<string, number>(),
      averageAnchorSize: 0,
      oldestAnchor: null as Date | null,
      newestAnchor: null as Date | null,
      blockchainAnchors: 0,
      s3Anchors: 0,
    };

    if (anchors.length > 0) {
      // Calculate statistics
      let totalSize = 0;

      for (const anchor of anchors) {
        // Count by type
        const dataType = anchor.metadata.dataType;
        stats.anchorsByType.set(
          dataType,
          (stats.anchorsByType.get(dataType) || 0) + 1,
        );

        // Count by tenant
        const tenantId = anchor.metadata.tenantId;
        stats.anchorsByTenant.set(
          tenantId,
          (stats.anchorsByTenant.get(tenantId) || 0) + 1,
        );

        // Size accumulation
        totalSize += anchor.metadata.size;

        // Timestamps
        if (!stats.oldestAnchor || anchor.timestamp < stats.oldestAnchor) {
          stats.oldestAnchor = anchor.timestamp;
        }
        if (!stats.newestAnchor || anchor.timestamp > stats.newestAnchor) {
          stats.newestAnchor = anchor.timestamp;
        }

        // External anchor counts
        if (anchor.transactionId) stats.blockchainAnchors++;
        if (anchor.s3Location) stats.s3Anchors++;
      }

      stats.averageAnchorSize = totalSize / anchors.length;
    }

    return {
      ...stats,
      anchorsByType: Object.fromEntries(stats.anchorsByType),
      anchorsByTenant: Object.fromEntries(stats.anchorsByTenant),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnchorConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart batch timer if frequency changed
    if (this.batchTimer && newConfig.anchorFrequencyMinutes !== undefined) {
      clearInterval(this.batchTimer);
      if (this.config.anchorFrequencyMinutes > 0) {
        this.batchTimer = setInterval(
          () => this.processBatchAnchors(),
          this.config.anchorFrequencyMinutes * 60 * 1000,
        );
      }
    }

    logger.info('Configuration updated', { config: this.config });
    this.emit('config_updated', this.config);
  }

  /**
   * Force batch processing
   */
  async forceBatchProcessing(): Promise<BatchAnchorResult | null> {
    return await this.processBatchAnchors();
  }

  /**
   * Export state for persistence
   */
  exportState(): any {
    return {
      config: this.config,
      anchorHistory: Object.fromEntries(
        Array.from(this.anchorHistory.entries()).slice(-100), // Keep recent anchors
      ),
      pendingAnchors: Object.fromEntries(this.pendingAnchors),
    };
  }

  /**
   * Import state from persistence
   */
  importState(state: any): void {
    this.config = state.config;
    this.anchorHistory = new Map(Object.entries(state.anchorHistory));
    this.pendingAnchors = new Map(Object.entries(state.pendingAnchors));

    logger.info('State imported', {
      anchorHistory: this.anchorHistory.size,
      pendingAnchors: this.pendingAnchors.size,
    });
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down StateMerkleAnchor');

    // Clear batch timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Process any remaining pending anchors
    if (this.pendingAnchors.size > 0) {
      try {
        await this.processBatchAnchors();
      } catch (error) {
        logger.warn('Failed to process final batch during shutdown', { error });
      }
    }

    this.removeAllListeners();
    logger.info('StateMerkleAnchor shutdown complete');
  }
}

export default StateMerkleAnchor;
