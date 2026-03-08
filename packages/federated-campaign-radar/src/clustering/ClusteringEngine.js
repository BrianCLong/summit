"use strict";
/**
 * Federated Clustering Engine
 *
 * Performs privacy-preserving narrative clustering over claim/media/actor graphs
 * with privacy budgets and cross-tenant confidence propagation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusteringEngine = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const types_1 = require("../core/types");
/**
 * Federated Clustering Engine
 */
class ClusteringEngine extends events_1.EventEmitter {
    config;
    activeClusters = new Map();
    signalBuffer = [];
    clusterHistory = new Map();
    privacyBudgetUsed = 0;
    // Clustering state
    updateTimer = null;
    lastClusteringRun = new Date();
    constructor(config) {
        super();
        this.config = config;
        this.startPeriodicClustering();
    }
    // ============================================================================
    // Public API
    // ============================================================================
    /**
     * Add a signal to the clustering buffer
     */
    addSignal(signal) {
        const embedding = this.extractEmbedding(signal);
        this.signalBuffer.push(embedding);
        // Trigger incremental clustering if buffer is large
        if (this.signalBuffer.length >= this.config.minClusterSize * 2) {
            this.performIncrementalClustering();
        }
    }
    /**
     * Add multiple signals in batch
     */
    addSignals(signals) {
        for (const signal of signals) {
            this.addSignal(signal);
        }
    }
    /**
     * Perform full clustering on all buffered signals
     */
    async performClustering() {
        if (this.signalBuffer.length < this.config.minClusterSize) {
            return Array.from(this.activeClusters.values());
        }
        // Check privacy budget
        if (!this.checkPrivacyBudget()) {
            this.emit('privacyBudgetExhausted');
            return Array.from(this.activeClusters.values());
        }
        const startTime = Date.now();
        // Group signals by type
        const signalsByType = this.groupSignalsByType();
        // Perform type-specific clustering
        const newClusters = [];
        for (const [signalType, signals] of signalsByType) {
            const typeClusters = await this.clusterSignalType(signalType, signals);
            newClusters.push(...typeClusters);
        }
        // Merge similar clusters across types
        const mergedClusters = this.mergeSimilarClusters(newClusters);
        // Update active clusters
        this.updateActiveClusters(mergedClusters);
        // Apply privacy protections
        const protectedClusters = this.applyPrivacyProtections(mergedClusters);
        // Update privacy budget
        this.consumePrivacyBudget(protectedClusters.length);
        // Clear processed signals
        this.clearOldSignals();
        this.lastClusteringRun = new Date();
        const duration = Date.now() - startTime;
        this.emit('clusteringComplete', {
            clusters: protectedClusters,
            duration,
            signalsProcessed: this.signalBuffer.length,
        });
        return protectedClusters;
    }
    /**
     * Get active clusters filtered by threat level
     */
    getActiveClusters(minThreatLevel) {
        let clusters = Array.from(this.activeClusters.values());
        if (minThreatLevel) {
            const threatOrder = [
                types_1.ThreatLevel.INFORMATIONAL,
                types_1.ThreatLevel.LOW,
                types_1.ThreatLevel.MEDIUM,
                types_1.ThreatLevel.HIGH,
                types_1.ThreatLevel.CRITICAL,
            ];
            const minIndex = threatOrder.indexOf(minThreatLevel);
            clusters = clusters.filter((c) => threatOrder.indexOf(c.threatLevel) >= minIndex);
        }
        return clusters;
    }
    /**
     * Get cluster by ID
     */
    getCluster(clusterId) {
        return this.activeClusters.get(clusterId);
    }
    /**
     * Get cluster evolution history
     */
    getClusterHistory(clusterId) {
        return this.clusterHistory.get(clusterId) || [];
    }
    /**
     * Find signals similar to a given signal
     */
    findSimilarSignals(signal, limit = 10) {
        const queryEmbedding = this.extractEmbedding(signal);
        const similarities = [];
        for (const bufferSignal of this.signalBuffer) {
            if (bufferSignal.signalId === queryEmbedding.signalId)
                continue;
            if (bufferSignal.signalType !== queryEmbedding.signalType)
                continue;
            const similarity = this.cosineSimilarity(queryEmbedding.embedding, bufferSignal.embedding);
            if (similarity > this.getThresholdForType(queryEmbedding.signalType)) {
                similarities.push({ signal: bufferSignal, similarity });
            }
        }
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }
    /**
     * Compute cross-tenant signal overlap
     */
    computeCrossTenantOverlap() {
        const orgs = new Set();
        const indicatorOrgs = new Map();
        for (const signal of this.signalBuffer) {
            orgs.add(signal.sourceOrg);
            if (!indicatorOrgs.has(signal.indicatorHash)) {
                indicatorOrgs.set(signal.indicatorHash, new Set());
            }
            indicatorOrgs.get(signal.indicatorHash).add(signal.sourceOrg);
        }
        // Count indicators seen by multiple orgs
        let sharedIndicators = 0;
        for (const [, orgSet] of indicatorOrgs) {
            if (orgSet.size > 1) {
                sharedIndicators++;
            }
        }
        const overlapScore = indicatorOrgs.size > 0 ? sharedIndicators / indicatorOrgs.size : 0;
        return {
            overlapScore,
            participatingOrgs: orgs.size,
            sharedIndicators,
        };
    }
    // ============================================================================
    // Private Clustering Methods
    // ============================================================================
    startPeriodicClustering() {
        this.updateTimer = setInterval(() => {
            this.performClustering();
        }, this.config.updateIntervalMs);
    }
    extractEmbedding(signal) {
        // Use signal's embedding if available, otherwise generate one
        let embedding = signal.embeddingVector;
        if (!embedding || embedding.length === 0) {
            // Generate embedding based on signal type
            embedding = this.generateFallbackEmbedding(signal);
        }
        return {
            signalId: signal.id,
            embedding,
            signalType: signal.signalType,
            sourceOrg: signal.sourceOrganization,
            timestamp: signal.timestamp,
            indicatorHash: signal.indicator.indicatorHash,
            metadata: {
                confidence: signal.confidence,
                privacyLevel: signal.privacyLevel,
            },
        };
    }
    generateFallbackEmbedding(signal) {
        // Generate deterministic embedding from indicator hash
        const hash = signal.indicator.indicatorHash;
        const dimensions = 128;
        const embedding = [];
        for (let i = 0; i < dimensions; i++) {
            const charCode = hash.charCodeAt(i % hash.length);
            embedding.push((charCode / 255) * 2 - 1);
        }
        // Normalize
        const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        return embedding.map((v) => v / norm);
    }
    groupSignalsByType() {
        const groups = new Map();
        for (const signal of this.signalBuffer) {
            if (!groups.has(signal.signalType)) {
                groups.set(signal.signalType, []);
            }
            groups.get(signal.signalType).push(signal);
        }
        return groups;
    }
    async clusterSignalType(signalType, signals) {
        if (signals.length < this.config.minClusterSize) {
            return [];
        }
        const threshold = this.getThresholdForType(signalType);
        const candidates = this.findClusterCandidates(signals, threshold);
        const clusters = this.buildClustersFromCandidates(candidates, signalType);
        return clusters;
    }
    getThresholdForType(signalType) {
        switch (signalType) {
            case types_1.SignalType.NARRATIVE:
            case types_1.SignalType.CLAIM:
                return this.config.narrativeSimilarityThreshold;
            case types_1.SignalType.MEDIA_ARTIFACT:
            case types_1.SignalType.SYNTHETIC_MEDIA:
                return this.config.mediaSimilarityThreshold;
            case types_1.SignalType.ACCOUNT_HANDLE:
                return this.config.accountSimilarityThreshold;
            default:
                return 0.7;
        }
    }
    findClusterCandidates(signals, threshold) {
        const candidates = [];
        const assigned = new Set();
        // Simple greedy clustering
        for (const signal of signals) {
            if (assigned.has(signal.signalId))
                continue;
            // Start new cluster candidate
            const clusterSignals = [signal];
            assigned.add(signal.signalId);
            // Find similar signals
            for (const other of signals) {
                if (assigned.has(other.signalId))
                    continue;
                const similarity = this.cosineSimilarity(signal.embedding, other.embedding);
                if (similarity >= threshold) {
                    clusterSignals.push(other);
                    assigned.add(other.signalId);
                }
            }
            if (clusterSignals.length >= this.config.minClusterSize) {
                const centroid = this.computeCentroid(clusterSignals.map((s) => s.embedding));
                const crossOrgCount = new Set(clusterSignals.map((s) => s.sourceOrg))
                    .size;
                candidates.push({
                    centroid,
                    signals: clusterSignals,
                    score: this.computeClusterScore(clusterSignals, crossOrgCount),
                    crossOrgCount,
                });
            }
        }
        return candidates;
    }
    computeCentroid(embeddings) {
        if (embeddings.length === 0)
            return [];
        const dim = embeddings[0].length;
        const centroid = new Array(dim).fill(0);
        for (const embedding of embeddings) {
            for (let i = 0; i < dim; i++) {
                centroid[i] += embedding[i] / embeddings.length;
            }
        }
        // Normalize
        const norm = Math.sqrt(centroid.reduce((sum, v) => sum + v * v, 0));
        return centroid.map((v) => v / norm);
    }
    computeClusterScore(signals, crossOrgCount) {
        // Score based on size, cross-org participation, and cohesion
        const sizeScore = Math.min(1, signals.length / 50);
        const crossOrgScore = Math.min(1, crossOrgCount / 5);
        // Compute cohesion (average pairwise similarity)
        let totalSimilarity = 0;
        let pairs = 0;
        for (let i = 0; i < signals.length && i < 20; i++) {
            for (let j = i + 1; j < signals.length && j < 20; j++) {
                totalSimilarity += this.cosineSimilarity(signals[i].embedding, signals[j].embedding);
                pairs++;
            }
        }
        const cohesionScore = pairs > 0 ? totalSimilarity / pairs : 0;
        return sizeScore * 0.3 + crossOrgScore * 0.4 + cohesionScore * 0.3;
    }
    buildClustersFromCandidates(candidates, signalType) {
        return candidates.map((candidate) => {
            const now = new Date();
            const timestamps = candidate.signals.map((s) => s.timestamp);
            const orgs = new Set(candidate.signals.map((s) => s.sourceOrg));
            // Build velocity metrics
            const velocityMetrics = this.computeVelocityMetrics(candidate.signals);
            // Compute threat level
            const threatLevel = (0, types_1.calculateThreatLevel)(candidate.signals.length, orgs.size, velocityMetrics, candidate.score);
            // Compute cross-tenant confidence boost
            const crossTenantConfidence = orgs.size > 1 ? 0.7 + orgs.size * 0.05 : 0.5;
            return {
                clusterId: (0, types_1.createClusterId)(),
                createdAt: now,
                updatedAt: now,
                status: this.determineClusterStatus(velocityMetrics),
                signalCount: candidate.signals.length,
                participatingOrgs: orgs.size,
                temporalRange: {
                    start: new Date(Math.min(...timestamps.map((t) => t.getTime()))),
                    end: new Date(Math.max(...timestamps.map((t) => t.getTime()))),
                },
                dominantNarratives: this.extractNarrativeSummaries(candidate.signals),
                coordinationPatterns: this.detectCoordinationPatterns(candidate.signals),
                channelDistribution: this.computeChannelDistribution(candidate.signals),
                geographicSpread: this.computeGeographicSpread(candidate.signals),
                threatLevel,
                confidenceScore: candidate.score,
                attributionHypotheses: this.generateAttributionHypotheses(candidate.signals),
                velocityMetrics,
                growthTrajectory: this.determineGrowthTrajectory(velocityMetrics),
                crossTenantConfidence,
                privacyPreservedMetrics: {
                    aggregationMethod: 'DIFFERENTIAL_PRIVACY',
                    epsilon: this.config.differentialPrivacy.epsilon,
                    noiseAdded: true,
                    minimumThreshold: this.config.minimumSignalsForAggregation,
                },
            };
        });
    }
    computeVelocityMetrics(signals) {
        if (signals.length === 0) {
            return {
                signalsPerHour: 0,
                growthRate: 0,
                accelerationRate: 0,
                peakVelocity: 0,
            };
        }
        // Sort by timestamp
        const sorted = [...signals].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const timeRangeHours = (sorted[sorted.length - 1].timestamp.getTime() -
            sorted[0].timestamp.getTime()) /
            (1000 * 60 * 60);
        const signalsPerHour = timeRangeHours > 0 ? signals.length / timeRangeHours : signals.length;
        // Compute growth rate (signals in last hour vs previous hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const recentSignals = signals.filter((s) => s.timestamp >= oneHourAgo).length;
        const previousSignals = signals.filter((s) => s.timestamp >= twoHoursAgo && s.timestamp < oneHourAgo).length;
        const growthRate = previousSignals > 0
            ? ((recentSignals - previousSignals) / previousSignals) * 100
            : recentSignals > 0
                ? 100
                : 0;
        return {
            signalsPerHour,
            growthRate,
            accelerationRate: growthRate / 100, // Simplified
            peakVelocity: signalsPerHour * 1.5,
            peakTimestamp: sorted[sorted.length - 1].timestamp,
        };
    }
    determineClusterStatus(velocity) {
        if (velocity.signalsPerHour === 0)
            return types_1.ClusterStatus.DORMANT;
        if (velocity.growthRate > 50)
            return types_1.ClusterStatus.EMERGING;
        if (velocity.growthRate > 0)
            return types_1.ClusterStatus.ACTIVE;
        if (velocity.growthRate > -20)
            return types_1.ClusterStatus.PEAK;
        return types_1.ClusterStatus.DECLINING;
    }
    determineGrowthTrajectory(velocity) {
        if (velocity.signalsPerHour === 0)
            return 'DORMANT';
        if (velocity.growthRate > 50)
            return 'EMERGING';
        if (velocity.growthRate > 10)
            return 'GROWING';
        if (velocity.growthRate > -10)
            return 'STABLE';
        return 'DECLINING';
    }
    extractNarrativeSummaries(signals) {
        // Group by indicator hash and extract dominant patterns
        const hashGroups = new Map();
        for (const signal of signals) {
            const key = signal.indicatorHash.substring(0, 16);
            if (!hashGroups.has(key)) {
                hashGroups.set(key, []);
            }
            hashGroups.get(key).push(signal);
        }
        const summaries = [];
        for (const [hashPrefix, groupSignals] of hashGroups) {
            if (groupSignals.length >= 2) {
                summaries.push({
                    narrativeId: hashPrefix,
                    themeSummary: `Narrative cluster with ${groupSignals.length} signals`,
                    keyTopics: [],
                    sentimentRange: { min: -0.5, max: 0.5 },
                    signalCount: groupSignals.length,
                    confidence: 0.75,
                });
            }
        }
        return summaries.slice(0, 5);
    }
    detectCoordinationPatterns(signals) {
        const patterns = [];
        // Check for synchronized posting
        const timestamps = signals.map((s) => s.timestamp.getTime());
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i - 1]);
        }
        if (intervals.length > 0) {
            const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, i) => sum + Math.pow(i - meanInterval, 2), 0) /
                intervals.length;
            const stdDev = Math.sqrt(variance);
            const cv = meanInterval > 0 ? stdDev / meanInterval : 1;
            const synchronicity = 1 - Math.min(1, cv);
            if (synchronicity > 0.5) {
                patterns.push({
                    patternType: types_1.CoordinationPatternType.SYNCHRONIZED_POSTING,
                    strength: synchronicity,
                    actorEstimate: {
                        min: Math.floor(signals.length * 0.5),
                        max: signals.length,
                    },
                    evidenceCount: signals.length,
                });
            }
        }
        // Check for copy-paste patterns
        const hashCounts = new Map();
        for (const signal of signals) {
            const hash = signal.indicatorHash;
            hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
        }
        const duplicateRatio = Array.from(hashCounts.values()).filter((c) => c > 1).length /
            hashCounts.size;
        if (duplicateRatio > 0.3) {
            patterns.push({
                patternType: types_1.CoordinationPatternType.COPY_PASTE_CAMPAIGN,
                strength: duplicateRatio,
                actorEstimate: {
                    min: Math.floor(hashCounts.size * 0.5),
                    max: hashCounts.size,
                },
                evidenceCount: signals.length,
            });
        }
        return patterns;
    }
    computeChannelDistribution(signals) {
        const distribution = {};
        // In a full implementation, channel info would be in metadata
        for (const signal of signals) {
            const channel = signal.metadata.channel || 'unknown';
            distribution[channel] = (distribution[channel] || 0) + 1;
        }
        return distribution;
    }
    computeGeographicSpread(signals) {
        // Would extract from signal metadata in full implementation
        const regions = {};
        const uniqueRegions = new Set();
        for (const signal of signals) {
            const region = signal.metadata.region || 'unknown';
            regions[region] = (regions[region] || 0) + 1;
            uniqueRegions.add(region);
        }
        return {
            regions,
            spreadIndex: Math.min(1, uniqueRegions.size / 10),
            primaryRegions: Object.entries(regions)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([region]) => region),
        };
    }
    generateAttributionHypotheses(signals) {
        // Generate hypotheses based on patterns
        const hypotheses = [];
        // Check for state-actor indicators
        const orgs = new Set(signals.map((s) => s.sourceOrg));
        if (orgs.size > 3 && signals.length > 50) {
            hypotheses.push({
                hypothesisId: (0, uuid_1.v4)(),
                actorType: 'STATE',
                confidence: 0.4,
                supportingIndicators: ['high_volume', 'cross_org_coordination'],
                contradictingIndicators: [],
            });
        }
        // Default unknown hypothesis
        hypotheses.push({
            hypothesisId: (0, uuid_1.v4)(),
            actorType: 'UNKNOWN',
            confidence: 0.6,
            supportingIndicators: ['insufficient_data'],
            contradictingIndicators: [],
        });
        return hypotheses;
    }
    mergeSimilarClusters(clusters) {
        if (clusters.length <= 1)
            return clusters;
        const merged = [];
        const mergedIndices = new Set();
        for (let i = 0; i < clusters.length; i++) {
            if (mergedIndices.has(i))
                continue;
            let current = clusters[i];
            for (let j = i + 1; j < clusters.length; j++) {
                if (mergedIndices.has(j))
                    continue;
                // Check if clusters should merge based on similarity
                if (this.shouldMergeClusters(current, clusters[j])) {
                    current = this.mergeTwoClusters(current, clusters[j]);
                    mergedIndices.add(j);
                }
            }
            merged.push(current);
        }
        return merged;
    }
    shouldMergeClusters(a, b) {
        // Check temporal overlap
        const aStart = a.temporalRange.start.getTime();
        const aEnd = a.temporalRange.end.getTime();
        const bStart = b.temporalRange.start.getTime();
        const bEnd = b.temporalRange.end.getTime();
        const hasTemporalOverlap = !(aEnd < bStart || bEnd < aStart);
        if (!hasTemporalOverlap)
            return false;
        // Check for shared narratives or patterns
        const sharedNarratives = a.dominantNarratives.filter((n) => b.dominantNarratives.some((bn) => bn.narrativeId === n.narrativeId));
        return sharedNarratives.length > 0;
    }
    mergeTwoClusters(a, b) {
        const now = new Date();
        return {
            clusterId: a.clusterId, // Keep first cluster ID
            createdAt: new Date(Math.min(a.createdAt.getTime(), b.createdAt.getTime())),
            updatedAt: now,
            status: a.status,
            signalCount: a.signalCount + b.signalCount,
            participatingOrgs: Math.max(a.participatingOrgs, b.participatingOrgs), // Conservative estimate
            temporalRange: {
                start: new Date(Math.min(a.temporalRange.start.getTime(), b.temporalRange.start.getTime())),
                end: new Date(Math.max(a.temporalRange.end.getTime(), b.temporalRange.end.getTime())),
            },
            dominantNarratives: [...a.dominantNarratives, ...b.dominantNarratives].slice(0, 10),
            coordinationPatterns: [
                ...a.coordinationPatterns,
                ...b.coordinationPatterns,
            ],
            channelDistribution: this.mergeDistributions(a.channelDistribution, b.channelDistribution),
            geographicSpread: {
                regions: this.mergeDistributions(a.geographicSpread.regions, b.geographicSpread.regions),
                spreadIndex: Math.max(a.geographicSpread.spreadIndex, b.geographicSpread.spreadIndex),
                primaryRegions: [
                    ...new Set([
                        ...a.geographicSpread.primaryRegions,
                        ...b.geographicSpread.primaryRegions,
                    ]),
                ].slice(0, 5),
            },
            threatLevel: this.compareThreatLevels(a.threatLevel, b.threatLevel) >= 0
                ? a.threatLevel
                : b.threatLevel,
            confidenceScore: (a.confidenceScore + b.confidenceScore) / 2,
            attributionHypotheses: [
                ...a.attributionHypotheses,
                ...b.attributionHypotheses,
            ].slice(0, 5),
            velocityMetrics: {
                signalsPerHour: a.velocityMetrics.signalsPerHour + b.velocityMetrics.signalsPerHour,
                growthRate: Math.max(a.velocityMetrics.growthRate, b.velocityMetrics.growthRate),
                accelerationRate: Math.max(a.velocityMetrics.accelerationRate, b.velocityMetrics.accelerationRate),
                peakVelocity: Math.max(a.velocityMetrics.peakVelocity, b.velocityMetrics.peakVelocity),
            },
            growthTrajectory: a.growthTrajectory,
            crossTenantConfidence: Math.max(a.crossTenantConfidence, b.crossTenantConfidence),
            privacyPreservedMetrics: a.privacyPreservedMetrics,
        };
    }
    mergeDistributions(a, b) {
        const merged = { ...a };
        for (const [key, value] of Object.entries(b)) {
            merged[key] = (merged[key] || 0) + value;
        }
        return merged;
    }
    compareThreatLevels(a, b) {
        const order = [
            types_1.ThreatLevel.INFORMATIONAL,
            types_1.ThreatLevel.LOW,
            types_1.ThreatLevel.MEDIUM,
            types_1.ThreatLevel.HIGH,
            types_1.ThreatLevel.CRITICAL,
        ];
        return order.indexOf(a) - order.indexOf(b);
    }
    updateActiveClusters(newClusters) {
        for (const cluster of newClusters) {
            const existing = this.activeClusters.get(cluster.clusterId);
            if (existing) {
                // Store history
                if (!this.clusterHistory.has(cluster.clusterId)) {
                    this.clusterHistory.set(cluster.clusterId, []);
                }
                this.clusterHistory.get(cluster.clusterId).push({ ...existing });
            }
            this.activeClusters.set(cluster.clusterId, cluster);
        }
        // Expire old clusters
        const cutoff = new Date(Date.now() - this.config.clusterTTLHours * 60 * 60 * 1000);
        for (const [id, cluster] of this.activeClusters) {
            if (cluster.updatedAt < cutoff) {
                cluster.status = types_1.ClusterStatus.DORMANT;
            }
        }
    }
    applyPrivacyProtections(clusters) {
        return clusters.map((cluster) => {
            // Add noise to counts if below threshold
            if (cluster.signalCount < this.config.minimumSignalsForAggregation) {
                return {
                    ...cluster,
                    signalCount: 0, // Suppress
                    participatingOrgs: 0,
                };
            }
            // Add Laplacian noise to numeric values
            const epsilon = this.config.differentialPrivacy.epsilon;
            const sensitivity = this.config.differentialPrivacy.sensitivityBound;
            const scale = sensitivity / epsilon;
            const noise = () => {
                const u = Math.random() - 0.5;
                return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
            };
            return {
                ...cluster,
                signalCount: Math.max(0, Math.round(cluster.signalCount + noise())),
                participatingOrgs: Math.max(0, Math.round(cluster.participatingOrgs + noise())),
                velocityMetrics: {
                    ...cluster.velocityMetrics,
                    signalsPerHour: Math.max(0, cluster.velocityMetrics.signalsPerHour + noise()),
                },
            };
        });
    }
    performIncrementalClustering() {
        // Lightweight incremental update
        this.emit('incrementalClusteringStarted');
        this.performClustering();
    }
    checkPrivacyBudget() {
        return (this.privacyBudgetUsed + 0.01 <=
            this.config.privacyBudget.totalEpsilon);
    }
    consumePrivacyBudget(clusterCount) {
        this.privacyBudgetUsed += 0.01 * clusterCount;
    }
    clearOldSignals() {
        const cutoff = new Date(Date.now() - this.config.temporalWindowHours * 60 * 60 * 1000);
        this.signalBuffer = this.signalBuffer.filter((s) => s.timestamp >= cutoff);
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length)
            return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const norm = Math.sqrt(normA) * Math.sqrt(normB);
        return norm > 0 ? dotProduct / norm : 0;
    }
    /**
     * Cleanup resources
     */
    dispose() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        this.removeAllListeners();
    }
}
exports.ClusteringEngine = ClusteringEngine;
exports.default = ClusteringEngine;
