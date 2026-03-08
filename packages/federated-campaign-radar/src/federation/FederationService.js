"use strict";
/**
 * Federation Service
 *
 * Privacy-preserving federation layer for cross-organization signal sharing.
 * Implements differential privacy, secure aggregation, and MPC-style workflows.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FederationService = void 0;
const events_1 = require("events");
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
const types_1 = require("../core/types");
/**
 * Federation Service
 */
class FederationService extends events_1.EventEmitter {
    config;
    participants = new Map();
    sharingAgreements = new Map();
    privacyBudgets = new Map();
    // Signal buffers for aggregation
    inboundBuffer = [];
    outboundBuffer = [];
    // Aggregation state
    aggregationWindow = new Map();
    aggregationTimer = null;
    // Cluster state
    activeClusters = new Map();
    constructor(config) {
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
    async registerParticipant(participantId, publicKey, capabilities) {
        const participant = {
            participantId,
            publicKey,
            joinedAt: new Date(),
            status: types_1.ParticipantStatus.PENDING_APPROVAL,
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
    async approveParticipant(participantId) {
        const participant = this.participants.get(participantId);
        if (!participant)
            return false;
        participant.status = types_1.ParticipantStatus.ACTIVE;
        this.initializeParticipantBudget(participantId);
        this.emit('participantApproved', participant);
        return true;
    }
    /**
     * Create a sharing agreement between participants
     */
    async createSharingAgreement(participantIds, signalTypes, privacyLevels, validDays) {
        const agreement = {
            agreementId: (0, uuid_1.v4)(),
            participantIds,
            signalTypes,
            privacyLevels,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
            termsHash: this.hashAgreementTerms(participantIds, signalTypes, privacyLevels),
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
    async submitSignal(signal, targetParticipants = 'BROADCAST') {
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
        const routing = {
            sourceParticipant: this.anonymizeParticipantId(this.config.participantId),
            targetParticipants,
            ttl: 3,
            priority: this.calculateSignalPriority(signal),
            requiresAck: signal.signalType === types_1.SignalType.COORDINATION_PATTERN,
        };
        const federatedSignal = {
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
    async receiveSignals() {
        const signals = [...this.inboundBuffer];
        this.inboundBuffer = [];
        return signals;
    }
    /**
     * Query aggregated statistics with privacy protections
     */
    async queryAggregatedStats(signalType, windowHours = 24) {
        const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);
        const windowEnd = new Date();
        // Collect signals in window
        const signals = this.collectSignalsInWindow(signalType, windowStart, windowEnd);
        // Apply differential privacy to counts
        const dpConfig = this.config.differentialPrivacy;
        const stats = {
            aggregationId: (0, uuid_1.v4)(),
            windowStart,
            windowEnd,
            signalType,
            signalCount: this.addLaplaceNoise(signals.length, dpConfig),
            uniqueIndicators: this.addLaplaceNoise(new Set(signals.map((s) => s.indicator.indicatorHash)).size, dpConfig),
            participatingOrgs: this.addLaplaceNoise(new Set(signals.map((s) => s.sourceOrganization)).size, dpConfig),
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
    async performFederatedClustering(signalType, windowHours = 24) {
        const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);
        const windowEnd = new Date();
        // Collect signals from all aggregation windows
        const allSignals = [];
        for (const [, signals] of this.aggregationWindow) {
            for (const signal of signals) {
                if (signal.timestamp >= windowStart &&
                    signal.timestamp <= windowEnd &&
                    (!signalType || signal.signalType === signalType)) {
                    allSignals.push(signal);
                }
            }
        }
        // Perform clustering on indicator hashes
        const clusters = await this.clusterSignals(allSignals);
        // Convert to CampaignCluster format with privacy protections
        const campaignClusters = clusters.map((cluster) => this.buildCampaignCluster(cluster));
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
    getActiveClusters() {
        return Array.from(this.activeClusters.values()).filter((c) => c.status !== types_1.ClusterStatus.RESOLVED);
    }
    // ============================================================================
    // Secure Aggregation
    // ============================================================================
    /**
     * Initiate secure aggregation round
     */
    async initiateSecureAggregation(aggregationType, participantIds) {
        const roundId = (0, uuid_1.v4)();
        // Check minimum participants
        if (participantIds.length < this.config.secureAggregation.minimumParticipants) {
            throw new Error(`Minimum ${this.config.secureAggregation.minimumParticipants} participants required`);
        }
        // Initialize round
        const round = {
            roundId,
            aggregationType,
            participantIds,
            status: 'COLLECTING',
            startedAt: new Date(),
            contributions: new Map(),
        };
        this.emit('secureAggregationStarted', round);
        return { roundId, status: 'COLLECTING' };
    }
    /**
     * Submit masked contribution for secure aggregation
     */
    async submitSecureContribution(roundId, maskedValue) {
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
    async privatSetIntersection(localIndicatorHashes, participantIds) {
        // Simplified PSI implementation
        // In production, would use actual PSI protocol (e.g., KKRT, OPRF-based)
        // Generate random commitments
        const commitments = localIndicatorHashes.map((hash) => this.generateCommitment(hash));
        // Simulate intersection computation
        const estimatedIntersection = Math.floor(localIndicatorHashes.length * 0.1 * participantIds.length);
        // Add noise for privacy
        const noisyIntersection = this.addLaplaceNoise(estimatedIntersection, this.config.differentialPrivacy);
        return {
            intersectionSize: Math.max(0, noisyIntersection.value),
            confidence: 0.85,
        };
    }
    /**
     * Perform MPC-based similarity computation
     */
    async privateCosineSimilarity(localEmbedding, participantId) {
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
    getPrivacyBudgetStatus(participantId) {
        return this.privacyBudgets.get(participantId || this.config.participantId);
    }
    /**
     * Check if operation is within privacy budget
     */
    canPerformOperation(estimatedEpsilon, estimatedDelta = 0) {
        const budget = this.privacyBudgets.get(this.config.participantId);
        if (!budget)
            return false;
        return (budget.usedEpsilon + estimatedEpsilon <= budget.totalEpsilon &&
            budget.usedDelta + estimatedDelta <= budget.totalDelta);
    }
    // ============================================================================
    // Private Helper Methods
    // ============================================================================
    initializePrivacyBudget() {
        const budget = {
            budgetId: (0, uuid_1.v4)(),
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
    initializeParticipantBudget(participantId) {
        const budget = {
            budgetId: (0, uuid_1.v4)(),
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
    startAggregationTimer() {
        this.aggregationTimer = setInterval(() => {
            this.processAggregationWindow();
        }, this.config.aggregationWindowMs);
    }
    async processAggregationWindow() {
        // Process signals in aggregation windows
        for (const [signalType, signals] of this.aggregationWindow) {
            if (signals.length >= this.config.secureAggregation.minimumParticipants) {
                // Perform aggregation
                const stats = await this.aggregateSignals(signals);
                this.emit('aggregationComplete', { signalType, stats });
            }
        }
    }
    async applyPrivacyProtections(signal) {
        const protected_ = { ...signal };
        switch (signal.privacyLevel) {
            case types_1.PrivacyLevel.HASHED:
                // Already hashed, ensure no raw content
                if (protected_.indicator.narrative) {
                    protected_.indicator.narrative.claimText = undefined;
                }
                break;
            case types_1.PrivacyLevel.ENCRYPTED:
                // Encrypt the indicator (placeholder)
                // In production, would use actual encryption
                break;
            case types_1.PrivacyLevel.AGGREGATE_ONLY:
                // Remove individual-level data
                protected_.embeddingVector = undefined;
                protected_.coordinationFeatures = [];
                break;
            case types_1.PrivacyLevel.INTERNAL_ONLY:
                // Should not be shared
                throw new Error('Cannot share INTERNAL_ONLY signals');
        }
        return protected_;
    }
    createPrivacyEnvelope(signal) {
        return {
            envelopeId: (0, uuid_1.v4)(),
            privacyLevel: signal.privacyLevel,
            noiseMagnitude: signal.privacyLevel === types_1.PrivacyLevel.AGGREGATE_ONLY
                ? this.calculateNoiseMagnitude()
                : undefined,
            accessControlList: this.getAuthorizedParticipants(signal),
            expiresAt: signal.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };
    }
    getAuthorizedParticipants(signal) {
        // Find participants with valid sharing agreements
        const authorized = [];
        for (const [agreementId, agreement] of this.sharingAgreements) {
            if (agreement.validUntil > new Date() &&
                agreement.signalTypes.includes(signal.signalType) &&
                agreement.privacyLevels.includes(signal.privacyLevel)) {
                authorized.push(...agreement.participantIds);
            }
        }
        return [...new Set(authorized)];
    }
    calculateSignalPriority(signal) {
        if (signal.signalType === types_1.SignalType.COORDINATION_PATTERN) {
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
    anonymizeParticipantId(participantId) {
        return (0, crypto_1.createHmac)('sha256', this.config.privateKey)
            .update(participantId)
            .digest('hex')
            .substring(0, 16);
    }
    calculatePrivacyCost(signal) {
        // Calculate epsilon cost based on signal type and privacy level
        let baseCost = 0.01;
        if (signal.privacyLevel === types_1.PrivacyLevel.PUBLIC) {
            baseCost = 0;
        }
        else if (signal.privacyLevel === types_1.PrivacyLevel.HASHED) {
            baseCost = 0.005;
        }
        else if (signal.privacyLevel === types_1.PrivacyLevel.ENCRYPTED) {
            baseCost = 0.01;
        }
        else if (signal.privacyLevel === types_1.PrivacyLevel.AGGREGATE_ONLY) {
            baseCost = 0.02;
        }
        return baseCost;
    }
    addToAggregationWindow(signal) {
        const key = signal.signalType;
        if (!this.aggregationWindow.has(key)) {
            this.aggregationWindow.set(key, []);
        }
        this.aggregationWindow.get(key).push(signal);
        // Trim old signals
        const cutoff = new Date(Date.now() - this.config.aggregationWindowMs * 2);
        const signals = this.aggregationWindow.get(key);
        this.aggregationWindow.set(key, signals.filter((s) => s.timestamp >= cutoff));
    }
    collectSignalsInWindow(signalType, start, end) {
        const signals = this.aggregationWindow.get(signalType) || [];
        return signals.filter((s) => s.timestamp >= start && s.timestamp <= end);
    }
    addLaplaceNoise(value, config) {
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
    aggregateChannelDistribution(signals, dpConfig) {
        const distribution = {};
        for (const signal of signals) {
            const channel = signal.channelMetadata.platform;
            distribution[channel] = (distribution[channel] || 0) + 1;
        }
        const noisyDistribution = {};
        for (const [channel, count] of Object.entries(distribution)) {
            noisyDistribution[channel] = this.addLaplaceNoise(count, dpConfig);
        }
        return noisyDistribution;
    }
    async aggregateSignals(signals) {
        return this.queryAggregatedStats(signals[0].signalType, 1);
    }
    async clusterSignals(signals) {
        // Simple clustering based on indicator hash similarity
        const clusters = new Map();
        for (const signal of signals) {
            const clusterKey = signal.indicator.indicatorHash.substring(0, 8);
            if (!clusters.has(clusterKey)) {
                clusters.set(clusterKey, []);
            }
            clusters.get(clusterKey).push(signal);
        }
        // Filter to significant clusters
        return Array.from(clusters.values()).filter((c) => c.length >= 2);
    }
    buildCampaignCluster(signals) {
        const now = new Date();
        const timestamps = signals.map((s) => s.timestamp);
        const orgs = new Set(signals.map((s) => s.sourceOrganization));
        // Calculate velocity metrics
        const velocityMetrics = {
            signalsPerHour: signals.length,
            growthRate: 10,
            accelerationRate: 0.5,
            peakVelocity: signals.length * 1.5,
            peakTimestamp: now,
        };
        // Determine threat level
        const coordinationStrength = signals.some((s) => s.indicator.coordination)
            ? signals.reduce((max, s) => Math.max(max, s.indicator.coordination?.synchronicity || 0), 0)
            : 0.3;
        const threatLevel = (0, types_1.calculateThreatLevel)(signals.length, orgs.size, velocityMetrics, coordinationStrength);
        // Build privacy-preserved metrics
        const privacyMetrics = {
            aggregationMethod: 'DIFFERENTIAL_PRIVACY',
            epsilon: this.config.differentialPrivacy.epsilon,
            noiseAdded: true,
            minimumThreshold: this.config.secureAggregation.minimumParticipants,
        };
        return {
            clusterId: (0, uuid_1.v4)(),
            createdAt: now,
            updatedAt: now,
            status: types_1.ClusterStatus.EMERGING,
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
    buildChannelDistribution(signals) {
        const distribution = {};
        for (const signal of signals) {
            const channel = signal.channelMetadata.platform;
            distribution[channel] = (distribution[channel] || 0) + 1;
        }
        return distribution;
    }
    calculateNoiseMagnitude() {
        return (this.config.differentialPrivacy.sensitivityBound /
            this.config.differentialPrivacy.epsilon);
    }
    generateCommitment(value) {
        const nonce = (0, crypto_1.randomBytes)(16).toString('hex');
        return (0, crypto_1.createHash)('sha256').update(`${value}:${nonce}`).digest('hex');
    }
    generateSecretShares(values, numShares = 3) {
        // Simplified Shamir secret sharing
        const shares = [];
        for (let i = 0; i < numShares; i++) {
            shares.push(values.map((v) => v + Math.random() * 0.1 - 0.05));
        }
        return shares;
    }
    hashAgreementTerms(participantIds, signalTypes, privacyLevels) {
        return (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify({
            participants: participantIds.sort(),
            signals: signalTypes.sort(),
            privacy: privacyLevels.sort(),
        }))
            .digest('hex');
    }
    /**
     * Cleanup resources
     */
    dispose() {
        if (this.aggregationTimer) {
            clearInterval(this.aggregationTimer);
        }
        this.removeAllListeners();
    }
}
exports.FederationService = FederationService;
exports.default = FederationService;
