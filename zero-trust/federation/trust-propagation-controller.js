"use strict";
/**
 * Trust Propagation Controller
 *
 * Manages cross-cluster trust relationships, bundle synchronization,
 * and identity federation for the IntelGraph zero-trust architecture.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustPropagationController = void 0;
exports.createTrustPropagationController = createTrustPropagationController;
const events_1 = require("events");
const crypto = __importStar(require("crypto"));
const audit_logger_1 = require("../../security/zero-trust/siem/audit-logger");
// Configuration
const config = {
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    healthCheckInterval: 30 * 1000, // 30 seconds
    cacheTtl: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3,
    retryBackoff: {
        initial: 1000,
        max: 30000,
        multiplier: 2,
    },
    consensus: {
        minClusters: 2,
        timeout: 30000,
        quorumType: 'majority',
    },
};
/**
 * Trust Bundle Manager
 * Handles synchronization and validation of trust bundles across clusters
 */
class TrustBundleManager {
    bundles = new Map();
    localTrustDomain;
    constructor(localTrustDomain) {
        this.localTrustDomain = localTrustDomain;
    }
    async fetchBundle(cluster) {
        console.log(`[TrustBundleManager] Fetching bundle from ${cluster.domain}`);
        // In production, this would make an actual HTTPS request to the bundle endpoint
        // For now, return a mock bundle
        const bundle = {
            trustDomain: cluster.domain,
            certificates: [],
            publicKeys: [],
            issuedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            signatures: [],
        };
        return bundle;
    }
    async validateBundle(bundle) {
        // Validate bundle signatures
        if (bundle.signatures.length < 2) {
            console.warn(`[TrustBundleManager] Bundle for ${bundle.trustDomain} has insufficient signatures`);
            return false;
        }
        // Validate certificate chain
        for (const cert of bundle.certificates) {
            if (new Date(cert.notAfter) < new Date()) {
                console.warn(`[TrustBundleManager] Certificate ${cert.serialNumber} has expired`);
                return false;
            }
        }
        // Validate bundle hasn't been tampered with
        const bundleHash = this.computeBundleHash(bundle);
        console.log(`[TrustBundleManager] Bundle hash for ${bundle.trustDomain}: ${bundleHash}`);
        return true;
    }
    async syncBundle(cluster) {
        try {
            const bundle = await this.fetchBundle(cluster);
            if (await this.validateBundle(bundle)) {
                const existingBundle = this.bundles.get(cluster.domain);
                const newHash = this.computeBundleHash(bundle);
                if (existingBundle) {
                    const existingHash = this.computeBundleHash(existingBundle);
                    if (existingHash !== newHash) {
                        console.log(`[TrustBundleManager] Bundle updated for ${cluster.domain}`);
                        this.bundles.set(cluster.domain, bundle);
                    }
                }
                else {
                    console.log(`[TrustBundleManager] New bundle added for ${cluster.domain}`);
                    this.bundles.set(cluster.domain, bundle);
                }
            }
        }
        catch (error) {
            console.error(`[TrustBundleManager] Failed to sync bundle from ${cluster.domain}:`, error);
            throw error;
        }
    }
    getBundle(trustDomain) {
        return this.bundles.get(trustDomain);
    }
    getAllBundles() {
        return new Map(this.bundles);
    }
    computeBundleHash(bundle) {
        const content = JSON.stringify({
            trustDomain: bundle.trustDomain,
            certificates: bundle.certificates,
            publicKeys: bundle.publicKeys,
        });
        return crypto.createHash('sha256').update(content).digest('hex');
    }
}
/**
 * Trust Decision Cache
 * Caches trust decisions for performance
 */
class TrustDecisionCache {
    cache = new Map();
    maxEntries;
    constructor(maxEntries = 10000) {
        this.maxEntries = maxEntries;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.decision;
    }
    set(key, decision, ttlMs) {
        // Evict oldest entries if at capacity
        if (this.cache.size >= this.maxEntries) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }
        this.cache.set(key, {
            decision,
            expiresAt: Date.now() + ttlMs,
        });
    }
    invalidate(pattern) {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }
    clear() {
        this.cache.clear();
    }
    size() {
        return this.cache.size;
    }
}
/**
 * Consensus Manager
 * Handles distributed consensus for trust decisions
 */
class ConsensusManager {
    clusters;
    constructor(clusters) {
        this.clusters = clusters;
    }
    async reachConsensus(operation, proposal, timeout = config.consensus.timeout) {
        console.log(`[ConsensusManager] Starting consensus for: ${operation}`);
        const votes = new Map();
        const activeClusters = this.clusters.filter((c) => c.status.connected);
        // Simulate consensus voting
        const votePromises = activeClusters.map(async (cluster) => {
            try {
                // In production, this would send the proposal to each cluster
                const vote = await this.requestVote(cluster, operation, proposal);
                votes.set(cluster.name, vote);
            }
            catch {
                votes.set(cluster.name, false);
            }
        });
        await Promise.race([
            Promise.all(votePromises),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Consensus timeout')), timeout)),
        ]).catch((err) => {
            console.warn(`[ConsensusManager] Consensus timeout: ${err.message}`);
        });
        const positiveVotes = Array.from(votes.values()).filter((v) => v).length;
        const requiredVotes = this.getRequiredVotes(activeClusters.length);
        const achieved = positiveVotes >= requiredVotes;
        console.log(`[ConsensusManager] Consensus ${achieved ? 'achieved' : 'failed'}: ${positiveVotes}/${activeClusters.length} votes (required: ${requiredVotes})`);
        return {
            achieved,
            votes,
            result: achieved ? proposal : undefined,
        };
    }
    async requestVote(cluster, operation, proposal) {
        // Simulate vote request - in production, this would be an RPC call
        console.log(`[ConsensusManager] Requesting vote from ${cluster.name} for ${operation}`);
        return cluster.trustLevel === 'full' || cluster.trustLevel === 'limited';
    }
    getRequiredVotes(totalClusters) {
        switch (config.consensus.quorumType) {
            case 'unanimous':
                return totalClusters;
            case 'majority':
                return Math.floor(totalClusters / 2) + 1;
            default:
                return Math.max(config.consensus.minClusters, 1);
        }
    }
}
/**
 * Audit Logger
 * Logs all trust propagation events for compliance
 */
class AuditLogger {
    entries = [];
    maxEntries = 100000;
    auditBus;
    constructor(auditBus) {
        this.auditBus = auditBus;
    }
    log(entry) {
        const auditEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            ...entry,
        };
        this.entries.push(auditEntry);
        if (this.auditBus) {
            this.publishToAuditBus(auditEntry).catch((error) => {
                console.error('[AuditLogger] Failed to publish to audit bus', error);
            });
        }
        // Trim old entries if over capacity
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(-this.maxEntries);
        }
        console.log(`[Audit] ${auditEntry.eventType}: ${auditEntry.action} - ${auditEntry.outcome}`);
    }
    query(filters) {
        return this.entries.filter((entry) => {
            for (const [key, value] of Object.entries(filters)) {
                if (entry[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    }
    getRecent(count = 100) {
        return this.entries.slice(-count);
    }
    exportForCompliance(startDate, endDate) {
        return this.entries.filter((entry) => entry.timestamp >= startDate && entry.timestamp <= endDate);
    }
    async publishToAuditBus(entry) {
        if (!this.auditBus)
            return;
        const severity = entry.outcome === 'success' ? 'informational' : 'medium';
        const event = {
            id: entry.id,
            timestamp: entry.timestamp.getTime(),
            eventType: 'policy_decision',
            severity,
            source: {
                type: 'application',
                component: 'trust-propagation-controller',
                hostname: process.env.HOSTNAME || 'unknown',
            },
            actor: {
                type: 'service',
                id: entry.identity || entry.sourceCluster,
            },
            action: {
                type: entry.eventType,
                method: entry.details?.['method'],
                parameters: {
                    targetCluster: entry.targetCluster,
                    correlationId: entry.details?.['correlationId'],
                },
            },
            resource: {
                type: 'service',
                id: entry.details?.['targetService'] || 'trust',
                name: entry.targetCluster || entry.sourceCluster,
                classification: 'internal',
            },
            outcome: {
                result: entry.outcome === 'success' ? 'success' : 'failure',
                reason: entry.details?.['reason'],
            },
            context: {
                requestId: entry.id,
                correlationId: entry.details?.['correlationId'],
                sourceIp: entry.details?.['sourceIp'] ||
                    'internal',
            },
            zeroTrust: {
                trustScore: entry.details?.['trustScore'] || 0,
                identityVerified: Boolean(entry.identity),
                deviceTrusted: true,
                sessionFresh: true,
                mfaVerified: Boolean(entry.details?.['mfa'] ?? false),
                policyDecision: entry.outcome === 'success' ? 'allow' : 'deny',
                enforcementPoint: 'trust-propagation',
            },
            compliance: {
                frameworks: ['NIST-800-53', 'FedRAMP'],
                controls: ['AC-3', 'AC-6', 'AU-2'],
                retentionRequired: true,
                auditRequired: true,
            },
            rawData: entry.details,
        };
        await this.auditBus.logSecurityEvent(event);
    }
}
/**
 * Trust Propagation Controller
 * Main controller orchestrating trust propagation across clusters
 */
class TrustPropagationController extends events_1.EventEmitter {
    bundleManager;
    decisionCache;
    consensusManager;
    auditLogger;
    auditBus;
    clusters = new Map();
    syncIntervals = new Map();
    running = false;
    constructor(localTrustDomain, auditBus = (0, audit_logger_1.createZeroTrustAuditLogger)()) {
        super();
        this.bundleManager = new TrustBundleManager(localTrustDomain);
        this.decisionCache = new TrustDecisionCache();
        this.auditBus = auditBus;
        this.auditLogger = new AuditLogger(this.auditBus);
        this.consensusManager = new ConsensusManager([]);
    }
    /**
     * Register a federated cluster
     */
    registerCluster(cluster) {
        const fullCluster = {
            ...cluster,
            status: {
                connected: false,
                lastSync: new Date(0),
                bundleHash: '',
                certificateExpiry: new Date(0),
                healthScore: 0,
            },
        };
        this.clusters.set(cluster.name, fullCluster);
        this.consensusManager = new ConsensusManager(Array.from(this.clusters.values()));
        this.auditLogger.log({
            eventType: 'cluster_registration',
            sourceCluster: cluster.name,
            action: 'register',
            outcome: 'success',
            details: {
                trustDomain: cluster.domain,
                trustLevel: cluster.trustLevel,
            },
        });
        console.log(`[TrustPropagationController] Registered cluster: ${cluster.name} (${cluster.domain})`);
    }
    /**
     * Start the trust propagation controller
     */
    async start() {
        if (this.running) {
            console.warn('[TrustPropagationController] Controller is already running');
            return;
        }
        this.running = true;
        console.log('[TrustPropagationController] Starting trust propagation...');
        // Initial sync of all clusters
        await this.syncAllClusters();
        // Set up periodic sync for each cluster
        for (const [name, cluster] of this.clusters) {
            const interval = setInterval(async () => {
                await this.syncCluster(name);
            }, config.refreshInterval);
            this.syncIntervals.set(name, interval);
        }
        // Start health monitoring
        this.startHealthMonitoring();
        this.emit('started');
        console.log('[TrustPropagationController] Trust propagation started');
    }
    /**
     * Stop the trust propagation controller
     */
    async stop() {
        if (!this.running) {
            return;
        }
        this.running = false;
        // Clear all sync intervals
        for (const interval of this.syncIntervals.values()) {
            clearInterval(interval);
        }
        this.syncIntervals.clear();
        this.emit('stopped');
        console.log('[TrustPropagationController] Trust propagation stopped');
    }
    /**
     * Sync all registered clusters
     */
    async syncAllClusters() {
        console.log('[TrustPropagationController] Syncing all clusters...');
        const syncPromises = Array.from(this.clusters.keys()).map((name) => this.syncCluster(name));
        await Promise.allSettled(syncPromises);
    }
    /**
     * Sync a specific cluster
     */
    async syncCluster(clusterName) {
        const cluster = this.clusters.get(clusterName);
        if (!cluster) {
            console.error(`[TrustPropagationController] Unknown cluster: ${clusterName}`);
            return;
        }
        try {
            await this.bundleManager.syncBundle(cluster);
            // Update cluster status
            cluster.status.connected = true;
            cluster.status.lastSync = new Date();
            cluster.status.healthScore = 100;
            this.auditLogger.log({
                eventType: 'bundle_sync',
                sourceCluster: clusterName,
                action: 'sync',
                outcome: 'success',
                details: {
                    bundleHash: cluster.status.bundleHash,
                },
            });
            this.emit('cluster_synced', { clusterName, status: cluster.status });
        }
        catch (error) {
            cluster.status.connected = false;
            cluster.status.healthScore = Math.max(0, cluster.status.healthScore - 20);
            this.auditLogger.log({
                eventType: 'bundle_sync',
                sourceCluster: clusterName,
                action: 'sync',
                outcome: 'failure',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            });
            this.emit('cluster_sync_failed', { clusterName, error });
        }
    }
    /**
     * Make a trust decision for cross-cluster access
     */
    async evaluateTrust(sourceIdentity, targetService, context) {
        const cacheKey = `${sourceIdentity}:${targetService}`;
        // Check cache first
        const cachedDecision = this.decisionCache.get(cacheKey);
        if (cachedDecision) {
            return cachedDecision;
        }
        // Extract source cluster from SPIFFE ID
        const sourceCluster = this.extractClusterFromSpiffeId(sourceIdentity);
        if (!sourceCluster) {
            return this.createDenyDecision(sourceIdentity, targetService, 'Invalid source identity');
        }
        const cluster = this.clusters.get(sourceCluster);
        if (!cluster) {
            return this.createDenyDecision(sourceIdentity, targetService, 'Unknown source cluster');
        }
        // Check cluster trust level
        if (!cluster.status.connected) {
            return this.createDenyDecision(sourceIdentity, targetService, 'Source cluster not connected');
        }
        // Validate trust bundle
        const bundle = this.bundleManager.getBundle(cluster.domain);
        if (!bundle || new Date() > bundle.expiresAt) {
            return this.createDenyDecision(sourceIdentity, targetService, 'Trust bundle expired or missing');
        }
        // Apply trust policies based on cluster trust level
        const decision = this.applyTrustPolicies(cluster, sourceIdentity, targetService, context);
        // Cache the decision
        this.decisionCache.set(cacheKey, decision, config.cacheTtl);
        // Audit the decision
        this.auditLogger.log({
            eventType: 'trust_evaluation',
            sourceCluster: sourceCluster,
            identity: sourceIdentity,
            action: decision.action,
            outcome: decision.action === 'allow' ? 'success' : 'failure',
            details: {
                targetService,
                trustScore: decision.trustScore,
                reason: decision.reason,
            },
        });
        return decision;
    }
    /**
     * Propagate a trust change to other clusters
     */
    async propagateTrustChange(event) {
        console.log(`[TrustPropagationController] Propagating trust change: ${event.type}`);
        // Require consensus for trust changes
        const consensus = await this.consensusManager.reachConsensus('trust_change', event);
        if (!consensus.achieved) {
            console.warn('[TrustPropagationController] Failed to reach consensus for trust change');
            this.auditLogger.log({
                eventType: 'trust_propagation',
                sourceCluster: event.sourceCluster,
                action: 'propagate',
                outcome: 'failure',
                details: {
                    reason: 'Consensus not achieved',
                    votes: Object.fromEntries(consensus.votes),
                },
            });
            return;
        }
        // Invalidate relevant cache entries
        this.decisionCache.invalidate(event.sourceCluster);
        // Notify target clusters
        for (const targetCluster of event.targetClusters) {
            this.emit('trust_propagated', {
                event,
                targetCluster,
            });
        }
        this.auditLogger.log({
            eventType: 'trust_propagation',
            sourceCluster: event.sourceCluster,
            action: 'propagate',
            outcome: 'success',
            details: {
                targetClusters: event.targetClusters,
                eventType: event.type,
            },
        });
    }
    /**
     * Handle certificate revocation
     */
    async handleRevocation(trustDomain, serialNumber) {
        console.log(`[TrustPropagationController] Handling revocation for certificate ${serialNumber} in ${trustDomain}`);
        // Invalidate all cached decisions for this trust domain
        this.decisionCache.invalidate(trustDomain);
        // Propagate revocation to all clusters
        const event = {
            type: 'revocation',
            sourceCluster: trustDomain,
            targetClusters: Array.from(this.clusters.keys()),
            payload: { serialNumber },
            timestamp: new Date(),
            correlationId: crypto.randomUUID(),
        };
        await this.propagateTrustChange(event);
        this.auditLogger.log({
            eventType: 'certificate_revocation',
            sourceCluster: trustDomain,
            action: 'revoke',
            outcome: 'success',
            details: {
                serialNumber,
            },
        });
    }
    /**
     * Get cluster status
     */
    getClusterStatus(clusterName) {
        return this.clusters.get(clusterName)?.status;
    }
    /**
     * Get all cluster statuses
     */
    getAllClusterStatuses() {
        const statuses = new Map();
        for (const [name, cluster] of this.clusters) {
            statuses.set(name, cluster.status);
        }
        return statuses;
    }
    /**
     * Get audit logs
     */
    getAuditLogs(count = 100) {
        return this.auditLogger.getRecent(count);
    }
    /**
     * Export audit logs for compliance
     */
    exportAuditLogs(startDate, endDate) {
        return this.auditLogger.exportForCompliance(startDate, endDate);
    }
    // Private helper methods
    startHealthMonitoring() {
        setInterval(() => {
            for (const [name, cluster] of this.clusters) {
                // Decay health score if no recent sync
                const timeSinceSync = Date.now() - cluster.status.lastSync.getTime();
                if (timeSinceSync > config.refreshInterval * 2) {
                    cluster.status.healthScore = Math.max(0, cluster.status.healthScore - 5);
                    if (cluster.status.healthScore < 50) {
                        this.emit('cluster_unhealthy', { clusterName: name, cluster });
                    }
                }
            }
        }, config.healthCheckInterval);
    }
    extractClusterFromSpiffeId(spiffeId) {
        // Parse SPIFFE ID: spiffe://trust-domain/path
        const match = spiffeId.match(/^spiffe:\/\/([^/]+)/);
        if (!match)
            return null;
        const trustDomain = match[1];
        for (const [name, cluster] of this.clusters) {
            if (cluster.domain === trustDomain) {
                return name;
            }
        }
        return null;
    }
    applyTrustPolicies(cluster, sourceIdentity, targetService, context) {
        const conditions = [];
        // Base trust score based on cluster trust level
        let trustScore;
        switch (cluster.trustLevel) {
            case 'full':
                trustScore = 100;
                break;
            case 'limited':
                trustScore = 75;
                break;
            case 'restricted':
                trustScore = 50;
                break;
            default:
                trustScore = 0;
        }
        // Apply context-based adjustments
        if (context['x-cluster-auth'] !== 'verified') {
            trustScore -= 30;
            conditions.push({
                type: 'header',
                key: 'x-cluster-auth',
                operator: 'equals',
                value: 'verified',
            });
        }
        // Check for emergency mode
        if (context['x-emergency-mode'] === 'active') {
            if (context['x-break-glass-token']) {
                trustScore = Math.max(trustScore, 80);
            }
            else {
                trustScore -= 20;
            }
        }
        // Calculate validity period
        const validityMinutes = trustScore >= 75 ? 5 : trustScore >= 50 ? 1 : 0;
        const validUntil = new Date(Date.now() + validityMinutes * 60 * 1000);
        // Make decision
        if (trustScore >= 50) {
            return {
                sourceIdentity,
                targetService,
                action: 'allow',
                reason: `Trust score ${trustScore} meets threshold`,
                trustScore,
                validUntil,
                conditions,
            };
        }
        return this.createDenyDecision(sourceIdentity, targetService, `Trust score ${trustScore} below threshold`, trustScore, conditions);
    }
    createDenyDecision(sourceIdentity, targetService, reason, trustScore = 0, conditions = []) {
        return {
            sourceIdentity,
            targetService,
            action: 'deny',
            reason,
            trustScore,
            validUntil: new Date(),
            conditions,
        };
    }
}
exports.TrustPropagationController = TrustPropagationController;
// Factory function for creating controller
function createTrustPropagationController(localTrustDomain) {
    const controller = new TrustPropagationController(localTrustDomain);
    // Register default federated clusters
    controller.registerCluster({
        name: 'primary-cluster',
        domain: 'primary.intelgraph.io',
        endpoint: 'https://spire-server.primary.intelgraph.io:8081',
        trustLevel: 'full',
        capabilities: ['identity-issuance', 'policy-enforcement', 'audit-collection'],
        labels: { region: 'us-east-1', environment: 'production' },
    });
    controller.registerCluster({
        name: 'secondary-cluster',
        domain: 'secondary.intelgraph.io',
        endpoint: 'https://spire-server.secondary.intelgraph.io:8081',
        trustLevel: 'full',
        capabilities: ['identity-issuance', 'policy-enforcement', 'audit-collection'],
        labels: { region: 'us-west-2', environment: 'production' },
    });
    controller.registerCluster({
        name: 'dr-cluster',
        domain: 'dr.intelgraph.io',
        endpoint: 'https://spire-server.dr.intelgraph.io:8081',
        trustLevel: 'limited',
        capabilities: ['identity-issuance', 'audit-collection'],
        labels: { region: 'eu-west-1', environment: 'dr' },
    });
    controller.registerCluster({
        name: 'analytics-cluster',
        domain: 'analytics.intelgraph.io',
        endpoint: 'https://spire-server.analytics.intelgraph.io:8081',
        trustLevel: 'restricted',
        capabilities: ['identity-issuance'],
        labels: { region: 'us-east-1', environment: 'production' },
    });
    return controller;
}
exports.default = TrustPropagationController;
