"use strict";
/**
 * Air-Gapped Failover Orchestrator
 *
 * Provides resilient queue operations for disconnected/air-gapped environments:
 * - Automatic detection of network isolation
 * - Local file-based queue persistence during air-gap
 * - Conflict-free sync when connectivity is restored
 * - Data integrity verification with checksums
 * - Encrypted local storage option for sensitive data
 *
 * Trade-offs:
 * - Local storage has I/O overhead (mitigated by batching)
 * - Sync can be slow for large backlogs (progressive sync supported)
 * - Conflict resolution may require manual intervention (rare edge cases)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirgapFailoverOrchestrator = void 0;
exports.createAirgapFailoverOrchestrator = createAirgapFailoverOrchestrator;
const events_1 = require("events");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const uuid_1 = require("uuid");
const logger_js_1 = require("../utils/logger.js");
class AirgapFailoverOrchestrator extends events_1.EventEmitter {
    config;
    redisClient;
    distributedQueue = null;
    state = 'connected';
    localState = null;
    encryptionKey = null;
    connectionCheckTimer;
    syncInProgress = false;
    lastConnectedAt;
    airgappedSince;
    logger;
    STORAGE_FILE = 'queue-state.json';
    ENCRYPTION_ALGORITHM = 'aes-256-gcm';
    constructor(redisClient, config = {}) {
        super();
        this.redisClient = redisClient;
        this.logger = new logger_js_1.Logger('AirgapFailoverOrchestrator');
        this.config = {
            enabled: config.enabled ?? true,
            detectionInterval: config.detectionInterval ?? 5000,
            recoveryThreshold: config.recoveryThreshold ?? 3,
            localStoragePath: config.localStoragePath ?? '/tmp/queue-airgap',
            maxLocalQueueSize: config.maxLocalQueueSize ?? 10000,
            syncBatchSize: config.syncBatchSize ?? 100,
            encryptLocalStorage: config.encryptLocalStorage ?? false,
        };
    }
    /**
     * Initialize the airgap orchestrator
     */
    async initialize(distributedQueue) {
        this.distributedQueue = distributedQueue ?? null;
        // Ensure storage directory exists
        await fs_1.promises.mkdir(this.config.localStoragePath, { recursive: true });
        // Initialize encryption if enabled
        if (this.config.encryptLocalStorage) {
            this.encryptionKey = await this.initializeEncryptionKey();
        }
        // Load existing local state
        await this.loadLocalState();
        // Start connection monitoring
        if (this.config.enabled) {
            this.startConnectionMonitoring();
        }
        this.logger.info('Airgap failover orchestrator initialized', {
            storagePath: this.config.localStoragePath,
            encrypted: this.config.encryptLocalStorage,
        });
    }
    /**
     * Set the distributed queue instance
     */
    setDistributedQueue(queue) {
        this.distributedQueue = queue;
    }
    /**
     * Get current airgap status
     */
    getStatus() {
        return {
            state: this.state,
            lastConnectedAt: this.lastConnectedAt,
            airgappedSince: this.airgappedSince,
            pendingJobs: this.localState?.pendingSync.length ?? 0,
            localQueueSize: this.localState?.jobs.length ?? 0,
            syncProgress: this.syncInProgress ? this.calculateSyncProgress() : undefined,
        };
    }
    /**
     * Add a job (works in both connected and airgapped modes)
     */
    async addJob(queueName, jobName, data, options = {}) {
        if (this.state === 'connected' && this.distributedQueue) {
            // Normal operation - use distributed queue
            try {
                return await this.distributedQueue.addJob(jobName, data, options);
            }
            catch (error) {
                // If failed, switch to airgap mode
                this.logger.warn('Failed to add job remotely, switching to local storage', { error });
                await this.transitionToAirgap();
            }
        }
        // Airgapped operation - store locally
        return this.addLocalJob(queueName, jobName, data, options);
    }
    /**
     * Get pending local jobs
     */
    getPendingLocalJobs() {
        if (!this.localState)
            return [];
        return this.localState.jobs.filter(j => !j.synced);
    }
    /**
     * Manually trigger sync
     */
    async triggerSync() {
        if (this.state !== 'connected' && this.state !== 'recovering') {
            throw new Error(`Cannot sync in ${this.state} state`);
        }
        return this.performSync();
    }
    /**
     * Force transition to airgap mode (for testing or manual failover)
     */
    async forceAirgap() {
        await this.transitionToAirgap();
    }
    /**
     * Force recovery attempt
     */
    async forceRecovery() {
        return this.attemptRecovery();
    }
    /**
     * Get local queue statistics
     */
    getLocalQueueStats() {
        if (!this.localState) {
            return { totalJobs: 0, pendingSync: 0, syncedJobs: 0, oldestJob: null };
        }
        const pendingJobs = this.localState.jobs.filter(j => !j.synced);
        const oldestJobDate = pendingJobs.length > 0
            ? new Date(pendingJobs[0].createdAt)
            : null;
        return {
            totalJobs: this.localState.jobs.length,
            pendingSync: pendingJobs.length,
            syncedJobs: this.localState.jobs.filter(j => j.synced).length,
            oldestJob: oldestJobDate,
        };
    }
    /**
     * Clear synced jobs from local storage
     */
    async clearSyncedJobs() {
        if (!this.localState)
            return 0;
        const syncedCount = this.localState.jobs.filter(j => j.synced).length;
        this.localState.jobs = this.localState.jobs.filter(j => !j.synced);
        this.localState.pendingSync = this.localState.jobs.map(j => j.id);
        await this.persistLocalState();
        this.logger.info('Cleared synced jobs', { count: syncedCount });
        return syncedCount;
    }
    /**
     * Graceful shutdown
     */
    async shutdown() {
        if (this.connectionCheckTimer) {
            clearInterval(this.connectionCheckTimer);
        }
        // Persist final state
        await this.persistLocalState();
        this.logger.info('Airgap failover orchestrator shutdown');
    }
    // Private methods
    async initializeEncryptionKey() {
        const keyPath = (0, path_1.join)(this.config.localStoragePath, '.encryption-key');
        try {
            const existingKey = await fs_1.promises.readFile(keyPath);
            return existingKey;
        }
        catch {
            // Generate new key
            const newKey = (0, crypto_1.randomBytes)(32);
            await fs_1.promises.writeFile(keyPath, newKey, { mode: 0o600 });
            return newKey;
        }
    }
    async loadLocalState() {
        const statePath = (0, path_1.join)(this.config.localStoragePath, this.STORAGE_FILE);
        try {
            let data = await fs_1.promises.readFile(statePath, 'utf-8');
            if (this.config.encryptLocalStorage && this.encryptionKey) {
                data = this.decrypt(data);
            }
            this.localState = JSON.parse(data);
            // Verify checksum
            const calculatedChecksum = this.calculateChecksum(this.localState.jobs);
            if (calculatedChecksum !== this.localState.checksum) {
                this.logger.warn('Local state checksum mismatch, state may be corrupted');
            }
            this.logger.info('Loaded local state', {
                jobs: this.localState.jobs.length,
                pendingSync: this.localState.pendingSync.length,
            });
        }
        catch (error) {
            // Initialize new state
            this.localState = {
                version: 1,
                lastSync: null,
                jobs: [],
                pendingSync: [],
                checksum: '',
            };
        }
    }
    async persistLocalState() {
        if (!this.localState)
            return;
        // Update checksum
        this.localState.checksum = this.calculateChecksum(this.localState.jobs);
        let data = JSON.stringify(this.localState, null, 2);
        if (this.config.encryptLocalStorage && this.encryptionKey) {
            data = this.encrypt(data);
        }
        const statePath = (0, path_1.join)(this.config.localStoragePath, this.STORAGE_FILE);
        await fs_1.promises.writeFile(statePath, data, { mode: 0o600 });
    }
    encrypt(data) {
        if (!this.encryptionKey)
            throw new Error('Encryption key not initialized');
        const iv = (0, crypto_1.randomBytes)(16);
        const cipher = (0, crypto_1.createCipheriv)(this.ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return JSON.stringify({
            iv: iv.toString('hex'),
            data: encrypted,
            tag: authTag.toString('hex'),
        });
    }
    decrypt(encryptedData) {
        if (!this.encryptionKey)
            throw new Error('Encryption key not initialized');
        const { iv, data, tag } = JSON.parse(encryptedData);
        const decipher = (0, crypto_1.createDecipheriv)(this.ENCRYPTION_ALGORITHM, this.encryptionKey, Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(tag, 'hex'));
        let decrypted = decipher.update(data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    calculateChecksum(jobs) {
        const hash = (0, crypto_1.createHash)('sha256');
        hash.update(JSON.stringify(jobs));
        return hash.digest('hex');
    }
    calculateJobChecksum(job) {
        const hash = (0, crypto_1.createHash)('sha256');
        hash.update(JSON.stringify(job));
        return hash.digest('hex');
    }
    startConnectionMonitoring() {
        let consecutiveSuccesses = 0;
        let consecutiveFailures = 0;
        this.connectionCheckTimer = setInterval(async () => {
            try {
                // Try to ping Redis
                await this.redisClient.execute('PING');
                consecutiveSuccesses++;
                consecutiveFailures = 0;
                if (this.state === 'airgapped' || this.state === 'degraded') {
                    if (consecutiveSuccesses >= this.config.recoveryThreshold) {
                        await this.transitionToRecovering();
                    }
                }
                else if (this.state === 'recovering') {
                    // Continue recovery
                    if (!this.syncInProgress) {
                        await this.performSync();
                    }
                }
                else {
                    this.lastConnectedAt = new Date();
                }
            }
            catch (error) {
                consecutiveFailures++;
                consecutiveSuccesses = 0;
                if (this.state === 'connected') {
                    this.logger.warn('Connection check failed', { consecutiveFailures });
                    if (consecutiveFailures >= 3) {
                        await this.transitionToAirgap();
                    }
                }
            }
        }, this.config.detectionInterval);
    }
    async transitionToAirgap() {
        const oldState = this.state;
        this.state = 'airgapped';
        this.airgappedSince = new Date();
        this.emit('state:changed', this.state, oldState);
        this.emit('airgap:detected', this.getStatus());
        this.logger.warn('Transitioned to airgap mode');
    }
    async transitionToRecovering() {
        const oldState = this.state;
        this.state = 'recovering';
        this.emit('state:changed', this.state, oldState);
        this.logger.info('Beginning recovery from airgap');
        // Start sync process
        await this.performSync();
    }
    async attemptRecovery() {
        try {
            await this.redisClient.execute('PING');
            if (this.state === 'airgapped') {
                await this.transitionToRecovering();
            }
            return true;
        }
        catch {
            return false;
        }
    }
    async performSync() {
        if (this.syncInProgress) {
            throw new Error('Sync already in progress');
        }
        this.syncInProgress = true;
        const operation = {
            id: (0, uuid_1.v4)(),
            type: 'upload',
            status: 'in-progress',
            jobsCount: this.localState?.pendingSync.length ?? 0,
            bytesTransferred: 0,
            startedAt: new Date(),
        };
        this.emit('sync:started', operation);
        try {
            if (!this.distributedQueue || !this.localState) {
                throw new Error('Queue or local state not available');
            }
            const pendingJobs = this.localState.jobs.filter(j => this.localState.pendingSync.includes(j.id));
            let syncedCount = 0;
            // Sync in batches
            for (let i = 0; i < pendingJobs.length; i += this.config.syncBatchSize) {
                const batch = pendingJobs.slice(i, i + this.config.syncBatchSize);
                for (const localJob of batch) {
                    try {
                        // Check for conflicts
                        const existingJob = await this.distributedQueue.getJob(localJob.id);
                        if (existingJob) {
                            // Conflict detected
                            this.emit('conflict:detected', localJob.id, localJob, existingJob);
                            this.logger.warn('Sync conflict detected', { jobId: localJob.id });
                            continue;
                        }
                        // Add to distributed queue
                        await this.distributedQueue.addJob(localJob.jobName, localJob.data, {
                            ...localJob.options,
                            idempotencyKey: localJob.id,
                        });
                        // Mark as synced
                        const job = this.localState.jobs.find(j => j.id === localJob.id);
                        if (job) {
                            job.synced = true;
                        }
                        // Remove from pending
                        const pendingIndex = this.localState.pendingSync.indexOf(localJob.id);
                        if (pendingIndex !== -1) {
                            this.localState.pendingSync.splice(pendingIndex, 1);
                        }
                        syncedCount++;
                        operation.bytesTransferred += JSON.stringify(localJob).length;
                    }
                    catch (error) {
                        this.logger.error('Failed to sync job', {
                            jobId: localJob.id,
                            error: error instanceof Error ? error.message : String(error),
                        });
                    }
                }
                // Emit progress
                const progress = Math.round((syncedCount / pendingJobs.length) * 100);
                this.emit('sync:progress', operation, progress);
                // Persist progress
                await this.persistLocalState();
            }
            // Complete sync
            operation.status = 'completed';
            operation.completedAt = new Date();
            this.localState.lastSync = new Date().toISOString();
            await this.persistLocalState();
            // Transition to connected state
            const oldState = this.state;
            this.state = 'connected';
            this.airgappedSince = undefined;
            this.lastConnectedAt = new Date();
            this.emit('state:changed', this.state, oldState);
            this.emit('sync:completed', operation);
            this.emit('airgap:recovered', this.getStatus());
            this.logger.info('Sync completed', {
                syncedJobs: syncedCount,
                duration: Date.now() - operation.startedAt.getTime(),
            });
            return operation;
        }
        catch (error) {
            operation.status = 'failed';
            operation.error = error instanceof Error ? error.message : String(error);
            operation.completedAt = new Date();
            this.emit('sync:failed', operation, error instanceof Error ? error : new Error(String(error)));
            // Revert to airgapped state
            this.state = 'airgapped';
            throw error;
        }
        finally {
            this.syncInProgress = false;
        }
    }
    calculateSyncProgress() {
        if (!this.localState)
            return 0;
        const totalPending = this.localState.jobs.filter(j => !j.synced).length;
        const totalJobs = this.localState.jobs.length;
        if (totalJobs === 0)
            return 100;
        return Math.round(((totalJobs - totalPending) / totalJobs) * 100);
    }
    async addLocalJob(queueName, jobName, data, options) {
        if (!this.localState) {
            await this.loadLocalState();
        }
        // Check queue size limit
        if (this.localState.jobs.length >= this.config.maxLocalQueueSize) {
            throw new Error('Local queue size limit exceeded');
        }
        const jobId = options.idempotencyKey ?? (0, uuid_1.v4)();
        const localJob = {
            id: jobId,
            queueName,
            jobName,
            data,
            options,
            createdAt: new Date().toISOString(),
            checksum: '',
            synced: false,
        };
        localJob.checksum = this.calculateJobChecksum({
            id: localJob.id,
            queueName: localJob.queueName,
            jobName: localJob.jobName,
            data: localJob.data,
            options: localJob.options,
            createdAt: localJob.createdAt,
        });
        this.localState.jobs.push(localJob);
        this.localState.pendingSync.push(jobId);
        await this.persistLocalState();
        this.logger.info('Job added to local queue', { jobId, queueName, jobName });
        return localJob;
    }
}
exports.AirgapFailoverOrchestrator = AirgapFailoverOrchestrator;
/**
 * Create an airgap failover orchestrator with default configuration
 */
function createAirgapFailoverOrchestrator(redisClient, config) {
    return new AirgapFailoverOrchestrator(redisClient, config);
}
