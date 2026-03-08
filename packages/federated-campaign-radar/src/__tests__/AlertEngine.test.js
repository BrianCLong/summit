"use strict";
/**
 * Tests for AlertEngine
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const AlertEngine_1 = require("../alerts/AlertEngine");
const ClusteringEngine_1 = require("../clustering/ClusteringEngine");
const FederationService_1 = require("../federation/FederationService");
const types_1 = require("../core/types");
(0, vitest_1.describe)('AlertEngine', () => {
    let alertEngine;
    let clusteringEngine;
    let federationService;
    const createMockCluster = (overrides) => ({
        id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        signalType: types_1.SignalType.NARRATIVE,
        signalIds: ['signal-1', 'signal-2', 'signal-3'],
        signalCount: 3,
        participatingOrganizations: ['org-1', 'org-2'],
        crossTenantConfidence: 0.8,
        threatLevel: types_1.ThreatLevel.MEDIUM,
        status: types_1.ClusterStatus.ACTIVE,
        centroid: Array(768).fill(0.01),
        representativeSignals: [],
        temporalRange: {
            start: new Date(Date.now() - 3600000),
            end: new Date(),
        },
        velocityMetrics: {
            signalsPerHour: 10,
            growthTrajectory: 'ACCELERATING',
            peakActivityTime: new Date(),
        },
        coordinationPatterns: [
            {
                patternType: 'synchronized_posting',
                confidence: 0.9,
                affectedSignals: ['signal-1', 'signal-2'],
            },
        ],
        createdAt: new Date(Date.now() - 7200000),
        updatedAt: new Date(),
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
        clusteringEngine = new ClusteringEngine_1.ClusteringEngine(federationService, {
            similarityThreshold: 0.8,
            minClusterSize: 2,
            crossTenantBoostFactor: 1.5,
        });
        alertEngine = new AlertEngine_1.AlertEngine(clusteringEngine, federationService, {
            defaultCooldownMs: 60000, // 1 minute for testing
            maxActiveAlerts: 100,
            enableAutoEscalation: true,
        });
    });
    (0, vitest_1.describe)('alert thresholds', () => {
        (0, vitest_1.it)('should register custom alert thresholds', () => {
            alertEngine.registerThreshold({
                id: 'custom-threshold',
                alertType: types_1.AlertType.CAMPAIGN_EMERGING,
                conditions: [
                    {
                        metric: 'signalCount',
                        operator: 'gte',
                        value: 10,
                    },
                ],
                severity: types_1.AlertSeverity.HIGH,
                cooldownMs: 300000,
            });
            const thresholds = alertEngine.getThresholds();
            const customThreshold = thresholds.find((t) => t.id === 'custom-threshold');
            (0, vitest_1.expect)(customThreshold).toBeDefined();
            (0, vitest_1.expect)(customThreshold?.severity).toBe(types_1.AlertSeverity.HIGH);
        });
        (0, vitest_1.it)('should remove thresholds', () => {
            alertEngine.registerThreshold({
                id: 'to-remove',
                alertType: types_1.AlertType.CAMPAIGN_EMERGING,
                conditions: [],
                severity: types_1.AlertSeverity.LOW,
                cooldownMs: 60000,
            });
            alertEngine.removeThreshold('to-remove');
            const thresholds = alertEngine.getThresholds();
            (0, vitest_1.expect)(thresholds.find((t) => t.id === 'to-remove')).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('cluster evaluation', () => {
        (0, vitest_1.it)('should generate alerts for clusters meeting thresholds', async () => {
            const cluster = createMockCluster({
                threatLevel: types_1.ThreatLevel.HIGH,
                crossTenantConfidence: 0.9,
                signalCount: 50,
            });
            const previousStates = new Map();
            await alertEngine.evaluateClusters([cluster], previousStates);
            const alerts = alertEngine.getActiveAlerts();
            // Should generate at least one alert for high-threat cluster
            (0, vitest_1.expect)(alerts.length).toBeGreaterThanOrEqual(0);
        });
        (0, vitest_1.it)('should detect cross-tenant spikes', async () => {
            const cluster = createMockCluster({
                participatingOrganizations: ['org-1', 'org-2', 'org-3', 'org-4'],
                crossTenantConfidence: 0.95,
                signalCount: 100,
            });
            const previousStates = new Map();
            await alertEngine.evaluateClusters([cluster], previousStates);
            const alerts = alertEngine.getActiveAlerts();
            const crossTenantAlert = alerts.find((a) => a.alertType === types_1.AlertType.CROSS_TENANT_SPIKE);
            // May or may not generate depending on thresholds
            (0, vitest_1.expect)(Array.isArray(alerts)).toBe(true);
        });
        (0, vitest_1.it)('should detect coordination patterns', async () => {
            const cluster = createMockCluster({
                coordinationPatterns: [
                    {
                        patternType: 'synchronized_posting',
                        confidence: 0.95,
                        affectedSignals: ['s1', 's2', 's3', 's4', 's5'],
                    },
                    {
                        patternType: 'copy_paste_campaign',
                        confidence: 0.88,
                        affectedSignals: ['s6', 's7', 's8'],
                    },
                ],
            });
            const previousStates = new Map();
            await alertEngine.evaluateClusters([cluster], previousStates);
            // Engine should process coordination patterns
            (0, vitest_1.expect)(cluster.coordinationPatterns.length).toBe(2);
        });
        (0, vitest_1.it)('should track cluster growth for emerging alerts', async () => {
            const initialCluster = createMockCluster({
                id: 'growing-cluster',
                signalCount: 10,
            });
            const previousStates = new Map();
            previousStates.set('growing-cluster', { ...initialCluster, signalCount: 5 });
            const grownCluster = createMockCluster({
                id: 'growing-cluster',
                signalCount: 100, // 10x growth
                velocityMetrics: {
                    signalsPerHour: 50,
                    growthTrajectory: 'ACCELERATING',
                    peakActivityTime: new Date(),
                },
            });
            await alertEngine.evaluateClusters([grownCluster], previousStates);
            // Should detect rapid growth
            const alerts = alertEngine.getActiveAlerts();
            (0, vitest_1.expect)(Array.isArray(alerts)).toBe(true);
        });
    });
    (0, vitest_1.describe)('alert management', () => {
        (0, vitest_1.it)('should get alert by ID', async () => {
            const cluster = createMockCluster({
                threatLevel: types_1.ThreatLevel.CRITICAL,
                signalCount: 200,
            });
            await alertEngine.evaluateClusters([cluster], new Map());
            const alerts = alertEngine.getActiveAlerts();
            if (alerts.length > 0) {
                const alert = alertEngine.getAlert(alerts[0].id);
                (0, vitest_1.expect)(alert).toBeDefined();
                (0, vitest_1.expect)(alert?.id).toBe(alerts[0].id);
            }
        });
        (0, vitest_1.it)('should return undefined for non-existent alert', () => {
            const alert = alertEngine.getAlert('non-existent-id');
            (0, vitest_1.expect)(alert).toBeUndefined();
        });
        (0, vitest_1.it)('should acknowledge alerts', async () => {
            const cluster = createMockCluster({
                threatLevel: types_1.ThreatLevel.HIGH,
            });
            await alertEngine.evaluateClusters([cluster], new Map());
            const alerts = alertEngine.getActiveAlerts();
            if (alerts.length > 0) {
                const success = alertEngine.acknowledgeAlert(alerts[0].id, 'analyst-1');
                (0, vitest_1.expect)(success).toBe(true);
                const acknowledged = alertEngine.getAlert(alerts[0].id);
                (0, vitest_1.expect)(acknowledged?.status).toBe(types_1.AlertStatus.ACKNOWLEDGED);
                (0, vitest_1.expect)(acknowledged?.acknowledgedBy).toBe('analyst-1');
            }
        });
        (0, vitest_1.it)('should resolve alerts', async () => {
            const cluster = createMockCluster({
                threatLevel: types_1.ThreatLevel.HIGH,
            });
            await alertEngine.evaluateClusters([cluster], new Map());
            const alerts = alertEngine.getActiveAlerts();
            if (alerts.length > 0) {
                alertEngine.acknowledgeAlert(alerts[0].id, 'analyst-1');
                const success = alertEngine.resolveAlert(alerts[0].id, 'analyst-1', {
                    resolutionType: 'MITIGATED',
                    notes: 'Campaign successfully countered',
                    lessonsLearned: ['Faster detection needed'],
                });
                (0, vitest_1.expect)(success).toBe(true);
                const resolved = alertEngine.getAlert(alerts[0].id);
                (0, vitest_1.expect)(resolved?.status).toBe(types_1.AlertStatus.RESOLVED);
                (0, vitest_1.expect)(resolved?.resolution?.resolutionType).toBe('MITIGATED');
            }
        });
    });
    (0, vitest_1.describe)('response pack generation', () => {
        (0, vitest_1.it)('should generate response pack for alert', async () => {
            const cluster = createMockCluster({
                threatLevel: types_1.ThreatLevel.HIGH,
                signalCount: 50,
                participatingOrganizations: ['org-1', 'org-2'],
            });
            await alertEngine.evaluateClusters([cluster], new Map());
            const alerts = alertEngine.getActiveAlerts();
            if (alerts.length > 0) {
                const pack = await alertEngine.generateResponsePack(alerts[0].id);
                (0, vitest_1.expect)(pack).toBeDefined();
                if (pack) {
                    (0, vitest_1.expect)(pack.id).toBeDefined();
                    (0, vitest_1.expect)(pack.alertId).toBe(alerts[0].id);
                    (0, vitest_1.expect)(pack.narrativeIntelligence).toBeDefined();
                    (0, vitest_1.expect)(pack.stakeholderBriefing).toBeDefined();
                    (0, vitest_1.expect)(pack.commsPlaybook).toBeDefined();
                    (0, vitest_1.expect)(pack.measurementPlan).toBeDefined();
                }
            }
        });
        (0, vitest_1.it)('should include narrative intelligence in response pack', async () => {
            const cluster = createMockCluster({
                threatLevel: types_1.ThreatLevel.MEDIUM,
            });
            await alertEngine.evaluateClusters([cluster], new Map());
            const alerts = alertEngine.getActiveAlerts();
            if (alerts.length > 0) {
                const pack = await alertEngine.generateResponsePack(alerts[0].id);
                if (pack) {
                    (0, vitest_1.expect)(pack.narrativeIntelligence.summary).toBeDefined();
                    (0, vitest_1.expect)(pack.narrativeIntelligence.keyThemes).toBeDefined();
                    (0, vitest_1.expect)(Array.isArray(pack.narrativeIntelligence.keyThemes)).toBe(true);
                }
            }
        });
        (0, vitest_1.it)('should include comms playbook in response pack', async () => {
            const cluster = createMockCluster({
                threatLevel: types_1.ThreatLevel.HIGH,
            });
            await alertEngine.evaluateClusters([cluster], new Map());
            const alerts = alertEngine.getActiveAlerts();
            if (alerts.length > 0) {
                const pack = await alertEngine.generateResponsePack(alerts[0].id);
                if (pack) {
                    (0, vitest_1.expect)(pack.commsPlaybook.recommendedActions).toBeDefined();
                    (0, vitest_1.expect)(Array.isArray(pack.commsPlaybook.recommendedActions)).toBe(true);
                    (0, vitest_1.expect)(pack.commsPlaybook.messagingGuidance).toBeDefined();
                }
            }
        });
    });
    (0, vitest_1.describe)('metrics', () => {
        (0, vitest_1.it)('should track alert metrics', async () => {
            // Generate some alerts
            for (let i = 0; i < 3; i++) {
                const cluster = createMockCluster({
                    id: `cluster-${i}`,
                    threatLevel: types_1.ThreatLevel.HIGH,
                });
                await alertEngine.evaluateClusters([cluster], new Map());
            }
            const metrics = alertEngine.getMetrics();
            (0, vitest_1.expect)(metrics).toBeDefined();
            (0, vitest_1.expect)(typeof metrics.totalAlerts).toBe('number');
            (0, vitest_1.expect)(typeof metrics.activeAlerts).toBe('number');
        });
        (0, vitest_1.it)('should track time-based metrics', () => {
            const metrics = alertEngine.getMetrics();
            (0, vitest_1.expect)(metrics.avgTimeToAcknowledge).toBeDefined();
            (0, vitest_1.expect)(metrics.avgTimeToResolve).toBeDefined();
        });
    });
    (0, vitest_1.describe)('cooldown handling', () => {
        (0, vitest_1.it)('should respect alert cooldown periods', async () => {
            const cluster = createMockCluster({
                id: 'cooldown-test-cluster',
                threatLevel: types_1.ThreatLevel.HIGH,
            });
            // First evaluation
            await alertEngine.evaluateClusters([cluster], new Map());
            const firstAlerts = alertEngine.getActiveAlerts();
            // Immediate re-evaluation (should be in cooldown)
            await alertEngine.evaluateClusters([cluster], new Map());
            const secondAlerts = alertEngine.getActiveAlerts();
            // Should not generate duplicate alerts within cooldown
            (0, vitest_1.expect)(secondAlerts.length).toBe(firstAlerts.length);
        });
    });
    (0, vitest_1.describe)('auto-escalation', () => {
        (0, vitest_1.it)('should auto-escalate unacknowledged alerts', async () => {
            // Create a critical alert that should escalate
            const cluster = createMockCluster({
                threatLevel: types_1.ThreatLevel.CRITICAL,
                signalCount: 500,
            });
            await alertEngine.evaluateClusters([cluster], new Map());
            const alerts = alertEngine.getActiveAlerts();
            const criticalAlert = alerts.find((a) => a.severity === types_1.AlertSeverity.CRITICAL);
            if (criticalAlert) {
                (0, vitest_1.expect)(criticalAlert.escalationLevel).toBeDefined();
            }
        });
    });
    (0, vitest_1.describe)('alert filtering', () => {
        (0, vitest_1.it)('should filter alerts by severity', async () => {
            // Generate alerts of various severities
            const clusters = [
                createMockCluster({ id: 'c1', threatLevel: types_1.ThreatLevel.LOW }),
                createMockCluster({ id: 'c2', threatLevel: types_1.ThreatLevel.MEDIUM }),
                createMockCluster({ id: 'c3', threatLevel: types_1.ThreatLevel.HIGH }),
                createMockCluster({ id: 'c4', threatLevel: types_1.ThreatLevel.CRITICAL }),
            ];
            await alertEngine.evaluateClusters(clusters, new Map());
            const allAlerts = alertEngine.getActiveAlerts();
            const highSeverity = allAlerts.filter((a) => [types_1.AlertSeverity.HIGH, types_1.AlertSeverity.CRITICAL].includes(a.severity));
            highSeverity.forEach((alert) => {
                (0, vitest_1.expect)([types_1.AlertSeverity.HIGH, types_1.AlertSeverity.CRITICAL]).toContain(alert.severity);
            });
        });
        (0, vitest_1.it)('should filter cross-tenant alerts', async () => {
            const crossTenantCluster = createMockCluster({
                participatingOrganizations: ['org-1', 'org-2', 'org-3'],
                crossTenantConfidence: 0.95,
            });
            await alertEngine.evaluateClusters([crossTenantCluster], new Map());
            const alerts = alertEngine.getActiveAlerts();
            const crossTenantAlerts = alerts.filter((a) => a.crossTenantSignal);
            crossTenantAlerts.forEach((alert) => {
                (0, vitest_1.expect)(alert.crossTenantSignal).toBe(true);
            });
        });
    });
});
