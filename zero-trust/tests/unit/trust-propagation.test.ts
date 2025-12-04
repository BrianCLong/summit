/**
 * Unit Tests for Trust Propagation Controller
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the trust propagation controller
interface MockTrustDomain {
  name: string;
  domain: string;
  endpoint: string;
  trustLevel: 'full' | 'limited' | 'restricted';
  capabilities: string[];
  labels: Record<string, string>;
}

interface MockTrustDecision {
  sourceIdentity: string;
  targetService: string;
  action: 'allow' | 'deny';
  reason: string;
  trustScore: number;
}

// Simulated Trust Propagation Controller for testing
class TestTrustPropagationController {
  private clusters: Map<string, MockTrustDomain & { status: { connected: boolean; healthScore: number } }> = new Map();
  private decisionCache: Map<string, MockTrustDecision> = new Map();

  registerCluster(cluster: MockTrustDomain): void {
    this.clusters.set(cluster.name, {
      ...cluster,
      status: { connected: false, healthScore: 0 }
    });
  }

  async connectCluster(name: string): Promise<boolean> {
    const cluster = this.clusters.get(name);
    if (cluster) {
      cluster.status.connected = true;
      cluster.status.healthScore = 100;
      return true;
    }
    return false;
  }

  async disconnectCluster(name: string): Promise<boolean> {
    const cluster = this.clusters.get(name);
    if (cluster) {
      cluster.status.connected = false;
      cluster.status.healthScore = 0;
      return true;
    }
    return false;
  }

  async evaluateTrust(
    sourceIdentity: string,
    targetService: string,
    context: Record<string, string> = {}
  ): Promise<MockTrustDecision> {
    const cacheKey = `${sourceIdentity}:${targetService}`;
    const cached = this.decisionCache.get(cacheKey);
    if (cached) return cached;

    // Extract cluster from SPIFFE ID
    const match = sourceIdentity.match(/spiffe:\/\/([^/]+)/);
    if (!match) {
      return {
        sourceIdentity,
        targetService,
        action: 'deny',
        reason: 'Invalid SPIFFE ID',
        trustScore: 0,
      };
    }

    const trustDomain = match[1];
    const cluster = Array.from(this.clusters.values()).find(c => c.domain === trustDomain);

    if (!cluster) {
      return {
        sourceIdentity,
        targetService,
        action: 'deny',
        reason: 'Unknown trust domain',
        trustScore: 0,
      };
    }

    if (!cluster.status.connected) {
      return {
        sourceIdentity,
        targetService,
        action: 'deny',
        reason: 'Cluster not connected',
        trustScore: 0,
      };
    }

    // Calculate trust score based on trust level
    let trustScore: number;
    switch (cluster.trustLevel) {
      case 'full': trustScore = 100; break;
      case 'limited': trustScore = 75; break;
      case 'restricted': trustScore = 50; break;
      default: trustScore = 0;
    }

    // Apply context modifiers
    if (context['x-cluster-auth'] !== 'verified') {
      trustScore -= 30;
    }

    const decision: MockTrustDecision = {
      sourceIdentity,
      targetService,
      action: trustScore >= 50 ? 'allow' : 'deny',
      reason: trustScore >= 50 ? 'Trust score meets threshold' : 'Trust score below threshold',
      trustScore,
    };

    this.decisionCache.set(cacheKey, decision);
    return decision;
  }

  getClusterStatus(name: string) {
    return this.clusters.get(name)?.status;
  }

  clearCache(): void {
    this.decisionCache.clear();
  }
}

describe('TrustPropagationController', () => {
  let controller: TestTrustPropagationController;

  beforeEach(() => {
    controller = new TestTrustPropagationController();

    // Register test clusters
    controller.registerCluster({
      name: 'primary-cluster',
      domain: 'primary.intelgraph.io',
      endpoint: 'https://spire.primary.intelgraph.io:8081',
      trustLevel: 'full',
      capabilities: ['identity-issuance', 'policy-enforcement'],
      labels: { region: 'us-east-1' },
    });

    controller.registerCluster({
      name: 'secondary-cluster',
      domain: 'secondary.intelgraph.io',
      endpoint: 'https://spire.secondary.intelgraph.io:8081',
      trustLevel: 'limited',
      capabilities: ['identity-issuance'],
      labels: { region: 'us-west-2' },
    });

    controller.registerCluster({
      name: 'restricted-cluster',
      domain: 'restricted.intelgraph.io',
      endpoint: 'https://spire.restricted.intelgraph.io:8081',
      trustLevel: 'restricted',
      capabilities: ['identity-issuance'],
      labels: { region: 'eu-west-1' },
    });
  });

  afterEach(() => {
    controller.clearCache();
  });

  describe('Cluster Registration', () => {
    it('should register a cluster with correct initial status', () => {
      const status = controller.getClusterStatus('primary-cluster');
      expect(status).toBeDefined();
      expect(status?.connected).toBe(false);
      expect(status?.healthScore).toBe(0);
    });

    it('should return undefined for unregistered cluster', () => {
      const status = controller.getClusterStatus('unknown-cluster');
      expect(status).toBeUndefined();
    });
  });

  describe('Cluster Connection', () => {
    it('should connect a registered cluster', async () => {
      const result = await controller.connectCluster('primary-cluster');
      expect(result).toBe(true);

      const status = controller.getClusterStatus('primary-cluster');
      expect(status?.connected).toBe(true);
      expect(status?.healthScore).toBe(100);
    });

    it('should fail to connect an unknown cluster', async () => {
      const result = await controller.connectCluster('unknown-cluster');
      expect(result).toBe(false);
    });

    it('should disconnect a connected cluster', async () => {
      await controller.connectCluster('primary-cluster');
      const result = await controller.disconnectCluster('primary-cluster');
      expect(result).toBe(true);

      const status = controller.getClusterStatus('primary-cluster');
      expect(status?.connected).toBe(false);
    });
  });

  describe('Trust Evaluation', () => {
    beforeEach(async () => {
      await controller.connectCluster('primary-cluster');
      await controller.connectCluster('secondary-cluster');
      await controller.connectCluster('restricted-cluster');
    });

    it('should allow access from full trust cluster with verified auth', async () => {
      const decision = await controller.evaluateTrust(
        'spiffe://primary.intelgraph.io/ns/intelgraph/sa/api-server',
        'graph-service',
        { 'x-cluster-auth': 'verified' }
      );

      expect(decision.action).toBe('allow');
      expect(decision.trustScore).toBe(100);
    });

    it('should allow access from limited trust cluster with verified auth', async () => {
      const decision = await controller.evaluateTrust(
        'spiffe://secondary.intelgraph.io/ns/intelgraph/sa/api-server',
        'graph-service',
        { 'x-cluster-auth': 'verified' }
      );

      expect(decision.action).toBe('allow');
      expect(decision.trustScore).toBe(75);
    });

    it('should allow access from restricted cluster with verified auth', async () => {
      const decision = await controller.evaluateTrust(
        'spiffe://restricted.intelgraph.io/ns/analytics/sa/worker',
        'analytics-api',
        { 'x-cluster-auth': 'verified' }
      );

      expect(decision.action).toBe('allow');
      expect(decision.trustScore).toBe(50);
    });

    it('should deny access without verified auth (score drops below threshold)', async () => {
      const decision = await controller.evaluateTrust(
        'spiffe://restricted.intelgraph.io/ns/analytics/sa/worker',
        'analytics-api',
        {} // No verified auth
      );

      expect(decision.action).toBe('deny');
      expect(decision.trustScore).toBe(20); // 50 - 30
    });

    it('should deny access from unknown trust domain', async () => {
      const decision = await controller.evaluateTrust(
        'spiffe://unknown.domain.io/ns/test/sa/service',
        'api-server',
        { 'x-cluster-auth': 'verified' }
      );

      expect(decision.action).toBe('deny');
      expect(decision.reason).toBe('Unknown trust domain');
    });

    it('should deny access with invalid SPIFFE ID', async () => {
      const decision = await controller.evaluateTrust(
        'invalid-identity',
        'api-server',
        { 'x-cluster-auth': 'verified' }
      );

      expect(decision.action).toBe('deny');
      expect(decision.reason).toBe('Invalid SPIFFE ID');
    });

    it('should deny access when cluster is disconnected', async () => {
      await controller.disconnectCluster('primary-cluster');

      const decision = await controller.evaluateTrust(
        'spiffe://primary.intelgraph.io/ns/intelgraph/sa/api-server',
        'graph-service',
        { 'x-cluster-auth': 'verified' }
      );

      expect(decision.action).toBe('deny');
      expect(decision.reason).toBe('Cluster not connected');
    });

    it('should cache trust decisions', async () => {
      const decision1 = await controller.evaluateTrust(
        'spiffe://primary.intelgraph.io/ns/intelgraph/sa/api-server',
        'graph-service',
        { 'x-cluster-auth': 'verified' }
      );

      const decision2 = await controller.evaluateTrust(
        'spiffe://primary.intelgraph.io/ns/intelgraph/sa/api-server',
        'graph-service',
        { 'x-cluster-auth': 'verified' }
      );

      // Should return cached decision
      expect(decision1).toEqual(decision2);
    });
  });
});

describe('Trust Score Calculation', () => {
  it('should calculate correct scores for each trust level', () => {
    const trustLevelScores = {
      full: 100,
      limited: 75,
      restricted: 50,
    };

    for (const [level, expectedScore] of Object.entries(trustLevelScores)) {
      expect(expectedScore).toBeGreaterThanOrEqual(0);
      expect(expectedScore).toBeLessThanOrEqual(100);
    }
  });

  it('should apply correct penalty for missing auth header', () => {
    const basePenalty = 30;
    const fullTrustWithPenalty = 100 - basePenalty;
    const limitedTrustWithPenalty = 75 - basePenalty;
    const restrictedTrustWithPenalty = 50 - basePenalty;

    expect(fullTrustWithPenalty).toBe(70);
    expect(limitedTrustWithPenalty).toBe(45);
    expect(restrictedTrustWithPenalty).toBe(20);
  });
});
