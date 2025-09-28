import { EventEmitter } from 'events';
import { createHash, createHmac } from 'crypto';
import { logger } from '../config/logger';

export interface RedisStateConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  ttl: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  snapshotInterval: number;
  merkleTreeEnabled: boolean;
}

export interface StateSnapshot {
  id: string;
  timestamp: Date;
  appId: string;
  tenantId: string;
  stateVersion: number;
  stateData: any;
  merkleRoot?: string;
  signature?: string;
  metadata: SnapshotMetadata;
}

export interface SnapshotMetadata {
  size: number;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  precedingSnapshot?: string;
  tags: string[];
}

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: any;
}

export interface StateTransition {
  id: string;
  timestamp: Date;
  fromSnapshot: string;
  toSnapshot: string;
  transitionType: TransitionType;
  changeSet: StateChange[];
  validationResult: ValidationResult;
}

export enum TransitionType {
  ADAPTATION = 'adaptation',
  OPTIMIZATION = 'optimization',
  ROLLBACK = 'rollback',
  MIGRATION = 'migration',
  MAINTENANCE = 'maintenance'
}

export interface StateChange {
  path: string;
  operation: ChangeOperation;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  reason: string;
}

export enum ChangeOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move'
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
}

export interface ValidationError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  path?: string;
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ValidationWarning {
  code: string;
  message: string;
  recommendation?: string;
}

export interface PeriodicSnapshot {
  interval: number;
  retentionPolicy: RetentionPolicy;
  compressionPolicy: CompressionPolicy;
  encryptionPolicy: EncryptionPolicy;
  merklePolicy: MerklePolicy;
}

export interface RetentionPolicy {
  maxSnapshots: number;
  maxAge: number;
  archiveAfter: number;
  deleteAfter: number;
}

export interface CompressionPolicy {
  algorithm: CompressionAlgorithm;
  level: number;
  threshold: number;
  enabled: boolean;
}

export enum CompressionAlgorithm {
  GZIP = 'gzip',
  LZ4 = 'lz4',
  BROTLI = 'brotli',
  ZSTD = 'zstd'
}

export interface EncryptionPolicy {
  algorithm: EncryptionAlgorithm;
  keySize: number;
  keyRotationInterval: number;
  enabled: boolean;
}

export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes-256-gcm',
  CHACHA20_POLY1305 = 'chacha20-poly1305',
  AES_256_CBC = 'aes-256-cbc'
}

export interface MerklePolicy {
  enabled: boolean;
  hashAlgorithm: HashAlgorithm;
  leafNodeSize: number;
  autoVerification: boolean;
}

export enum HashAlgorithm {
  SHA256 = 'sha256',
  SHA3_256 = 'sha3-256',
  BLAKE3 = 'blake3',
  KECCAK256 = 'keccak256'
}

export interface StateQuery {
  appId?: string;
  tenantId?: string;
  stateVersion?: number;
  timestampRange?: [Date, Date];
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface StateMetrics {
  totalSnapshots: number;
  totalSize: number;
  compressionRatio: number;
  averageSnapshotSize: number;
  oldestSnapshot: Date;
  newestSnapshot: Date;
  snapshotFrequency: number;
  errorRate: number;
}

export interface CompactionResult {
  compactedSnapshots: number;
  spaceSaved: number;
  newMerkleRoot: string;
  duration: number;
  errors: string[];
}

export class RedisStateManager extends EventEmitter {
  private config: RedisStateConfig;
  private redis: any; // Redis client
  private encryptionKey?: Buffer;
  private hmacKey?: Buffer;
  private snapshotTimer?: NodeJS.Timeout;
  private compactionTimer?: NodeJS.Timeout;
  private periodicConfig: PeriodicSnapshot;

  constructor(config: RedisStateConfig, redisClient: any) {
    super();
    this.config = config;
    this.redis = redisClient;

    this.periodicConfig = {
      interval: config.snapshotInterval,
      retentionPolicy: {
        maxSnapshots: 1000,
        maxAge: 30 * 24 * 3600 * 1000, // 30 days
        archiveAfter: 7 * 24 * 3600 * 1000, // 7 days
        deleteAfter: 90 * 24 * 3600 * 1000 // 90 days
      },
      compressionPolicy: {
        algorithm: CompressionAlgorithm.GZIP,
        level: 6,
        threshold: 1024, // 1KB
        enabled: config.compressionEnabled
      },
      encryptionPolicy: {
        algorithm: EncryptionAlgorithm.AES_256_GCM,
        keySize: 256,
        keyRotationInterval: 24 * 3600 * 1000, // 24 hours
        enabled: config.encryptionEnabled
      },
      merklePolicy: {
        enabled: config.merkleTreeEnabled,
        hashAlgorithm: HashAlgorithm.SHA256,
        leafNodeSize: 4096,
        autoVerification: true
      }
    };

    this.initializeEncryption();
    this.startPeriodicSnapshots();
    this.startPeriodicCompaction();

    logger.info('RedisStateManager initialized', {
      keyPrefix: config.keyPrefix,
      snapshotInterval: config.snapshotInterval,
      compression: config.compressionEnabled,
      encryption: config.encryptionEnabled,
      merkle: config.merkleTreeEnabled
    });
  }

  private initializeEncryption(): void {
    if (this.config.encryptionEnabled) {
      // In production, these would come from a secure key management system
      this.encryptionKey = Buffer.from(process.env.REDIS_ENCRYPTION_KEY || 'default-encryption-key-32-bytes!!', 'utf8');
      this.hmacKey = Buffer.from(process.env.REDIS_HMAC_KEY || 'default-hmac-key-for-integrity!!', 'utf8');
    }
  }

  public async saveState(
    appId: string,
    tenantId: string,
    stateData: any,
    tags: string[] = []
  ): Promise<StateSnapshot> {
    const startTime = Date.now();

    try {
      // Create snapshot
      const snapshot: StateSnapshot = {
        id: this.generateSnapshotId(appId, tenantId),
        timestamp: new Date(),
        appId,
        tenantId,
        stateVersion: await this.getNextStateVersion(appId, tenantId),
        stateData,
        metadata: {
          size: JSON.stringify(stateData).length,
          compressed: false,
          encrypted: false,
          checksum: '',
          tags
        }
      };

      // Process state data
      let processedData = JSON.stringify(stateData);

      // Apply compression if enabled and above threshold
      if (this.periodicConfig.compressionPolicy.enabled &&
          snapshot.metadata.size > this.periodicConfig.compressionPolicy.threshold) {
        processedData = await this.compressData(processedData);
        snapshot.metadata.compressed = true;
      }

      // Apply encryption if enabled
      if (this.config.encryptionEnabled && this.encryptionKey) {
        processedData = await this.encryptData(processedData);
        snapshot.metadata.encrypted = true;
      }

      // Calculate checksum
      snapshot.metadata.checksum = this.calculateChecksum(processedData);

      // Generate Merkle root if enabled
      if (this.config.merkleTreeEnabled) {
        snapshot.merkleRoot = await this.generateMerkleRoot(stateData);
      }

      // Sign snapshot if signing is enabled
      if (this.hmacKey) {
        snapshot.signature = this.signSnapshot(snapshot);
      }

      // Store in Redis
      const key = this.getSnapshotKey(snapshot.id);
      await this.redis.setex(key, this.config.ttl, processedData);

      // Store snapshot metadata
      const metadataKey = this.getSnapshotMetadataKey(snapshot.id);
      await this.redis.setex(metadataKey, this.config.ttl, JSON.stringify(snapshot));

      // Update indexes
      await this.updateIndexes(snapshot);

      this.emit('stateSaved', {
        snapshotId: snapshot.id,
        appId,
        tenantId,
        size: snapshot.metadata.size,
        compressed: snapshot.metadata.compressed,
        encrypted: snapshot.metadata.encrypted,
        duration: Date.now() - startTime
      });

      logger.info('State saved successfully', {
        snapshotId: snapshot.id,
        appId,
        tenantId,
        size: snapshot.metadata.size,
        version: snapshot.stateVersion
      });

      return snapshot;

    } catch (error) {
      logger.error('Failed to save state', {
        appId,
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  public async loadState(snapshotId: string): Promise<any> {
    const startTime = Date.now();

    try {
      // Load snapshot metadata
      const metadataKey = this.getSnapshotMetadataKey(snapshotId);
      const metadataJson = await this.redis.get(metadataKey);

      if (!metadataJson) {
        throw new Error(`Snapshot not found: ${snapshotId}`);
      }

      const snapshot: StateSnapshot = JSON.parse(metadataJson);

      // Verify signature if present
      if (snapshot.signature && this.hmacKey) {
        if (!this.verifySnapshotSignature(snapshot)) {
          throw new Error('Snapshot signature verification failed');
        }
      }

      // Load state data
      const key = this.getSnapshotKey(snapshotId);
      let processedData = await this.redis.get(key);

      if (!processedData) {
        throw new Error(`Snapshot data not found: ${snapshotId}`);
      }

      // Verify checksum
      const calculatedChecksum = this.calculateChecksum(processedData);
      if (calculatedChecksum !== snapshot.metadata.checksum) {
        throw new Error('Snapshot checksum verification failed');
      }

      // Decrypt if encrypted
      if (snapshot.metadata.encrypted && this.encryptionKey) {
        processedData = await this.decryptData(processedData);
      }

      // Decompress if compressed
      if (snapshot.metadata.compressed) {
        processedData = await this.decompressData(processedData);
      }

      const stateData = JSON.parse(processedData);

      // Verify Merkle root if enabled
      if (this.config.merkleTreeEnabled && snapshot.merkleRoot) {
        const calculatedRoot = await this.generateMerkleRoot(stateData);
        if (calculatedRoot !== snapshot.merkleRoot) {
          logger.warn('Merkle root verification failed', {
            snapshotId,
            expected: snapshot.merkleRoot,
            calculated: calculatedRoot
          });
        }
      }

      this.emit('stateLoaded', {
        snapshotId,
        appId: snapshot.appId,
        tenantId: snapshot.tenantId,
        size: snapshot.metadata.size,
        duration: Date.now() - startTime
      });

      return stateData;

    } catch (error) {
      logger.error('Failed to load state', {
        snapshotId,
        error: error.message
      });
      throw error;
    }
  }

  public async querySnapshots(query: StateQuery): Promise<StateSnapshot[]> {
    try {
      const indexKey = this.getIndexKey('snapshots');
      const snapshotIds = await this.redis.smembers(indexKey);

      const snapshots: StateSnapshot[] = [];

      for (const snapshotId of snapshotIds) {
        try {
          const metadataKey = this.getSnapshotMetadataKey(snapshotId);
          const metadataJson = await this.redis.get(metadataKey);

          if (metadataJson) {
            const snapshot: StateSnapshot = JSON.parse(metadataJson);

            // Apply filters
            if (this.matchesQuery(snapshot, query)) {
              snapshots.push(snapshot);
            }
          }
        } catch (error) {
          logger.warn('Failed to load snapshot metadata', {
            snapshotId,
            error: error.message
          });
        }
      }

      // Sort by timestamp (newest first)
      snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 100;

      return snapshots.slice(offset, offset + limit);

    } catch (error) {
      logger.error('Failed to query snapshots', { query, error: error.message });
      throw error;
    }
  }

  private matchesQuery(snapshot: StateSnapshot, query: StateQuery): boolean {
    if (query.appId && snapshot.appId !== query.appId) return false;
    if (query.tenantId && snapshot.tenantId !== query.tenantId) return false;
    if (query.stateVersion && snapshot.stateVersion !== query.stateVersion) return false;

    if (query.timestampRange) {
      const [start, end] = query.timestampRange;
      const snapshotTime = snapshot.timestamp.getTime();
      if (snapshotTime < start.getTime() || snapshotTime > end.getTime()) return false;
    }

    if (query.tags && query.tags.length > 0) {
      const hasAllTags = query.tags.every(tag => snapshot.metadata.tags.includes(tag));
      if (!hasAllTags) return false;
    }

    return true;
  }

  public async deleteSnapshot(snapshotId: string): Promise<void> {
    try {
      // Load snapshot metadata for cleanup
      const metadataKey = this.getSnapshotMetadataKey(snapshotId);
      const metadataJson = await this.redis.get(metadataKey);

      if (metadataJson) {
        const snapshot: StateSnapshot = JSON.parse(metadataJson);

        // Remove from indexes
        await this.removeFromIndexes(snapshot);
      }

      // Delete data and metadata
      const dataKey = this.getSnapshotKey(snapshotId);
      await this.redis.del(dataKey, metadataKey);

      this.emit('snapshotDeleted', { snapshotId });

      logger.info('Snapshot deleted', { snapshotId });

    } catch (error) {
      logger.error('Failed to delete snapshot', {
        snapshotId,
        error: error.message
      });
      throw error;
    }
  }

  public async createStateTransition(
    fromSnapshotId: string,
    toSnapshotId: string,
    transitionType: TransitionType,
    changeSet: StateChange[]
  ): Promise<StateTransition> {
    try {
      const transition: StateTransition = {
        id: this.generateTransitionId(),
        timestamp: new Date(),
        fromSnapshot: fromSnapshotId,
        toSnapshot: toSnapshotId,
        transitionType,
        changeSet,
        validationResult: await this.validateTransition(changeSet)
      };

      // Store transition
      const transitionKey = this.getTransitionKey(transition.id);
      await this.redis.setex(
        transitionKey,
        this.config.ttl,
        JSON.stringify(transition)
      );

      // Update transition index
      const transitionIndexKey = this.getIndexKey('transitions');
      await this.redis.sadd(transitionIndexKey, transition.id);

      this.emit('transitionCreated', {
        transitionId: transition.id,
        fromSnapshot: fromSnapshotId,
        toSnapshot: toSnapshotId,
        changeCount: changeSet.length
      });

      return transition;

    } catch (error) {
      logger.error('Failed to create state transition', {
        fromSnapshotId,
        toSnapshotId,
        error: error.message
      });
      throw error;
    }
  }

  private async validateTransition(changeSet: StateChange[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate individual changes
    for (const change of changeSet) {
      // Path validation
      if (!change.path || change.path.trim().length === 0) {
        errors.push({
          code: 'INVALID_PATH',
          message: 'Change path cannot be empty',
          severity: ErrorSeverity.HIGH,
          path: change.path
        });
      }

      // Operation validation
      if (change.operation === ChangeOperation.UPDATE && change.oldValue === change.newValue) {
        warnings.push({
          code: 'REDUNDANT_UPDATE',
          message: 'Update operation with no value change',
          recommendation: 'Consider removing redundant updates'
        });
      }

      // Value validation
      if (change.operation === ChangeOperation.CREATE && change.oldValue !== undefined) {
        warnings.push({
          code: 'CREATE_WITH_OLD_VALUE',
          message: 'Create operation should not have old value',
          recommendation: 'Remove old value for create operations'
        });
      }
    }

    // Calculate validation score
    const maxScore = 100;
    const errorPenalty = errors.reduce((penalty, error) => {
      switch (error.severity) {
        case ErrorSeverity.CRITICAL: return penalty + 30;
        case ErrorSeverity.HIGH: return penalty + 20;
        case ErrorSeverity.MEDIUM: return penalty + 10;
        case ErrorSeverity.LOW: return penalty + 5;
        default: return penalty;
      }
    }, 0);

    const warningPenalty = warnings.length * 2;
    const score = Math.max(0, maxScore - errorPenalty - warningPenalty);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score
    };
  }

  public async getStateMetrics(): Promise<StateMetrics> {
    try {
      const indexKey = this.getIndexKey('snapshots');
      const snapshotIds = await this.redis.smembers(indexKey);

      let totalSize = 0;
      let compressedSize = 0;
      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;

      for (const snapshotId of snapshotIds) {
        try {
          const metadataKey = this.getSnapshotMetadataKey(snapshotId);
          const metadataJson = await this.redis.get(metadataKey);

          if (metadataJson) {
            const snapshot: StateSnapshot = JSON.parse(metadataJson);
            totalSize += snapshot.metadata.size;

            const timestamp = snapshot.timestamp.getTime();
            oldestTimestamp = Math.min(oldestTimestamp, timestamp);
            newestTimestamp = Math.max(newestTimestamp, timestamp);

            if (snapshot.metadata.compressed) {
              // Estimate compressed size (would be more accurate with actual compressed size)
              compressedSize += Math.floor(snapshot.metadata.size * 0.3);
            } else {
              compressedSize += snapshot.metadata.size;
            }
          }
        } catch (error) {
          // Skip invalid snapshots
        }
      }

      const timeSpan = newestTimestamp - oldestTimestamp;
      const snapshotFrequency = timeSpan > 0 ? snapshotIds.length / (timeSpan / (24 * 3600 * 1000)) : 0;

      return {
        totalSnapshots: snapshotIds.length,
        totalSize,
        compressionRatio: totalSize > 0 ? compressedSize / totalSize : 1.0,
        averageSnapshotSize: snapshotIds.length > 0 ? totalSize / snapshotIds.length : 0,
        oldestSnapshot: new Date(oldestTimestamp),
        newestSnapshot: new Date(newestTimestamp),
        snapshotFrequency,
        errorRate: 0 // Would be calculated based on error tracking
      };

    } catch (error) {
      logger.error('Failed to get state metrics', { error: error.message });
      throw error;
    }
  }

  public async compactSnapshots(appId?: string, tenantId?: string): Promise<CompactionResult> {
    const startTime = Date.now();

    try {
      const query: StateQuery = { appId, tenantId };
      const snapshots = await this.querySnapshots(query);

      // Apply retention policy
      const retentionPolicy = this.periodicConfig.retentionPolicy;
      const now = Date.now();

      const snapshotsToDelete = snapshots.filter(snapshot => {
        const age = now - snapshot.timestamp.getTime();
        return age > retentionPolicy.deleteAfter;
      });

      const snapshotsToArchive = snapshots.filter(snapshot => {
        const age = now - snapshot.timestamp.getTime();
        return age > retentionPolicy.archiveAfter && age <= retentionPolicy.deleteAfter;
      });

      // Delete old snapshots
      for (const snapshot of snapshotsToDelete) {
        await this.deleteSnapshot(snapshot.id);
      }

      // Archive snapshots (simplified - would implement proper archival)
      for (const snapshot of snapshotsToArchive) {
        await this.archiveSnapshot(snapshot);
      }

      // Generate new Merkle root for remaining snapshots
      const remainingSnapshots = snapshots.filter(s =>
        !snapshotsToDelete.includes(s) && !snapshotsToArchive.includes(s)
      );

      const newMerkleRoot = await this.generateCompactionMerkleRoot(remainingSnapshots);

      const spaceSaved = snapshotsToDelete.reduce((total, s) => total + s.metadata.size, 0);

      const result: CompactionResult = {
        compactedSnapshots: snapshotsToDelete.length + snapshotsToArchive.length,
        spaceSaved,
        newMerkleRoot,
        duration: Date.now() - startTime,
        errors: []
      };

      this.emit('compactionCompleted', result);

      logger.info('Snapshot compaction completed', {
        compactedSnapshots: result.compactedSnapshots,
        spaceSaved: result.spaceSaved,
        duration: result.duration
      });

      return result;

    } catch (error) {
      logger.error('Snapshot compaction failed', { error: error.message });
      throw error;
    }
  }

  private async archiveSnapshot(snapshot: StateSnapshot): Promise<void> {
    // Implementation would move snapshot to archive storage
    // For now, just tag it as archived
    snapshot.metadata.tags.push('archived');

    const metadataKey = this.getSnapshotMetadataKey(snapshot.id);
    await this.redis.setex(metadataKey, this.config.ttl, JSON.stringify(snapshot));
  }

  private startPeriodicSnapshots(): void {
    if (this.periodicConfig.interval > 0) {
      this.snapshotTimer = setInterval(() => {
        this.performPeriodicMaintenance();
      }, this.periodicConfig.interval);
    }
  }

  private startPeriodicCompaction(): void {
    // Run compaction daily
    const compactionInterval = 24 * 3600 * 1000;
    this.compactionTimer = setInterval(() => {
      this.performPeriodicCompaction();
    }, compactionInterval);
  }

  private async performPeriodicMaintenance(): Promise<void> {
    try {
      // Check for expired snapshots
      const metrics = await this.getStateMetrics();

      // Trigger compaction if needed
      if (metrics.totalSnapshots > this.periodicConfig.retentionPolicy.maxSnapshots) {
        await this.compactSnapshots();
      }

      this.emit('maintenancePerformed', { metrics });

    } catch (error) {
      logger.error('Periodic maintenance failed', { error: error.message });
    }
  }

  private async performPeriodicCompaction(): Promise<void> {
    try {
      const result = await this.compactSnapshots();

      this.emit('periodicCompactionCompleted', result);

    } catch (error) {
      logger.error('Periodic compaction failed', { error: error.message });
    }
  }

  // Utility methods
  private generateSnapshotId(appId: string, tenantId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `snapshot_${appId}_${tenantId}_${timestamp}_${random}`;
  }

  private generateTransitionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `transition_${timestamp}_${random}`;
  }

  private async getNextStateVersion(appId: string, tenantId: string): Promise<number> {
    const versionKey = this.getVersionKey(appId, tenantId);
    return await this.redis.incr(versionKey);
  }

  private getSnapshotKey(snapshotId: string): string {
    return `${this.config.keyPrefix}:snapshot:${snapshotId}`;
  }

  private getSnapshotMetadataKey(snapshotId: string): string {
    return `${this.config.keyPrefix}:snapshot:meta:${snapshotId}`;
  }

  private getTransitionKey(transitionId: string): string {
    return `${this.config.keyPrefix}:transition:${transitionId}`;
  }

  private getIndexKey(indexType: string): string {
    return `${this.config.keyPrefix}:index:${indexType}`;
  }

  private getVersionKey(appId: string, tenantId: string): string {
    return `${this.config.keyPrefix}:version:${appId}:${tenantId}`;
  }

  private async updateIndexes(snapshot: StateSnapshot): Promise<void> {
    // Add to main snapshot index
    const snapshotIndexKey = this.getIndexKey('snapshots');
    await this.redis.sadd(snapshotIndexKey, snapshot.id);

    // Add to app-specific index
    const appIndexKey = this.getIndexKey(`app:${snapshot.appId}`);
    await this.redis.sadd(appIndexKey, snapshot.id);

    // Add to tenant-specific index
    const tenantIndexKey = this.getIndexKey(`tenant:${snapshot.tenantId}`);
    await this.redis.sadd(tenantIndexKey, snapshot.id);

    // Add to tag indexes
    for (const tag of snapshot.metadata.tags) {
      const tagIndexKey = this.getIndexKey(`tag:${tag}`);
      await this.redis.sadd(tagIndexKey, snapshot.id);
    }
  }

  private async removeFromIndexes(snapshot: StateSnapshot): Promise<void> {
    // Remove from all indexes
    const snapshotIndexKey = this.getIndexKey('snapshots');
    await this.redis.srem(snapshotIndexKey, snapshot.id);

    const appIndexKey = this.getIndexKey(`app:${snapshot.appId}`);
    await this.redis.srem(appIndexKey, snapshot.id);

    const tenantIndexKey = this.getIndexKey(`tenant:${snapshot.tenantId}`);
    await this.redis.srem(tenantIndexKey, snapshot.id);

    for (const tag of snapshot.metadata.tags) {
      const tagIndexKey = this.getIndexKey(`tag:${tag}`);
      await this.redis.srem(tagIndexKey, snapshot.id);
    }
  }

  private calculateChecksum(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private signSnapshot(snapshot: StateSnapshot): string {
    if (!this.hmacKey) throw new Error('HMAC key not available');

    const signData = JSON.stringify({
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      appId: snapshot.appId,
      tenantId: snapshot.tenantId,
      stateVersion: snapshot.stateVersion,
      checksum: snapshot.metadata.checksum,
      merkleRoot: snapshot.merkleRoot
    });

    return createHmac('sha256', this.hmacKey).update(signData).digest('hex');
  }

  private verifySnapshotSignature(snapshot: StateSnapshot): boolean {
    if (!snapshot.signature || !this.hmacKey) return false;

    const expectedSignature = this.signSnapshot({
      ...snapshot,
      signature: undefined // Remove signature for verification
    });

    return snapshot.signature === expectedSignature;
  }

  private async compressData(data: string): Promise<string> {
    // Simplified compression - would use actual compression libraries
    const compressed = Buffer.from(data).toString('base64');
    return compressed;
  }

  private async decompressData(compressedData: string): Promise<string> {
    // Simplified decompression
    return Buffer.from(compressedData, 'base64').toString('utf8');
  }

  private async encryptData(data: string): Promise<string> {
    if (!this.encryptionKey) throw new Error('Encryption key not available');

    // Simplified encryption - would use actual crypto libraries
    const encrypted = Buffer.from(data).toString('base64');
    return encrypted;
  }

  private async decryptData(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) throw new Error('Encryption key not available');

    // Simplified decryption
    return Buffer.from(encryptedData, 'base64').toString('utf8');
  }

  private async generateMerkleRoot(data: any): Promise<string> {
    // Simplified Merkle tree generation
    const dataString = JSON.stringify(data);
    const chunks = this.chunkData(dataString, this.periodicConfig.merklePolicy.leafNodeSize);
    const tree = await this.buildMerkleTree(chunks);
    return tree.hash;
  }

  private chunkData(data: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async buildMerkleTree(chunks: string[]): Promise<MerkleNode> {
    if (chunks.length === 0) {
      throw new Error('Cannot build Merkle tree from empty chunks');
    }

    // Create leaf nodes
    let nodes: MerkleNode[] = chunks.map(chunk => ({
      hash: createHash(this.periodicConfig.merklePolicy.hashAlgorithm).update(chunk).digest('hex'),
      data: chunk
    }));

    // Build tree bottom-up
    while (nodes.length > 1) {
      const nextLevel: MerkleNode[] = [];

      for (let i = 0; i < nodes.length; i += 2) {
        const left = nodes[i];
        const right = i + 1 < nodes.length ? nodes[i + 1] : left; // Duplicate if odd

        const combinedHash = createHash(this.periodicConfig.merklePolicy.hashAlgorithm)
          .update(left.hash + right.hash)
          .digest('hex');

        nextLevel.push({
          hash: combinedHash,
          left,
          right: right !== left ? right : undefined
        });
      }

      nodes = nextLevel;
    }

    return nodes[0];
  }

  private async generateCompactionMerkleRoot(snapshots: StateSnapshot[]): Promise<string> {
    const snapshotHashes = snapshots.map(s => s.merkleRoot || s.metadata.checksum);
    const combinedHash = createHash('sha256')
      .update(snapshotHashes.join(''))
      .digest('hex');
    return combinedHash;
  }

  public async shutdown(): Promise<void> {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
    }

    if (this.compactionTimer) {
      clearInterval(this.compactionTimer);
    }

    this.removeAllListeners();

    logger.info('RedisStateManager shutdown complete');
  }
}