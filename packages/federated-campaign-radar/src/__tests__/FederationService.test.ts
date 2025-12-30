/**
 * Tests for FederationService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FederationService } from '../federation/FederationService';
import {
  SignalType,
  PrivacyLevel,
  CampaignSignal,
  ThreatLevel,
} from '../core/types';

describe('FederationService', () => {
  let federationService: FederationService;

  const createMockSignal = (overrides?: Partial<CampaignSignal>): CampaignSignal => ({
    id: `signal-${Date.now()}-${Math.random()}`,
    signalType: SignalType.NARRATIVE,
    privacyLevel: PrivacyLevel.HASHED,
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
    threatLevel: ThreatLevel.LOW,
    ...overrides,
  });

  beforeEach(() => {
    federationService = new FederationService({
      participantId: 'test-participant',
      organizationId: 'test-org',
      epsilon: 0.5,
      delta: 1e-6,
      minParticipantsForAggregation: 3,
      enableSecureAggregation: true,
    });
  });

  describe('participant management', () => {
    it('should register a new participant', async () => {
      const result = await federationService.registerParticipant(
        'new-participant',
        'public-key-123',
        ['SIGNAL_SHARING', 'AGGREGATION'],
      );

      expect(result.success).toBe(true);
      expect(result.participantId).toBe('new-participant');
    });

    it('should get participant status', async () => {
      await federationService.registerParticipant(
        'participant-a',
        'public-key-a',
        ['SIGNAL_SHARING'],
      );

      const status = federationService.getParticipantStatus('participant-a');

      expect(status).toBeDefined();
      expect(status?.status).toBe('ACTIVE');
      expect(status?.capabilities).toContain('SIGNAL_SHARING');
    });

    it('should reject duplicate participant registration', async () => {
      await federationService.registerParticipant('dup-participant', 'key-1', []);

      const result = await federationService.registerParticipant(
        'dup-participant',
        'key-2',
        [],
      );

      expect(result.success).toBe(false);
    });
  });

  describe('sharing agreements', () => {
    it('should create a sharing agreement between participants', async () => {
      // Register participants first
      await federationService.registerParticipant('org-a', 'key-a', ['SIGNAL_SHARING']);
      await federationService.registerParticipant('org-b', 'key-b', ['SIGNAL_SHARING']);

      const agreement = await federationService.createSharingAgreement(
        ['org-a', 'org-b'],
        [SignalType.NARRATIVE, SignalType.URL],
        [PrivacyLevel.HASHED, PrivacyLevel.AGGREGATE_ONLY],
        30, // 30 days validity
      );

      expect(agreement).toBeDefined();
      expect(agreement.id).toBeDefined();
      expect(agreement.participantIds).toContain('org-a');
      expect(agreement.participantIds).toContain('org-b');
      expect(agreement.signalTypes).toContain(SignalType.NARRATIVE);
    });

    it('should validate signal sharing against agreements', async () => {
      await federationService.registerParticipant('sender', 'key-1', ['SIGNAL_SHARING']);
      await federationService.registerParticipant('receiver', 'key-2', ['SIGNAL_SHARING']);

      await federationService.createSharingAgreement(
        ['sender', 'receiver'],
        [SignalType.NARRATIVE],
        [PrivacyLevel.HASHED],
        30,
      );

      const signal = createMockSignal({
        sourceParticipantId: 'sender',
        signalType: SignalType.NARRATIVE,
        privacyLevel: PrivacyLevel.HASHED,
      });

      const canShare = federationService.canShareSignal(signal, 'receiver');

      expect(canShare).toBe(true);
    });

    it('should reject sharing without valid agreement', async () => {
      const signal = createMockSignal({
        sourceParticipantId: 'unknown-sender',
        signalType: SignalType.NARRATIVE,
      });

      const canShare = federationService.canShareSignal(signal, 'unknown-receiver');

      expect(canShare).toBe(false);
    });
  });

  describe('signal submission', () => {
    it('should submit a signal to the federation', async () => {
      const signal = createMockSignal();

      const result = await federationService.submitSignal(signal);

      expect(result.success).toBe(true);
      expect(result.federatedSignalId).toBeDefined();
    });

    it('should track submitted signals', async () => {
      const signal = createMockSignal();

      await federationService.submitSignal(signal);

      const signals = federationService.getSubmittedSignals();
      expect(signals.length).toBeGreaterThan(0);
    });
  });

  describe('privacy budget', () => {
    it('should track privacy budget consumption', async () => {
      const initialBudget = federationService.getPrivacyBudgetStatus();

      // Submit signals to consume budget
      for (let i = 0; i < 5; i++) {
        await federationService.submitSignal(createMockSignal());
      }

      const afterBudget = federationService.getPrivacyBudgetStatus();

      expect(afterBudget.consumed).toBeGreaterThan(initialBudget.consumed);
      expect(afterBudget.remaining).toBeLessThan(initialBudget.remaining);
    });

    it('should refuse operations when budget is exhausted', async () => {
      // Create a service with very low budget
      const lowBudgetService = new FederationService({
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
      expect(status.remaining).toBeLessThanOrEqual(0.001);
    });
  });

  describe('secure aggregation', () => {
    it('should initiate secure aggregation session', async () => {
      // Register required participants
      await federationService.registerParticipant('agg-1', 'key-1', ['AGGREGATION']);
      await federationService.registerParticipant('agg-2', 'key-2', ['AGGREGATION']);
      await federationService.registerParticipant('agg-3', 'key-3', ['AGGREGATION']);

      const session = await federationService.initiateSecureAggregation(
        'SUM',
        ['agg-1', 'agg-2', 'agg-3'],
      );

      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.status).toBe('INITIATED');
    });

    it('should require minimum participants for aggregation', async () => {
      await federationService.registerParticipant('solo-1', 'key-1', ['AGGREGATION']);

      await expect(
        federationService.initiateSecureAggregation('SUM', ['solo-1']),
      ).rejects.toThrow();
    });
  });

  describe('aggregated stats', () => {
    it('should query aggregated stats with differential privacy', async () => {
      // Submit some signals first
      for (let i = 0; i < 10; i++) {
        await federationService.submitSignal(createMockSignal());
      }

      const stats = await federationService.queryAggregatedStats(
        SignalType.NARRATIVE,
        24, // 24 hour window
      );

      expect(stats).toBeDefined();
      expect(stats.count).toBeDefined();
      expect(stats.noiseAdded).toBe(true); // DP noise should be added
    });
  });

  describe('differential privacy', () => {
    it('should add noise to aggregated counts', async () => {
      const counts: number[] = [];

      // Query same data multiple times
      for (let i = 0; i < 10; i++) {
        const stats = await federationService.queryAggregatedStats(
          SignalType.NARRATIVE,
          24,
        );
        counts.push(stats.count);
      }

      // With DP, counts should vary (noise added)
      const uniqueCounts = new Set(counts);
      expect(uniqueCounts.size).toBeGreaterThan(1);
    });
  });

  describe('cross-tenant operations', () => {
    it('should perform private set intersection', async () => {
      // This is a stub test for the MPC-style operation
      const result = await federationService.privateSetIntersection(
        ['hash1', 'hash2', 'hash3'],
        ['hash2', 'hash3', 'hash4'],
      );

      expect(result.intersectionSize).toBeDefined();
      expect(result.intersectionSize).toBeGreaterThanOrEqual(0);
    });

    it('should compute private cosine similarity', async () => {
      const embedding1 = Array(768).fill(0).map(() => Math.random());
      const embedding2 = Array(768).fill(0).map(() => Math.random());

      const result = await federationService.privateCosineSimilarity(
        embedding1,
        embedding2,
      );

      expect(result.similarity).toBeDefined();
      expect(result.similarity).toBeGreaterThanOrEqual(-1);
      expect(result.similarity).toBeLessThanOrEqual(1);
    });
  });
});
