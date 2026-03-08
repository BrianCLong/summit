"use strict";
/**
 * Tests for FederationService
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const FederationService_1 = require("../federation/FederationService");
const types_1 = require("../core/types");
(0, vitest_1.describe)('FederationService', () => {
    let federationService;
    const createMockSignal = (overrides) => ({
        id: `signal-${Date.now()}-${Math.random()}`,
        signalType: types_1.SignalType.NARRATIVE,
        privacyLevel: types_1.PrivacyLevel.HASHED,
        sourceParticipantId: 'participant-1',
        organizationId: 'org-1',
        timestamp: new Date(),
        content: {
            text: 'Test narrative content',
            textHash: 'hash-abc123',
        },
        channelMetadata: {
            platform: 'twitter',
            channelType: 'social',
            reach: 'medium',
        },
        coordinationFeatures: [],
        threatLevel: types_1.ThreatLevel.LOW,
        ...overrides,
    });
    (0, vitest_1.beforeEach)(() => {
        federationService = new FederationService_1.FederationService({
            participantId: 'test-participant',
            organizationId: 'test-org',
            epsilon: 0.5,
            delta: 1e-6,
            minParticipantsForAggregation: 3,
            enableSecureAggregation: true,
        });
    });
    (0, vitest_1.describe)('participant management', () => {
        (0, vitest_1.it)('should register a new participant', async () => {
            const result = await federationService.registerParticipant('new-participant', 'public-key-123', ['SIGNAL_SHARING', 'AGGREGATION']);
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.participantId).toBe('new-participant');
        });
        (0, vitest_1.it)('should get participant status', async () => {
            await federationService.registerParticipant('participant-a', 'public-key-a', ['SIGNAL_SHARING']);
            const status = federationService.getParticipantStatus('participant-a');
            (0, vitest_1.expect)(status).toBeDefined();
            (0, vitest_1.expect)(status?.status).toBe('ACTIVE');
            (0, vitest_1.expect)(status?.capabilities).toContain('SIGNAL_SHARING');
        });
        (0, vitest_1.it)('should reject duplicate participant registration', async () => {
            await federationService.registerParticipant('dup-participant', 'key-1', []);
            const result = await federationService.registerParticipant('dup-participant', 'key-2', []);
            (0, vitest_1.expect)(result.success).toBe(false);
        });
    });
    (0, vitest_1.describe)('sharing agreements', () => {
        (0, vitest_1.it)('should create a sharing agreement between participants', async () => {
            // Register participants first
            await federationService.registerParticipant('org-a', 'key-a', ['SIGNAL_SHARING']);
            await federationService.registerParticipant('org-b', 'key-b', ['SIGNAL_SHARING']);
            const agreement = await federationService.createSharingAgreement(['org-a', 'org-b'], [types_1.SignalType.NARRATIVE, types_1.SignalType.URL], [types_1.PrivacyLevel.HASHED, types_1.PrivacyLevel.AGGREGATE_ONLY], 30);
            (0, vitest_1.expect)(agreement).toBeDefined();
            (0, vitest_1.expect)(agreement.id).toBeDefined();
            (0, vitest_1.expect)(agreement.participantIds).toContain('org-a');
            (0, vitest_1.expect)(agreement.participantIds).toContain('org-b');
            (0, vitest_1.expect)(agreement.signalTypes).toContain(types_1.SignalType.NARRATIVE);
        });
        (0, vitest_1.it)('should validate signal sharing against agreements', async () => {
            await federationService.registerParticipant('sender', 'key-1', ['SIGNAL_SHARING']);
            await federationService.registerParticipant('receiver', 'key-2', ['SIGNAL_SHARING']);
            await federationService.createSharingAgreement(['sender', 'receiver'], [types_1.SignalType.NARRATIVE], [types_1.PrivacyLevel.HASHED], 30);
            const signal = createMockSignal({
                sourceParticipantId: 'sender',
                signalType: types_1.SignalType.NARRATIVE,
                privacyLevel: types_1.PrivacyLevel.HASHED,
            });
            const canShare = federationService.canShareSignal(signal, 'receiver');
            (0, vitest_1.expect)(canShare).toBe(true);
        });
        (0, vitest_1.it)('should reject sharing without valid agreement', async () => {
            const signal = createMockSignal({
                sourceParticipantId: 'unknown-sender',
                signalType: types_1.SignalType.NARRATIVE,
            });
            const canShare = federationService.canShareSignal(signal, 'unknown-receiver');
            (0, vitest_1.expect)(canShare).toBe(false);
        });
    });
    (0, vitest_1.describe)('signal submission', () => {
        (0, vitest_1.it)('should submit a signal to the federation', async () => {
            const signal = createMockSignal();
            const result = await federationService.submitSignal(signal);
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.federatedSignalId).toBeDefined();
        });
        (0, vitest_1.it)('should track submitted signals', async () => {
            const signal = createMockSignal();
            await federationService.submitSignal(signal);
            const signals = federationService.getSubmittedSignals();
            (0, vitest_1.expect)(signals.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('privacy budget', () => {
        (0, vitest_1.it)('should track privacy budget consumption', async () => {
            const initialBudget = federationService.getPrivacyBudgetStatus();
            // Submit signals to consume budget
            for (let i = 0; i < 5; i++) {
                await federationService.submitSignal(createMockSignal());
            }
            const afterBudget = federationService.getPrivacyBudgetStatus();
            (0, vitest_1.expect)(afterBudget.consumed).toBeGreaterThan(initialBudget.consumed);
            (0, vitest_1.expect)(afterBudget.remaining).toBeLessThan(initialBudget.remaining);
        });
        (0, vitest_1.it)('should refuse operations when budget is exhausted', async () => {
            // Create a service with very low budget
            const lowBudgetService = new FederationService_1.FederationService({
                participantId: 'low-budget',
                organizationId: 'org',
                epsilon: 0.001, // Very low budget
                delta: 1e-6,
                minParticipantsForAggregation: 3,
                enableSecureAggregation: true,
                maxBudgetPerWindow: 0.001,
            });
            // Exhaust budget
            await lowBudgetService.submitSignal(createMockSignal());
            const status = lowBudgetService.getPrivacyBudgetStatus();
            // Budget should be nearly exhausted
            (0, vitest_1.expect)(status.remaining).toBeLessThanOrEqual(0.001);
        });
    });
    (0, vitest_1.describe)('secure aggregation', () => {
        (0, vitest_1.it)('should initiate secure aggregation session', async () => {
            // Register required participants
            await federationService.registerParticipant('agg-1', 'key-1', ['AGGREGATION']);
            await federationService.registerParticipant('agg-2', 'key-2', ['AGGREGATION']);
            await federationService.registerParticipant('agg-3', 'key-3', ['AGGREGATION']);
            const session = await federationService.initiateSecureAggregation('SUM', ['agg-1', 'agg-2', 'agg-3']);
            (0, vitest_1.expect)(session).toBeDefined();
            (0, vitest_1.expect)(session.sessionId).toBeDefined();
            (0, vitest_1.expect)(session.status).toBe('INITIATED');
        });
        (0, vitest_1.it)('should require minimum participants for aggregation', async () => {
            await federationService.registerParticipant('solo-1', 'key-1', ['AGGREGATION']);
            await (0, vitest_1.expect)(federationService.initiateSecureAggregation('SUM', ['solo-1'])).rejects.toThrow();
        });
    });
    (0, vitest_1.describe)('aggregated stats', () => {
        (0, vitest_1.it)('should query aggregated stats with differential privacy', async () => {
            // Submit some signals first
            for (let i = 0; i < 10; i++) {
                await federationService.submitSignal(createMockSignal());
            }
            const stats = await federationService.queryAggregatedStats(types_1.SignalType.NARRATIVE, 24);
            (0, vitest_1.expect)(stats).toBeDefined();
            (0, vitest_1.expect)(stats.count).toBeDefined();
            (0, vitest_1.expect)(stats.noiseAdded).toBe(true); // DP noise should be added
        });
    });
    (0, vitest_1.describe)('differential privacy', () => {
        (0, vitest_1.it)('should add noise to aggregated counts', async () => {
            const counts = [];
            // Query same data multiple times
            for (let i = 0; i < 10; i++) {
                const stats = await federationService.queryAggregatedStats(types_1.SignalType.NARRATIVE, 24);
                counts.push(stats.count);
            }
            // With DP, counts should vary (noise added)
            const uniqueCounts = new Set(counts);
            (0, vitest_1.expect)(uniqueCounts.size).toBeGreaterThan(1);
        });
    });
    (0, vitest_1.describe)('cross-tenant operations', () => {
        (0, vitest_1.it)('should perform private set intersection', async () => {
            // This is a stub test for the MPC-style operation
            const result = await federationService.privateSetIntersection(['hash1', 'hash2', 'hash3'], ['hash2', 'hash3', 'hash4']);
            (0, vitest_1.expect)(result.intersectionSize).toBeDefined();
            (0, vitest_1.expect)(result.intersectionSize).toBeGreaterThanOrEqual(0);
        });
        (0, vitest_1.it)('should compute private cosine similarity', async () => {
            const embedding1 = Array(768).fill(0).map(() => Math.random());
            const embedding2 = Array(768).fill(0).map(() => Math.random());
            const result = await federationService.privateCosineSimilarity(embedding1, embedding2);
            (0, vitest_1.expect)(result.similarity).toBeDefined();
            (0, vitest_1.expect)(result.similarity).toBeGreaterThanOrEqual(-1);
            (0, vitest_1.expect)(result.similarity).toBeLessThanOrEqual(1);
        });
    });
});
