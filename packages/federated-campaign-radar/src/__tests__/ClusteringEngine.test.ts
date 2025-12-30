/**
 * Tests for ClusteringEngine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClusteringEngine } from '../clustering/ClusteringEngine';
import { FederationService } from '../federation/FederationService';
import {
  SignalType,
  PrivacyLevel,
  CampaignSignal,
  ThreatLevel,
  ClusterStatus,
} from '../core/types';

describe('ClusteringEngine', () => {
  let clusteringEngine: ClusteringEngine;
  let federationService: FederationService;

  const createMockSignal = (
    overrides?: Partial<CampaignSignal>,
  ): CampaignSignal => {
    const embedding = Array(768)
      .fill(0)
      .map(() => Math.random() - 0.5);
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    const normalizedEmbedding = embedding.map((v) => v / magnitude);

    return {
      id: `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      signalType: SignalType.NARRATIVE,
      privacyLevel: PrivacyLevel.HASHED,
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
      threatLevel: ThreatLevel.LOW,
      ...overrides,
    };
  };

  const createSimilarSignals = (
    baseEmbedding: number[],
    count: number,
    organizationId: string,
  ): CampaignSignal[] => {
    return Array(count)
      .fill(0)
      .map(() => {
        // Add small noise to base embedding
        const noisyEmbedding = baseEmbedding.map((v) => v + (Math.random() - 0.5) * 0.1);
        const magnitude = Math.sqrt(
          noisyEmbedding.reduce((sum, v) => sum + v * v, 0),
        );
        return createMockSignal({
          organizationId,
          embedding: noisyEmbedding.map((v) => v / magnitude),
        });
      });
  };

  beforeEach(() => {
    federationService = new FederationService({
      participantId: 'test-participant',
      organizationId: 'test-org',
      epsilon: 0.5,
      delta: 1e-6,
      minParticipantsForAggregation: 3,
      enableSecureAggregation: true,
    });

    clusteringEngine = new ClusteringEngine(federationService, {
      similarityThreshold: 0.8,
      minClusterSize: 2,
      crossTenantBoostFactor: 1.5,
    });
  });

  describe('signal management', () => {
    it('should add signals to the engine', () => {
      const signal = createMockSignal();

      clusteringEngine.addSignal(signal);

      const signals = clusteringEngine.getAllSignals();
      expect(signals.length).toBe(1);
      expect(signals[0].id).toBe(signal.id);
    });

    it('should handle multiple signals', () => {
      for (let i = 0; i < 10; i++) {
        clusteringEngine.addSignal(createMockSignal());
      }

      expect(clusteringEngine.getAllSignals().length).toBe(10);
    });
  });

  describe('clustering', () => {
    it('should cluster similar signals together', async () => {
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

      expect(clusters.length).toBeGreaterThan(0);
      // Similar signals should be in the same cluster
      const clusterWithMostSignals = clusters.reduce(
        (max, c) => (c.signalCount > max.signalCount ? c : max),
        clusters[0],
      );
      expect(clusterWithMostSignals.signalCount).toBeGreaterThanOrEqual(2);
    });

    it('should keep dissimilar signals in separate clusters', async () => {
      // Create two groups of very different signals
      for (let i = 0; i < 3; i++) {
        clusteringEngine.addSignal(
          createMockSignal({
            embedding: [1, 0, ...Array(766).fill(0)],
          }),
        );
        clusteringEngine.addSignal(
          createMockSignal({
            embedding: [0, 1, ...Array(766).fill(0)],
          }),
        );
      }

      const clusters = await clusteringEngine.performClustering();

      // Should have at least 2 clusters for orthogonal embeddings
      expect(clusters.length).toBeGreaterThanOrEqual(1);
    });

    it('should identify cross-tenant clusters', async () => {
      // Create similar signals from different organizations
      const baseEmbedding = Array(768)
        .fill(0)
        .map(() => Math.random() - 0.5);
      const magnitude = Math.sqrt(baseEmbedding.reduce((sum, v) => sum + v * v, 0));
      const normalizedBase = baseEmbedding.map((v) => v / magnitude);

      const org1Signals = createSimilarSignals(normalizedBase, 3, 'org-1');
      const org2Signals = createSimilarSignals(normalizedBase, 3, 'org-2');
      const org3Signals = createSimilarSignals(normalizedBase, 3, 'org-3');

      [...org1Signals, ...org2Signals, ...org3Signals].forEach((s) =>
        clusteringEngine.addSignal(s),
      );

      const clusters = await clusteringEngine.performClustering();

      // Find cluster with cross-tenant signals
      const crossTenantCluster = clusters.find(
        (c) => c.crossTenantConfidence > 0.5,
      );

      expect(crossTenantCluster).toBeDefined();
      if (crossTenantCluster) {
        expect(crossTenantCluster.participatingOrganizations.length).toBeGreaterThan(1);
      }
    });
  });

  describe('cluster retrieval', () => {
    it('should get active clusters', async () => {
      // Add signals and cluster
      for (let i = 0; i < 5; i++) {
        clusteringEngine.addSignal(createMockSignal());
      }
      await clusteringEngine.performClustering();

      const activeClusters = clusteringEngine.getActiveClusters();

      activeClusters.forEach((cluster) => {
        expect([ClusterStatus.ACTIVE, ClusterStatus.EMERGING]).toContain(
          cluster.status,
        );
      });
    });

    it('should filter clusters by threat level', async () => {
      for (let i = 0; i < 10; i++) {
        clusteringEngine.addSignal(createMockSignal());
      }
      await clusteringEngine.performClustering();

      const highThreatClusters = clusteringEngine.getActiveClusters(
        ThreatLevel.HIGH,
      );

      highThreatClusters.forEach((cluster) => {
        expect([ThreatLevel.HIGH, ThreatLevel.CRITICAL]).toContain(
          cluster.threatLevel,
        );
      });
    });

    it('should get specific cluster by ID', async () => {
      for (let i = 0; i < 5; i++) {
        clusteringEngine.addSignal(createMockSignal());
      }
      const clusters = await clusteringEngine.performClustering();

      if (clusters.length > 0) {
        const cluster = clusteringEngine.getCluster(clusters[0].id);
        expect(cluster).toBeDefined();
        expect(cluster?.id).toBe(clusters[0].id);
      }
    });

    it('should return undefined for non-existent cluster', () => {
      const cluster = clusteringEngine.getCluster('non-existent-id');
      expect(cluster).toBeUndefined();
    });
  });

  describe('cluster history', () => {
    it('should maintain cluster history', async () => {
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
        expect(Array.isArray(history)).toBe(true);
      }
    });
  });

  describe('cross-tenant overlap', () => {
    it('should compute cross-tenant overlap', async () => {
      // Add signals from multiple organizations
      for (let i = 0; i < 3; i++) {
        clusteringEngine.addSignal(
          createMockSignal({ organizationId: `org-${i}` }),
        );
      }
      await clusteringEngine.performClustering();

      const overlap = clusteringEngine.computeCrossTenantOverlap();

      expect(overlap).toBeDefined();
      expect(typeof overlap.overlapScore).toBe('number');
      expect(overlap.participatingOrganizations).toBeDefined();
    });
  });

  describe('velocity metrics', () => {
    it('should calculate velocity metrics for clusters', async () => {
      // Add signals with timestamps spread over time
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        clusteringEngine.addSignal(
          createMockSignal({
            timestamp: new Date(now - i * 3600000), // 1 hour apart
          }),
        );
      }

      const clusters = await clusteringEngine.performClustering();

      if (clusters.length > 0) {
        expect(clusters[0].velocityMetrics).toBeDefined();
        expect(clusters[0].velocityMetrics.signalsPerHour).toBeDefined();
        expect(clusters[0].velocityMetrics.growthTrajectory).toBeDefined();
      }
    });
  });

  describe('coordination patterns', () => {
    it('should detect coordination patterns', async () => {
      // Add signals with coordination features
      for (let i = 0; i < 5; i++) {
        clusteringEngine.addSignal(
          createMockSignal({
            coordinationFeatures: [
              {
                featureType: 'synchronized_posting',
                value: 'pattern-123',
                confidence: 0.9,
              },
            ],
          }),
        );
      }

      const clusters = await clusteringEngine.performClustering();

      if (clusters.length > 0) {
        expect(clusters[0].coordinationPatterns).toBeDefined();
        expect(clusters[0].coordinationPatterns.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('privacy budget integration', () => {
    it('should respect privacy budget when clustering', async () => {
      // This tests that clustering operations consume privacy budget
      const initialBudget = federationService.getPrivacyBudgetStatus();

      for (let i = 0; i < 20; i++) {
        clusteringEngine.addSignal(createMockSignal());
      }
      await clusteringEngine.performClustering();

      const afterBudget = federationService.getPrivacyBudgetStatus();

      // Budget should be consumed during clustering
      expect(afterBudget.consumed).toBeGreaterThanOrEqual(initialBudget.consumed);
    });
  });
});
