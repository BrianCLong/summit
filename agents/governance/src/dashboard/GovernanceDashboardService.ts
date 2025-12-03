/**
 * Governance Dashboard Service
 *
 * Provides aggregated metrics and real-time status for the
 * AI agent governance dashboard.
 */

import {
  GovernanceDashboardMetrics,
  FleetMetrics,
  PolicyMetrics,
  IncidentMetrics,
  HallucinationMetrics,
  RollbackMetrics,
  ComplianceMetrics,
  GovernanceEvent,
  AgentTrustLevel,
  AgentClassification,
  IncidentSeverity,
  IncidentType,
  HallucinationSeverity,
  RollbackTrigger,
} from '../types';
import { AgentPolicyEngine } from '../policy-engine/AgentPolicyEngine';
import { PromptChainOrchestrator } from '../orchestration/PromptChainOrchestrator';
import { IncidentResponseManager } from '../incident-response/IncidentResponseManager';
import { HallucinationAuditor } from '../hallucination-audit/HallucinationAuditor';
import { RollbackManager } from '../rollback/RollbackManager';
import { ICFY28ComplianceValidator } from '../compliance/ICFY28ComplianceValidator';

// ============================================================================
// Dashboard Service
// ============================================================================

export class GovernanceDashboardService {
  private policyEngine: AgentPolicyEngine;
  private orchestrator: PromptChainOrchestrator;
  private incidentManager: IncidentResponseManager;
  private hallucinationAuditor: HallucinationAuditor;
  private rollbackManager: RollbackManager;
  private complianceValidator: ICFY28ComplianceValidator;
  private eventHistory: GovernanceEvent[];
  private maxEventHistory: number;

  constructor(dependencies: {
    policyEngine: AgentPolicyEngine;
    orchestrator: PromptChainOrchestrator;
    incidentManager: IncidentResponseManager;
    hallucinationAuditor: HallucinationAuditor;
    rollbackManager: RollbackManager;
    complianceValidator: ICFY28ComplianceValidator;
  }) {
    this.policyEngine = dependencies.policyEngine;
    this.orchestrator = dependencies.orchestrator;
    this.incidentManager = dependencies.incidentManager;
    this.hallucinationAuditor = dependencies.hallucinationAuditor;
    this.rollbackManager = dependencies.rollbackManager;
    this.complianceValidator = dependencies.complianceValidator;
    this.eventHistory = [];
    this.maxEventHistory = 10000;

    // Subscribe to events from all components
    this.subscribeToEvents();
  }

  /**
   * Subscribe to events from all governance components
   */
  private subscribeToEvents(): void {
    const recordEvent = (event: GovernanceEvent) => {
      this.eventHistory.push(event);
      if (this.eventHistory.length > this.maxEventHistory) {
        this.eventHistory.shift();
      }
    };

    this.policyEngine.onEvent(recordEvent);
    this.incidentManager.onEvent(recordEvent);
    this.hallucinationAuditor.onEvent(recordEvent);
    this.rollbackManager.onEvent(recordEvent);
    this.complianceValidator.onEvent(recordEvent);
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getMetrics(): Promise<GovernanceDashboardMetrics> {
    const [fleet, policy, incidents, hallucinations, rollbacks, compliance] = await Promise.all([
      this.getFleetMetrics(),
      this.getPolicyMetrics(),
      this.getIncidentMetrics(),
      this.getHallucinationMetrics(),
      this.getRollbackMetrics(),
      this.getComplianceMetrics(),
    ]);

    return {
      timestamp: new Date(),
      fleet,
      policy,
      incidents,
      hallucinations,
      rollbacks,
      compliance,
    };
  }

  /**
   * Get fleet metrics
   */
  private async getFleetMetrics(): Promise<FleetMetrics> {
    // In production, this would query the agent registry
    const activeChains = this.orchestrator.getActiveChains();

    return {
      totalAgents: 0, // Would query agent registry
      activeAgents: activeChains.length,
      byTrustLevel: {
        untrusted: 0,
        basic: 0,
        elevated: 0,
        privileged: 0,
        sovereign: 0,
      } as Record<AgentTrustLevel, number>,
      byClassification: {
        UNCLASSIFIED: 0,
        CUI: 0,
        CONFIDENTIAL: 0,
        SECRET: 0,
        TOP_SECRET: 0,
        SCI: 0,
        SAP: 0,
      } as Record<AgentClassification, number>,
      healthScore: 100,
    };
  }

  /**
   * Get policy metrics
   */
  private async getPolicyMetrics(): Promise<PolicyMetrics> {
    const engineMetrics = this.policyEngine.getMetrics();

    // Calculate top denial reasons from event history
    const denialReasons: Record<string, number> = {};
    const policyEvents = this.eventHistory.filter((e) => e.type === 'policy_violation');

    for (const event of policyEvents) {
      const reason = (event.details?.reason as string) || 'Unknown';
      denialReasons[reason] = (denialReasons[reason] || 0) + 1;
    }

    const topDenialReasons = Object.entries(denialReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      evaluationsTotal: engineMetrics.evaluationsTotal,
      evaluationsAllowed: engineMetrics.evaluationsAllowed,
      evaluationsDenied: engineMetrics.evaluationsDenied,
      averageLatencyMs: engineMetrics.averageLatencyMs,
      cacheHitRate:
        engineMetrics.cacheHits /
        Math.max(1, engineMetrics.cacheHits + engineMetrics.cacheMisses),
      topDenialReasons,
    };
  }

  /**
   * Get incident metrics
   */
  private async getIncidentMetrics(): Promise<IncidentMetrics> {
    const managerMetrics = this.incidentManager.getMetrics();
    const activeIncidents = this.incidentManager.getActiveIncidents();

    // Calculate MTTR from resolved incidents
    const resolvedEvents = this.eventHistory.filter((e) => e.type === 'incident_resolved');
    let totalMttr = 0;
    let mttrCount = 0;

    for (const event of resolvedEvents) {
      if (event.details?.mttr) {
        totalMttr += event.details.mttr as number;
        mttrCount++;
      }
    }

    // Get incidents resolved in last 24h
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const resolvedLast24h = resolvedEvents.filter(
      (e) => e.timestamp.getTime() >= oneDayAgo,
    ).length;

    return {
      activeIncidents: activeIncidents.length,
      resolvedLast24h,
      mttr: mttrCount > 0 ? totalMttr / mttrCount : 0,
      bySeverity: managerMetrics.bySeverity,
      byType: managerMetrics.byType as Record<IncidentType, number>,
    };
  }

  /**
   * Get hallucination metrics
   */
  private async getHallucinationMetrics(): Promise<HallucinationMetrics> {
    const hallucinationEvents = this.eventHistory.filter(
      (e) => e.type === 'hallucination_detected',
    );

    const bySeverity: Record<HallucinationSeverity, number> = {
      benign: 0,
      misleading: 0,
      harmful: 0,
      dangerous: 0,
    };

    const patterns: Record<string, number> = {};

    for (const event of hallucinationEvents) {
      const severity = (event.details?.severity as HallucinationSeverity) || 'benign';
      bySeverity[severity]++;

      const type = (event.details?.type as string) || 'unknown';
      patterns[type] = (patterns[type] || 0) + 1;
    }

    const remediatedEvents = this.eventHistory.filter(
      (e) => e.type === 'hallucination_remediated',
    );

    return {
      detectionRate: hallucinationEvents.length > 0 ? 1 : 0, // Would calculate from total generations
      totalDetections: hallucinationEvents.length,
      bySeverity,
      remediationRate:
        hallucinationEvents.length > 0
          ? remediatedEvents.length / hallucinationEvents.length
          : 1,
      topPatterns: Object.entries(patterns)
        .map(([pattern, count]) => ({ pattern, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }

  /**
   * Get rollback metrics
   */
  private async getRollbackMetrics(): Promise<RollbackMetrics> {
    const managerMetrics = this.rollbackManager.getMetrics();

    return {
      totalRollbacks: managerMetrics.total,
      successfulRollbacks: managerMetrics.successful,
      failedRollbacks: managerMetrics.failed,
      averageRecoveryTime: managerMetrics.avgRecoveryTime,
      byTrigger: managerMetrics.byTrigger,
    };
  }

  /**
   * Get compliance metrics
   */
  private async getComplianceMetrics(): Promise<ComplianceMetrics> {
    const history = this.complianceValidator.getValidationHistory();
    const latest = history[history.length - 1];
    const score = this.complianceValidator.getComplianceScore();
    const openFindings = this.complianceValidator.getOpenFindings();

    return {
      overallScore: score.score,
      icfy28Compliant: latest?.overallCompliant || false,
      slsaLevel: 'SLSA_3',
      lastAudit: latest?.timestamp || new Date(0),
      openFindings: openFindings.length,
      criticalFindings: openFindings.filter((f) => f.severity === 'critical').length,
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 100): GovernanceEvent[] {
    return this.eventHistory.slice(-limit).reverse();
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string, limit: number = 100): GovernanceEvent[] {
    return this.eventHistory
      .filter((e) => e.type === type)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get events for time range
   */
  getEventsInRange(start: Date, end: Date): GovernanceEvent[] {
    return this.eventHistory.filter(
      (e) => e.timestamp >= start && e.timestamp <= end,
    );
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, { status: string; message: string }>;
  }> {
    const components: Record<string, { status: string; message: string }> = {};

    // Check policy engine
    const policyMetrics = this.policyEngine.getMetrics();
    components.policyEngine = {
      status: policyMetrics.evaluationsFailed === 0 ? 'healthy' : 'degraded',
      message: `${policyMetrics.evaluationsTotal} evaluations, ${policyMetrics.evaluationsFailed} failed`,
    };

    // Check incident manager
    const activeIncidents = this.incidentManager.getActiveIncidents();
    const criticalIncidents = activeIncidents.filter((i) => i.severity === 'critical');
    components.incidentResponse = {
      status: criticalIncidents.length === 0 ? 'healthy' : 'degraded',
      message: `${activeIncidents.length} active incidents, ${criticalIncidents.length} critical`,
    };

    // Check compliance
    const compliance = this.complianceValidator.getComplianceScore();
    components.compliance = {
      status: compliance.score >= 80 ? 'healthy' : compliance.score >= 60 ? 'degraded' : 'unhealthy',
      message: `${compliance.score}% compliant, trend: ${compliance.trend}`,
    };

    // Determine overall health
    const statuses = Object.values(components).map((c) => c.status);
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (statuses.includes('unhealthy')) overall = 'unhealthy';
    else if (statuses.includes('degraded')) overall = 'degraded';

    return { overall, components };
  }

  /**
   * Get summary for display
   */
  async getSummary(): Promise<{
    status: string;
    agents: { total: number; active: number };
    incidents: { active: number; critical: number };
    compliance: { score: number; compliant: boolean };
    lastUpdated: Date;
  }> {
    const metrics = await this.getMetrics();
    const health = await this.getHealthStatus();

    return {
      status: health.overall,
      agents: {
        total: metrics.fleet.totalAgents,
        active: metrics.fleet.activeAgents,
      },
      incidents: {
        active: metrics.incidents.activeIncidents,
        critical: metrics.incidents.bySeverity.critical || 0,
      },
      compliance: {
        score: metrics.compliance.overallScore,
        compliant: metrics.compliance.icfy28Compliant,
      },
      lastUpdated: metrics.timestamp,
    };
  }
}

// ============================================================================
// Dashboard API Types (for UI consumption)
// ============================================================================

export interface DashboardAPIResponse<T> {
  success: boolean;
  data: T;
  timestamp: Date;
  requestId: string;
}

export interface DashboardChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

export interface DashboardTimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}
