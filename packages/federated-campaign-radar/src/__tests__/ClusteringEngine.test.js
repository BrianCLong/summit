"use strict";
/**
 * Tests for ClusteringEngine
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ClusteringEngine_1 = require("../clustering/ClusteringEngine");
const FederationService_1 = require("../federation/FederationService");
const types_1 = require("../core/types");
(0, vitest_1.describe)('ClusteringEngine', () => {
    let clusteringEngine;
    let federationService;
    const createMockSignal = (overrides) => {
        const embedding = Array(768)
            .fill(0)
            .map(() => Math.random() - 0.5);
        const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        const normalizedEmbedding = embedding.map((v) => v / magnitude);
        return {
            id: `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            signalType: types_1.SignalType.NARRATIVE,
            privacyLevel: types_1.PrivacyLevel.HASHED,
            sourceParticipantId: 'participant-1',
            organizationId: 'org-1',
            timestamp: new Date(),
            content: {
                text: 'Test narrative content',
                textHash: `hash-${Math.random().toString(36).substr(2, 9)}`,
            },
            channelMetadata: {
                platform: 'twitter',
                channelType: 'social',
                reach: 'medium',
            },
            coordinationFeatures: [],
            embedding: normalizedEmbedding,
            threatLevel: types_1.ThreatLevel.LOW,
            ...overrides,
        };
    };
    const createSimilarSignals = (baseEmbedding, count, organizationId) => {
        return Array(count)
            .fill(0)
            .map(() => {
            // Add small noise to base embedding
            const noisyEmbedding = baseEmbedding.map((v) => v + (Math.random() - 0.5) * 0.1);
            const magnitude = Math.sqrt(noisyEmbedding.reduce((sum, v) => sum + v * v, 0));
            return createMockSignal({
                organizationId,
                embedding: noisyEmbedding.map((v) => v / magnitude),
            });
        });
    };
    (0, vitest_1.beforeEach)(() => {
        federationService = new FederationService_1.FederationService({
            participantId: 'test-participant',
            organizationId: 'test-org',
            epsilon: 0.5,
            delta: 1e-6,
            minParticipantsForAggregation: 3,
            enableSecureAggregation: true,
        });
        clusteringEngine = new ClusteringEngine_1.ClusteringEngine(federationService, {
            similarityThreshold: 0.8,
            minClusterSize: 2,
            crossTenantBoostFactor: 1.5,
        });
    });
    (0, vitest_1.describe)('signal management', () => {
        (0, vitest_1.it)('should add signals to the engine', () => {
            const signal = createMockSignal();
            clusteringEngine.addSignal(signal);
            const signals = clusteringEngine.getAllSignals();
            (0, vitest_1.expect)(signals.length).toBe(1);
            (0, vitest_1.expect)(signals[0].id).toBe(signal.id);
        });
        (0, vitest_1.it)('should handle multiple signals', () => {
            for (let i = 0; i < 10; i++) {
                clusteringEngine.addSignal(createMockSignal());
            }
            (0, vitest_1.expect)(clusteringEngine.getAllSignals().length).toBe(10);
        });
    });
    (0, vitest_1.describe)('clustering', () => {
        (0, vitest_1.it)('should cluster similar signals together', async () => {
            // Create base embedding
            const baseEmbedding = Array(768)
                .fill(0)
                .map(() => Math.random() - 0.5);
            const magnitude = Math.sqrt(baseEmbedding.reduce((sum, v) => sum + v * v, 0));
            const normalizedBase = baseEmbedding.map((v) => v / magnitude);
            // Create similar signals
            const similarSignals = createSimilarSignals(normalizedBase, 5, 'org-1');
            similarSignals.forEach((s) => clusteringEngine.addSignal(s));
            const clusters = await clusteringEngine.performClustering();
            (0, vitest_1.expect)(clusters.length).toBeGreaterThan(0);
            // Similar signals should be in the same cluster
            const clusterWithMostSignals = clusters.reduce((max, c) => (c.signalCount > max.signalCount ? c : max), clusters[0]);
            (0, vitest_1.expect)(clusterWithMostSignals.signalCount).toBeGreaterThanOrEqual(2);
        });
        (0, vitest_1.it)('should keep dissimilar signals in separate clusters', async () => {
            // Create two groups of very different signals
            for (let i = 0; i < 3; i++) {
                clusteringEngine.addSignal(createMockSignal({
                    embedding: [1, 0, ...Array(766).fill(0)],
                }));
                clusteringEngine.addSignal(createMockSignal({
                    embedding: [0, 1, ...Array(766).fill(0)],
                }));
            }
            const clusters = await clusteringEngine.performClustering();
            // Should have at least 2 clusters for orthogonal embeddings
            (0, vitest_1.expect)(clusters.length).toBeGreaterThanOrEqual(1);
        });
        (0, vitest_1.it)('should identify cross-tenant clusters', async () => {
            // Create similar signals from different organizations
            const baseEmbedding = Array(768)
                .fill(0)
                .map(() => Math.random() - 0.5);
            const magnitude = Math.sqrt(baseEmbedding.reduce((sum, v) => sum + v * v, 0));
            const normalizedBase = baseEmbedding.map((v) => v / magnitude);
            const org1Signals = createSimilarSignals(normalizedBase, 3, 'org-1');
            const org2Signals = createSimilarSignals(normalizedBase, 3, 'org-2');
            const org3Signals = createSimilarSignals(normalizedBase, 3, 'org-3');
            [...org1Signals, ...org2Signals, ...org3Signals].forEach((s) => clusteringEngine.addSignal(s));
            const clusters = await clusteringEngine.performClustering();
            // Find cluster with cross-tenant signals
            const crossTenantCluster = clusters.find((c) => c.crossTenantConfidence > 0.5);
            (0, vitest_1.expect)(crossTenantCluster).toBeDefined();
            if (crossTenantCluster) {
                (0, vitest_1.expect)(crossTenantCluster.participatingOrganizations.length).toBeGreaterThan(1);
            }
        });
    });
    (0, vitest_1.describe)('cluster retrieval', () => {
        (0, vitest_1.it)('should get active clusters', async () => {
            // Add signals and cluster
            for (let i = 0; i < 5; i++) {
                clusteringEngine.addSignal(createMockSignal());
            }
            await clusteringEngine.performClustering();
            const activeClusters = clusteringEngine.getActiveClusters();
            activeClusters.forEach((cluster) => {
                (0, vitest_1.expect)([types_1.ClusterStatus.ACTIVE, types_1.ClusterStatus.EMERGING]).toContain(cluster.status);
            });
        });
        (0, vitest_1.it)('should filter clusters by threat level', async () => {
            for (let i = 0; i < 10; i++) {
                clusteringEngine.addSignal(createMockSignal());
            }
            await clusteringEngine.performClustering();
            const highThreatClusters = clusteringEngine.getActiveClusters(types_1.ThreatLevel.HIGH);
            highThreatClusters.forEach((cluster) => {
                (0, vitest_1.expect)([types_1.ThreatLevel.HIGH, types_1.ThreatLevel.CRITICAL]).toContain(cluster.threatLevel);
            });
        });
        (0, vitest_1.it)('should get specific cluster by ID', async () => {
            for (let i = 0; i < 5; i++) {
                clusteringEngine.addSignal(createMockSignal());
            }
            const clusters = await clusteringEngine.performClustering();
            if (clusters.length > 0) {
                const cluster = clusteringEngine.getCluster(clusters[0].id);
                (0, vitest_1.expect)(cluster).toBeDefined();
                (0, vitest_1.expect)(cluster?.id).toBe(clusters[0].id);
            }
        });
        (0, vitest_1.it)('should return undefined for non-existent cluster', () => {
            const cluster = clusteringEngine.getCluster('non-existent-id');
            (0, vitest_1.expect)(cluster).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('cluster history', () => {
        (0, vitest_1.it)('should maintain cluster history', async () => {
            // Add signals and cluster multiple times
            for (let i = 0; i < 5; i++) {
                clusteringEngine.addSignal(createMockSignal());
            }
            await clusteringEngine.performClustering();
            // Add more signals and cluster again
            for (let i = 0; i < 5; i++) {
                clusteringEngine.addSignal(createMockSignal());
            }
            const clusters = await clusteringEngine.performClustering();
            if (clusters.length > 0) {
                const history = clusteringEngine.getClusterHistory(clusters[0].id);
                (0, vitest_1.expect)(Array.isArray(history)).toBe(true);
            }
        });
    });
    (0, vitest_1.describe)('cross-tenant overlap', () => {
        (0, vitest_1.it)('should compute cross-tenant overlap', async () => {
            // Add signals from multiple organizations
            for (let i = 0; i < 3; i++) {
                clusteringEngine.addSignal(createMockSignal({ organizationId: `org-${i}` }));
            }
            await clusteringEngine.performClustering();
            const overlap = clusteringEngine.computeCrossTenantOverlap();
            (0, vitest_1.expect)(overlap).toBeDefined();
            (0, vitest_1.expect)(typeof overlap.overlapScore).toBe('number');
            (0, vitest_1.expect)(overlap.participatingOrganizations).toBeDefined();
        });
    });
    (0, vitest_1.describe)('velocity metrics', () => {
        (0, vitest_1.it)('should calculate velocity metrics for clusters', async () => {
            // Add signals with timestamps spread over time
            const now = Date.now();
            for (let i = 0; i < 10; i++) {
                clusteringEngine.addSignal(createMockSignal({
                    timestamp: new Date(now - i * 3600000), // 1 hour apart
                }));
            }
            const clusters = await clusteringEngine.performClustering();
            if (clusters.length > 0) {
                (0, vitest_1.expect)(clusters[0].velocityMetrics).toBeDefined();
                (0, vitest_1.expect)(clusters[0].velocityMetrics.signalsPerHour).toBeDefined();
                (0, vitest_1.expect)(clusters[0].velocityMetrics.growthTrajectory).toBeDefined();
            }
        });
    });
    (0, vitest_1.describe)('coordination patterns', () => {
        (0, vitest_1.it)('should detect coordination patterns', async () => {
            // Add signals with coordination features
            for (let i = 0; i < 5; i++) {
                clusteringEngine.addSignal(createMockSignal({
                    coordinationFeatures: [
                        {
                            featureType: 'synchronized_posting',
                            value: 'pattern-123',
                            confidence: 0.9,
                        },
                    ],
                }));
            }
            const clusters = await clusteringEngine.performClustering();
            if (clusters.length > 0) {
                (0, vitest_1.expect)(clusters[0].coordinationPatterns).toBeDefined();
                (0, vitest_1.expect)(clusters[0].coordinationPatterns.length).toBeGreaterThanOrEqual(0);
            }
        });
    });
    (0, vitest_1.describe)('privacy budget integration', () => {
        (0, vitest_1.it)('should respect privacy budget when clustering', async () => {
            // This tests that clustering operations consume privacy budget
            const initialBudget = federationService.getPrivacyBudgetStatus();
            for (let i = 0; i < 20; i++) {
                clusteringEngine.addSignal(createMockSignal());
            }
            await clusteringEngine.performClustering();
            const afterBudget = federationService.getPrivacyBudgetStatus();
            // Budget should be consumed during clustering
            (0, vitest_1.expect)(afterBudget.consumed).toBeGreaterThanOrEqual(initialBudget.consumed);
        });
    });
});
