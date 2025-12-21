import path from 'node:path';
import { loadPlan } from './config.js';
import { validatePlan } from './validators.js';
import { ResiliencePlan } from './types.js';

function buildFailingPlan(): ResiliencePlan {
  return {
    services: [
      {
        name: 'unstable-service',
        tier: 'T0',
        owners: ['platform'],
        dependencies: [
          {
            name: 'db',
            type: 'db',
            owner: 'data',
            criticality: 'critical',
            timeoutsMs: 0,
            retries: 0,
            circuitBreaker: { failureThreshold: 1, resetSeconds: 10 },
            bulkhead: { tenantIsolation: false, featureIsolation: false, queueDepthLimit: 1 },
            gracefulDegradation: { mode: '', testedAt: '2025-01-01T00:00:00Z' },
            cacheStrategy: { scope: 'none', ttlSeconds: 0 },
            sla: { availability: 99.0, latencyMsP99: 1000 },
            failStrategy: 'fail-closed',
            killSwitch: { present: false, lastTestedAt: '2024-01-01T00:00:00Z', coverage: [] },
            chaosTests: { lastSimulatedAt: '2024-01-01T00:00:00Z', scenario: 'none' },
            escalation: { contact: '@nobody' },
          },
        ],
        backup: {
          schedule: 'unknown',
          lastBackupAt: '2024-01-01T00:00:00Z',
          lastRestoreVerifiedAt: '2024-01-01T00:00:00Z',
          restoreDurationMinutes: 999,
          dataLossMinutes: 999,
          evidencePath: 'RUNBOOKS/DR.md',
        },
        runbook: { path: '', roles: [], lastReviewedAt: '2024-01-01T00:00:00Z' },
        drEnvironment: { runnable: false, smokeCommand: 'make dr-up', lastSmokeAt: '2024-01-01T00:00:00Z' },
        drills: [],
        capacity: {
          peakRps: 0,
          scenarios: [],
          p95LatencyBudgetMs: 0,
          throughputBudgetRps: 0,
          autoscaling: { minReplicas: 0, maxReplicas: 0, cooldownSeconds: 0 },
          backpressure: { queueCap: 0, shedLoadAboveMs: 0, timeoutMs: 0 },
          quotas: { perTenantRps: 0 },
          dashboards: [],
          forecastHorizonDays: 0,
          brownoutMode: { enabled: false, lastTestedAt: '2024-01-01T00:00:00Z', strategy: '' },
        },
        dataIntegrity: {
          riskyWritePaths: [],
          idempotencyKeys: [],
          invariants: [],
          reconciliationJobs: { cadence: '', exceptionQueue: '' },
          eventLog: { enabled: false, topics: [] },
          outbox: { enabled: false },
          dualControl: { enabled: false, scope: [] },
          quarantine: { enabled: false, rules: [] },
          integrityChecks: { restoreHashValidation: false, recordCounts: false },
          correctnessScorecard: { driftFindings: 1, mttrMinutes: 0 },
        },
        releaseSafety: {
          progressiveStages: [],
          rollbackTriggers: [],
          featureFlagGovernance: { owner: 'platform', expiryDays: 0, killSwitch: false },
          migrationSafety: { lockBudgetSeconds: 0, rollbackPlan: '' },
          blastRadiusLabels: [],
          verificationSuites: [],
          releaseMarkers: [],
          breakGlass: { process: '', auditPath: '' },
          rollbackDrills: { frequencyDays: 365, lastRunAt: '2024-01-01T00:00:00Z' },
          changeFailureRate: 1,
        },
        observability: {
          structuredLogging: false,
          correlationIds: false,
          tracingCoverage: [],
          sloDashboards: [],
          syntheticMonitors: [],
          entityTimeline: false,
          alertDeepLinks: false,
          anomalyDetection: false,
          perTenantSignals: false,
          mttrMinutes: 0,
          mttaMinutes: 0,
          timeToInnocenceMinutes: 0,
          telemetryCostControls: { sampling: false, retentionTiers: false },
        },
        chaos: {
          calendar: [],
          tooling: { blastRadiusCapPercent: 100, approvalsRequired: false },
          mitigationBacklog: { openItems: 0, lastUpdatedAt: '2024-01-01T00:00:00Z' },
          killSwitchesVerifiedAt: '2024-01-01T00:00:00Z',
          drIncluded: false,
          score: 0,
        },
        multiRegion: {
          strategy: 'single-az',
          regions: ['us-east-1'],
          healthChecks: false,
          replicationLagSeconds: 1000,
          regionalDashboards: false,
          regionalDeployPipelines: false,
          failoverDrillAt: '2024-01-01T00:00:00Z',
          crossRegionChattyCalls: true,
          secretsStandardized: false,
          vendorPlan: false,
          adr: 'adr/none',
        },
        governance: {
          errorBudgets: [],
          riskRegister: [],
          postmortemsRequireSystemicFix: false,
          reliabilityReleaseCadenceDays: 365,
          ownershipComplete: false,
          killSwitchRegistryTestDays: 365,
          lastAuditAt: '2024-01-01T00:00:00Z',
          incentives: false,
        },
      },
    ],
    artifactRegistry: [],
  };
}

describe('resilience validators', () => {
  it('passes the golden resilience plan', () => {
    const planPath = path.join(process.cwd(), 'packages', 'resilience', 'resilience-plan.json');
    const plan = loadPlan(planPath);
    const report = validatePlan(plan);

    expect(report.overallStatus).toBe('pass');
    report.results.forEach((result) => expect(result.status).toBe('pass'));
  });

  it('highlights failures for non-compliant services', () => {
    const report = validatePlan(buildFailingPlan());

    expect(report.overallStatus).toBe('fail');
    const drEpic = report.results.find((result) => result.epic.startsWith('Epic 1'));
    expect(drEpic?.findings.some((finding) => finding.includes('restore duration'))).toBe(true);
    const governanceEpic = report.results.find((result) => result.epic.startsWith('Epic 9'));
    expect(governanceEpic?.findings.length).toBeGreaterThan(0);
  });
});
