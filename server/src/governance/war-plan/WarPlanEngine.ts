import {
  AcceptanceCriteria,
  AcceptanceValidationResult,
  CostBudgetReport,
  CostBudgetSnapshot,
  ErrorBudgetStatus,
  GuardrailReport,
  GuardrailSnapshot,
  JourneyStatus,
  NonNegotiableChecklist,
  NonNegotiableResult,
  PhaseReport,
  PhaseStatus,
  PhaseSnapshot,
  RequirementReport,
  RiskItem,
  RiskRegisterStatus,
  Scoreboard,
  ServiceReliability,
  SurfaceAreaChange,
  SurfaceAreaResult,
} from './types.js';
import {
  COST_ALERT_THRESHOLDS,
  DEFAULT_AVAILABILITY_TARGET,
  DEFAULT_COST_VARIANCE,
  DEFAULT_MTTR_MINUTES,
  ERROR_BUDGET_ALERTS,
  ERROR_BUDGET_MINUTES,
  REQUIRED_DELETIONS_PER_PHASE_ONE,
  REQUIRED_JOURNEYS,
  REQUIRED_LOW_USAGE_FEATURES,
  REQUIRED_NOISY_ALERTS_REMOVED,
  REQUIRED_QUERIES_OPTIMIZED,
  REQUIRED_TELEMETRY_DELETIONS,
} from './config.js';

interface WarPlanConfig {
  availabilityTarget: number;
  mttrMinutes: number;
  costVariance: number;
  errorBudgetMinutes: number;
  errorBudgetAlerts: number[];
  costAlertThresholds: number[];
  requiredJourneys: number;
  requiredDeletions: number;
  requiredNoisyAlerts: number;
  requiredLowUsageFeatures: number;
  requiredTelemetryDeletions: number;
  requiredQueriesOptimized: number;
}

export class WarPlanEngine {
  private readonly config: WarPlanConfig;

  constructor(config: Partial<WarPlanConfig> = {}) {
    this.config = {
      availabilityTarget: config.availabilityTarget ?? DEFAULT_AVAILABILITY_TARGET,
      mttrMinutes: config.mttrMinutes ?? DEFAULT_MTTR_MINUTES,
      costVariance: config.costVariance ?? DEFAULT_COST_VARIANCE,
      errorBudgetMinutes: config.errorBudgetMinutes ?? ERROR_BUDGET_MINUTES,
      errorBudgetAlerts: config.errorBudgetAlerts ?? ERROR_BUDGET_ALERTS,
      costAlertThresholds: config.costAlertThresholds ?? COST_ALERT_THRESHOLDS,
      requiredJourneys: config.requiredJourneys ?? REQUIRED_JOURNEYS,
      requiredDeletions: config.requiredDeletions ?? REQUIRED_DELETIONS_PER_PHASE_ONE,
      requiredNoisyAlerts: config.requiredNoisyAlerts ?? REQUIRED_NOISY_ALERTS_REMOVED,
      requiredLowUsageFeatures:
        config.requiredLowUsageFeatures ?? REQUIRED_LOW_USAGE_FEATURES,
      requiredTelemetryDeletions:
        config.requiredTelemetryDeletions ?? REQUIRED_TELEMETRY_DELETIONS,
      requiredQueriesOptimized:
        config.requiredQueriesOptimized ?? REQUIRED_QUERIES_OPTIMIZED,
    };
  }

  evaluateGuardrails(snapshot: GuardrailSnapshot): GuardrailReport {
    const reliabilityViolations = this.evaluateReliability(snapshot.reliability);
    const journeyViolations = this.evaluateJourneys(snapshot.journeys);
    const costViolations = this.evaluateCostGuardrails(snapshot.costs);
    const securityViolations = this.evaluateSecurity(snapshot.security);

    return {
      reliability: this.toReport(reliabilityViolations),
      journeys: this.toReport(journeyViolations),
      cost: this.toReport(costViolations),
      security: this.toReport(securityViolations),
    };
  }

  evaluateErrorBudget(downtimeMinutes: number): ErrorBudgetStatus {
    const burnRate = downtimeMinutes / this.config.errorBudgetMinutes;
    const alerts = this.config.errorBudgetAlerts.filter(
      (threshold) => burnRate >= threshold,
    );

    return {
      remainingMinutes: Math.max(this.config.errorBudgetMinutes - downtimeMinutes, 0),
      budgetMinutes: this.config.errorBudgetMinutes,
      burnRate,
      alerts,
      exhausted: burnRate >= 1,
    };
  }

  evaluateCostBudgets(costs: CostBudgetSnapshot[]): CostBudgetReport {
    const nonCompliant: string[] = [];

    const statuses = costs.map((cost) => {
      const variance = (cost.actualSpend - cost.weeklyBudget) / cost.weeklyBudget;
      const ratio = cost.actualSpend / cost.weeklyBudget;
      const alertLevel = this.config.costAlertThresholds.reduce<number | null>(
        (level, threshold) => (ratio >= threshold ? threshold : level),
        null,
      );

      const telemetryBreached = cost.telemetryActual > cost.telemetryCap;
      const storageBreached = cost.storageActual > cost.storageCap;
      const throttleRecommended =
        ratio >= 1 ||
        variance > this.config.costVariance ||
        ((cost.burstyTenants?.length ?? 0) > 0 && ratio >= 0.85);

      if (
        variance > this.config.costVariance ||
        ratio > 1 ||
        telemetryBreached ||
        storageBreached
      ) {
        nonCompliant.push(cost.service);
      }

      return {
        service: cost.service,
        budget: cost.weeklyBudget,
        actual: cost.actualSpend,
        variance,
        alertLevel,
        throttleRecommended,
        telemetryBreached,
        storageBreached,
      };
    });

    return { statuses, nonCompliant };
  }

  enforceNonNegotiables(checklist: NonNegotiableChecklist): NonNegotiableResult {
    const missing: string[] = [];

    if (!checklist.domainOwner) {
      missing.push('domain_owner');
    }
    if (!checklist.sloGatesEnforced) {
      missing.push('slo_ci_gates');
    }
    if (checklist.deprecationWindowDays <= 0) {
      missing.push('deprecation_window');
    }
    if (!checklist.auditLoggingEnabled) {
      missing.push('audit_logging');
    }
    if (!checklist.rollbackPlan.autoRollbackEnabled) {
      missing.push('auto_rollback');
    }
    if (!checklist.rollbackPlan.testedInGameDay) {
      missing.push('rollback_tested');
    }
    if (checklist.rollbackPlan.triggers.length === 0) {
      missing.push('rollback_triggers');
    }
    if (checklist.documentationLinks.length === 0) {
      missing.push('documentation');
    }
    if (!checklist.supportTrainingComplete) {
      missing.push('support_training');
    }

    return {
      compliant: missing.length === 0,
      violations: missing,
      missing,
    };
  }

  validateAcceptanceCriteria(
    criteria: AcceptanceCriteria,
  ): AcceptanceValidationResult {
    const missing: string[] = [];

    if (criteria.successMetrics.length === 0) {
      missing.push('success_metrics');
    }
    if (!criteria.rolloutPlan) {
      missing.push('rollout_plan');
    }
    if (!criteria.rollbackPlan.autoRollbackEnabled) {
      missing.push('auto_rollback');
    }
    if (!criteria.rollbackPlan.testedInGameDay) {
      missing.push('rollback_tested');
    }
    if (criteria.rollbackPlan.triggers.length === 0) {
      missing.push('rollback_triggers');
    }
    if (criteria.documentation.length === 0) {
      missing.push('documentation');
    }
    if (!criteria.supportTraining) {
      missing.push('support_training');
    }

    const observability = criteria.observability;
    if (!observability.sloDefined) {
      missing.push('slo_defined');
    }
    if (!observability.burnAlertsEnabled) {
      missing.push('burn_alerts');
    }
    if (!observability.tracingEnabled) {
      missing.push('tracing');
    }
    if (!observability.structuredLogging) {
      missing.push('structured_logging');
    }
    if (!observability.correlationIds) {
      missing.push('correlation_ids');
    }

    return {
      compliant: missing.length === 0,
      violations: missing,
      missing,
    };
  }

  checkSurfaceAreaFreeze(change: SurfaceAreaChange): SurfaceAreaResult {
    const missing: string[] = [];

    if (change.added.length > 0 && change.removed.length === 0) {
      missing.push('one_out_required');
    }
    if (change.removed.length < change.added.length) {
      missing.push('insufficient_removals');
    }

    return {
      compliant: missing.length === 0,
      violations: missing,
    };
  }

  normalizeRiskRegister(risks: RiskItem[]): RiskRegisterStatus {
    const validRisks = risks.filter((risk) => this.isValidDate(risk.dueDate));
    const staleOrMissing = risks.filter(
      (risk) => !risk.owner || !this.isValidDate(risk.dueDate),
    );

    const severityOrder: Record<RiskItem['severity'], number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    const topRisks = [...validRisks]
      .sort((a, b) => {
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      })
      .slice(0, 10);

    return { topRisks, staleOrMissing };
  }

  assessPhaseProgress(snapshot: PhaseSnapshot): PhaseReport {
    const phases = [
      this.assessPhaseOne(snapshot),
      this.assessPhaseTwo(snapshot),
      this.assessPhaseThree(snapshot),
    ];

    return { phases };
  }

  summarizeScoreboard(snapshot: PhaseSnapshot): Scoreboard {
    const guardrails = this.evaluateGuardrails({
      reliability: snapshot.reliability,
      journeys: snapshot.journeys,
      costs: snapshot.costs,
      security: snapshot.security,
    });
    const delivery = this.assessPhaseProgress(snapshot);
    const riskRegister = this.normalizeRiskRegister(snapshot.riskRegister);

    return {
      reliability: guardrails.reliability,
      cost: guardrails.cost,
      security: guardrails.security,
      delivery,
      riskRegister,
    };
  }

  private assessPhaseOne(snapshot: PhaseSnapshot): PhaseStatus {
    const violations: string[] = [];

    if (snapshot.journeys.length < this.config.requiredJourneys) {
      violations.push('missing_revenue_journeys');
    }
    const underInstrumented = snapshot.journeys.filter(
      (journey) =>
        !journey.hasSloDashboard ||
        !journey.hasBurnAlerts ||
        !journey.hasRunbook ||
        !journey.gameDayValidated,
    );
    if (underInstrumented.length > 0) {
      violations.push('journeys_not_fully_instrumented');
    }
    if (!snapshot.progressiveDeliveryEnabled) {
      violations.push('progressive_delivery_missing');
    }
    if (!snapshot.ssoMfaCoverage || !snapshot.adminAuditLogging) {
      violations.push('identity_or_audit_missing');
    }
    if (!snapshot.costDashboardsReady) {
      violations.push('cost_dashboards_missing');
    }
    if (snapshot.deletionsCompleted < this.config.requiredDeletions) {
      violations.push('deletion_goal_unmet');
    }
    if (snapshot.noisyAlertsRemoved < this.config.requiredNoisyAlerts) {
      violations.push('noisy_alerts_not_retired');
    }
    if (!snapshot.backlogInPlace) {
      violations.push('backlog_or_stop_doing_missing');
    }
    if (snapshot.riskRegister.length === 0) {
      violations.push('risk_register_missing');
    }

    return {
      name: 'Phase 1',
      compliant: violations.length === 0,
      violations,
    };
  }

  private assessPhaseTwo(snapshot: PhaseSnapshot): PhaseStatus {
    const violations: string[] = [];

    if (snapshot.servicesCollapsed < 2) {
      violations.push('insufficient_consolidation');
    }
    if (!snapshot.canonicalFlowsLive) {
      violations.push('canonical_flows_missing');
    }
    if (snapshot.lowUsageFeaturesRemoved < this.config.requiredLowUsageFeatures) {
      violations.push('low_usage_features_not_removed');
    }
    if (!snapshot.toolingConsolidated || !snapshot.queueConsolidated) {
      violations.push('tooling_or_queue_not_consolidated');
    }
    if (!snapshot.crossDomainReadsRemoved) {
      violations.push('cross_domain_reads_present');
    }
    if (!snapshot.migrationFactoryUsed) {
      violations.push('migration_factory_missing');
    }
    if (snapshot.dualWritesEliminated < 1) {
      violations.push('dual_writes_present');
    }
    if (!snapshot.constraintsEnforced) {
      violations.push('constraints_missing');
    }
    if (!snapshot.reconciliationJobsRunning) {
      violations.push('reconciliation_missing');
    }
    if (!snapshot.idempotencyCoverage) {
      violations.push('idempotency_missing');
    }
    if (
      snapshot.telemetryStreamsDeleted < this.config.requiredTelemetryDeletions ||
      snapshot.topTelemetryDashboardsDeleted < this.config.requiredTelemetryDeletions
    ) {
      violations.push('telemetry_cleanup_incomplete');
    }
    if (snapshot.dependenciesUpgraded === 0) {
      violations.push('dependencies_not_upgraded');
    }

    return {
      name: 'Phase 2',
      compliant: violations.length === 0,
      violations,
    };
  }

  private assessPhaseThree(snapshot: PhaseSnapshot): PhaseStatus {
    const violations: string[] = [];

    if (snapshot.queriesOptimized < this.config.requiredQueriesOptimized) {
      violations.push('expensive_queries_not_optimized');
    }
    if (!snapshot.cachingShipped) {
      violations.push('caching_missing');
    }
    if (!snapshot.frontendBundleReduced) {
      violations.push('frontend_bundle_not_reduced');
    }
    if (!snapshot.autoscalingCaps) {
      violations.push('autoscaling_caps_missing');
    }
    if (!snapshot.quotasLive) {
      violations.push('quotas_missing');
    }
    if (!snapshot.jobWasteReduced) {
      violations.push('job_waste_not_reduced');
    }
    if (!snapshot.costAnomalyDetection) {
      violations.push('cost_anomaly_detection_missing');
    }
    if (!snapshot.archivePolicies) {
      violations.push('archive_policies_missing');
    }
    if (!snapshot.trustCenterLive || !snapshot.auditExportsEnabled) {
      violations.push('trust_package_incomplete');
    }
    if (!snapshot.scimRbacTemplates) {
      violations.push('scim_rbac_templates_missing');
    }
    if (!snapshot.retentionControls) {
      violations.push('retention_controls_missing');
    }
    if (!snapshot.entitlementsCentralized) {
      violations.push('entitlements_not_centralized');
    }
    if (!snapshot.meteringAccuracyChecks) {
      violations.push('metering_checks_missing');
    }
    if (!snapshot.upgradesSelfServe) {
      violations.push('self_serve_upgrades_missing');
    }
    if (!snapshot.dunningRetries) {
      violations.push('dunning_or_retries_missing');
    }
    if (!snapshot.cancellationReasons) {
      violations.push('cancellation_reasons_missing');
    }

    return {
      name: 'Phase 3',
      compliant: violations.length === 0,
      violations,
    };
  }

  private evaluateReliability(
    reliability: ServiceReliability[],
  ): string[] {
    return reliability
      .filter((service) =>
        ['T0', 'T1'].includes(service.tier) &&
        (service.availability < this.config.availabilityTarget ||
          service.mttrMinutes > this.config.mttrMinutes),
      )
      .map(
        (service) =>
          `${service.service}:availability=${service.availability},mttr=${service.mttrMinutes}`,
      );
  }

  private evaluateJourneys(journeys: JourneyStatus[]): string[] {
    const violations: string[] = [];
    if (journeys.length < this.config.requiredJourneys) {
      violations.push('insufficient_journeys');
    }

    const missing = journeys.filter(
      (journey) =>
        !journey.hasSloDashboard ||
        !journey.hasBurnAlerts ||
        !journey.hasRunbook ||
        !journey.gameDayValidated,
    );

    if (missing.length > 0) {
      violations.push('journeys_missing_observability');
    }

    return violations;
  }

  private evaluateCostGuardrails(costs: CostBudgetSnapshot[]): string[] {
    return costs
      .filter((cost) => {
        const variance =
          (cost.perWorkspaceActual - cost.perWorkspaceBaseline) /
          cost.perWorkspaceBaseline;
        return (
          variance > this.config.costVariance ||
          cost.telemetryActual > cost.telemetryCap ||
          cost.storageActual > cost.storageCap
        );
      })
      .map((cost) => cost.service);
  }

  private evaluateSecurity(security: GuardrailSnapshot['security']): string[] {
    const violations: string[] = [];
    if (security.criticalFindings > 0) {
      violations.push('critical_findings_present');
    }
    if (!security.auditLoggingEnabled || !security.privilegedAuditCoverage) {
      violations.push('audit_logging_incomplete');
    }
    if (!security.ssoMfaEnforced || !security.sharedAccountsRemoved) {
      violations.push('identity_controls_incomplete');
    }
    return violations;
  }

  private toReport(violations: string[]): RequirementReport {
    return {
      compliant: violations.length === 0,
      violations,
    };
  }

  private isValidDate(value: string): boolean {
    const date = new Date(value);
    return Number.isFinite(date.getTime());
  }
}
