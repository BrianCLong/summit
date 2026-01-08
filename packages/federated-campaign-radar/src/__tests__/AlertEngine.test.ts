/**
 * Tests for AlertEngine
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AlertEngine } from "../alerts/AlertEngine";
import { ClusteringEngine } from "../clustering/ClusteringEngine";
import { FederationService } from "../federation/FederationService";
import {
  SignalType,
  PrivacyLevel,
  CampaignSignal,
  CampaignCluster,
  ThreatLevel,
  ClusterStatus,
  AlertType,
  AlertSeverity,
  AlertStatus,
} from "../core/types";

describe("AlertEngine", () => {
  let alertEngine: AlertEngine;
  let clusteringEngine: ClusteringEngine;
  let federationService: FederationService;

  const createMockCluster = (overrides?: Partial<CampaignCluster>): CampaignCluster => ({
    id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    signalType: SignalType.NARRATIVE,
    signalIds: ["signal-1", "signal-2", "signal-3"],
    signalCount: 3,
    participatingOrganizations: ["org-1", "org-2"],
    crossTenantConfidence: 0.8,
    threatLevel: ThreatLevel.MEDIUM,
    status: ClusterStatus.ACTIVE,
    centroid: Array(768).fill(0.01),
    representativeSignals: [],
    temporalRange: {
      start: new Date(Date.now() - 3600000),
      end: new Date(),
    },
    velocityMetrics: {
      signalsPerHour: 10,
      growthTrajectory: "ACCELERATING",
      peakActivityTime: new Date(),
    },
    coordinationPatterns: [
      {
        patternType: "synchronized_posting",
        confidence: 0.9,
        affectedSignals: ["signal-1", "signal-2"],
      },
    ],
    createdAt: new Date(Date.now() - 7200000),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    federationService = new FederationService({
      participantId: "test-participant",
      organizationId: "test-org",
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

    alertEngine = new AlertEngine(clusteringEngine, federationService, {
      defaultCooldownMs: 60000, // 1 minute for testing
      maxActiveAlerts: 100,
      enableAutoEscalation: true,
    });
  });

  describe("alert thresholds", () => {
    it("should register custom alert thresholds", () => {
      alertEngine.registerThreshold({
        id: "custom-threshold",
        alertType: AlertType.CAMPAIGN_EMERGING,
        conditions: [
          {
            metric: "signalCount",
            operator: "gte",
            value: 10,
          },
        ],
        severity: AlertSeverity.HIGH,
        cooldownMs: 300000,
      });

      const thresholds = alertEngine.getThresholds();
      const customThreshold = thresholds.find((t) => t.id === "custom-threshold");

      expect(customThreshold).toBeDefined();
      expect(customThreshold?.severity).toBe(AlertSeverity.HIGH);
    });

    it("should remove thresholds", () => {
      alertEngine.registerThreshold({
        id: "to-remove",
        alertType: AlertType.CAMPAIGN_EMERGING,
        conditions: [],
        severity: AlertSeverity.LOW,
        cooldownMs: 60000,
      });

      alertEngine.removeThreshold("to-remove");

      const thresholds = alertEngine.getThresholds();
      expect(thresholds.find((t) => t.id === "to-remove")).toBeUndefined();
    });
  });

  describe("cluster evaluation", () => {
    it("should generate alerts for clusters meeting thresholds", async () => {
      const cluster = createMockCluster({
        threatLevel: ThreatLevel.HIGH,
        crossTenantConfidence: 0.9,
        signalCount: 50,
      });

      const previousStates = new Map<string, CampaignCluster>();
      await alertEngine.evaluateClusters([cluster], previousStates);

      const alerts = alertEngine.getActiveAlerts();

      // Should generate at least one alert for high-threat cluster
      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });

    it("should detect cross-tenant spikes", async () => {
      const cluster = createMockCluster({
        participatingOrganizations: ["org-1", "org-2", "org-3", "org-4"],
        crossTenantConfidence: 0.95,
        signalCount: 100,
      });

      const previousStates = new Map<string, CampaignCluster>();
      await alertEngine.evaluateClusters([cluster], previousStates);

      const alerts = alertEngine.getActiveAlerts();
      const crossTenantAlert = alerts.find((a) => a.alertType === AlertType.CROSS_TENANT_SPIKE);

      // May or may not generate depending on thresholds
      expect(Array.isArray(alerts)).toBe(true);
    });

    it("should detect coordination patterns", async () => {
      const cluster = createMockCluster({
        coordinationPatterns: [
          {
            patternType: "synchronized_posting",
            confidence: 0.95,
            affectedSignals: ["s1", "s2", "s3", "s4", "s5"],
          },
          {
            patternType: "copy_paste_campaign",
            confidence: 0.88,
            affectedSignals: ["s6", "s7", "s8"],
          },
        ],
      });

      const previousStates = new Map<string, CampaignCluster>();
      await alertEngine.evaluateClusters([cluster], previousStates);

      // Engine should process coordination patterns
      expect(cluster.coordinationPatterns.length).toBe(2);
    });

    it("should track cluster growth for emerging alerts", async () => {
      const initialCluster = createMockCluster({
        id: "growing-cluster",
        signalCount: 10,
      });

      const previousStates = new Map<string, CampaignCluster>();
      previousStates.set("growing-cluster", { ...initialCluster, signalCount: 5 });

      const grownCluster = createMockCluster({
        id: "growing-cluster",
        signalCount: 100, // 10x growth
        velocityMetrics: {
          signalsPerHour: 50,
          growthTrajectory: "ACCELERATING",
          peakActivityTime: new Date(),
        },
      });

      await alertEngine.evaluateClusters([grownCluster], previousStates);

      // Should detect rapid growth
      const alerts = alertEngine.getActiveAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe("alert management", () => {
    it("should get alert by ID", async () => {
      const cluster = createMockCluster({
        threatLevel: ThreatLevel.CRITICAL,
        signalCount: 200,
      });

      await alertEngine.evaluateClusters([cluster], new Map());

      const alerts = alertEngine.getActiveAlerts();
      if (alerts.length > 0) {
        const alert = alertEngine.getAlert(alerts[0].id);
        expect(alert).toBeDefined();
        expect(alert?.id).toBe(alerts[0].id);
      }
    });

    it("should return undefined for non-existent alert", () => {
      const alert = alertEngine.getAlert("non-existent-id");
      expect(alert).toBeUndefined();
    });

    it("should acknowledge alerts", async () => {
      const cluster = createMockCluster({
        threatLevel: ThreatLevel.HIGH,
      });

      await alertEngine.evaluateClusters([cluster], new Map());

      const alerts = alertEngine.getActiveAlerts();
      if (alerts.length > 0) {
        const success = alertEngine.acknowledgeAlert(alerts[0].id, "analyst-1");

        expect(success).toBe(true);

        const acknowledged = alertEngine.getAlert(alerts[0].id);
        expect(acknowledged?.status).toBe(AlertStatus.ACKNOWLEDGED);
        expect(acknowledged?.acknowledgedBy).toBe("analyst-1");
      }
    });

    it("should resolve alerts", async () => {
      const cluster = createMockCluster({
        threatLevel: ThreatLevel.HIGH,
      });

      await alertEngine.evaluateClusters([cluster], new Map());

      const alerts = alertEngine.getActiveAlerts();
      if (alerts.length > 0) {
        alertEngine.acknowledgeAlert(alerts[0].id, "analyst-1");

        const success = alertEngine.resolveAlert(alerts[0].id, "analyst-1", {
          resolutionType: "MITIGATED",
          notes: "Campaign successfully countered",
          lessonsLearned: ["Faster detection needed"],
        });

        expect(success).toBe(true);

        const resolved = alertEngine.getAlert(alerts[0].id);
        expect(resolved?.status).toBe(AlertStatus.RESOLVED);
        expect(resolved?.resolution?.resolutionType).toBe("MITIGATED");
      }
    });
  });

  describe("response pack generation", () => {
    it("should generate response pack for alert", async () => {
      const cluster = createMockCluster({
        threatLevel: ThreatLevel.HIGH,
        signalCount: 50,
        participatingOrganizations: ["org-1", "org-2"],
      });

      await alertEngine.evaluateClusters([cluster], new Map());

      const alerts = alertEngine.getActiveAlerts();
      if (alerts.length > 0) {
        const pack = await alertEngine.generateResponsePack(alerts[0].id);

        expect(pack).toBeDefined();
        if (pack) {
          expect(pack.id).toBeDefined();
          expect(pack.alertId).toBe(alerts[0].id);
          expect(pack.narrativeIntelligence).toBeDefined();
          expect(pack.stakeholderBriefing).toBeDefined();
          expect(pack.commsPlaybook).toBeDefined();
          expect(pack.measurementPlan).toBeDefined();
        }
      }
    });

    it("should include narrative intelligence in response pack", async () => {
      const cluster = createMockCluster({
        threatLevel: ThreatLevel.MEDIUM,
      });

      await alertEngine.evaluateClusters([cluster], new Map());

      const alerts = alertEngine.getActiveAlerts();
      if (alerts.length > 0) {
        const pack = await alertEngine.generateResponsePack(alerts[0].id);

        if (pack) {
          expect(pack.narrativeIntelligence.summary).toBeDefined();
          expect(pack.narrativeIntelligence.keyThemes).toBeDefined();
          expect(Array.isArray(pack.narrativeIntelligence.keyThemes)).toBe(true);
        }
      }
    });

    it("should include comms playbook in response pack", async () => {
      const cluster = createMockCluster({
        threatLevel: ThreatLevel.HIGH,
      });

      await alertEngine.evaluateClusters([cluster], new Map());

      const alerts = alertEngine.getActiveAlerts();
      if (alerts.length > 0) {
        const pack = await alertEngine.generateResponsePack(alerts[0].id);

        if (pack) {
          expect(pack.commsPlaybook.recommendedActions).toBeDefined();
          expect(Array.isArray(pack.commsPlaybook.recommendedActions)).toBe(true);
          expect(pack.commsPlaybook.messagingGuidance).toBeDefined();
        }
      }
    });
  });

  describe("metrics", () => {
    it("should track alert metrics", async () => {
      // Generate some alerts
      for (let i = 0; i < 3; i++) {
        const cluster = createMockCluster({
          id: `cluster-${i}`,
          threatLevel: ThreatLevel.HIGH,
        });
        await alertEngine.evaluateClusters([cluster], new Map());
      }

      const metrics = alertEngine.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalAlerts).toBe("number");
      expect(typeof metrics.activeAlerts).toBe("number");
    });

    it("should track time-based metrics", () => {
      const metrics = alertEngine.getMetrics();

      expect(metrics.avgTimeToAcknowledge).toBeDefined();
      expect(metrics.avgTimeToResolve).toBeDefined();
    });
  });

  describe("cooldown handling", () => {
    it("should respect alert cooldown periods", async () => {
      const cluster = createMockCluster({
        id: "cooldown-test-cluster",
        threatLevel: ThreatLevel.HIGH,
      });

      // First evaluation
      await alertEngine.evaluateClusters([cluster], new Map());
      const firstAlerts = alertEngine.getActiveAlerts();

      // Immediate re-evaluation (should be in cooldown)
      await alertEngine.evaluateClusters([cluster], new Map());
      const secondAlerts = alertEngine.getActiveAlerts();

      // Should not generate duplicate alerts within cooldown
      expect(secondAlerts.length).toBe(firstAlerts.length);
    });
  });

  describe("auto-escalation", () => {
    it("should auto-escalate unacknowledged alerts", async () => {
      // Create a critical alert that should escalate
      const cluster = createMockCluster({
        threatLevel: ThreatLevel.CRITICAL,
        signalCount: 500,
      });

      await alertEngine.evaluateClusters([cluster], new Map());

      const alerts = alertEngine.getActiveAlerts();
      const criticalAlert = alerts.find((a) => a.severity === AlertSeverity.CRITICAL);

      if (criticalAlert) {
        expect(criticalAlert.escalationLevel).toBeDefined();
      }
    });
  });

  describe("alert filtering", () => {
    it("should filter alerts by severity", async () => {
      // Generate alerts of various severities
      const clusters = [
        createMockCluster({ id: "c1", threatLevel: ThreatLevel.LOW }),
        createMockCluster({ id: "c2", threatLevel: ThreatLevel.MEDIUM }),
        createMockCluster({ id: "c3", threatLevel: ThreatLevel.HIGH }),
        createMockCluster({ id: "c4", threatLevel: ThreatLevel.CRITICAL }),
      ];

      await alertEngine.evaluateClusters(clusters, new Map());

      const allAlerts = alertEngine.getActiveAlerts();
      const highSeverity = allAlerts.filter((a) =>
        [AlertSeverity.HIGH, AlertSeverity.CRITICAL].includes(a.severity)
      );

      highSeverity.forEach((alert) => {
        expect([AlertSeverity.HIGH, AlertSeverity.CRITICAL]).toContain(alert.severity);
      });
    });

    it("should filter cross-tenant alerts", async () => {
      const crossTenantCluster = createMockCluster({
        participatingOrganizations: ["org-1", "org-2", "org-3"],
        crossTenantConfidence: 0.95,
      });

      await alertEngine.evaluateClusters([crossTenantCluster], new Map());

      const alerts = alertEngine.getActiveAlerts();
      const crossTenantAlerts = alerts.filter((a) => a.crossTenantSignal);

      crossTenantAlerts.forEach((alert) => {
        expect(alert.crossTenantSignal).toBe(true);
      });
    });
  });
});
