import { TIER_TARGETS } from './constants';
import { ResiliencePlan, ServicePlan, EpicResult, ValidationReport, Tier } from './types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysSince(timestamp: string): number {
  return (Date.now() - new Date(timestamp).getTime()) / MS_PER_DAY;
}

function latestDrill(service: ServicePlan, type: ServicePlan['drills'][number]['type']): number {
  const dates = service.drills
    .filter((drill) => drill.type === type)
    .map((drill) => new Date(drill.executedAt).getTime());
  return dates.length === 0 ? Number.POSITIVE_INFINITY : (Date.now() - Math.max(...dates)) / MS_PER_DAY;
}

function ensureTierTargets(service: ServicePlan, findings: string[]): void {
  const targets = TIER_TARGETS[service.tier];
  if (service.backup.dataLossMinutes > targets.rpoMinutes) {
    findings.push(`${service.name}: data loss ${service.backup.dataLossMinutes}m exceeds RPO ${targets.rpoMinutes}m`);
  }
  if (service.backup.restoreDurationMinutes > targets.rtoMinutes) {
    findings.push(`${service.name}: restore duration ${service.backup.restoreDurationMinutes}m exceeds RTO ${targets.rtoMinutes}m`);
  }
  const sinceRestore = daysSince(service.backup.lastRestoreVerifiedAt);
  if (sinceRestore > targets.restoreVerificationCadenceDays) {
    findings.push(
      `${service.name}: last restore verification ${sinceRestore.toFixed(1)}d ago exceeds cadence ${targets.restoreVerificationCadenceDays}d`,
    );
  }
  const sinceDrill = latestDrill(service, 'restore');
  if (sinceDrill > targets.drillCadenceDays) {
    findings.push(`${service.name}: restore drill stale at ${sinceDrill.toFixed(1)}d`);
  }
}

function validateRunbooks(service: ServicePlan, findings: string[]): void {
  if (!service.runbook.path || service.runbook.roles.length === 0) {
    findings.push(`${service.name}: missing runbook or incident roles`);
  }
  if (daysSince(service.runbook.lastReviewedAt) > 60) {
    findings.push(`${service.name}: runbook review older than 60d`);
  }
  if (!service.drEnvironment.runnable) {
    findings.push(`${service.name}: DR environment not runnable`);
  }
  if (daysSince(service.drEnvironment.lastSmokeAt) > 30) {
    findings.push(`${service.name}: DR smoke older than 30d`);
  }
}

function validateDependencies(service: ServicePlan, findings: string[]): void {
  if (service.dependencies.length === 0) {
    findings.push(`${service.name}: dependencies inventory missing`);
    return;
  }
  for (const dep of service.dependencies) {
    if (dep.timeoutsMs <= 0 || dep.retries <= 0) {
      findings.push(`${service.name}: dependency ${dep.name} missing timeouts/retries`);
    }
    if (!dep.bulkhead.tenantIsolation || !dep.bulkhead.featureIsolation) {
      findings.push(`${service.name}: dependency ${dep.name} lacks bulkheads`);
    }
    if (!dep.gracefulDegradation.mode) {
      findings.push(`${service.name}: dependency ${dep.name} missing graceful degradation mode`);
    }
    if (!dep.killSwitch.present || daysSince(dep.killSwitch.lastTestedAt) > 120) {
      findings.push(`${service.name}: dependency ${dep.name} kill switch untested >120d`);
    }
    if (daysSince(dep.chaosTests.lastSimulatedAt) > 120) {
      findings.push(`${service.name}: dependency ${dep.name} chaos coverage stale`);
    }
    if (!dep.cacheStrategy && dep.type !== 'queue' && dep.type !== 'stream') {
      findings.push(`${service.name}: dependency ${dep.name} missing cache strategy`);
    }
  }
}

function validateCapacity(service: ServicePlan, findings: string[]): void {
  const { capacity } = service;
  if (service.tier === 'T0' || service.tier === 'T1') {
    if (capacity.scenarios.length === 0) {
      findings.push(`${service.name}: missing load scenarios`);
    }
    if (capacity.p95LatencyBudgetMs <= 0 || capacity.throughputBudgetRps <= 0) {
      findings.push(`${service.name}: invalid performance budgets`);
    }
  }
  if (capacity.autoscaling.minReplicas <= 0 || capacity.autoscaling.maxReplicas <= capacity.autoscaling.minReplicas) {
    findings.push(`${service.name}: autoscaling bounds invalid`);
  }
  if (capacity.backpressure.queueCap <= 0 || capacity.backpressure.shedLoadAboveMs <= 0) {
    findings.push(`${service.name}: backpressure configuration missing`);
  }
  if (capacity.quotas.perTenantRps <= 0) {
    findings.push(`${service.name}: per-tenant quotas missing`);
  }
  if (daysSince(capacity.brownoutMode.lastTestedAt) > 120) {
    findings.push(`${service.name}: brownout mode untested >120d`);
  }
}

function validateDataIntegrity(service: ServicePlan, findings: string[]): void {
  const { dataIntegrity } = service;
  if (dataIntegrity.riskyWritePaths.length < 5) {
    findings.push(`${service.name}: fewer than 5 risky write paths enumerated`);
  }
  if (dataIntegrity.idempotencyKeys.length === 0) {
    findings.push(`${service.name}: missing idempotency keys`);
  }
  if (!dataIntegrity.outbox.enabled || !dataIntegrity.eventLog.enabled) {
    findings.push(`${service.name}: outbox or event log disabled`);
  }
  if (!dataIntegrity.dualControl.enabled) {
    findings.push(`${service.name}: dual-control not enabled for destructive actions`);
  }
  if (!dataIntegrity.quarantine.enabled) {
    findings.push(`${service.name}: quarantine not enabled`);
  }
  if (!dataIntegrity.integrityChecks.restoreHashValidation || !dataIntegrity.integrityChecks.recordCounts) {
    findings.push(`${service.name}: missing integrity checks on restore`);
  }
  if (dataIntegrity.correctnessScorecard.driftFindings > 0) {
    findings.push(`${service.name}: unresolved correctness drift`);
  }
}

function validateReleaseSafety(service: ServicePlan, findings: string[]): void {
  const { releaseSafety } = service;
  if (releaseSafety.progressiveStages.length < 3) {
    findings.push(`${service.name}: missing progressive delivery stages`);
  }
  if (releaseSafety.rollbackTriggers.length === 0) {
    findings.push(`${service.name}: missing rollback triggers`);
  }
  if (!releaseSafety.featureFlagGovernance.killSwitch) {
    findings.push(`${service.name}: feature flag kill switch missing`);
  }
  if (releaseSafety.migrationSafety.lockBudgetSeconds <= 0 || !releaseSafety.migrationSafety.rollbackPlan) {
    findings.push(`${service.name}: migration safety incomplete`);
  }
  if (releaseSafety.rollbackDrills.frequencyDays > 90 || daysSince(releaseSafety.rollbackDrills.lastRunAt) > 90) {
    findings.push(`${service.name}: rollback drills stale`);
  }
  if (releaseSafety.changeFailureRate > 0.3) {
    findings.push(`${service.name}: change failure rate too high (${releaseSafety.changeFailureRate})`);
  }
}

function validateObservability(service: ServicePlan, findings: string[]): void {
  const { observability } = service;
  if (!observability.structuredLogging || !observability.correlationIds) {
    findings.push(`${service.name}: structured logging or correlation IDs missing`);
  }
  if (observability.tracingCoverage.length < 5 && (service.tier === 'T0' || service.tier === 'T1')) {
    findings.push(`${service.name}: insufficient trace coverage for top journeys`);
  }
  if (observability.syntheticMonitors.length < 4) {
    findings.push(`${service.name}: synthetic coverage missing key journeys`);
  }
  if (!observability.entityTimeline || !observability.alertDeepLinks) {
    findings.push(`${service.name}: triage deep links incomplete`);
  }
  if (!observability.anomalyDetection) {
    findings.push(`${service.name}: anomaly detection missing`);
  }
  if (!observability.perTenantSignals && service.tier === 'T0') {
    findings.push(`${service.name}: per-tenant observability missing for Tier0`);
  }
  if (!observability.telemetryCostControls.sampling || !observability.telemetryCostControls.retentionTiers) {
    findings.push(`${service.name}: telemetry cost controls absent`);
  }
}

function validateChaos(service: ServicePlan, findings: string[]): void {
  if (service.chaos.calendar.length === 0) {
    findings.push(`${service.name}: chaos calendar missing`);
  }
  if (!service.chaos.drIncluded) {
    findings.push(`${service.name}: DR not included in chaos drills`);
  }
  if (service.chaos.tooling.blastRadiusCapPercent > 30) {
    findings.push(`${service.name}: chaos blast radius cap too high`);
  }
  if (daysSince(service.chaos.killSwitchesVerifiedAt) > 90) {
    findings.push(`${service.name}: kill switches not recently verified`);
  }
  if (daysSince(service.chaos.mitigationBacklog.lastUpdatedAt) > 30) {
    findings.push(`${service.name}: mitigation backlog stale`);
  }
  if (service.chaos.score < 80) {
    findings.push(`${service.name}: resilience score below target`);
  }
}

function validateMultiRegion(service: ServicePlan, findings: string[]): void {
  if ((service.tier === 'T0' || service.tier === 'T1') && service.multiRegion.strategy === 'single-az') {
    findings.push(`${service.name}: multi-AZ/region not defined for critical tier`);
  }
  if (!service.multiRegion.healthChecks || !service.multiRegion.regionalDashboards) {
    findings.push(`${service.name}: regional health checks or dashboards missing`);
  }
  if (service.multiRegion.replicationLagSeconds * (1 / 60) > TIER_TARGETS[service.tier].rpoMinutes) {
    findings.push(`${service.name}: replication lag exceeds RPO`);
  }
  if (daysSince(service.multiRegion.failoverDrillAt) > 120) {
    findings.push(`${service.name}: failover drill stale`);
  }
  if (!service.multiRegion.secretsStandardized) {
    findings.push(`${service.name}: secrets not standardized across regions`);
  }
  if (!service.multiRegion.vendorPlan) {
    findings.push(`${service.name}: vendor dependency plan per region missing`);
  }
}

function validateGovernance(service: ServicePlan, findings: string[]): void {
  if (service.governance.errorBudgets.length === 0) {
    findings.push(`${service.name}: error budgets missing`);
  }
  const overspent = service.governance.errorBudgets.filter((budget) => budget.burnedMinutes > budget.monthlyMinutes);
  if (overspent.length > 0) {
    findings.push(`${service.name}: error budgets overspent`);
  }
  if (service.governance.riskRegister.length < 1) {
    findings.push(`${service.name}: risk register empty`);
  }
  const staleRisks = service.governance.riskRegister.filter((risk) => risk.status !== 'closed');
  if (staleRisks.some((risk) => risk.mitigationSlaDays > 90)) {
    findings.push(`${service.name}: open risks missing mitigation SLAs within 90d`);
  }
  if (!service.governance.postmortemsRequireSystemicFix) {
    findings.push(`${service.name}: postmortem systemic fixes not enforced`);
  }
  if (service.governance.reliabilityReleaseCadenceDays > 90) {
    findings.push(`${service.name}: reliability release cadence too slow`);
  }
  if (!service.governance.ownershipComplete) {
    findings.push(`${service.name}: ownership/runbook/on-call incomplete`);
  }
  if (service.governance.killSwitchRegistryTestDays > 90) {
    findings.push(`${service.name}: kill switch registry not tested within 90d`);
  }
  if (daysSince(service.governance.lastAuditAt) > 120) {
    findings.push(`${service.name}: quarterly audit missing`);
  }
  if (!service.governance.incentives) {
    findings.push(`${service.name}: incentives for hardening not defined`);
  }
}

function buildEpicResult(epic: string, findings: string[]): EpicResult {
  return {
    epic,
    status: findings.length === 0 ? 'pass' : 'fail',
    findings,
  };
}

function validatePerService(plan: ResiliencePlan, validator: (service: ServicePlan, findings: string[]) => void, epic: string): EpicResult {
  const findings: string[] = [];
  for (const service of plan.services) {
    validator(service, findings);
  }
  return buildEpicResult(epic, findings);
}

export function validatePlan(plan: ResiliencePlan): ValidationReport {
  const results: EpicResult[] = [
    validatePerService(plan, (service, findings) => {
      ensureTierTargets(service, findings);
      validateRunbooks(service, findings);
      validateDependencies(service, findings);
    }, 'Epic 1 — DR Baseline'),
    validatePerService(plan, validateDependencies, 'Epic 2 — Dependency Isolation'),
    validatePerService(plan, validateCapacity, 'Epic 3 — Capacity & Load Discipline'),
    validatePerService(plan, validateDataIntegrity, 'Epic 4 — Data Corruption Hardening'),
    validatePerService(plan, validateReleaseSafety, 'Epic 5 — Release Safety & Blast Radius Control'),
    validatePerService(plan, validateObservability, 'Epic 6 — Observability That Wins Wars'),
    validatePerService(plan, validateChaos, 'Epic 7 — Chaos & GameDays'),
    validatePerService(plan, validateMultiRegion, 'Epic 8 — Multi-Region / Multi-AZ Resilience'),
    validatePerService(plan, validateGovernance, 'Epic 9 — Resilience Governance'),
  ];
  const overallStatus: ValidationReport['overallStatus'] = results.every((result) => result.status === 'pass')
    ? 'pass'
    : 'fail';
  return { overallStatus, results };
}

export function tierFromString(value: string): Tier {
  if (value === 'T0' || value === 'T1' || value === 'T2' || value === 'T3') {
    return value;
  }
  throw new Error(`Unknown tier value: ${value}`);
}
