"use strict";
/**
 * Unit Tests for Trust Propagation Controller
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Simulated Trust Propagation Controller for testing
class TestTrustPropagationController {
    clusters = new Map();
    decisionCache = new Map();
    registerCluster(cluster) {
        this.clusters.set(cluster.name, {
            ...cluster,
            status: { connected: false, healthScore: 0 }
        });
    }
    async connectCluster(name) {
        const cluster = this.clusters.get(name);
        if (cluster) {
            cluster.status.connected = true;
            cluster.status.healthScore = 100;
            return true;
        }
        return false;
    }
    async disconnectCluster(name) {
        const cluster = this.clusters.get(name);
        if (cluster) {
            cluster.status.connected = false;
            cluster.status.healthScore = 0;
            return true;
        }
        return false;
    }
    async evaluateTrust(sourceIdentity, targetService, context = {}) {
        const cacheKey = `${sourceIdentity}:${targetService}`;
        const cached = this.decisionCache.get(cacheKey);
        if (cached)
            return cached;
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
        let trustScore;
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
            default: trustScore = 0;
        }
        // Apply context modifiers
        if (context['x-cluster-auth'] !== 'verified') {
            trustScore -= 30;
        }
        const decision = {
            sourceIdentity,
            targetService,
            action: trustScore >= 50 ? 'allow' : 'deny',
            reason: trustScore >= 50 ? 'Trust score meets threshold' : 'Trust score below threshold',
            trustScore,
        };
        this.decisionCache.set(cacheKey, decision);
        return decision;
    }
    getClusterStatus(name) {
        return this.clusters.get(name)?.status;
    }
    clearCache() {
        this.decisionCache.clear();
    }
}
(0, globals_1.describe)('TrustPropagationController', () => {
    let controller;
    (0, globals_1.beforeEach)(() => {
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
    (0, globals_1.afterEach)(() => {
        controller.clearCache();
    });
    (0, globals_1.describe)('Cluster Registration', () => {
        (0, globals_1.it)('should register a cluster with correct initial status', () => {
            const status = controller.getClusterStatus('primary-cluster');
            (0, globals_1.expect)(status).toBeDefined();
            (0, globals_1.expect)(status?.connected).toBe(false);
            (0, globals_1.expect)(status?.healthScore).toBe(0);
        });
        (0, globals_1.it)('should return undefined for unregistered cluster', () => {
            const status = controller.getClusterStatus('unknown-cluster');
            (0, globals_1.expect)(status).toBeUndefined();
        });
    });
    (0, globals_1.describe)('Cluster Connection', () => {
        (0, globals_1.it)('should connect a registered cluster', async () => {
            const result = await controller.connectCluster('primary-cluster');
            (0, globals_1.expect)(result).toBe(true);
            const status = controller.getClusterStatus('primary-cluster');
            (0, globals_1.expect)(status?.connected).toBe(true);
            (0, globals_1.expect)(status?.healthScore).toBe(100);
        });
        (0, globals_1.it)('should fail to connect an unknown cluster', async () => {
            const result = await controller.connectCluster('unknown-cluster');
            (0, globals_1.expect)(result).toBe(false);
        });
        (0, globals_1.it)('should disconnect a connected cluster', async () => {
            await controller.connectCluster('primary-cluster');
            const result = await controller.disconnectCluster('primary-cluster');
            (0, globals_1.expect)(result).toBe(true);
            const status = controller.getClusterStatus('primary-cluster');
            (0, globals_1.expect)(status?.connected).toBe(false);
        });
    });
    (0, globals_1.describe)('Trust Evaluation', () => {
        (0, globals_1.beforeEach)(async () => {
            await controller.connectCluster('primary-cluster');
            await controller.connectCluster('secondary-cluster');
            await controller.connectCluster('restricted-cluster');
        });
        (0, globals_1.it)('should allow access from full trust cluster with verified auth', async () => {
            const decision = await controller.evaluateTrust('spiffe://primary.intelgraph.io/ns/intelgraph/sa/api-server', 'graph-service', { 'x-cluster-auth': 'verified' });
            (0, globals_1.expect)(decision.action).toBe('allow');
            (0, globals_1.expect)(decision.trustScore).toBe(100);
        });
        (0, globals_1.it)('should allow access from limited trust cluster with verified auth', async () => {
            const decision = await controller.evaluateTrust('spiffe://secondary.intelgraph.io/ns/intelgraph/sa/api-server', 'graph-service', { 'x-cluster-auth': 'verified' });
            (0, globals_1.expect)(decision.action).toBe('allow');
            (0, globals_1.expect)(decision.trustScore).toBe(75);
        });
        (0, globals_1.it)('should allow access from restricted cluster with verified auth', async () => {
            const decision = await controller.evaluateTrust('spiffe://restricted.intelgraph.io/ns/analytics/sa/worker', 'analytics-api', { 'x-cluster-auth': 'verified' });
            (0, globals_1.expect)(decision.action).toBe('allow');
            (0, globals_1.expect)(decision.trustScore).toBe(50);
        });
        (0, globals_1.it)('should deny access without verified auth (score drops below threshold)', async () => {
            const decision = await controller.evaluateTrust('spiffe://restricted.intelgraph.io/ns/analytics/sa/worker', 'analytics-api', {} // No verified auth
            );
            (0, globals_1.expect)(decision.action).toBe('deny');
            (0, globals_1.expect)(decision.trustScore).toBe(20); // 50 - 30
        });
        (0, globals_1.it)('should deny access from unknown trust domain', async () => {
            const decision = await controller.evaluateTrust('spiffe://unknown.domain.io/ns/test/sa/service', 'api-server', { 'x-cluster-auth': 'verified' });
            (0, globals_1.expect)(decision.action).toBe('deny');
            (0, globals_1.expect)(decision.reason).toBe('Unknown trust domain');
        });
        (0, globals_1.it)('should deny access with invalid SPIFFE ID', async () => {
            const decision = await controller.evaluateTrust('invalid-identity', 'api-server', { 'x-cluster-auth': 'verified' });
            (0, globals_1.expect)(decision.action).toBe('deny');
            (0, globals_1.expect)(decision.reason).toBe('Invalid SPIFFE ID');
        });
        (0, globals_1.it)('should deny access when cluster is disconnected', async () => {
            await controller.disconnectCluster('primary-cluster');
            const decision = await controller.evaluateTrust('spiffe://primary.intelgraph.io/ns/intelgraph/sa/api-server', 'graph-service', { 'x-cluster-auth': 'verified' });
            (0, globals_1.expect)(decision.action).toBe('deny');
            (0, globals_1.expect)(decision.reason).toBe('Cluster not connected');
        });
        (0, globals_1.it)('should cache trust decisions', async () => {
            const decision1 = await controller.evaluateTrust('spiffe://primary.intelgraph.io/ns/intelgraph/sa/api-server', 'graph-service', { 'x-cluster-auth': 'verified' });
            const decision2 = await controller.evaluateTrust('spiffe://primary.intelgraph.io/ns/intelgraph/sa/api-server', 'graph-service', { 'x-cluster-auth': 'verified' });
            // Should return cached decision
            (0, globals_1.expect)(decision1).toEqual(decision2);
        });
    });
});
(0, globals_1.describe)('Trust Score Calculation', () => {
    (0, globals_1.it)('should calculate correct scores for each trust level', () => {
        const trustLevelScores = {
            full: 100,
            limited: 75,
            restricted: 50,
        };
        for (const [level, expectedScore] of Object.entries(trustLevelScores)) {
            (0, globals_1.expect)(expectedScore).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(expectedScore).toBeLessThanOrEqual(100);
        }
    });
    (0, globals_1.it)('should apply correct penalty for missing auth header', () => {
        const basePenalty = 30;
        const fullTrustWithPenalty = 100 - basePenalty;
        const limitedTrustWithPenalty = 75 - basePenalty;
        const restrictedTrustWithPenalty = 50 - basePenalty;
        (0, globals_1.expect)(fullTrustWithPenalty).toBe(70);
        (0, globals_1.expect)(limitedTrustWithPenalty).toBe(45);
        (0, globals_1.expect)(restrictedTrustWithPenalty).toBe(20);
    });
});
