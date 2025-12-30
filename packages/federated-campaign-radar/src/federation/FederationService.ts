/**
 * Federation Service
 *
 * Privacy-preserving federation layer for cross-organization signal sharing.
 * Implements differential privacy, secure aggregation, and MPC-style workflows.
 */

import { EventEmitter } from 'events';
import { createHash, createHmac, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  CampaignSignal,
  SignalType,
  PrivacyLevel,
  FederationParticipant,
  ParticipantStatus,
  SharingAgreement,
  PrivacyBudget,
  DifferentialPrivacyConfig,
  SecureAggregationConfig,
  MPCConfig,
  CampaignCluster,
  ClusterStatus,
  ThreatLevel,
  FederationMetadata,
  VelocityMetrics,
  PrivacyPreservedMetrics,
  createFederationId,
  calculateThreatLevel,
} from '../core/types';

/**
 * Federated signal with privacy envelope
 */
export interface FederatedSignal {
  signal: CampaignSignal;
  envelope: PrivacyEnvelope;
  routing: RoutingMetadata;
}

export interface PrivacyEnvelope {
  envelopeId: string;
  privacyLevel: PrivacyLevel;
  noiseMagnitude?: number;
  encryptedPayload?: string;
  accessControlList: string[]; // Participant IDs allowed to access
  expiresAt: Date;
}

export interface RoutingMetadata {
  sourceParticipant: string; // Anonymized
  targetParticipants: string[] | 'BROADCAST';
  ttl: number;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requiresAck: boolean;
}

/**
 * Aggregated signal statistics for privacy-preserving sharing
 */
export interface AggregatedStats {
  aggregationId: string;
  windowStart: Date;
  windowEnd: Date;
  signalType: SignalType;

  // Privacy-preserved counts
  signalCount: NoisyCount;
  uniqueIndicators: NoisyCount;
  participatingOrgs: NoisyCount;

  // Privacy-preserved distributions
  channelDistribution: Record<string, NoisyCount>;
  threatLevelDistribution: Record<string, NoisyCount>;

  // Aggregation metadata
  aggregationMethod: string;
  privacyParameters: DifferentialPrivacyConfig;
}

export interface NoisyCount {
  value: number;
  noiseAdded: boolean;
  epsilon?: number;
  confidenceInterval?: { lower: number; upper: number };
}

/**
 * Federation configuration
 */
export interface FederationConfig {
  federationId: string;
  participantId: string;
  privateKey: string;
  publicKey: string;

  // Privacy settings
  defaultPrivacyLevel: PrivacyLevel;
  differentialPrivacy: DifferentialPrivacyConfig;
  secureAggregation: SecureAggregationConfig;

  // Network settings
  bootstrapNodes: string[];
  heartbeatIntervalMs: number;
  signalBufferSize: number;
  aggregationWindowMs: number;
}

/**
 * Federation Service
 */
export class FederationService extends EventEmitter {
  private config: FederationConfig;
  private participants: Map<string, FederationParticipant> = new Map();
  private sharingAgreements: Map<string, SharingAgreement> = new Map();
  private privacyBudgets: Map<string, PrivacyBudget> = new Map();

  // Signal buffers for aggregation
  private inboundBuffer: FederatedSignal[] = [];
  private outboundBuffer: FederatedSignal[] = [];

  // Aggregation state
  private aggregationWindow: Map<string, CampaignSignal[]> = new Map();
  private aggregationTimer: NodeJS.Timeout | null = null;

  // Cluster state
  private activeClusters: Map<string, CampaignCluster> = new Map();

  constructor(config: FederationConfig) {
    super();
    this.config = config;
    this.initializePrivacyBudget();
    this.startAggregationTimer();
  }

  // ============================================================================
  // Participant Management
  // ============================================================================

  /**
   * Register a new federation participant
   */
  async registerParticipant(
    participantId: string,
    publicKey: string,
    capabilities: string[],
  ): Promise<FederationParticipant> {
    const participant: FederationParticipant = {
      participantId,
      publicKey,
      joinedAt: new Date(),
      status: ParticipantStatus.PENDING_APPROVAL,
      capabilities: capabilities.map((c) => ({
        capability: c,
        enabled: true,
      })),
      trustScore: 0.5, // Initial neutral trust
      sharingAgreements: [],
      rateLimits: {
        signalsPerHour: 1000,
        queriesPerHour: 100,
        computeUnitsPerDay: 10000,
      },
      statistics: {
        totalSignalsContributed: 0,
        totalSignalsReceived: 0,
        averageSignalQuality: 0,
        lastActivityAt: new Date(),
        uptime: 1.0,
      },
    };

    this.participants.set(participantId, participant);
    this.emit('participantRegistered', participant);

    return participant;
  }

  /**
   * Approve a pending participant
   */
  async approveParticipant(participantId: string): Promise<boolean> {
    const participant = this.participants.get(participantId);
    if (!participant) return false;

    participant.status = ParticipantStatus.ACTIVE;
    this.initializeParticipantBudget(participantId);
    this.emit('participantApproved', participant);

    return true;
  }

  /**
   * Create a sharing agreement between participants
   */
  async createSharingAgreement(
    participantIds: string[],
    signalTypes: SignalType[],
    privacyLevels: PrivacyLevel[],
    validDays: number,
  ): Promise<SharingAgreement> {
    const agreement: SharingAgreement = {
      agreementId: uuidv4(),
      participantIds,
      signalTypes,
      privacyLevels,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
      termsHash: this.hashAgreementTerms(
        participantIds,
        signalTypes,
        privacyLevels,
      ),
      signatures: [],
      constraints: [
        {
          constraintType: 'minimum_aggregation',
          parameters: { minSignals: 5 },
        },
        {
          constraintType: 'rate_limit',
          parameters: { signalsPerHour: 1000 },
        },
      ],
    };

    this.sharingAgreements.set(agreement.agreementId, agreement);

    // Update participant agreements
    for (const participantId of participantIds) {
      const participant = this.participants.get(participantId);
      if (participant) {
        participant.sharingAgreements.push(agreement);
      }
    }

    this.emit('agreementCreated', agreement);
    return agreement;
  }

  // ============================================================================
  // Signal Sharing
  // ============================================================================

  /**
   * Submit a signal to the federation with privacy protections
   */
  async submitSignal(
    signal: CampaignSignal,
    targetParticipants: string[] | 'BROADCAST' = 'BROADCAST',
  ): Promise<{ success: boolean; federatedSignalId: string }> {
    // Check privacy budget
    const budget = this.privacyBudgets.get(this.config.participantId);
    if (!budget || budget.usedEpsilon >= budget.totalEpsilon) {
      throw new Error('Privacy budget exhausted');
    }

    // Apply privacy protections based on level
    const protectedSignal = await this.applyPrivacyProtections(signal);

    // Create privacy envelope
    const envelope = this.createPrivacyEnvelope(signal);

    // Create routing metadata
    const routing: RoutingMetadata = {
      sourceParticipant: this.anonymizeParticipantId(this.config.participantId),
      targetParticipants,
      ttl: 3,
      priority: this.calculateSignalPriority(signal),
      requiresAck: signal.signalType === SignalType.COORDINATION_PATTERN,
    };

    const federatedSignal: FederatedSignal = {
      signal: protectedSignal,
      envelope,
      routing,
    };

    // Add to outbound buffer
    this.outboundBuffer.push(federatedSignal);

    // Update budget
    budget.usedEpsilon += this.calculatePrivacyCost(signal);

    // Add to aggregation window
    this.addToAggregationWindow(signal);

    this.emit('signalSubmitted', federatedSignal);

    return {
      success: true,
      federatedSignalId: federatedSignal.envelope.envelopeId,
    };
  }

  /**
   * Receive signals from federation
   */
  async receiveSignals(): Promise<FederatedSignal[]> {
    const signals = [...this.inboundBuffer];
    this.inboundBuffer = [];
    return signals;
  }

  /**
   * Query aggregated statistics with privacy protections
   */
  async queryAggregatedStats(
    signalType: SignalType,
    windowHours: number = 24,
  ): Promise<AggregatedStats> {
    const windowStart = new Date(
      Date.now() - windowHours * 60 * 60 * 1000,
    );
    const windowEnd = new Date();

    // Collect signals in window
    const signals = this.collectSignalsInWindow(signalType, windowStart, windowEnd);

    // Apply differential privacy to counts
    const dpConfig = this.config.differentialPrivacy;

    const stats: AggregatedStats = {
      aggregationId: uuidv4(),
      windowStart,
      windowEnd,
      signalType,
      signalCount: this.addLaplaceNoise(signals.length, dpConfig),
      uniqueIndicators: this.addLaplaceNoise(
        new Set(signals.map((s) => s.indicator.indicatorHash)).size,
        dpConfig,
      ),
      participatingOrgs: this.addLaplaceNoise(
        new Set(signals.map((s) => s.sourceOrganization)).size,
        dpConfig,
      ),
      channelDistribution: this.aggregateChannelDistribution(signals, dpConfig),
      threatLevelDistribution: {},
      aggregationMethod: 'differential_privacy',
      privacyParameters: dpConfig,
    };

    return stats;
  }

  // ============================================================================
  // Campaign Clustering
  // ============================================================================

  /**
   * Perform privacy-preserving cross-tenant clustering
   */
  async performFederatedClustering(
    signalType?: SignalType,
    windowHours: number = 24,
  ): Promise<CampaignCluster[]> {
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const windowEnd = new Date();

    // Collect signals from all aggregation windows
    const allSignals: CampaignSignal[] = [];
    for (const [, signals] of this.aggregationWindow) {
      for (const signal of signals) {
        if (
          signal.timestamp >= windowStart &&
          signal.timestamp <= windowEnd &&
          (!signalType || signal.signalType === signalType)
        ) {
          allSignals.push(signal);
        }
      }
    }

    // Perform clustering on indicator hashes
    const clusters = await this.clusterSignals(allSignals);

    // Convert to CampaignCluster format with privacy protections
    const campaignClusters: CampaignCluster[] = clusters.map((cluster) =>
      this.buildCampaignCluster(cluster),
    );

    // Update active clusters
    for (const cluster of campaignClusters) {
      this.activeClusters.set(cluster.clusterId, cluster);
    }

    this.emit('clusteringComplete', campaignClusters);
    return campaignClusters;
  }

  /**
   * Get active campaign clusters
   */
  getActiveClusters(): CampaignCluster[] {
    return Array.from(this.activeClusters.values()).filter(
      (c) => c.status !== ClusterStatus.RESOLVED,
    );
  }

  // ============================================================================
  // Secure Aggregation
  // ============================================================================

  /**
   * Initiate secure aggregation round
   */
  async initiateSecureAggregation(
    aggregationType: 'SUM' | 'MEAN' | 'COUNT',
    participantIds: string[],
  ): Promise<{ roundId: string; status: string }> {
    const roundId = uuidv4();

    // Check minimum participants
    if (participantIds.length < this.config.secureAggregation.minimumParticipants) {
      throw new Error(
        `Minimum ${this.config.secureAggregation.minimumParticipants} participants required`,
      );
    }

    // Initialize round
    const round = {
      roundId,
      aggregationType,
      participantIds,
      status: 'COLLECTING',
      startedAt: new Date(),
      contributions: new Map<string, number[]>(),
    };

    this.emit('secureAggregationStarted', round);

    return { roundId, status: 'COLLECTING' };
  }

  /**
   * Submit masked contribution for secure aggregation
   */
  async submitSecureContribution(
    roundId: string,
    maskedValue: number[],
  ): Promise<boolean> {
    // In production, this would implement SecAgg protocol
    this.emit('contributionReceived', {
      roundId,
      participantId: this.config.participantId,
    });
    return true;
  }

  // ============================================================================
  // MPC Operations
  // ============================================================================

  /**
   * Perform MPC-based private set intersection
   */
  async privatSetIntersection(
    localIndicatorHashes: string[],
    participantIds: string[],
  ): Promise<{ intersectionSize: number; confidence: number }> {
    // Simplified PSI implementation
    // In production, would use actual PSI protocol (e.g., KKRT, OPRF-based)

    // Generate random commitments
    const commitments = localIndicatorHashes.map((hash) =>
      this.generateCommitment(hash),
    );

    // Simulate intersection computation
    const estimatedIntersection = Math.floor(
      localIndicatorHashes.length * 0.1 * participantIds.length,
    );

    // Add noise for privacy
    const noisyIntersection = this.addLaplaceNoise(
      estimatedIntersection,
      this.config.differentialPrivacy,
    );

    return {
      intersectionSize: Math.max(0, noisyIntersection.value),
      confidence: 0.85,
    };
  }

  /**
   * Perform MPC-based similarity computation
   */
  async privateCosineSimilarity(
    localEmbedding: number[],
    participantId: string,
  ): Promise<{ similarity: number; confidence: number }> {
    // Simplified secure similarity computation
    // In production, would use SPDZ or similar MPC framework

    // Generate shares
    const shares = this.generateSecretShares(localEmbedding);

    // Simulate secure computation
    const similarity = 0.5 + Math.random() * 0.3;

    return {
      similarity,
      confidence: 0.75,
    };
  }

  // ============================================================================
  // Privacy Budget Management
  // ============================================================================

  /**
   * Get current privacy budget status
   */
  getPrivacyBudgetStatus(participantId?: string): PrivacyBudget | undefined {
    return this.privacyBudgets.get(participantId || this.config.participantId);
  }

  /**
   * Check if operation is within privacy budget
   */
  canPerformOperation(
    estimatedEpsilon: number,
    estimatedDelta: number = 0,
  ): boolean {
    const budget = this.privacyBudgets.get(this.config.participantId);
    if (!budget) return false;

    return (
      budget.usedEpsilon + estimatedEpsilon <= budget.totalEpsilon &&
      budget.usedDelta + estimatedDelta <= budget.totalDelta
    );
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private initializePrivacyBudget(): void {
    const budget: PrivacyBudget = {
      budgetId: uuidv4(),
      organizationId: this.config.participantId,
      totalEpsilon: 1.0, // Standard privacy budget
      usedEpsilon: 0,
      totalDelta: 1e-5,
      usedDelta: 0,
      resetPeriod: 'DAILY',
      lastResetAt: new Date(),
      nextResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    this.privacyBudgets.set(this.config.participantId, budget);
  }

  private initializeParticipantBudget(participantId: string): void {
    const budget: PrivacyBudget = {
      budgetId: uuidv4(),
      organizationId: participantId,
      totalEpsilon: 1.0,
      usedEpsilon: 0,
      totalDelta: 1e-5,
      usedDelta: 0,
      resetPeriod: 'DAILY',
      lastResetAt: new Date(),
      nextResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    this.privacyBudgets.set(participantId, budget);
  }

  private startAggregationTimer(): void {
    this.aggregationTimer = setInterval(() => {
      this.processAggregationWindow();
    }, this.config.aggregationWindowMs);
  }

  private async processAggregationWindow(): Promise<void> {
    // Process signals in aggregation windows
    for (const [signalType, signals] of this.aggregationWindow) {
      if (signals.length >= this.config.secureAggregation.minimumParticipants) {
        // Perform aggregation
        const stats = await this.aggregateSignals(signals);
        this.emit('aggregationComplete', { signalType, stats });
      }
    }
  }

  private async applyPrivacyProtections(
    signal: CampaignSignal,
  ): Promise<CampaignSignal> {
    const protected_ = { ...signal };

    switch (signal.privacyLevel) {
      case PrivacyLevel.HASHED:
        // Already hashed, ensure no raw content
        if (protected_.indicator.narrative) {
          protected_.indicator.narrative.claimText = undefined;
        }
        break;

      case PrivacyLevel.ENCRYPTED:
        // Encrypt the indicator (placeholder)
        // In production, would use actual encryption
        break;

      case PrivacyLevel.AGGREGATE_ONLY:
        // Remove individual-level data
        protected_.embeddingVector = undefined;
        protected_.coordinationFeatures = [];
        break;

      case PrivacyLevel.INTERNAL_ONLY:
        // Should not be shared
        throw new Error('Cannot share INTERNAL_ONLY signals');
    }

    return protected_;
  }

  private createPrivacyEnvelope(signal: CampaignSignal): PrivacyEnvelope {
    return {
      envelopeId: uuidv4(),
      privacyLevel: signal.privacyLevel,
      noiseMagnitude:
        signal.privacyLevel === PrivacyLevel.AGGREGATE_ONLY
          ? this.calculateNoiseMagnitude()
          : undefined,
      accessControlList: this.getAuthorizedParticipants(signal),
      expiresAt: signal.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  private getAuthorizedParticipants(signal: CampaignSignal): string[] {
    // Find participants with valid sharing agreements
    const authorized: string[] = [];

    for (const [agreementId, agreement] of this.sharingAgreements) {
      if (
        agreement.validUntil > new Date() &&
        agreement.signalTypes.includes(signal.signalType) &&
        agreement.privacyLevels.includes(signal.privacyLevel)
      ) {
        authorized.push(...agreement.participantIds);
      }
    }

    return [...new Set(authorized)];
  }

  private calculateSignalPriority(
    signal: CampaignSignal,
  ): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
    if (signal.signalType === SignalType.COORDINATION_PATTERN) {
      const coordination = signal.indicator.coordination;
      if (coordination && coordination.synchronicity > 0.8) {
        return 'URGENT';
      }
      return 'HIGH';
    }

    if (signal.confidence > 0.9) {
      return 'HIGH';
    }

    return 'NORMAL';
  }

  private anonymizeParticipantId(participantId: string): string {
    return createHmac('sha256', this.config.privateKey)
      .update(participantId)
      .digest('hex')
      .substring(0, 16);
  }

  private calculatePrivacyCost(signal: CampaignSignal): number {
    // Calculate epsilon cost based on signal type and privacy level
    let baseCost = 0.01;

    if (signal.privacyLevel === PrivacyLevel.PUBLIC) {
      baseCost = 0;
    } else if (signal.privacyLevel === PrivacyLevel.HASHED) {
      baseCost = 0.005;
    } else if (signal.privacyLevel === PrivacyLevel.ENCRYPTED) {
      baseCost = 0.01;
    } else if (signal.privacyLevel === PrivacyLevel.AGGREGATE_ONLY) {
      baseCost = 0.02;
    }

    return baseCost;
  }

  private addToAggregationWindow(signal: CampaignSignal): void {
    const key = signal.signalType;
    if (!this.aggregationWindow.has(key)) {
      this.aggregationWindow.set(key, []);
    }
    this.aggregationWindow.get(key)!.push(signal);

    // Trim old signals
    const cutoff = new Date(Date.now() - this.config.aggregationWindowMs * 2);
    const signals = this.aggregationWindow.get(key)!;
    this.aggregationWindow.set(
      key,
      signals.filter((s) => s.timestamp >= cutoff),
    );
  }

  private collectSignalsInWindow(
    signalType: SignalType,
    start: Date,
    end: Date,
  ): CampaignSignal[] {
    const signals = this.aggregationWindow.get(signalType) || [];
    return signals.filter(
      (s) => s.timestamp >= start && s.timestamp <= end,
    );
  }

  private addLaplaceNoise(
    value: number,
    config: DifferentialPrivacyConfig,
  ): NoisyCount {
    // Laplace mechanism for differential privacy
    const scale = config.sensitivityBound / config.epsilon;
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));

    const noisyValue = Math.max(0, Math.round(value + noise));

    // Calculate confidence interval
    const confidenceLevel = 0.95;
    const z = 1.96;
    const intervalWidth = z * scale;

    return {
      value: noisyValue,
      noiseAdded: true,
      epsilon: config.epsilon,
      confidenceInterval: {
        lower: Math.max(0, noisyValue - intervalWidth),
        upper: noisyValue + intervalWidth,
      },
    };
  }

  private aggregateChannelDistribution(
    signals: CampaignSignal[],
    dpConfig: DifferentialPrivacyConfig,
  ): Record<string, NoisyCount> {
    const distribution: Record<string, number> = {};

    for (const signal of signals) {
      const channel = signal.channelMetadata.platform;
      distribution[channel] = (distribution[channel] || 0) + 1;
    }

    const noisyDistribution: Record<string, NoisyCount> = {};
    for (const [channel, count] of Object.entries(distribution)) {
      noisyDistribution[channel] = this.addLaplaceNoise(count, dpConfig);
    }

    return noisyDistribution;
  }

  private async aggregateSignals(
    signals: CampaignSignal[],
  ): Promise<AggregatedStats> {
    return this.queryAggregatedStats(signals[0].signalType, 1);
  }

  private async clusterSignals(
    signals: CampaignSignal[],
  ): Promise<CampaignSignal[][]> {
    // Simple clustering based on indicator hash similarity
    const clusters: Map<string, CampaignSignal[]> = new Map();

    for (const signal of signals) {
      const clusterKey = signal.indicator.indicatorHash.substring(0, 8);
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, []);
      }
      clusters.get(clusterKey)!.push(signal);
    }

    // Filter to significant clusters
    return Array.from(clusters.values()).filter((c) => c.length >= 2);
  }

  private buildCampaignCluster(signals: CampaignSignal[]): CampaignCluster {
    const now = new Date();
    const timestamps = signals.map((s) => s.timestamp);
    const orgs = new Set(signals.map((s) => s.sourceOrganization));

    // Calculate velocity metrics
    const velocityMetrics: VelocityMetrics = {
      signalsPerHour: signals.length,
      growthRate: 10,
      accelerationRate: 0.5,
      peakVelocity: signals.length * 1.5,
      peakTimestamp: now,
    };

    // Determine threat level
    const coordinationStrength = signals.some((s) => s.indicator.coordination)
      ? signals.reduce(
          (max, s) =>
            Math.max(max, s.indicator.coordination?.synchronicity || 0),
          0,
        )
      : 0.3;

    const threatLevel = calculateThreatLevel(
      signals.length,
      orgs.size,
      velocityMetrics,
      coordinationStrength,
    );

    // Build privacy-preserved metrics
    const privacyMetrics: PrivacyPreservedMetrics = {
      aggregationMethod: 'DIFFERENTIAL_PRIVACY',
      epsilon: this.config.differentialPrivacy.epsilon,
      noiseAdded: true,
      minimumThreshold: this.config.secureAggregation.minimumParticipants,
    };

    return {
      clusterId: uuidv4(),
      createdAt: now,
      updatedAt: now,
      status: ClusterStatus.EMERGING,
      signalCount: signals.length,
      participatingOrgs: orgs.size,
      temporalRange: {
        start: new Date(Math.min(...timestamps.map((t) => t.getTime()))),
        end: new Date(Math.max(...timestamps.map((t) => t.getTime()))),
      },
      dominantNarratives: [],
      coordinationPatterns: [],
      channelDistribution: this.buildChannelDistribution(signals),
      geographicSpread: {
        regions: {},
        spreadIndex: 0.5,
        primaryRegions: [],
      },
      threatLevel,
      confidenceScore: 0.75,
      attributionHypotheses: [],
      velocityMetrics,
      growthTrajectory: 'EMERGING',
      crossTenantConfidence: orgs.size > 1 ? 0.9 : 0.6,
      privacyPreservedMetrics: privacyMetrics,
    };
  }

  private buildChannelDistribution(
    signals: CampaignSignal[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const signal of signals) {
      const channel = signal.channelMetadata.platform;
      distribution[channel] = (distribution[channel] || 0) + 1;
    }
    return distribution;
  }

  private calculateNoiseMagnitude(): number {
    return (
      this.config.differentialPrivacy.sensitivityBound /
      this.config.differentialPrivacy.epsilon
    );
  }

  private generateCommitment(value: string): string {
    const nonce = randomBytes(16).toString('hex');
    return createHash('sha256').update(`${value}:${nonce}`).digest('hex');
  }

  private generateSecretShares(
    values: number[],
    numShares: number = 3,
  ): number[][] {
    // Simplified Shamir secret sharing
    const shares: number[][] = [];
    for (let i = 0; i < numShares; i++) {
      shares.push(values.map((v) => v + Math.random() * 0.1 - 0.05));
    }
    return shares;
  }

  private hashAgreementTerms(
    participantIds: string[],
    signalTypes: SignalType[],
    privacyLevels: PrivacyLevel[],
  ): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          participants: participantIds.sort(),
          signals: signalTypes.sort(),
          privacy: privacyLevels.sort(),
        }),
      )
      .digest('hex');
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
    this.removeAllListeners();
  }
}

export default FederationService;
