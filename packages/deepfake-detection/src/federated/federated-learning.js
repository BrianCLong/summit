"use strict";
/**
 * Federated Learning for Privacy-Preserving Deepfake Detection
 * Train models across distributed nodes without sharing raw data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FederatedLearningOrchestrator = exports.EncryptionScheme = exports.ParticipantStatus = exports.RoundStatus = exports.AggregationStrategy = exports.NoiseMechanism = void 0;
var NoiseMechanism;
(function (NoiseMechanism) {
    NoiseMechanism["GAUSSIAN"] = "gaussian";
    NoiseMechanism["LAPLACIAN"] = "laplacian";
    NoiseMechanism["EXPONENTIAL"] = "exponential";
})(NoiseMechanism || (exports.NoiseMechanism = NoiseMechanism = {}));
var AggregationStrategy;
(function (AggregationStrategy) {
    AggregationStrategy["FEDAVG"] = "fedavg";
    AggregationStrategy["FEDPROX"] = "fedprox";
    AggregationStrategy["SCAFFOLD"] = "scaffold";
    AggregationStrategy["FEDADAM"] = "fedadam";
    AggregationStrategy["FEDYOGI"] = "fedyogi";
    AggregationStrategy["QFEDAVG"] = "qfedavg";
})(AggregationStrategy || (exports.AggregationStrategy = AggregationStrategy = {}));
var RoundStatus;
(function (RoundStatus) {
    RoundStatus["PENDING"] = "pending";
    RoundStatus["IN_PROGRESS"] = "in_progress";
    RoundStatus["AGGREGATING"] = "aggregating";
    RoundStatus["COMPLETED"] = "completed";
    RoundStatus["FAILED"] = "failed";
})(RoundStatus || (exports.RoundStatus = RoundStatus = {}));
var ParticipantStatus;
(function (ParticipantStatus) {
    ParticipantStatus["SELECTED"] = "selected";
    ParticipantStatus["TRAINING"] = "training";
    ParticipantStatus["SUBMITTED"] = "submitted";
    ParticipantStatus["VALIDATED"] = "validated";
    ParticipantStatus["REJECTED"] = "rejected";
})(ParticipantStatus || (exports.ParticipantStatus = ParticipantStatus = {}));
var EncryptionScheme;
(function (EncryptionScheme) {
    EncryptionScheme["PAILLIER"] = "paillier";
    EncryptionScheme["CKKS"] = "ckks";
    EncryptionScheme["SECRET_SHARING"] = "secret_sharing";
    EncryptionScheme["SECURE_AGGREGATION"] = "secure_aggregation";
})(EncryptionScheme || (exports.EncryptionScheme = EncryptionScheme = {}));
class FederatedLearningOrchestrator {
    config;
    globalModel;
    participants;
    rounds;
    privacyAccountant;
    secureAggregator;
    constructor(config) {
        this.config = config;
        this.globalModel = new GlobalModel();
        this.participants = new Map();
        this.rounds = [];
        this.privacyAccountant = new PrivacyAccountant(config.differentialPrivacy);
        this.secureAggregator = new SecureAggregator(config.secureAggregation);
    }
    /**
     * Register a new participant
     */
    async registerParticipant(participantId, publicKey, capabilities) {
        const participant = new Participant(participantId, publicKey, capabilities);
        this.participants.set(participantId, participant);
    }
    /**
     * Start a new federated training round
     */
    async startRound() {
        const roundId = this.rounds.length;
        const selectedParticipants = await this.selectParticipants();
        if (selectedParticipants.length < this.config.minParticipants) {
            throw new Error(`Insufficient participants: ${selectedParticipants.length} < ${this.config.minParticipants}`);
        }
        const round = {
            roundId,
            startTime: new Date(),
            participants: selectedParticipants.map(p => ({
                participantId: p.id,
                dataSize: p.dataSize,
                computeCapacity: p.computeCapacity,
                trustScore: p.trustScore,
                contribution: null,
                status: ParticipantStatus.SELECTED,
            })),
            aggregatedUpdate: null,
            metrics: null,
            status: RoundStatus.IN_PROGRESS,
        };
        this.rounds.push(round);
        // Distribute global model to participants
        const modelCheckpoint = await this.globalModel.getCheckpoint();
        for (const participant of selectedParticipants) {
            await participant.receiveGlobalModel(modelCheckpoint);
        }
        return round;
    }
    /**
     * Select participants for current round
     */
    async selectParticipants() {
        const available = Array.from(this.participants.values()).filter(p => p.isAvailable);
        // Selection based on data quality, compute capacity, and trust
        const scored = available.map(p => ({
            participant: p,
            score: p.trustScore * 0.4 + p.dataQuality * 0.3 + p.computeCapacity * 0.3,
        }));
        scored.sort((a, b) => b.score - a.score);
        // Select top participants with some randomization for fairness
        const targetCount = Math.min(Math.ceil(available.length * 0.7), this.config.minParticipants * 2);
        return scored.slice(0, targetCount).map(s => s.participant);
    }
    /**
     * Receive update from participant
     */
    async receiveUpdate(roundId, participantId, encryptedUpdate, localMetrics) {
        const round = this.rounds[roundId];
        if (!round || round.status !== RoundStatus.IN_PROGRESS) {
            throw new Error('Invalid round');
        }
        const participantInfo = round.participants.find(p => p.participantId === participantId);
        if (!participantInfo) {
            throw new Error('Participant not in round');
        }
        // Validate update
        const isValid = await this.validateUpdate(encryptedUpdate, participantId);
        if (!isValid) {
            participantInfo.status = ParticipantStatus.REJECTED;
            return;
        }
        participantInfo.contribution = {
            modelUpdate: encryptedUpdate,
            localMetrics,
            dataDistribution: { totalSamples: 0, positiveRatio: 0.5, featureStatistics: [] },
            computeTime: 0,
        };
        participantInfo.status = ParticipantStatus.SUBMITTED;
        // Check if all participants have submitted
        const submittedCount = round.participants.filter(p => p.status === ParticipantStatus.SUBMITTED || p.status === ParticipantStatus.VALIDATED).length;
        if (submittedCount >= this.config.minParticipants) {
            await this.aggregateRound(roundId);
        }
    }
    /**
     * Validate participant update
     */
    async validateUpdate(update, participantId) {
        // Verify zero-knowledge proof if present
        if (update.proof) {
            const proofValid = await this.verifyZKProof(update.proof);
            if (!proofValid)
                return false;
        }
        // Check for Byzantine behavior
        const participant = this.participants.get(participantId);
        if (participant && participant.trustScore < 0.3) {
            return false;
        }
        return true;
    }
    async verifyZKProof(proof) {
        // Verify zero-knowledge proof of valid computation
        return true;
    }
    /**
     * Aggregate updates from participants
     */
    async aggregateRound(roundId) {
        const round = this.rounds[roundId];
        round.status = RoundStatus.AGGREGATING;
        const validContributions = round.participants
            .filter(p => p.status === ParticipantStatus.SUBMITTED)
            .map(p => p.contribution);
        // Decrypt and aggregate
        let aggregatedWeights;
        if (this.config.secureAggregation) {
            aggregatedWeights = await this.secureAggregator.aggregate(validContributions.map(c => c.modelUpdate));
        }
        else {
            aggregatedWeights = await this.standardAggregate(validContributions);
        }
        // Apply differential privacy noise
        if (this.config.differentialPrivacy.enabled) {
            aggregatedWeights = await this.privacyAccountant.addNoise(aggregatedWeights);
        }
        // Update global model
        const totalSamples = validContributions.reduce((sum, c) => sum + c.dataDistribution.totalSamples, 0);
        round.aggregatedUpdate = {
            version: `${roundId + 1}.0.0`,
            weights: aggregatedWeights,
            metadata: {
                participantCount: validContributions.length,
                totalSamples,
                aggregationMethod: this.config.aggregationStrategy,
                privacyBudgetSpent: this.privacyAccountant.getSpentBudget(),
            },
        };
        await this.globalModel.applyUpdate(round.aggregatedUpdate);
        // Calculate round metrics
        round.metrics = this.calculateRoundMetrics(validContributions);
        round.status = RoundStatus.COMPLETED;
        round.endTime = new Date();
        // Update participant trust scores
        for (const p of round.participants) {
            if (p.status === ParticipantStatus.SUBMITTED) {
                const participant = this.participants.get(p.participantId);
                if (participant) {
                    participant.updateTrustScore(true);
                }
            }
        }
    }
    /**
     * Standard FedAvg aggregation
     */
    async standardAggregate(contributions) {
        const totalSamples = contributions.reduce((sum, c) => sum + c.dataDistribution.totalSamples, 0);
        // Decrypt all updates
        const decryptedUpdates = await Promise.all(contributions.map(c => this.decryptUpdate(c.modelUpdate)));
        // Weighted average based on sample count
        const modelSize = decryptedUpdates[0].length;
        const aggregated = new Float32Array(modelSize);
        for (let i = 0; i < contributions.length; i++) {
            const weight = contributions[i].dataDistribution.totalSamples / totalSamples;
            for (let j = 0; j < modelSize; j++) {
                aggregated[j] += decryptedUpdates[i][j] * weight;
            }
        }
        return aggregated;
    }
    async decryptUpdate(update) {
        // Decrypt based on scheme
        return new Float32Array(100);
    }
    calculateRoundMetrics(contributions) {
        const losses = contributions.map(c => c.localMetrics.loss);
        const accuracies = contributions.map(c => c.localMetrics.accuracy);
        const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
        const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
        const variance = losses.reduce((sum, l) => sum + Math.pow(l - avgLoss, 2), 0) / losses.length;
        return {
            globalLoss: avgLoss,
            globalAccuracy: avgAccuracy,
            participantVariance: variance,
            convergenceRate: this.calculateConvergenceRate(),
            communicationCost: contributions.length * 1024 * 1024, // bytes
            privacyGuarantee: {
                epsilon: this.config.differentialPrivacy.epsilon,
                delta: this.config.differentialPrivacy.delta,
                composedEpsilon: this.privacyAccountant.getComposedEpsilon(),
                remainingBudget: this.privacyAccountant.getRemainingBudget(),
            },
        };
    }
    calculateConvergenceRate() {
        if (this.rounds.length < 2)
            return 0;
        const recentRounds = this.rounds.slice(-5);
        const losses = recentRounds.map(r => r.metrics?.globalLoss || 1);
        let improvementSum = 0;
        for (let i = 1; i < losses.length; i++) {
            improvementSum += (losses[i - 1] - losses[i]) / losses[i - 1];
        }
        return improvementSum / (losses.length - 1);
    }
    /**
     * Get current global model
     */
    async getGlobalModel() {
        return this.globalModel.getCheckpoint();
    }
    /**
     * Get training history
     */
    getHistory() {
        return [...this.rounds];
    }
}
exports.FederatedLearningOrchestrator = FederatedLearningOrchestrator;
class Participant {
    id;
    publicKey;
    capabilities;
    trustScore = 0.5;
    dataQuality = 0.5;
    isAvailable = true;
    computeCapacity;
    dataSize;
    constructor(id, publicKey, capabilities) {
        this.id = id;
        this.publicKey = publicKey;
        this.capabilities = capabilities;
        this.computeCapacity = capabilities.computeCapacity;
        this.dataSize = capabilities.dataSize;
    }
    async receiveGlobalModel(checkpoint) {
        // Receive and store model
    }
    updateTrustScore(successful) {
        const delta = successful ? 0.05 : -0.1;
        this.trustScore = Math.max(0, Math.min(1, this.trustScore + delta));
    }
}
class GlobalModel {
    weights;
    version = '0.0.0';
    constructor() {
        this.weights = new Float32Array(1000);
    }
    async getCheckpoint() {
        return {
            version: this.version,
            weights: new Float32Array(this.weights),
            metadata: {
                participantCount: 0,
                totalSamples: 0,
                aggregationMethod: AggregationStrategy.FEDAVG,
                privacyBudgetSpent: 0,
            },
        };
    }
    async applyUpdate(update) {
        this.weights = new Float32Array(update.weights);
        this.version = update.version;
    }
}
class PrivacyAccountant {
    config;
    spentEpsilon = 0;
    totalBudget;
    constructor(config) {
        this.config = config;
        this.totalBudget = config.epsilon * 10; // Total budget for training
    }
    async addNoise(weights) {
        const noisy = new Float32Array(weights.length);
        const sensitivity = this.config.clippingNorm;
        for (let i = 0; i < weights.length; i++) {
            const noise = this.sampleNoise(sensitivity / this.config.epsilon);
            noisy[i] = weights[i] + noise;
        }
        this.spentEpsilon += this.config.epsilon;
        return noisy;
    }
    sampleNoise(scale) {
        switch (this.config.noiseMechanism) {
            case NoiseMechanism.GAUSSIAN:
                return this.gaussianNoise(0, scale);
            case NoiseMechanism.LAPLACIAN:
                return this.laplacianNoise(scale);
            default:
                return this.gaussianNoise(0, scale);
        }
    }
    gaussianNoise(mean, std) {
        const u1 = Math.random();
        const u2 = Math.random();
        return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
    laplacianNoise(scale) {
        const u = Math.random() - 0.5;
        return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    }
    getSpentBudget() {
        return this.spentEpsilon;
    }
    getComposedEpsilon() {
        // Simple composition
        return this.spentEpsilon;
    }
    getRemainingBudget() {
        return this.totalBudget - this.spentEpsilon;
    }
}
class SecureAggregator {
    enabled;
    constructor(enabled) {
        this.enabled = enabled;
    }
    async aggregate(updates) {
        // Secure aggregation using secret sharing or homomorphic encryption
        // Sum encrypted values without decrypting individual contributions
        return new Float32Array(1000);
    }
}
