/**
 * Trust Propagation Controller
 *
 * Manages cross-cluster trust relationships, bundle synchronization,
 * and identity federation for the IntelGraph zero-trust architecture.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// Types for trust propagation
interface TrustDomain {
  name: string;
  domain: string;
  endpoint: string;
  trustLevel: 'full' | 'limited' | 'restricted';
  capabilities: string[];
  labels: Record<string, string>;
  status: ClusterTrustStatus;
}

interface ClusterTrustStatus {
  connected: boolean;
  lastSync: Date;
  bundleHash: string;
  certificateExpiry: Date;
  healthScore: number;
}

interface TrustBundle {
  trustDomain: string;
  certificates: X509Certificate[];
  publicKeys: PublicKey[];
  issuedAt: Date;
  expiresAt: Date;
  signatures: BundleSignature[];
}

interface X509Certificate {
  subject: string;
  issuer: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  publicKey: string;
  fingerprint: string;
  raw: string;
}

interface PublicKey {
  keyId: string;
  algorithm: string;
  publicKey: string;
  use: 'sign' | 'verify' | 'encrypt';
}

interface BundleSignature {
  signerId: string;
  algorithm: string;
  signature: string;
  timestamp: Date;
}

interface PropagationEvent {
  type: 'bundle_update' | 'trust_change' | 'revocation' | 'conflict';
  sourceCluster: string;
  targetClusters: string[];
  payload: unknown;
  timestamp: Date;
  correlationId: string;
}

interface TrustDecision {
  sourceIdentity: string;
  targetService: string;
  action: 'allow' | 'deny';
  reason: string;
  trustScore: number;
  validUntil: Date;
  conditions: TrustCondition[];
}

interface TrustCondition {
  type: string;
  key: string;
  operator: 'equals' | 'notEquals' | 'in' | 'notIn' | 'exists';
  value: string | string[];
}

interface AuditEntry {
  id: string;
  timestamp: Date;
  eventType: string;
  sourceCluster: string;
  targetCluster?: string;
  identity?: string;
  action: string;
  outcome: 'success' | 'failure';
  details: Record<string, unknown>;
}

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
    quorumType: 'majority' as const,
  },
};

/**
 * Trust Bundle Manager
 * Handles synchronization and validation of trust bundles across clusters
 */
class TrustBundleManager {
  private bundles: Map<string, TrustBundle> = new Map();
  private localTrustDomain: string;

  constructor(localTrustDomain: string) {
    this.localTrustDomain = localTrustDomain;
  }

  async fetchBundle(cluster: TrustDomain): Promise<TrustBundle> {
    console.log(`[TrustBundleManager] Fetching bundle from ${cluster.domain}`);

    // In production, this would make an actual HTTPS request to the bundle endpoint
    // For now, return a mock bundle
    const bundle: TrustBundle = {
      trustDomain: cluster.domain,
      certificates: [],
      publicKeys: [],
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      signatures: [],
    };

    return bundle;
  }

  async validateBundle(bundle: TrustBundle): Promise<boolean> {
    // Validate bundle signatures
    if (bundle.signatures.length < 2) {
      console.warn(
        `[TrustBundleManager] Bundle for ${bundle.trustDomain} has insufficient signatures`,
      );
      return false;
    }

    // Validate certificate chain
    for (const cert of bundle.certificates) {
      if (new Date(cert.notAfter) < new Date()) {
        console.warn(
          `[TrustBundleManager] Certificate ${cert.serialNumber} has expired`,
        );
        return false;
      }
    }

    // Validate bundle hasn't been tampered with
    const bundleHash = this.computeBundleHash(bundle);
    console.log(
      `[TrustBundleManager] Bundle hash for ${bundle.trustDomain}: ${bundleHash}`,
    );

    return true;
  }

  async syncBundle(cluster: TrustDomain): Promise<void> {
    try {
      const bundle = await this.fetchBundle(cluster);

      if (await this.validateBundle(bundle)) {
        const existingBundle = this.bundles.get(cluster.domain);
        const newHash = this.computeBundleHash(bundle);

        if (existingBundle) {
          const existingHash = this.computeBundleHash(existingBundle);
          if (existingHash !== newHash) {
            console.log(
              `[TrustBundleManager] Bundle updated for ${cluster.domain}`,
            );
            this.bundles.set(cluster.domain, bundle);
          }
        } else {
          console.log(
            `[TrustBundleManager] New bundle added for ${cluster.domain}`,
          );
          this.bundles.set(cluster.domain, bundle);
        }
      }
    } catch (error) {
      console.error(
        `[TrustBundleManager] Failed to sync bundle from ${cluster.domain}:`,
        error,
      );
      throw error;
    }
  }

  getBundle(trustDomain: string): TrustBundle | undefined {
    return this.bundles.get(trustDomain);
  }

  getAllBundles(): Map<string, TrustBundle> {
    return new Map(this.bundles);
  }

  private computeBundleHash(bundle: TrustBundle): string {
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
  private cache: Map<string, { decision: TrustDecision; expiresAt: number }> =
    new Map();
  private maxEntries: number;

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
  }

  get(key: string): TrustDecision | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.decision;
  }

  set(key: string, decision: TrustDecision, ttlMs: number): void {
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

  invalidate(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Consensus Manager
 * Handles distributed consensus for trust decisions
 */
class ConsensusManager {
  private clusters: TrustDomain[];

  constructor(clusters: TrustDomain[]) {
    this.clusters = clusters;
  }

  async reachConsensus<T>(
    operation: string,
    proposal: T,
    timeout: number = config.consensus.timeout,
  ): Promise<{
    achieved: boolean;
    votes: Map<string, boolean>;
    result?: T;
  }> {
    console.log(`[ConsensusManager] Starting consensus for: ${operation}`);

    const votes = new Map<string, boolean>();
    const activeClusters = this.clusters.filter((c) => c.status.connected);

    // Simulate consensus voting
    const votePromises = activeClusters.map(async (cluster) => {
      try {
        // In production, this would send the proposal to each cluster
        const vote = await this.requestVote(cluster, operation, proposal);
        votes.set(cluster.name, vote);
      } catch {
        votes.set(cluster.name, false);
      }
    });

    await Promise.race([
      Promise.all(votePromises),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Consensus timeout')), timeout),
      ),
    ]).catch((err) => {
      console.warn(`[ConsensusManager] Consensus timeout: ${err.message}`);
    });

    const positiveVotes = Array.from(votes.values()).filter((v) => v).length;
    const requiredVotes = this.getRequiredVotes(activeClusters.length);
    const achieved = positiveVotes >= requiredVotes;

    console.log(
      `[ConsensusManager] Consensus ${achieved ? 'achieved' : 'failed'}: ${positiveVotes}/${activeClusters.length} votes (required: ${requiredVotes})`,
    );

    return {
      achieved,
      votes,
      result: achieved ? proposal : undefined,
    };
  }

  private async requestVote<T>(
    cluster: TrustDomain,
    operation: string,
    proposal: T,
  ): Promise<boolean> {
    // Simulate vote request - in production, this would be an RPC call
    console.log(
      `[ConsensusManager] Requesting vote from ${cluster.name} for ${operation}`,
    );
    return cluster.trustLevel === 'full' || cluster.trustLevel === 'limited';
  }

  private getRequiredVotes(totalClusters: number): number {
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
  private entries: AuditEntry[] = [];
  private maxEntries: number = 100000;

  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    const auditEntry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...entry,
    };

    this.entries.push(auditEntry);

    // Trim old entries if over capacity
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    console.log(
      `[Audit] ${auditEntry.eventType}: ${auditEntry.action} - ${auditEntry.outcome}`,
    );
  }

  query(filters: Partial<AuditEntry>): AuditEntry[] {
    return this.entries.filter((entry) => {
      for (const [key, value] of Object.entries(filters)) {
        if (entry[key as keyof AuditEntry] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  getRecent(count: number = 100): AuditEntry[] {
    return this.entries.slice(-count);
  }

  exportForCompliance(startDate: Date, endDate: Date): AuditEntry[] {
    return this.entries.filter(
      (entry) => entry.timestamp >= startDate && entry.timestamp <= endDate,
    );
  }
}

/**
 * Trust Propagation Controller
 * Main controller orchestrating trust propagation across clusters
 */
export class TrustPropagationController extends EventEmitter {
  private bundleManager: TrustBundleManager;
  private decisionCache: TrustDecisionCache;
  private consensusManager: ConsensusManager;
  private auditLogger: AuditLogger;
  private clusters: Map<string, TrustDomain> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private running: boolean = false;

  constructor(localTrustDomain: string) {
    super();
    this.bundleManager = new TrustBundleManager(localTrustDomain);
    this.decisionCache = new TrustDecisionCache();
    this.auditLogger = new AuditLogger();
    this.consensusManager = new ConsensusManager([]);
  }

  /**
   * Register a federated cluster
   */
  registerCluster(cluster: Omit<TrustDomain, 'status'>): void {
    const fullCluster: TrustDomain = {
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
    this.consensusManager = new ConsensusManager(
      Array.from(this.clusters.values()),
    );

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

    console.log(
      `[TrustPropagationController] Registered cluster: ${cluster.name} (${cluster.domain})`,
    );
  }

  /**
   * Start the trust propagation controller
   */
  async start(): Promise<void> {
    if (this.running) {
      console.warn(
        '[TrustPropagationController] Controller is already running',
      );
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
  async stop(): Promise<void> {
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
  private async syncAllClusters(): Promise<void> {
    console.log('[TrustPropagationController] Syncing all clusters...');

    const syncPromises = Array.from(this.clusters.keys()).map((name) =>
      this.syncCluster(name),
    );

    await Promise.allSettled(syncPromises);
  }

  /**
   * Sync a specific cluster
   */
  private async syncCluster(clusterName: string): Promise<void> {
    const cluster = this.clusters.get(clusterName);
    if (!cluster) {
      console.error(
        `[TrustPropagationController] Unknown cluster: ${clusterName}`,
      );
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
    } catch (error) {
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
  async evaluateTrust(
    sourceIdentity: string,
    targetService: string,
    context: Record<string, string>,
  ): Promise<TrustDecision> {
    const cacheKey = `${sourceIdentity}:${targetService}`;

    // Check cache first
    const cachedDecision = this.decisionCache.get(cacheKey);
    if (cachedDecision) {
      return cachedDecision;
    }

    // Extract source cluster from SPIFFE ID
    const sourceCluster = this.extractClusterFromSpiffeId(sourceIdentity);
    if (!sourceCluster) {
      return this.createDenyDecision(
        sourceIdentity,
        targetService,
        'Invalid source identity',
      );
    }

    const cluster = this.clusters.get(sourceCluster);
    if (!cluster) {
      return this.createDenyDecision(
        sourceIdentity,
        targetService,
        'Unknown source cluster',
      );
    }

    // Check cluster trust level
    if (!cluster.status.connected) {
      return this.createDenyDecision(
        sourceIdentity,
        targetService,
        'Source cluster not connected',
      );
    }

    // Validate trust bundle
    const bundle = this.bundleManager.getBundle(cluster.domain);
    if (!bundle || new Date() > bundle.expiresAt) {
      return this.createDenyDecision(
        sourceIdentity,
        targetService,
        'Trust bundle expired or missing',
      );
    }

    // Apply trust policies based on cluster trust level
    const decision = this.applyTrustPolicies(
      cluster,
      sourceIdentity,
      targetService,
      context,
    );

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
  async propagateTrustChange(event: PropagationEvent): Promise<void> {
    console.log(
      `[TrustPropagationController] Propagating trust change: ${event.type}`,
    );

    // Require consensus for trust changes
    const consensus = await this.consensusManager.reachConsensus(
      'trust_change',
      event,
    );

    if (!consensus.achieved) {
      console.warn(
        '[TrustPropagationController] Failed to reach consensus for trust change',
      );
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
  async handleRevocation(
    trustDomain: string,
    serialNumber: string,
  ): Promise<void> {
    console.log(
      `[TrustPropagationController] Handling revocation for certificate ${serialNumber} in ${trustDomain}`,
    );

    // Invalidate all cached decisions for this trust domain
    this.decisionCache.invalidate(trustDomain);

    // Propagate revocation to all clusters
    const event: PropagationEvent = {
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
  getClusterStatus(
    clusterName: string,
  ): ClusterTrustStatus | undefined {
    return this.clusters.get(clusterName)?.status;
  }

  /**
   * Get all cluster statuses
   */
  getAllClusterStatuses(): Map<string, ClusterTrustStatus> {
    const statuses = new Map<string, ClusterTrustStatus>();
    for (const [name, cluster] of this.clusters) {
      statuses.set(name, cluster.status);
    }
    return statuses;
  }

  /**
   * Get audit logs
   */
  getAuditLogs(count: number = 100): AuditEntry[] {
    return this.auditLogger.getRecent(count);
  }

  /**
   * Export audit logs for compliance
   */
  exportAuditLogs(startDate: Date, endDate: Date): AuditEntry[] {
    return this.auditLogger.exportForCompliance(startDate, endDate);
  }

  // Private helper methods

  private startHealthMonitoring(): void {
    setInterval(() => {
      for (const [name, cluster] of this.clusters) {
        // Decay health score if no recent sync
        const timeSinceSync =
          Date.now() - cluster.status.lastSync.getTime();
        if (timeSinceSync > config.refreshInterval * 2) {
          cluster.status.healthScore = Math.max(
            0,
            cluster.status.healthScore - 5,
          );

          if (cluster.status.healthScore < 50) {
            this.emit('cluster_unhealthy', { clusterName: name, cluster });
          }
        }
      }
    }, config.healthCheckInterval);
  }

  private extractClusterFromSpiffeId(spiffeId: string): string | null {
    // Parse SPIFFE ID: spiffe://trust-domain/path
    const match = spiffeId.match(/^spiffe:\/\/([^/]+)/);
    if (!match) return null;

    const trustDomain = match[1];
    for (const [name, cluster] of this.clusters) {
      if (cluster.domain === trustDomain) {
        return name;
      }
    }

    return null;
  }

  private applyTrustPolicies(
    cluster: TrustDomain,
    sourceIdentity: string,
    targetService: string,
    context: Record<string, string>,
  ): TrustDecision {
    const conditions: TrustCondition[] = [];

    // Base trust score based on cluster trust level
    let trustScore: number;
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
      } else {
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

    return this.createDenyDecision(
      sourceIdentity,
      targetService,
      `Trust score ${trustScore} below threshold`,
      trustScore,
      conditions,
    );
  }

  private createDenyDecision(
    sourceIdentity: string,
    targetService: string,
    reason: string,
    trustScore: number = 0,
    conditions: TrustCondition[] = [],
  ): TrustDecision {
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

// Factory function for creating controller
export function createTrustPropagationController(
  localTrustDomain: string,
): TrustPropagationController {
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

export default TrustPropagationController;
